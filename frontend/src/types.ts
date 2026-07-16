export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Satellite {
  name: string;
  noradId: string;
  epoch: string;
  hoursSinceEpoch: number;
  isIndianAsset: boolean;
}

export interface PositionSeries {
  satelliteName: string;
  timestamps: string[];
  eciKm: number[][];
}

export interface ScoreBreakdown {
  proximityFactor: number;
  proximityWeight: number;
  closingSpeedFactor: number;
  closingSpeedWeight: number;
}

export interface ConjunctionAlert {
  id: string;
  satA: string;
  satB: string;
  minDistanceKm: number;
  timeOfClosestApproach: string;
  relativeSpeedKms: number;
  riskScore: number;
  riskLevel: RiskLevel;
  scoreBreakdown: ScoreBreakdown;
  monitoringWindow: { start: string; end: string };
}

export interface ScreeningParams {
  windowHours: number;
  stepMinutes: number;
  thresholdKm: number;
  satelliteGroup: string;
}

export interface ScreeningResult {
  generatedAt: string;
  stale: boolean;
  params: ScreeningParams;
  positions: Record<string, PositionSeries>;
  alerts: ConjunctionAlert[];
}
