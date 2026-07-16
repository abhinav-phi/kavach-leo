"""Pydantic models shared by the FastAPI boundary."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class Satellite(BaseModel):
    name: str
    norad_id: str = Field(pattern=r"^\d{1,6}$")
    tle_line1: str = Field(min_length=1)
    tle_line2: str = Field(min_length=1)
    epoch: datetime
    hours_since_epoch: float
    is_indian_asset: bool


class PositionSeries(BaseModel):
    satellite_name: str
    timestamps: list[datetime]
    eci_km: list[list[float]]


class MonitoringWindow(BaseModel):
    start: datetime
    end: datetime


class ScoreBreakdown(BaseModel):
    proximity_factor: float = Field(ge=0, le=1)
    proximity_weight: float = 0.7
    closing_speed_factor: float = Field(ge=0, le=1)
    closing_speed_weight: float = 0.3


class ConjunctionAlert(BaseModel):
    id: str
    sat_a: str
    sat_b: str
    min_distance_km: float = Field(ge=0)
    time_of_closest_approach: datetime
    relative_speed_kms: float = Field(ge=0)
    risk_score: float = Field(ge=0, le=100)
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    score_breakdown: ScoreBreakdown
    monitoring_window: MonitoringWindow


class ScreeningRequest(BaseModel):
    window_hours: int = Field(default=24, ge=12, le=48)
    step_minutes: int = Field(default=5, ge=1, le=15)
    threshold_km: float = Field(default=50.0, ge=10.0, le=100.0)
    satellite_group: str = Field(default="starlink", min_length=1, max_length=32)


class HealthResponse(BaseModel):
    status: str
    tle_cache_age_minutes: int | None
