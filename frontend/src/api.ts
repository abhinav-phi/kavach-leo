import type { ConjunctionAlert, PositionSeries, Satellite, ScreeningParams, ScreeningResult } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

const mapSatellite = (value: any): Satellite => ({
  name: value.name,
  noradId: value.norad_id,
  epoch: value.epoch,
  hoursSinceEpoch: value.hours_since_epoch,
  isIndianAsset: value.is_indian_asset,
});

const mapAlert = (value: any): ConjunctionAlert => ({
  id: value.id,
  satA: value.sat_a,
  satB: value.sat_b,
  minDistanceKm: value.min_distance_km,
  timeOfClosestApproach: value.time_of_closest_approach,
  relativeSpeedKms: value.relative_speed_kms,
  riskScore: value.risk_score,
  riskLevel: value.risk_level,
  scoreBreakdown: {
    proximityFactor: value.score_breakdown.proximity_factor,
    proximityWeight: value.score_breakdown.proximity_weight,
    closingSpeedFactor: value.score_breakdown.closing_speed_factor,
    closingSpeedWeight: value.score_breakdown.closing_speed_weight,
  },
  monitoringWindow: {
    start: value.monitoring_window.start,
    end: value.monitoring_window.end,
  },
});

const mapPositions = (value: any): Record<string, PositionSeries> => Object.fromEntries(
  Object.entries(value).map(([name, series]: [string, any]) => [name, {
    satelliteName: series.satellite_name,
    timestamps: series.timestamps,
    eciKm: series.eci_km,
  }]),
);

export async function fetchSatellites(): Promise<{ stale: boolean; satellites: Satellite[] }> {
  const response = await fetch(`${API_BASE}/api/satellites`);
  if (!response.ok) throw new Error("Satellite catalogue unavailable");
  const value = await response.json();
  return { stale: value.stale, satellites: value.satellites.map(mapSatellite) };
}

export async function runScreening(params: ScreeningParams): Promise<ScreeningResult> {
  const response = await fetch(`${API_BASE}/api/screen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      window_hours: params.windowHours,
      step_minutes: params.stepMinutes,
      threshold_km: params.thresholdKm,
      satellite_group: params.satelliteGroup,
    }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? "Screening failed");
  }
  const value = await response.json();
  return {
    generatedAt: value.generated_at,
    stale: value.stale,
    params: {
      windowHours: value.params.window_hours,
      stepMinutes: value.params.step_minutes,
      thresholdKm: value.params.threshold_km,
      satelliteGroup: value.params.satellite_group,
    },
    positions: mapPositions(value.positions),
    alerts: value.alerts.map(mapAlert),
  };
}
