/**
 * Type definitions for the dashcam video analysis system
 */

export interface DetectedObject {
  id: string;
  class: string;
  confidence: number;
  bbox: BoundingBox;
  frameIndex: number;
  timestamp: number;
  tracked?: boolean;
  trackId?: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameAnalysis {
  frameIndex: number;
  timestamp: number;
  objects: DetectedObject[];
  riskScore: number;
  riskFactors: RiskFactor[];
}

export interface RiskFactor {
  type: RiskType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  objectIds: string[];
  confidence: number;
}

export type RiskType =
  | 'proximity'
  | 'velocity_change'
  | 'near_collision'
  | 'lane_interference'
  | 'sudden_appearance'
  | 'high_speed_proximity'
  | 'crossing_path';

export interface TrackedObject {
  trackId: number;
  class: string;
  firstSeen: number;
  lastSeen: number;
  positions: Array<{ frameIndex: number; bbox: BoundingBox; timestamp: number }>;
  velocity: { x: number; y: number };
  acceleration: { x: number; y: number };
  maxConfidence: number;
}

export interface AnalysisResult {
  videoMetadata: VideoMetadata;
  summary: AnalysisSummary;
  frames: FrameAnalysis[];
  trackedObjects: TrackedObject[];
  highRiskMoments: HighRiskMoment[];
  objectStatistics: ObjectStatistics;
}

export interface VideoMetadata {
  filename: string;
  duration: number;
  frameCount: number;
  width: number;
  height: number;
  fps: number;
  fileSize: number;
  format: string;
}

export interface AnalysisSummary {
  totalObjectsDetected: number;
  uniqueObjectsTracked: number;
  averageRiskScore: number;
  maxRiskScore: number;
  totalHighRiskFrames: number;
  totalCriticalRiskFrames: number;
  riskDistribution: RiskDistribution;
  analysisTimestamp: number;
}

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface HighRiskMoment {
  frameIndex: number;
  timestamp: number;
  riskScore: number;
  description: string;
  involvedObjects: DetectedObject[];
  thumbnail?: string;
}

export interface ObjectStatistics {
  byClass: Record<string, ClassStatistics>;
  total: number;
}

export interface ClassStatistics {
  count: number;
  averageConfidence: number;
  averageSize: { width: number; height: number };
  maxRiskEncountered: number;
}

export interface AnalysisProgress {
  stage: AnalysisStage;
  progress: number; // 0-100
  message: string;
  processedFrames: number;
  totalFrames: number;
}

export type AnalysisStage =
  | 'initializing'
  | 'loading_model'
  | 'extracting_frames'
  | 'detecting_objects'
  | 'tracking_objects'
  | 'analyzing_risk'
  | 'generating_report'
  | 'complete'
  | 'error';

export interface AnalysisConfig {
  frameSampleRate: number; // Analyze every Nth frame
  maxDuration: number; // Maximum video duration in seconds
  maxFileSize: number; // Maximum file size in bytes
  confidenceThreshold: number; // Minimum confidence for object detection
  proximityThreshold: number; // Distance threshold for proximity risk (0-1, normalized)
  velocityThreshold: number; // Velocity change threshold for risk
  enableObjectTracking: boolean;
  enableRiskAnalysis: boolean;
}

export interface ProcessingError {
  code: ErrorCode;
  message: string;
  details?: string;
  recoverable: boolean;
}

export type ErrorCode =
  | 'unsupported_format'
  | 'file_too_large'
  | 'duration_too_long'
  | 'model_load_failed'
  | 'inference_failed'
  | 'out_of_memory'
  | 'corrupted_file'
  | 'processing_timeout';