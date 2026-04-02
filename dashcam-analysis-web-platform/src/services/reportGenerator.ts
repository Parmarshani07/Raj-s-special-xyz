/**
 * Report Generator Service
 * Creates downloadable reports from analysis results
 */

import type {
  AnalysisResult,
} from '../types/analysis';

export class ReportGenerator {
  /**
   * Generate a comprehensive text report
   */
  generateTextReport(result: AnalysisResult): string {
    const lines: string[] = [];

    // Header
    lines.push('='.repeat(60));
    lines.push('DASHCAM VIDEO ANALYSIS REPORT');
    lines.push('='.repeat(60));
    lines.push('');

    // Video Metadata
    lines.push('VIDEO INFORMATION');
    lines.push('-'.repeat(60));
    lines.push(`Filename: ${result.videoMetadata.filename}`);
    lines.push(`Duration: ${this.formatDuration(result.videoMetadata.duration)}`);
    lines.push(`Resolution: ${result.videoMetadata.width}x${result.videoMetadata.height}`);
    lines.push(`Frame Rate: ${result.videoMetadata.fps} FPS`);
    lines.push(`Total Frames Analyzed: ${result.frames.length}`);
    lines.push(`File Size: ${this.formatFileSize(result.videoMetadata.fileSize)}`);
    lines.push('');

    // Analysis Summary
    lines.push('ANALYSIS SUMMARY');
    lines.push('-'.repeat(60));
    lines.push(`Total Objects Detected: ${result.summary.totalObjectsDetected}`);
    lines.push(`Unique Objects Tracked: ${result.summary.uniqueObjectsTracked}`);
    lines.push(`Average Risk Score: ${result.summary.averageRiskScore.toFixed(1)}/100`);
    lines.push(`Maximum Risk Score: ${result.summary.maxRiskScore.toFixed(1)}/100`);
    lines.push(`High-Risk Frames (50+): ${result.summary.totalHighRiskFrames}`);
    lines.push(`Critical-Risk Frames (75+): ${result.summary.totalCriticalRiskFrames}`);
    lines.push(`Analysis Date: ${new Date(result.summary.analysisTimestamp).toLocaleString()}`);
    lines.push('');

    // Risk Distribution
    lines.push('RISK DISTRIBUTION');
    lines.push('-'.repeat(60));
    lines.push(`Low Risk (<25): ${result.summary.riskDistribution.low} frames`);
    lines.push(`Medium Risk (25-50): ${result.summary.riskDistribution.medium} frames`);
    lines.push(`High Risk (50-75): ${result.summary.riskDistribution.high} frames`);
    lines.push(`Critical Risk (75+): ${result.summary.riskDistribution.critical} frames`);
    lines.push('');

    // Object Statistics
    lines.push('DETECTED OBJECTS STATISTICS');
    lines.push('-'.repeat(60));
    for (const [className, stats] of Object.entries(result.objectStatistics.byClass)) {
      lines.push(`${className.toUpperCase()}:`);
      lines.push(`  Count: ${stats.count}`);
      lines.push(`  Average Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
      lines.push(`  Average Size: ${(stats.averageSize.width * 100).toFixed(1)}% x ${(stats.averageSize.height * 100).toFixed(1)}%`);
      lines.push(`  Max Risk Encountered: ${stats.maxRiskEncountered.toFixed(1)}/100`);
      lines.push('');
    }

    // High-Risk Moments
    if (result.highRiskMoments.length > 0) {
      lines.push('HIGH-RISK MOMENTS (Top 20)');
      lines.push('-'.repeat(60));
      for (let i = 0; i < Math.min(result.highRiskMoments.length, 20); i++) {
        const moment = result.highRiskMoments[i];
        lines.push(`${i + 1}. Timestamp: ${this.formatTimestamp(moment.timestamp)}`);
        lines.push(`   Risk Score: ${moment.riskScore.toFixed(1)}/100`);
        lines.push(`   Description: ${moment.description}`);
        lines.push(`   Involved Objects: ${moment.involvedObjects.map(o => o.class).join(', ')}`);
        lines.push('');
      }
    }

    // Detailed Frame Analysis (sample of high-risk frames)
    if (result.frames.some(f => f.riskScore >= 50)) {
      lines.push('DETAILED HIGH-RISK FRAME ANALYSIS');
      lines.push('-'.repeat(60));
      
      const highRiskFrames = result.frames
        .filter(f => f.riskScore >= 50)
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 10);

      for (const frame of highRiskFrames) {
        lines.push(`Frame ${frame.frameIndex} (${this.formatTimestamp(frame.timestamp)})`);
        lines.push(`  Risk Score: ${frame.riskScore.toFixed(1)}/100`);
        lines.push(`  Objects Detected: ${frame.objects.length}`);
        lines.push(`  Risk Factors:`);

        for (const factor of frame.riskFactors) {
          lines.push(`    - [${factor.severity.toUpperCase()}] ${factor.type}: ${factor.description}`);
          lines.push(`      Confidence: ${(factor.confidence * 100).toFixed(1)}%`);
        }
        lines.push('');
      }
    }

    // Tracked Objects
    if (result.trackedObjects.length > 0) {
      lines.push('TRACKED OBJECTS');
      lines.push('-'.repeat(60));
      lines.push(`Total Objects Tracked: ${result.trackedObjects.length}`);

      const longTracks = result.trackedObjects
        .filter(t => t.positions.length >= 5)
        .sort((a, b) => b.positions.length - a.positions.length)
        .slice(0, 10);

      if (longTracks.length > 0) {
        lines.push('\nLongest Tracks:');
        for (const track of longTracks) {
          lines.push(`  Track ID ${track.trackId} (${track.class})`);
          lines.push(`    Duration: ${track.positions.length} frames`);
          lines.push(`    Start: ${this.formatTimestamp(track.firstSeen / result.videoMetadata.fps)}`);
          lines.push(`    End: ${this.formatTimestamp(track.lastSeen / result.videoMetadata.fps)}`);
          lines.push(`    Max Confidence: ${(track.maxConfidence * 100).toFixed(1)}%`);
          lines.push(`    Velocity: (${track.velocity.x.toFixed(3)}, ${track.velocity.y.toFixed(3)})`);
          lines.push('');
        }
      }
    }

    // Footer
    lines.push('='.repeat(60));
    lines.push('END OF REPORT');
    lines.push('='.repeat(60));
    lines.push('');
    lines.push('NOTES:');
    lines.push('- Risk scores are estimated for reference only');
    lines.push('- Always review footage manually for complete safety assessment');
    lines.push('- Detection accuracy depends on video quality and lighting conditions');
    lines.push('');
    lines.push('LIMITATIONS:');
    lines.push('- Browser-based analysis may be less accurate than server-side processing');
    lines.push('- Complex scenarios (e.g., multiple occlusions) may have reduced accuracy');
    lines.push('- Speed estimation is based on frame-by-frame position changes');
    lines.push('- Depth estimation is not available; only 2D proximity is measured');

    return lines.join('\n');
  }

  /**
   * Generate a JSON report
   */
  generateJSONReport(result: AnalysisResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Generate a CSV report of frame-by-frame risks
   */
  generateCSVReport(result: AnalysisResult): string {
    const lines: string[] = [];

    // Header
    lines.push('Frame,Time (s),Risk Score,Object Count,Risk Factors,Objects');

    // Data rows
    for (const frame of result.frames) {
      const riskFactorsStr = frame.riskFactors
        .map(f => `${f.type}:${f.severity}`)
        .join('; ');

      const objectsStr = frame.objects
        .map(o => `${o.class}:${(o.confidence * 100).toFixed(0)}%`)
        .join('; ');

      lines.push(
        `${frame.frameIndex},${frame.timestamp.toFixed(2)},${frame.riskScore.toFixed(2)},${frame.objects.length},"${riskFactorsStr}","${objectsStr}"`
      );
    }

    return lines.join('\n');
  }

  /**
   * Download a report as a file
   */
  downloadReport(result: AnalysisResult, format: 'txt' | 'json' | 'csv' = 'txt'): void {
    let content: string;
    let mimeType: string;
    let filename: string;

    switch (format) {
      case 'json':
        content = this.generateJSONReport(result);
        mimeType = 'application/json';
        filename = `${result.videoMetadata.filename.replace(/\.[^/.]+$/, '')}_report.json`;
        break;
      case 'csv':
        content = this.generateCSVReport(result);
        mimeType = 'text/csv';
        filename = `${result.videoMetadata.filename.replace(/\.[^/.]+$/, '')}_report.csv`;
        break;
      case 'txt':
      default:
        content = this.generateTextReport(result);
        mimeType = 'text/plain';
        filename = `${result.videoMetadata.filename.replace(/\.[^/.]+$/, '')}_report.txt`;
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Format duration in seconds to readable format
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format timestamp in seconds to readable format
   */
  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  /**
   * Format file size in bytes to readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}