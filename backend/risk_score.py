"""Explainable conjunction scoring."""

from __future__ import annotations

from datetime import datetime, timedelta


def score_factors(min_distance_km: float, relative_speed_kms: float, threshold_km: float = 50.0, ref_max_speed_kms: float = 15.0) -> tuple[float, float]:
    if threshold_km <= 0 or ref_max_speed_kms <= 0:
        raise ValueError("threshold_km and ref_max_speed_kms must be positive")
    proximity = max(0.0, min(1.0, (threshold_km - min_distance_km) / threshold_km))
    closing_speed = max(0.0, min(1.0, relative_speed_kms / ref_max_speed_kms))
    return proximity, closing_speed


def compute_risk_score(min_distance_km: float, relative_speed_kms: float, threshold_km: float = 50.0, ref_max_speed_kms: float = 15.0) -> tuple[float, str]:
    proximity, closing_speed = score_factors(min_distance_km, relative_speed_kms, threshold_km, ref_max_speed_kms)
    score = round((proximity * 0.7 + closing_speed * 0.3) * 100, 1)
    level = "HIGH" if score >= 70 else "MEDIUM" if score >= 35 else "LOW"
    return score, level


def score_breakdown(min_distance_km: float, relative_speed_kms: float, threshold_km: float = 50.0, ref_max_speed_kms: float = 15.0) -> dict[str, float]:
    proximity, closing_speed = score_factors(min_distance_km, relative_speed_kms, threshold_km, ref_max_speed_kms)
    return {
        "proximity_factor": round(proximity, 4),
        "proximity_weight": 0.7,
        "closing_speed_factor": round(closing_speed, 4),
        "closing_speed_weight": 0.3,
    }


def monitoring_window(time_of_closest_approach: datetime, risk_level: str) -> tuple[str, str]:
    try:
        buffer_minutes = {"LOW": 20, "MEDIUM": 30, "HIGH": 45}[risk_level]
    except KeyError as exc:
        raise ValueError(f"unknown risk level: {risk_level}") from exc
    delta = timedelta(minutes=buffer_minutes)
    return (time_of_closest_approach - delta).isoformat(), (time_of_closest_approach + delta).isoformat()
