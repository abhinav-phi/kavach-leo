"""SGP4 propagation helpers backed by Skyfield."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

import numpy as np
from skyfield.api import EarthSatellite, load


@dataclass(frozen=True)
class TLESatellite:
    name: str
    norad_id: str
    line1: str
    line2: str
    satellite: EarthSatellite
    is_indian_asset: bool = False


def parse_norad_id(line1: str) -> str:
    return line1[2:7].strip()


def is_indian_asset(name: str) -> bool:
    upper = name.upper()
    return any(token in upper for token in ("ASTROSAT", "CARTOSAT", "RISAT", "EOS", "IRNSS", "NAVIC", "GSAT"))


def build_satellites(records: Iterable[list[str]], indian_names: set[str] | None = None) -> list[TLESatellite]:
    timescale = load.timescale()
    indian_names = {name.upper() for name in (indian_names or set())}
    result: list[TLESatellite] = []
    for record in records:
        if len(record) < 3 or not record[1].startswith("1 ") or not record[2].startswith("2 "):
            continue
        name, line1, line2 = record[:3]
        try:
            sat = EarthSatellite(line1, line2, name, timescale)
        except (ValueError, TypeError):
            continue
        result.append(TLESatellite(name=name.strip(), norad_id=parse_norad_id(line1), line1=line1, line2=line2, satellite=sat, is_indian_asset=name.upper() in indian_names or is_indian_asset(name)))
    return result


def epoch_datetime(satellite: TLESatellite) -> datetime:
    value = satellite.satellite.epoch.utc_datetime()
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def propagate_satellite(satellite: TLESatellite, times) -> np.ndarray:
    positions = np.asarray(satellite.satellite.at(times).position.km, dtype=float)
    if positions.ndim != 2 or positions.shape[0] != 3:
        raise ValueError(f"unexpected position shape for {satellite.name}: {positions.shape}")
    return positions


def refine_closest_approach(sat_a: TLESatellite, sat_b: TLESatellite, timescale, coarse_time, window_minutes: int = 15, step_seconds: int = 10) -> tuple[object, float, float]:
    offsets = np.arange(-window_minutes * 60, window_minutes * 60 + step_seconds, step_seconds, dtype=float)
    fine_times = timescale.tt_jd(coarse_time.tt + offsets / 86400.0)
    pos_a = propagate_satellite(sat_a, fine_times)
    pos_b = propagate_satellite(sat_b, fine_times)
    distances = np.linalg.norm(pos_a - pos_b, axis=0)
    index = int(np.argmin(distances))
    if index == 0:
        neighbor = 1
    elif index == len(distances) - 1:
        neighbor = index - 1
    else:
        neighbor = index + 1
    delta_seconds = abs((offsets[neighbor] - offsets[index]))
    relative_speed = float(np.linalg.norm((pos_a[:, neighbor] - pos_b[:, neighbor]) - (pos_a[:, index] - pos_b[:, index])) / max(delta_seconds, 1.0))
    return fine_times[index], float(distances[index]), relative_speed
