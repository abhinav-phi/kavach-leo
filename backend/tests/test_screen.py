from datetime import datetime, timedelta, timezone

import numpy as np

from backend.screen import screen_positions, stable_alert_id


def test_pairwise_screening_flags_and_sorts_alerts():
    timestamps = [datetime(2026, 7, 16, tzinfo=timezone.utc) + timedelta(minutes=i) for i in range(3)]
    positions = {
        "ALPHA": np.array([[7000, 7000, 7000], [0, 0, 0], [0, 0, 0]], dtype=float),
        "BRAVO": np.array([[7040, 7010, 7040], [0, 0, 0], [0, 0, 0]], dtype=float),
        "FAR": np.array([[8000, 8000, 8000], [0, 0, 0], [0, 0, 0]], dtype=float),
    }
    alerts = screen_positions(positions, timestamps, threshold_km=50, step_seconds=60)
    assert len(alerts) == 1
    assert alerts[0]["sat_a"] == "ALPHA"
    assert alerts[0]["sat_b"] == "BRAVO"
    assert alerts[0]["min_distance_km"] == 10.0
    assert alerts[0]["id"] == stable_alert_id("ALPHA", "BRAVO")


def test_alert_id_is_order_independent():
    assert stable_alert_id("ALPHA", "BRAVO") == stable_alert_id("BRAVO", "ALPHA")
