"""FastAPI application for ARGUS-LEO."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from skyfield.api import load

from .fetch_tle import cache_age_minutes, cache_is_fresh, cache_to_disk, load_cache, refresh_cache
from .models import ConjunctionAlert, HealthResponse, PositionSeries, ScreeningRequest, Satellite
from .propagate import TLESatellite, build_satellites, epoch_datetime, propagate_satellite, refine_closest_approach
from .screen import screen_positions

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CACHE_PATH = DATA_DIR / "tle_cache.txt"
META_PATH = DATA_DIR / "tle_cache_meta.json"

app = FastAPI(title="ARGUS-LEO API", version="0.1.0", description="Transparent, cached LEO conjunction screening for triage and education.")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def _records() -> list[list[str]]:
    return load_cache(CACHE_PATH)


def _skyfield_satellites() -> list[TLESatellite]:
    return build_satellites(_records())


def _stale() -> bool:
    return not cache_is_fresh(META_PATH)


def _iso(value) -> str:
    if hasattr(value, "utc_iso"):
        return value.utc_iso().replace("Z", "+00:00")
    if isinstance(value, datetime):
        return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).isoformat()
    return str(value)


def _satellite_response(satellite: TLESatellite) -> Satellite:
    epoch = epoch_datetime(satellite)
    hours_since_epoch = (datetime.now(timezone.utc) - epoch).total_seconds() / 3600
    return Satellite(name=satellite.name, norad_id=satellite.norad_id, tle_line1=satellite.line1, tle_line2=satellite.line2, epoch=epoch, hours_since_epoch=round(hours_since_epoch, 2), is_indian_asset=satellite.is_indian_asset)


def _screen(request: ScreeningRequest) -> dict:
    satellites = _skyfield_satellites()
    if not satellites:
        raise HTTPException(status_code=503, detail="No valid TLE cache found. Use POST /api/refresh-tle first.")
    timescale = load.timescale()
    now = datetime.now(timezone.utc)
    timestamps = [now.timestamp() + index * request.step_minutes * 60 for index in range(int(request.window_hours * 60 / request.step_minutes) + 1)]
    skyfield_times = timescale.utc([datetime.fromtimestamp(value, timezone.utc) for value in timestamps])
    positions: dict[str, np.ndarray] = {}
    serialized_positions: dict[str, PositionSeries] = {}
    valid_satellites: list[TLESatellite] = []
    for satellite in satellites:
        try:
            position = propagate_satellite(satellite, skyfield_times)
        except Exception:
            continue
        valid_satellites.append(satellite)
        positions[satellite.name] = position
        serialized_positions[satellite.name] = PositionSeries(satellite_name=satellite.name, timestamps=[datetime.fromtimestamp(value, timezone.utc) for value in timestamps], eci_km=position.T.T.round(3).tolist())
    if not positions:
        raise HTTPException(status_code=422, detail="No cached TLE could be propagated.")
    alerts = screen_positions(positions, [datetime.fromtimestamp(value, timezone.utc) for value in timestamps], request.threshold_km, request.step_minutes * 60)
    # Fine refinement is only performed after the cheap coarse pass identifies a
    # candidate. This keeps a normal 20-satellite run fast.
    by_name = {satellite.name: satellite for satellite in valid_satellites}
    for alert in alerts:
        try:
            coarse_value = alert["time_of_closest_approach"]
            if isinstance(coarse_value, str):
                coarse_value = datetime.fromisoformat(coarse_value)
            coarse_time = timescale.utc(coarse_value)
            fine_time, distance, relative_speed = refine_closest_approach(by_name[alert["sat_a"]], by_name[alert["sat_b"]], timescale, coarse_time)
            alert["time_of_closest_approach"] = datetime.fromisoformat(_iso(fine_time))
            alert["min_distance_km"] = round(distance, 2)
            alert["relative_speed_kms"] = round(relative_speed, 4)
            from .risk_score import compute_risk_score, monitoring_window, score_breakdown
            score, level = compute_risk_score(distance, relative_speed, request.threshold_km)
            alert["risk_score"] = score
            alert["risk_level"] = level
            alert["score_breakdown"] = score_breakdown(distance, relative_speed, request.threshold_km)
            start, end = monitoring_window(alert["time_of_closest_approach"], level)
            alert["monitoring_window"] = {"start": start, "end": end}
        except (KeyError, ValueError, TypeError):
            continue
    return {"generated_at": datetime.now(timezone.utc), "stale": _stale(), "params": request, "positions": serialized_positions, "alerts": [ConjunctionAlert.model_validate(alert) for alert in alerts]}


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", tle_cache_age_minutes=cache_age_minutes(META_PATH))


@app.get("/api/satellites", response_model=dict)
def satellites() -> dict:
    return {"generated_at": datetime.now(timezone.utc), "stale": _stale(), "satellites": [_satellite_response(satellite) for satellite in _skyfield_satellites()]}


@app.post("/api/refresh-tle", response_model=dict)
def refresh_tle() -> dict:
    try:
        metadata = refresh_cache(DATA_DIR)
    except Exception as exc:
        if not _records():
            raise HTTPException(status_code=502, detail=f"Live TLE fetch failed and no cache is available: {exc}") from exc
        metadata = json.loads(META_PATH.read_text(encoding="utf-8"))
        metadata["stale"] = True
    return {"status": "ok", "metadata": metadata, "stale": not cache_is_fresh(META_PATH)}


@app.post("/api/screen", response_model=dict)
def screen(request: ScreeningRequest) -> dict:
    return _screen(request)


@app.get("/api/alerts/{alert_id}", response_model=ConjunctionAlert)
def get_alert(alert_id: str, request: ScreeningRequest | None = None) -> ConjunctionAlert:
    result = _screen(request or ScreeningRequest())
    for alert in result["alerts"]:
        if alert.id == alert_id:
            return alert
    raise HTTPException(status_code=404, detail="Alert not found in the current screening run")
