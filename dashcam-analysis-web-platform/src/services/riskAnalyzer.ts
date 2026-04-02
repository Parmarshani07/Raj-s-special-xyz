/**
 * Risk Analysis Module
 * Implements practical computer-vision based risk scoring for road safety analysis
 */

import type {
  DetectedObject,
  FrameAnalysis,
  RiskFactor,
  TrackedObject,
  RiskType,
  BoundingBox,
} from '../types/analysis';

export class RiskAnalyzer {
  private config: {
    proximityThreshold: number;
    velocityThreshold: number;
    nearCollisionThreshold: number;
    highSpeedProximityThreshold: number;
    screenWidth: number;
    screenHeight: number;
  };

  constructor(screenWidth: number = 640, screenHeight: number = 480) {
    this.config = {
      proximityThreshold: 0.15, // 15% of screen width
      velocityThreshold: 0.05, // 5% of screen per second
      nearCollisionThreshold: 0.08, // 8% of screen width
      highSpeedProximityThreshold: 0.12, // 12% of screen width
      screenWidth,
      screenHeight,
    };
  }

  /**
   * Calculate risk score for a single frame based on detected objects
   */
  analyzeFrameRisk(
    objects: DetectedObject[],
    frameIndex: number,
    trackedObjects?: Map<number, TrackedObject>,
    previousFrameObjects?: DetectedObject[]
  ): FrameAnalysis {
    const riskFactors: RiskFactor[] = [];
    let frameRiskScore = 0;

    // Analyze proximity risks between objects
    const proximityRisks = this.analyzeProximity(objects);
    riskFactors.push(...proximityRisks);

    // Analyze trajectory risks if tracking is available
    if (trackedObjects && trackedObjects.size > 0) {
      const trajectoryRisks = this.analyzeTrajectories(objects, trackedObjects);
      riskFactors.push(...trajectoryRisks);
    }

    // Analyze sudden movement patterns
    if (previousFrameObjects && previousFrameObjects.length > 0) {
      const movementRisks = this.analyzeMovementPatterns(objects, previousFrameObjects);
      riskFactors.push(...movementRisks);
    }

    // Analyze lane/boundaries risks
    const boundaryRisks = this.analyzeBoundaryRisks(objects);
    riskFactors.push(...boundaryRisks);

    // Check for high-risk object combinations
    const combinationRisks = this.analyzeHighRiskCombinations(objects);
    riskFactors.push(...combinationRisks);

    // Calculate overall frame risk score
    frameRiskScore = this.calculateAggregateRisk(riskFactors);

    return {
      frameIndex,
      timestamp: 0, // Will be set by caller
      objects,
      riskScore: frameRiskScore,
      riskFactors,
    };
  }

  /**
   * Analyze proximity risks between all object pairs
   */
  private analyzeProximity(objects: DetectedObject[]): RiskFactor[] {
    const risks: RiskFactor[] = [];

    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const obj1 = objects[i];
        const obj2 = objects[j];

        const distance = this.calculateNormalizedDistance(obj1.bbox, obj2.bbox);
        const severity = this.getProximitySeverity(distance);

        if (severity !== 'low') {
          const type = this.inferProximityType(obj1, obj2, distance);
          risks.push({
            type,
            severity,
            description: this.formatProximityDescription(obj1, obj2, distance, type),
            objectIds: [obj1.id, obj2.id],
            confidence: this.calculateProximityConfidence(distance, obj1.confidence, obj2.confidence),
          });
        }
      }
    }

    return risks;
  }

  /**
   * Analyze trajectory risks using tracked object history
   */
  private analyzeTrajectories(
    objects: DetectedObject[],
    trackedObjects: Map<number, TrackedObject>
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    for (const obj of objects) {
      if (obj.trackId === undefined) continue;

      const tracked = trackedObjects.get(obj.trackId);
      if (!tracked || tracked.positions.length < 3) continue;

      // Calculate current velocity
      const velocity = tracked.velocity;
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);

      // Calculate acceleration
      const acceleration = tracked.acceleration;
      const accelMagnitude = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2);

      // Check for sudden acceleration/deceleration
      if (accelMagnitude > this.config.velocityThreshold * 2) {
        risks.push({
          type: 'velocity_change',
          severity: this.getVelocitySeverity(accelMagnitude),
          description: `Sudden velocity change detected for ${tracked.class}`,
          objectIds: [obj.id],
          confidence: Math.min(0.95, tracked.maxConfidence + 0.1),
        });
      }

      // Check for high-speed objects in dangerous areas
      if (speed > 0.1 && this.isInDangerousZone(obj.bbox)) {
        risks.push({
          type: 'high_speed_proximity',
          severity: speed > 0.2 ? 'high' : 'medium',
          description: `High-speed ${tracked.class} detected in potential collision zone`,
          objectIds: [obj.id],
          confidence: tracked.maxConfidence,
        });
      }

      // Predict potential collisions based on trajectories
      const collisionRisks = this.predictCollisions(obj, tracked, objects, trackedObjects);
      risks.push(...collisionRisks);
    }

    return risks;
  }

  /**
   * Analyze movement patterns compared to previous frame
   */
  private analyzeMovementPatterns(
    currentObjects: DetectedObject[],
    previousObjects: DetectedObject[]
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Match objects between frames
    for (const currentObj of currentObjects) {
      const previousMatches = previousObjects.filter(prev =>
        this.matchObjects(currentObj, prev)
      );

      for (const prevObj of previousMatches) {
        const displacement = this.calculateDisplacement(currentObj.bbox, prevObj.bbox);
        const displacementMag = Math.sqrt(displacement.x ** 2 + displacement.y ** 2);

        // Check for sudden appearance or movement
        if (displacementMag > this.config.velocityThreshold * 3) {
          risks.push({
            type: 'sudden_appearance',
            severity: 'medium',
            description: `${currentObj.class} appeared suddenly with high velocity`,
            objectIds: [currentObj.id],
            confidence: currentObj.confidence * 0.8,
          });
        }
      }
    }

    return risks;
  }

  /**
   * Analyze boundary-related risks
   */
  private analyzeBoundaryRisks(objects: DetectedObject[]): RiskFactor[] {
    const risks: RiskFactor[] = [];

    for (const obj of objects) {
      const bbox = obj.bbox;
      const margin = 0.05; // 5% margin from edge

      // Object too close to left edge (potential incoming traffic)
      if (bbox.x < margin) {
        risks.push({
          type: 'lane_interference',
          severity: 'low',
          description: `${obj.class} detected near left boundary`,
          objectIds: [obj.id],
          confidence: obj.confidence,
        });
      }

      // Object approaching from right
      if (bbox.x + bbox.width > 1 - margin) {
        risks.push({
          type: 'lane_interference',
          severity: 'low',
          description: `${obj.class} detected near right boundary`,
          objectIds: [obj.id],
          confidence: obj.confidence,
        });
      }

      // Large object at bottom (close to camera = higher risk)
      const bottomProximity = (bbox.y + bbox.height) / this.config.screenHeight;
      if (bottomProximity > 0.9 && this.isVehicle(obj.class)) {
        risks.push({
          type: 'proximity',
          severity: 'medium',
          description: `Close proximity: ${obj.class} approaching`,
          objectIds: [obj.id],
          confidence: obj.confidence,
        });
      }
    }

    return risks;
  }

  /**
   * Analyze high-risk object combinations
   */
  private analyzeHighRiskCombinations(objects: DetectedObject[]): RiskFactor[] {
    const risks: RiskFactor[] = [];

    const vehicles = objects.filter(obj => this.isVehicle(obj.class));
    const pedestrians = objects.filter(obj => obj.class === 'person');
    const bicycles = objects.filter(obj => obj.class === 'bicycle');

    // Vehicle-pedestrian interaction
    for (const vehicle of vehicles) {
      for (const pedestrian of pedestrians) {
        const distance = this.calculateNormalizedDistance(vehicle.bbox, pedestrian.bbox);
        if (distance < this.config.proximityThreshold * 1.5) {
          risks.push({
            type: 'near_collision',
            severity: distance < this.config.nearCollisionThreshold ? 'critical' : 'high',
            description: `Vehicle-pedestrian proximity warning`,
            objectIds: [vehicle.id, pedestrian.id],
            confidence: Math.min(vehicle.confidence, pedestrian.confidence),
          });
        }
      }
    }

    // Vehicle-bicycle interaction
    for (const vehicle of vehicles) {
      for (const bicycle of bicycles) {
        const distance = this.calculateNormalizedDistance(vehicle.bbox, bicycle.bbox);
        if (distance < this.config.proximityThreshold * 1.5) {
          risks.push({
            type: 'near_collision',
            severity: distance < this.config.nearCollisionThreshold ? 'high' : 'medium',
            description: `Vehicle-bicycle proximity warning`,
            objectIds: [vehicle.id, bicycle.id],
            confidence: Math.min(vehicle.confidence, bicycle.confidence),
          });
        }
      }
    }

    return risks;
  }

  /**
   * Predict potential collisions based on trajectory extrapolation
   */
  private predictCollisions(
    obj: DetectedObject,
    tracked: TrackedObject,
    allObjects: DetectedObject[],
    _allTracked: Map<number, TrackedObject>
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    const positions = tracked.positions;
    if (positions.length < 5) return risks;

    // Simple linear extrapolation
    const recentPositions = positions.slice(-3);
    const velocity = {
      x: (recentPositions[2].bbox.x - recentPositions[0].bbox.x) / 2,
      y: (recentPositions[2].bbox.y - recentPositions[0].bbox.y) / 2,
    };

    // Predict future position (1 second ahead)
    const predictedBbox: BoundingBox = {
      x: Math.max(0, Math.min(1, obj.bbox.x + velocity.x)),
      y: Math.max(0, Math.min(1, obj.bbox.y + velocity.y)),
      width: obj.bbox.width,
      height: obj.bbox.height,
    };

    // Check if predicted position intersects with other objects
    for (const other of allObjects) {
      if (other.id === obj.id || other.trackId === obj.trackId) continue;

      const intersection = this.calculateIntersectionArea(predictedBbox, other.bbox);
      const union = this.calculateUnionArea(predictedBbox, other.bbox);
      const iou = intersection / union;

      if (iou > 0.3) {
        risks.push({
          type: 'crossing_path',
          severity: iou > 0.5 ? 'critical' : 'high',
          description: `Potential collision course: ${obj.class} may intersect with ${other.class}`,
          objectIds: [obj.id, other.id],
          confidence: iou * tracked.maxConfidence,
        });
      }
    }

    return risks;
  }

  /**
   * Calculate aggregated risk score from all risk factors
   */
  private calculateAggregateRisk(riskFactors: RiskFactor[]): number {
    if (riskFactors.length === 0) return 0;

    const severityWeights = {
      low: 0.25,
      medium: 0.5,
      high: 0.75,
      critical: 1.0,
    };

    let totalRisk = 0;
    let totalWeight = 0;

    for (const factor of riskFactors) {
      const weight = severityWeights[factor.severity];
      totalRisk += weight * factor.confidence;
      totalWeight += factor.confidence;
    }

    // Normalize to 0-100
    return totalWeight > 0 ? (totalRisk / totalWeight) * 100 : 0;
  }

  /**
   * Calculate normalized distance between two bounding boxes
   */
  private calculateNormalizedDistance(bbox1: BoundingBox, bbox2: BoundingBox): number {
    const center1 = { x: bbox1.x + bbox1.width / 2, y: bbox1.y + bbox1.height / 2 };
    const center2 = { x: bbox2.x + bbox2.width / 2, y: bbox2.y + bbox2.height / 2 };

    const dx = center1.x - center2.x;
    const dy = center1.y - center2.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate displacement between two bounding boxes
   */
  private calculateDisplacement(bbox1: BoundingBox, bbox2: BoundingBox): { x: number; y: number } {
    const center1 = { x: bbox1.x + bbox1.width / 2, y: bbox1.y + bbox1.height / 2 };
    const center2 = { x: bbox2.x + bbox2.width / 2, y: bbox2.y + bbox2.height / 2 };

    return {
      x: center1.x - center2.x,
      y: center1.y - center2.y,
    };
  }

  /**
   * Calculate intersection area of two bounding boxes
   */
  private calculateIntersectionArea(bbox1: BoundingBox, bbox2: BoundingBox): number {
    const x1 = Math.max(bbox1.x, bbox2.x);
    const y1 = Math.max(bbox1.y, bbox2.y);
    const x2 = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
    const y2 = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);

    if (x2 <= x1 || y2 <= y1) return 0;

    return (x2 - x1) * (y2 - y1);
  }

  /**
   * Calculate union area of two bounding boxes
   */
  private calculateUnionArea(bbox1: BoundingBox, bbox2: BoundingBox): number {
    const area1 = bbox1.width * bbox1.height;
    const area2 = bbox2.width * bbox2.height;
    const intersection = this.calculateIntersectionArea(bbox1, bbox2);

    return area1 + area2 - intersection;
  }

  /**
   * Get severity level based on distance
   */
  private getProximitySeverity(distance: number): 'low' | 'medium' | 'high' | 'critical' {
    if (distance < this.config.nearCollisionThreshold) return 'critical';
    if (distance < this.config.proximityThreshold * 0.8) return 'high';
    if (distance < this.config.proximityThreshold * 1.2) return 'medium';
    return 'low';
  }

  /**
   * Get severity level based on velocity change
   */
  private getVelocitySeverity(accelMagnitude: number): 'low' | 'medium' | 'high' | 'critical' {
    if (accelMagnitude > 0.15) return 'critical';
    if (accelMagnitude > 0.1) return 'high';
    if (accelMagnitude > 0.05) return 'medium';
    return 'low';
  }

  /**
   * Infer the type of proximity risk
   */
  private inferProximityType(obj1: DetectedObject, obj2: DetectedObject, distance: number): RiskType {
    const bothVehicles = this.isVehicle(obj1.class) && this.isVehicle(obj2.class);
    const hasPedestrian = obj1.class === 'person' || obj2.class === 'person';
    const hasBicycle = obj1.class === 'bicycle' || obj2.class === 'bicycle';

    if (distance < this.config.nearCollisionThreshold) {
      return 'near_collision';
    }

    if (hasPedestrian || hasBicycle) {
      return 'proximity';
    }

    return bothVehicles ? 'proximity' : 'proximity';
  }

  /**
   * Format description for proximity risk
   */
  private formatProximityDescription(
    obj1: DetectedObject,
    obj2: DetectedObject,
    distance: number,
    type: RiskType
  ): string {
    const normalizedDist = Math.round(distance * 100);
    
    if (type === 'near_collision') {
      return `Near-collision risk: ${obj1.class} and ${obj2.class} at ${normalizedDist}% proximity`;
    }
    
    return `Proximity alert: ${obj1.class} and ${obj2.class} at ${normalizedDist}% distance`;
  }

  /**
   * Calculate confidence for proximity risk
   */
  private calculateProximityConfidence(distance: number, conf1: number, conf2: number): number {
    const distFactor = Math.max(0.5, 1 - distance / 0.5);
    return (conf1 + conf2) / 2 * distFactor;
  }

  /**
   * Check if object class is a vehicle
   */
  private isVehicle(className: string): boolean {
    return ['car', 'truck', 'bus', 'motorcycle'].includes(className);
  }

  /**
   * Check if object is in dangerous zone (lower portion of screen, near center)
   */
  private isInDangerousZone(bbox: BoundingBox): boolean {
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    // Lower third of screen
    if (centerY < 0.66) return false;

    // Middle 60% horizontally
    if (centerX < 0.2 || centerX > 0.8) return false;

    return true;
  }

  /**
   * Match objects between frames using spatial overlap
   */
  private matchObjects(obj1: DetectedObject, obj2: DetectedObject): boolean {
    const iou = this.calculateIoU(obj1.bbox, obj2.bbox);
    return iou > 0.3;
  }

  /**
   * Calculate Intersection over Union
   */
  private calculateIoU(bbox1: BoundingBox, bbox2: BoundingBox): number {
    const intersection = this.calculateIntersectionArea(bbox1, bbox2);
    const union = this.calculateUnionArea(bbox1, bbox2);
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Update screen dimensions
   */
  updateScreenDimensions(width: number, height: number): void {
    this.config.screenWidth = width;
    this.config.screenHeight = height;
  }
}

/**
 * Calculate velocity and acceleration for tracked objects
 */
export function calculateObjectKinematics(positions: Array<{
  bbox: BoundingBox;
  timestamp: number;
}>): {
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
      const v1 = calculateVelocity(older);
      const v2 = calculateVelocity(newer);
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

function calculateVelocity(positions: Array<{ bbox: BoundingBox; timestamp: number }>): { x: number; y: number } {
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