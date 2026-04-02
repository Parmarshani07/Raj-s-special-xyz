/**
 * Object Tracking Module
 * Implements simplified object tracking across frames using spatial overlap
 */

import type {
  DetectedObject,
  TrackedObject,
  BoundingBox,
} from '../types/analysis';

export class ObjectTracker {
  private nextTrackId: number = 1;
  private trackedObjects: Map<number, TrackedObject> = new Map();
  private maxTrackAge: number = 30; // Maximum frames to keep a track alive
  private iouThreshold: number = 0.3; // Minimum IoU for matching

  /**
   * Match detected objects to existing tracks and update tracking state
   */
  updateTracks(
    detectedObjects: DetectedObject[],
    frameIndex: number,
    timestamp: number
  ): Map<number, TrackedObject> {
    const unmatchedDetections: DetectedObject[] = [...detectedObjects];
    const matchedTrackIds = new Set<number>();

    // Match detections to existing tracks
    for (const [trackId, tracked] of this.trackedObjects.entries()) {
      const bestMatch = this.findBestMatch(tracked, unmatchedDetections);

      if (bestMatch !== null) {
        // Update existing track
        this.updateTrackedObject(tracked, bestMatch, frameIndex, timestamp);
        
        // Update the detection with track ID
        bestMatch.trackId = trackId;
        bestMatch.tracked = true;

        matchedTrackIds.add(trackId);
        unmatchedDetections.splice(unmatchedDetections.indexOf(bestMatch), 1);
      }
    }

    // Create new tracks for unmatched detections
    for (const detection of unmatchedDetections) {
      const newTrack = this.createNewTrack(detection, frameIndex, timestamp);
      this.trackedObjects.set(newTrack.trackId, newTrack);
      detection.trackId = newTrack.trackId;
      detection.tracked = true;
    }

    // Remove old tracks
    this.cleanupOldTracks(frameIndex);

    return this.trackedObjects;
  }

  /**
   * Find the best matching detection for a track using IoU
   */
  private findBestMatch(
    tracked: TrackedObject,
    detections: DetectedObject[]
  ): DetectedObject | null {
    let bestMatch: DetectedObject | null = null;
    let bestIoU = this.iouThreshold;

    const lastPosition = tracked.positions[tracked.positions.length - 1];

    for (const detection of detections) {
      // First check class compatibility
      if (detection.class !== tracked.class) continue;

      // Calculate IoU with last known position
      const iou = this.calculateIoU(lastPosition.bbox, detection.bbox);

      if (iou > bestIoU) {
        bestIoU = iou;
        bestMatch = detection;
      }
    }

    return bestMatch;
  }

  /**
   * Create a new track from a detection
   */
  private createNewTrack(
    detection: DetectedObject,
    frameIndex: number,
    timestamp: number
  ): TrackedObject {
    const track: TrackedObject = {
      trackId: this.nextTrackId++,
      class: detection.class,
      firstSeen: frameIndex,
      lastSeen: frameIndex,
      positions: [{
        frameIndex,
        bbox: { ...detection.bbox },
        timestamp,
      }],
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      maxConfidence: detection.confidence,
    };

    return track;
  }

  /**
   * Update an existing tracked object with new detection
   */
  private updateTrackedObject(
    tracked: TrackedObject,
    detection: DetectedObject,
    frameIndex: number,
    timestamp: number
  ): void {
    tracked.lastSeen = frameIndex;
    tracked.positions.push({
      frameIndex,
      bbox: { ...detection.bbox },
      timestamp,
    });

    // Limit position history
    if (tracked.positions.length > 10) {
      tracked.positions.shift();
    }

    // Update max confidence
    tracked.maxConfidence = Math.max(tracked.maxConfidence, detection.confidence);

    // Recalculate kinematics
    const kinematics = this.calculateKinematics(tracked.positions);
    tracked.velocity = kinematics.velocity;
    tracked.acceleration = kinematics.acceleration;
  }

  /**
   * Remove tracks that haven't been seen recently
   */
  private cleanupOldTracks(currentFrame: number): void {
    const toDelete: number[] = [];

    for (const [trackId, tracked] of this.trackedObjects.entries()) {
      const age = currentFrame - tracked.lastSeen;
      if (age > this.maxTrackAge) {
        toDelete.push(trackId);
      }
    }

    for (const trackId of toDelete) {
      this.trackedObjects.delete(trackId);
    }
  }

  /**
   * Calculate intersection over union
   */
  private calculateIoU(bbox1: BoundingBox, bbox2: BoundingBox): number {
    const x1 = Math.max(bbox1.x, bbox2.x);
    const y1 = Math.max(bbox1.y, bbox2.y);
    const x2 = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
    const y2 = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);

    if (x2 <= x1 || y2 <= y1) return 0;

    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = bbox1.width * bbox1.height;
    const area2 = bbox2.width * bbox2.height;
    const union = area1 + area2 - intersection;

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Calculate velocity and acceleration from position history
   */
  private calculateKinematics(
    positions: Array<{ bbox: BoundingBox; timestamp: number }>
  ): {
    velocity: { x: number; y: number };
    acceleration: { x: number; y: number };
  } {
    if (positions.length < 2) {
      return { velocity: { x: 0, y: 0 }, acceleration: { x: 0, y: 0 } };
    }

    // Calculate velocity from most recent positions
    const recent = positions.slice(-3);
    let velocity = { x: 0, y: 0 };

    if (recent.length >= 2) {
      const dt = recent[recent.length - 1].timestamp - recent[0].timestamp;
      if (dt > 0) {
        const dx = recent[recent.length - 1].bbox.x - recent[0].bbox.x;
        const dy = recent[recent.length - 1].bbox.y - recent[0].bbox.y;
        velocity = { x: dx / dt, y: dy / dt };
      }
    }

    // Calculate acceleration
    let acceleration = { x: 0, y: 0 };
    if (positions.length >= 4) {
      const older = positions.slice(-6, -3);
      const newer = positions.slice(-3);

      if (older.length >= 2 && newer.length >= 2) {
        const v1 = this.calculateVelocity(older);
        const v2 = this.calculateVelocity(newer);
        const dt = newer[newer.length - 1].timestamp - older[older.length - 1].timestamp;
        if (dt > 0) {
          acceleration = {
            x: (v2.x - v1.x) / dt,
            y: (v2.y - v1.y) / dt,
          };
        }
      }
    }

    return { velocity, acceleration };
  }

  private calculateVelocity(
    positions: Array<{ bbox: BoundingBox; timestamp: number }>
  ): { x: number; y: number } {
    if (positions.length < 2) return { x: 0, y: 0 };

    const first = positions[0];
    const last = positions[positions.length - 1];
    const dt = last.timestamp - first.timestamp;

    if (dt <= 0) return { x: 0, y: 0 };

    return {
      x: (last.bbox.x - first.bbox.x) / dt,
      y: (last.bbox.y - first.bbox.y) / dt,
    };
  }

  /**
   * Get the current tracking state
   */
  getTrackedObjects(): Map<number, TrackedObject> {
    return new Map(this.trackedObjects);
  }

  /**
   * Reset the tracker
   */
  reset(): void {
    this.nextTrackId = 1;
    this.trackedObjects.clear();
  }

  /**
   * Get statistics about current tracking
   */
  getTrackingStats(): {
    totalTracks: number;
    activeTracks: number;
    averageTrackLength: number;
  } {
    const tracks = Array.from(this.trackedObjects.values());
    const activeTracks = tracks.filter(
      t => t.positions.length > 1
    ).length;
    const avgLength = tracks.length > 0
      ? tracks.reduce((sum, t) => sum + t.positions.length, 0) / tracks.length
      : 0;

    return {
      totalTracks: tracks.length,
      activeTracks,
      averageTrackLength: avgLength,
    };
  }
}