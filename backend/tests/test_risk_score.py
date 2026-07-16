from datetime import datetime, timezone

import pytest

from backend.risk_score import compute_risk_score, monitoring_window, score_breakdown


def test_high_score_combines_proximity_and_speed():
    score, level = compute_risk_score(5, 15, threshold_km=50)
    assert score == 93.0
    assert level == "HIGH"


def test_score_is_clamped_for_safe_inputs():
    score, level = compute_risk_score(80, -1, threshold_km=50)
    assert score == 0.0
    assert level == "LOW"
    assert score_breakdown(80, -1)["proximity_factor"] == 0.0


def test_monitoring_window_scales_by_risk():
    point = datetime(2026, 7, 16, 12, tzinfo=timezone.utc)
    start, end = monitoring_window(point, "HIGH")
    assert start.endswith("11:15:00+00:00")
    assert end.endswith("12:45:00+00:00")


def test_unknown_risk_level_is_rejected():
    with pytest.raises(ValueError):
        monitoring_window(datetime.now(timezone.utc), "UNKNOWN")
