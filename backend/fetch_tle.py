"""CelesTrak ingestion and local cache management.

The cache is deliberately plain text so a demo can be inspected or repaired by
hand. Live fetches are gated by the two-hour CelesTrak update cadence.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import requests

CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php"
MIN_REFETCH_INTERVAL_HOURS = 2
DEFAULT_GROUP = "starlink"
DEFAULT_CONSTELLATION_CAP = 15

# These are stable, long-established Indian spacecraft catalog IDs. The fetch
# routine still treats them as optional: catalogs change and one missing object
# must never prevent the rest of the working set from loading.
DEFAULT_INDIAN_NORAD_IDS = ("40930", "39635", "41948", "43286", "44804")


def cache_is_fresh(meta_path: str | Path = "data/tle_cache_meta.json", min_hours: float = MIN_REFETCH_INTERVAL_HOURS) -> bool:
    try:
        meta = json.loads(Path(meta_path).read_text(encoding="utf-8"))
        fetched_at = datetime.fromisoformat(meta["fetched_at"])
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=timezone.utc)
        age_hours = (datetime.now(timezone.utc) - fetched_at).total_seconds() / 3600
        return age_hours < min_hours
    except (FileNotFoundError, KeyError, ValueError, TypeError, OSError):
        return False


def cache_age_minutes(meta_path: str | Path = "data/tle_cache_meta.json") -> int | None:
    try:
        meta = json.loads(Path(meta_path).read_text(encoding="utf-8"))
        fetched_at = datetime.fromisoformat(meta["fetched_at"])
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=timezone.utc)
        return max(0, round((datetime.now(timezone.utc) - fetched_at).total_seconds() / 60))
    except (FileNotFoundError, KeyError, ValueError, TypeError, OSError):
        return None


def _parse_tle_response(text: str) -> list[list[str]]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return [lines[i : i + 3] for i in range(0, len(lines) - 2, 3) if lines[i + 1].startswith("1 ") and lines[i + 2].startswith("2 ")]


def fetch_group(group: str, timeout: int = 15) -> list[list[str]]:
    response = requests.get(CELESTRAK_URL, params={"GROUP": group, "FORMAT": "tle"}, timeout=timeout)
    if response.status_code != 200:
        raise RuntimeError(f"CelesTrak returned HTTP {response.status_code} for GROUP={group}")
    records = _parse_tle_response(response.text)
    if not records:
        raise ValueError(f"CelesTrak returned no valid TLE records for GROUP={group}")
    return records


def fetch_by_norad_id(norad_id: str, timeout: int = 15) -> list[str]:
    response = requests.get(CELESTRAK_URL, params={"CATNR": norad_id, "FORMAT": "tle"}, timeout=timeout)
    if response.status_code != 200:
        raise RuntimeError(f"CelesTrak returned HTTP {response.status_code} for CATNR={norad_id}")
    records = _parse_tle_response(response.text)
    if not records:
        raise ValueError(f"No legacy-TLE data for CATNR={norad_id} (possible 6-digit catalog ID)")
    return records[0]


def build_working_set(
    constellation_group: str = DEFAULT_GROUP,
    constellation_cap: int = DEFAULT_CONSTELLATION_CAP,
    indian_norad_ids: Iterable[str] | None = None,
) -> list[list[str]]:
    records = fetch_group(constellation_group)[:constellation_cap]
    for norad_id in indian_norad_ids or DEFAULT_INDIAN_NORAD_IDS:
        try:
            records.append(fetch_by_norad_id(norad_id))
        except (requests.RequestException, RuntimeError, ValueError):
            continue
    return records


def cache_to_disk(records: Iterable[list[str]], path: str | Path = "data/tle_cache.txt", meta_path: str | Path = "data/tle_cache_meta.json", group: str = DEFAULT_GROUP) -> dict:
    records = list(records)
    cache_path = Path(path)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text("".join(f"{name}\n{line1}\n{line2}\n" for name, line1, line2 in records), encoding="utf-8")
    metadata = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "group": group,
        "count": len(records),
        "schema_version": "1",
    }
    meta_path = Path(meta_path)
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def load_cache(path: str | Path = "data/tle_cache.txt") -> list[list[str]]:
    cache_path = Path(path)
    if not cache_path.exists():
        return []
    return _parse_tle_response(cache_path.read_text(encoding="utf-8"))


def refresh_cache(data_dir: str | Path = "data", group: str = DEFAULT_GROUP, constellation_cap: int = DEFAULT_CONSTELLATION_CAP) -> dict:
    data_dir = Path(data_dir)
    if cache_is_fresh(data_dir / "tle_cache_meta.json"):
        return json.loads((data_dir / "tle_cache_meta.json").read_text(encoding="utf-8"))
    records = build_working_set(group, constellation_cap)
    return cache_to_disk(records, data_dir / "tle_cache.txt", data_dir / "tle_cache_meta.json", group)
