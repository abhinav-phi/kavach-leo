"""Pairwise conjunction screening over propagated ECI positions."""

from __future__ import annotations

import hashlib
from itertools import combinations
from typing import Mapping, Sequence

import numpy as np

from .risk_score import compute_risk_score, monitoring_window, score_breakdown


def stable_alert_id(sat_a: str, sat_b: str) -> str:
    pair = "|".join(sorted((sat_a, sat_b)))
    return hashlib.sha256(pair.encode("utf-8")).hexdigest()[:12]


def relative_speed_at_index(pos_a: np.ndarray, pos_b: np.ndarray, index: int, step_seconds: float) -> float:
    if pos_a.shape[1] == 1:
        return 0.0
    left = max(0, index - 1)
    right = min(pos_a.shape[1] - 1, index + 1)
    elapsed = max((right - left) * step_seconds, 1.0)
    return float(np.linalg.norm((pos_a[:, right] - pos_b[:, right]) - (pos_a[:, left] - pos_b[:, left])) / elapsed)


def screen_positions(positions: Mapping[str, np.ndarray], timestamps: Sequence, threshold_km: float = 50.0, step_seconds: float = 300.0) -> list[dict]:
    if threshold_km <= 0:
        raise ValueError("threshold_km must be positive")
    alerts: list[dict] = []
    for (name_a, pos_a), (name_b, pos_b) in combinations(positions.items(), 2):
        if pos_a.shape != pos_b.shape or pos_a.shape[0] != 3:
            raise ValueError("all position arrays must have shape (3, N)")
        distances = np.linalg.norm(pos_a - pos_b, axis=0)
        coarse_index = int(np.argmin(distances))
        min_distance = float(distances[coarse_index])
        if min_distance >= threshold_km:
            continue
        relative_speed = relative_speed_at_index(pos_a, pos_b, coarse_index, step_seconds)
        score, level = compute_risk_score(min_distance, relative_speed, threshold_km)
        closest_time = timestamps[coarse_index]
        start, end = monitoring_window(closest_time, level)
        alerts.append({
            "id": stable_alert_id(name_a, name_b),
            "sat_a": name_a,
            "sat_b": name_b,
            "min_distance_km": round(min_distance, 2),
            "time_of_closest_approach": closest_time,
            "relative_speed_kms": round(relative_speed, 4),
            "risk_score": score,
            "risk_level": level,
            "score_breakdown": score_breakdown(min_distance, relative_speed, threshold_km),
            "monitoring_window": {"start": start, "end": end},
        })
    return sorted(alerts, key=lambda alert: alert["risk_score"], reverse=True)
