/**
 * Video Processing Service
 * Handles video loading, frame extraction, and coordinates analysis pipeline
 */

import type {
  AnalysisResult,
  AnalysisProgress,
  AnalysisStage,
  AnalysisConfig,
  ProcessingError,
  VideoMetadata,
  FrameAnalysis,
  HighRiskMoment,
  ObjectStatistics,
  AnalysisSummary,
  RiskDistribution,
  DetectedObject,
  TrackedObject,
} from '../types/analysis';
import { RiskAnalyzer } from './riskAnalyzer';
import { ObjectTracker } from './objectTracker';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export class VideoProcessor {
  private config: AnalysisConfig;
  private riskAnalyzer: RiskAnalyzer;
  private objectTracker: ObjectTracker;
  private model: cocoSsd.ObjectDetection | null = null;
  private abortController: AbortController | null = null;

  private progressCallbacks: Set<(progress: AnalysisProgress) => void> = new Set();

  constructor(config?: Partial<AnalysisConfig>) {
    this.config = {
      frameSampleRate: 2, // Analyze every 2nd frame
      maxDuration: 60, // 60 seconds max
      maxFileSize: 100 * 1024 * 1024, // 100MB
      confidenceThreshold: 0.5,
      proximityThreshold: 0.15,
      velocityThreshold: 0.05,
      enableObjectTracking: true,
      enableRiskAnalysis: true,
      ...config,
    };

    this.riskAnalyzer = new RiskAnalyzer();
    this.objectTracker = new ObjectTracker();
  }

  /**
   * Initialize the AI model
   */
  async initialize(): Promise<void> {
    this.updateProgress('loading_model', 0, 'Loading object detection model...');

    try {
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2', // Faster, lighter model
      });

      this.updateProgress('loading_model', 100, 'Model loaded successfully');
    } catch (error) {
      throw this.createError(
        'model_load_failed',
        'Failed to load object detection model',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Process a video file
   */
  async processVideo(file: File): Promise<AnalysisResult> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // Validate video file
      await this.validateVideoFile(file);

      this.updateProgress('initializing', 0, 'Initializing video analysis...');

      // Load video metadata
      const metadata = await this.extractVideoMetadata(file);

      // Update screen dimensions for risk analyzer
      this.riskAnalyzer.updateScreenDimensions(metadata.width, metadata.height);

      // Process frames
      this.updateProgress('extracting_frames', 0, 'Processing video frames...');

      const frameAnalyses: FrameAnalysis[] = [];
      let previousFrameObjects: DetectedObject[] = [];
      let trackedObjectsMap = new Map<number, TrackedObject>();

      const totalFramesToProcess = Math.ceil(
        metadata.frameCount / this.config.frameSampleRate
      );

      let processedFrames = 0;

      // Process video
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve(void 0);
        video.onerror = () => reject(new Error('Failed to load video'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = metadata.width;
      canvas.height = metadata.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        throw this.createError('processing_timeout', 'Failed to initialize canvas context');
      }

      // Process frames
      let frameIndex = 0;
      while (frameIndex < metadata.frameCount) {
        if (signal.aborted) {
          throw this.createError('processing_timeout', 'Analysis was cancelled');
        }

        // Seek to frame
        video.currentTime = frameIndex / metadata.fps;

        await new Promise(resolve => {
          const onSeek = () => {
            video.removeEventListener('seeked', onSeek);
            resolve(void 0);
          };
          video.addEventListener('seeked', onSeek);
        });

        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get frame data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Detect objects
        const timestamp = frameIndex / metadata.fps;

        const objects = await this.detectObjects(
          imageData,
          frameIndex,
          timestamp,
          canvas.width,
          canvas.height
        );

        // Update tracking
        if (this.config.enableObjectTracking) {
          trackedObjectsMap = this.objectTracker.updateTracks(
            objects,
            frameIndex,
            timestamp
          );
        }

        // Analyze risk
        let riskScore = 0;
        let riskFactors: any[] = [];

        if (this.config.enableRiskAnalysis) {
          const analysis = this.riskAnalyzer.analyzeFrameRisk(
            objects,
            frameIndex,
            trackedObjectsMap,
            previousFrameObjects
          );
          riskScore = analysis.riskScore;
          riskFactors = analysis.riskFactors;
        }

        frameAnalyses.push({
          frameIndex,
          timestamp,
          objects,
          riskScore,
          riskFactors,
        });

        previousFrameObjects = [...objects];
        processedFrames++;
        frameIndex += this.config.frameSampleRate;

        // Update progress
        const progress = (processedFrames / totalFramesToProcess) * 80 + 20;
        this.updateProgress(
          'detecting_objects',
          progress,
          `Processing frame ${processedFrames}/${totalFramesToProcess}...`
        );
      }

      // Cleanup
      URL.revokeObjectURL(video.src);

      // Generate summary and results
      this.updateProgress('analyzing_risk', 90, 'Analyzing results...');

      const summary = this.generateSummary(frameAnalyses, metadata);
      const highRiskMoments = this.extractHighRiskMoments(frameAnalyses);
      const objectStatistics = this.calculateObjectStatistics(frameAnalyses);

      const trackedObjects = Array.from(trackedObjectsMap.values());

      this.updateProgress('complete', 100, 'Analysis complete');

      return {
        videoMetadata: metadata,
        summary,
        frames: frameAnalyses,
        trackedObjects,
        highRiskMoments,
        objectStatistics,
      };
    } catch (error) {
      if (signal.aborted) {
        throw this.createError('processing_timeout', 'Analysis was cancelled');
      }
      throw this.createError(
        'inference_failed',
        'Failed to process video',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Validate the uploaded video file
   */
  private async validateVideoFile(file: File): Promise<void> {
    // Check file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      throw this.createError(
        'unsupported_format',
        `Unsupported file format: ${file.type}. Please upload MP4, WebM, or OGG video files.`
      );
    }

    // Check file size
    if (file.size > this.config.maxFileSize) {
      const maxSizeMB = (this.config.maxFileSize / (1024 * 1024)).toFixed(0);
      throw this.createError(
        'file_too_large',
        `File size exceeds ${maxSizeMB}MB limit. Please upload a smaller file.`
      );
    }

    // Check video duration
    const duration = await this.getVideoDuration(file);
    if (duration > this.config.maxDuration) {
      throw this.createError(
        'duration_too_long',
        `Video duration exceeds ${this.config.maxDuration}s limit. Please upload a shorter video.`
      );
    }
  }

  /**
   * Extract video metadata
   */
  private async extractVideoMetadata(file: File): Promise<VideoMetadata> {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve(void 0);
      video.onerror = () => reject(new Error('Failed to load video metadata'));
    });

    const metadata: VideoMetadata = {
      filename: file.name,
      duration: video.duration,
      frameCount: Math.round(video.duration * (video as any).fps || video.duration * 30),
      width: video.videoWidth || 640,
      height: video.videoHeight || 480,
      fps: (video as any).fps || 30,
      fileSize: file.size,
      format: file.type,
    };

    URL.revokeObjectURL(video.src);

    return metadata;
  }

  /**
   * Get video duration
   */
  private async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        reject(new Error('Failed to get video duration'));
        URL.revokeObjectURL(video.src);
      };
    });
  }

  /**
   * Detect objects in a frame
   */
  private async detectObjects(
    imageData: ImageData,
    frameIndex: number,
    timestamp: number,
    width: number,
    height: number
  ): Promise<DetectedObject[]> {
    if (!this.model) {
      throw this.createError('model_load_failed', 'Object detection model not loaded');
    }

    try {
      const predictions = await this.model.detect(imageData);

      return predictions
        .filter(pred => pred.score >= this.config.confidenceThreshold)
        .map((pred, index) => ({
          id: `${frameIndex}-${index}`,
          class: pred.class,
          confidence: pred.score,
          bbox: {
            x: pred.bbox[0] / width,
            y: pred.bbox[1] / height,
            width: pred.bbox[2] / width,
            height: pred.bbox[3] / height,
          },
          frameIndex,
          timestamp,
        }));
    } catch (error) {
      throw this.createError(
        'inference_failed',
        'Failed to detect objects in frame',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(
    frameAnalyses: FrameAnalysis[],
    _metadata: VideoMetadata
  ): AnalysisSummary {
    const totalObjectsDetected = frameAnalyses.reduce(
      (sum, frame) => sum + frame.objects.length,
      0
    );

    const uniqueTrackIds = new Set(
      frameAnalyses.flatMap(frame => frame.objects.map(obj => obj.trackId).filter(Boolean))
    );

    const riskScores = frameAnalyses.map(f => f.riskScore);
    const averageRiskScore =
      riskScores.length > 0
        ? riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length
        : 0;

    const maxRiskScore = riskScores.length > 0 ? Math.max(...riskScores) : 0;

    const totalHighRiskFrames = frameAnalyses.filter(f => f.riskScore >= 50).length;
    const totalCriticalRiskFrames = frameAnalyses.filter(f => f.riskScore >= 75).length;

    const riskDistribution: RiskDistribution = {
      low: frameAnalyses.filter(f => f.riskScore < 25).length,
      medium: frameAnalyses.filter(f => f.riskScore >= 25 && f.riskScore < 50).length,
      high: frameAnalyses.filter(f => f.riskScore >= 50 && f.riskScore < 75).length,
      critical: frameAnalyses.filter(f => f.riskScore >= 75).length,
    };

    return {
      totalObjectsDetected,
      uniqueObjectsTracked: uniqueTrackIds.size,
      averageRiskScore,
      maxRiskScore,
      totalHighRiskFrames,
      totalCriticalRiskFrames,
      riskDistribution,
      analysisTimestamp: Date.now(),
    };
  }

  /**
   * Extract high-risk moments from frame analyses
   */
  private extractHighRiskMoments(frameAnalyses: FrameAnalysis[]): HighRiskMoment[] {
    return frameAnalyses
      .filter(frame => frame.riskScore >= 40)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20)
      .map(frame => ({
        frameIndex: frame.frameIndex,
        timestamp: frame.timestamp,
        riskScore: frame.riskScore,
        description: this.formatRiskDescription(frame),
        involvedObjects: frame.objects.filter(obj =>
          frame.riskFactors.some(factor => factor.objectIds.includes(obj.id))
        ),
      }));
  }

  /**
   * Format risk description
   */
  private formatRiskDescription(frame: FrameAnalysis): string {
    const topFactors = frame.riskFactors
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 2);

    if (topFactors.length === 0) {
      return 'Moderate risk level detected';
    }

    return topFactors.map(f => f.description).join('; ');
  }

  /**
   * Calculate object statistics
   */
  private calculateObjectStatistics(frameAnalyses: FrameAnalysis[]): ObjectStatistics {
    const byClass: Record<string, any> = {};

    for (const frame of frameAnalyses) {
      for (const obj of frame.objects) {
        if (!byClass[obj.class]) {
          byClass[obj.class] = {
            count: 0,
            totalConfidence: 0,
            totalWidth: 0,
            totalHeight: 0,
            maxRisk: 0,
          };
        }

        byClass[obj.class].count++;
        byClass[obj.class].totalConfidence += obj.confidence;
        byClass[obj.class].totalWidth += obj.bbox.width;
        byClass[obj.class].totalHeight += obj.bbox.height;
        byClass[obj.class].maxRisk = Math.max(byClass[obj.class].maxRisk, frame.riskScore);
      }
    }

    const objectStatistics: Record<string, any> = {};

    for (const [className, stats] of Object.entries(byClass)) {
      objectStatistics[className] = {
        count: stats.count,
        averageConfidence: stats.totalConfidence / stats.count,
        averageSize: {
          width: stats.totalWidth / stats.count,
          height: stats.totalHeight / stats.count,
        },
        maxRiskEncountered: stats.maxRisk,
      };
    }

    return {
      byClass: objectStatistics,
      total: Object.values(byClass).reduce((sum: number, stats: any) => sum + stats.count, 0),
    };
  }

  /**
   * Cancel ongoing processing
   */
  cancel(): void {
    this.abortController?.abort();
    this.objectTracker.reset();
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: (progress: AnalysisProgress) => void): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Update progress
   */
  private updateProgress(
    stage: AnalysisStage,
    progress: number,
    message: string
  ): void {
    const progressData: AnalysisProgress = {
      stage,
      progress,
      message,
      processedFrames: 0,
      totalFrames: 0,
    };

    for (const callback of this.progressCallbacks) {
      try {
        callback(progressData);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    }
  }

  /**
   * Create an error object
   */
  private createError(
    code: ProcessingError['code'],
    message: string,
    details?: string
  ): ProcessingError {
    return {
      code,
      message,
      details,
      recoverable: code !== 'model_load_failed' && code !== 'out_of_memory',
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalysisConfig {
    return { ...this.config };
  }
}