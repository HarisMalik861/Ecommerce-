"""
Dataset registry: separate CSV files per upload, single active dataset for training.
"""

from __future__ import annotations

import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import Any

import pandas as pd

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR = os.path.join(BACKEND_DIR, "datasets")
REGISTRY_PATH = os.path.join(DATASETS_DIR, "registry.json")
BASELINE_CSV = os.path.join(BACKEND_DIR, "daraz_multicategory_pakistan_500k.csv")
BASELINE_ID = "baseline-500k"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_dirs() -> None:
    os.makedirs(DATASETS_DIR, exist_ok=True)


def _read_registry_raw() -> dict[str, Any]:
    _ensure_dirs()
    if not os.path.exists(REGISTRY_PATH):
        return {"activeId": None, "datasets": []}
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        return {"activeId": None, "datasets": []}
    data.setdefault("activeId", None)
    data.setdefault("datasets", [])
    return data


def _write_registry(data: dict[str, Any]) -> None:
    _ensure_dirs()
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _count_csv_rows(csv_path: str) -> int:
    """Count data rows without loading the full CSV into memory."""
    try:
        with open(csv_path, "rb") as handle:
            # Subtract header line when present.
            line_count = sum(1 for _ in handle)
        return max(0, line_count - 1)
    except Exception:
        return 0


def _dataset_csv_path(dataset_id: str) -> str:
    return os.path.join(DATASETS_DIR, f"{dataset_id}.csv")


def _find_dataset(registry: dict[str, Any], dataset_id: str) -> dict[str, Any] | None:
    for item in registry.get("datasets", []):
        if item.get("id") == dataset_id:
            return item
    return None


def _adopt_root_artifacts_as_cache(dataset_id: str) -> None:
    """If the active dataset has no cache but root artifacts exist, seed it."""
    try:
        from model_cache import (
            REQUIRED_ARTIFACTS,
            has_cached_model,
            save_cache,
        )

        if has_cached_model(dataset_id):
            return
        has_all = all(
            os.path.exists(os.path.join(BACKEND_DIR, name))
            for name in REQUIRED_ARTIFACTS
        )
        if has_all:
            save_cache(dataset_id)
    except Exception:
        pass


def ensure_registry_seeded() -> dict[str, Any]:
    """Create registry and seed baseline dataset if missing.

    Also adopts any pre-existing model artifacts at the Backend/ root as the
    cache for the currently active dataset (so re-activating doesn't retrain).
    """
    _ensure_dirs()
    registry = _read_registry_raw()

    if not registry.get("datasets"):
        if not os.path.exists(BASELINE_CSV):
            raise FileNotFoundError(
                f"Baseline dataset not found at {BASELINE_CSV}. "
                "Run generate_multicategory_dataset.py first."
            )

        baseline_dest = _dataset_csv_path(BASELINE_ID)
        if not os.path.exists(baseline_dest):
            shutil.copy2(BASELINE_CSV, baseline_dest)

        rows = _count_csv_rows(baseline_dest)
        size_bytes = os.path.getsize(baseline_dest)
        baseline_entry = {
            "id": BASELINE_ID,
            "fileName": "daraz_multicategory_pakistan_500k.csv",
            "originalName": "daraz_multicategory_pakistan_500k.csv",
            "rows": rows,
            "sizeBytes": size_bytes,
            "isBaseline": True,
            "uploadedAt": _utc_now_iso(),
        }
        registry = {"activeId": BASELINE_ID, "datasets": [baseline_entry]}
        _write_registry(registry)

    active_id = registry.get("activeId")
    if active_id:
        _adopt_root_artifacts_as_cache(str(active_id))

    return registry


def list_datasets() -> list[dict[str, Any]]:
    registry = ensure_registry_seeded()
    active_id = registry.get("activeId")

    try:
        from model_cache import has_cached_model
    except Exception:
        has_cached_model = None  # type: ignore[assignment]

    items = []
    for ds in registry.get("datasets", []):
        csv_path = _dataset_csv_path(ds["id"])
        rows = ds.get("rows")
        if os.path.exists(csv_path):
            rows = _count_csv_rows(csv_path)
        items.append(
            {
                "id": ds["id"],
                "fileName": ds.get("fileName", f"{ds['id']}.csv"),
                "originalName": ds.get("originalName", ds.get("fileName", "")),
                "rows": rows,
                "sizeBytes": ds.get("sizeBytes", 0),
                "isBaseline": bool(ds.get("isBaseline", False)),
                "uploadedAt": ds.get("uploadedAt", ""),
                "isActive": ds["id"] == active_id,
                "hasCachedModel": bool(has_cached_model(ds["id"]))
                if has_cached_model
                else False,
            }
        )
    return items


def get_active_id() -> str:
    registry = ensure_registry_seeded()
    active_id = registry.get("activeId")
    if not active_id:
        raise RuntimeError("No active dataset configured in registry.")
    return str(active_id)


def get_active_path() -> str:
    active_id = get_active_id()
    csv_path = _dataset_csv_path(active_id)
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Active dataset file not found: {csv_path}")
    return os.path.abspath(csv_path)


MONTH_ORDER = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


def get_dataset_year_info() -> dict[str, int]:
    """Historical year bounds and the next-year forecast target (max + 1)."""
    csv_path = get_active_path()
    years = pd.to_numeric(
        pd.read_csv(csv_path, usecols=["Year"])["Year"], errors="coerce"
    ).dropna().astype(int)
    if years.empty:
        return {"minYear": 2020, "maxYear": 2025, "forecastYear": 2026}
    min_y, max_y = int(years.min()), int(years.max())
    return {"minYear": min_y, "maxYear": max_y, "forecastYear": max_y + 1}


def get_dataset_months() -> list[str]:
    """Distinct months in the active dataset, Jan–Dec order."""
    csv_path = get_active_path()
    raw = (
        pd.read_csv(csv_path, usecols=["Month"])["Month"]
        .dropna()
        .astype(str)
        .str.strip()
        .unique()
        .tolist()
    )
    order = {m: i for i, m in enumerate(MONTH_ORDER)}
    present = [m for m in MONTH_ORDER if m in raw]
    extras = sorted([m for m in raw if m not in order], key=str.lower)
    return present + extras if present else list(MONTH_ORDER)


def register_dataset(src_csv: str, original_name: str) -> str:
    """Copy src_csv into datasets/<id>.csv and append registry entry."""
    ensure_registry_seeded()
    if not os.path.exists(src_csv):
        raise FileNotFoundError(f"Source CSV not found: {src_csv}")

    dataset_id = uuid.uuid4().hex
    dest_path = _dataset_csv_path(dataset_id)
    shutil.copy2(src_csv, dest_path)

    rows = _count_csv_rows(dest_path)
    size_bytes = os.path.getsize(dest_path)
    safe_name = os.path.basename(original_name or f"dataset_{dataset_id}.csv")

    entry = {
        "id": dataset_id,
        "fileName": f"{dataset_id}.csv",
        "originalName": safe_name,
        "rows": rows,
        "sizeBytes": size_bytes,
        "isBaseline": False,
        "uploadedAt": _utc_now_iso(),
    }

    registry = _read_registry_raw()
    registry.setdefault("datasets", []).append(entry)
    _write_registry(registry)
    return dataset_id


def set_active(dataset_id: str) -> str:
    """Set active dataset id. Returns previous active id."""
    registry = ensure_registry_seeded()
    if not _find_dataset(registry, dataset_id):
        raise ValueError(f"Unknown dataset id: {dataset_id}")

    previous_id = registry.get("activeId")
    registry["activeId"] = dataset_id
    _write_registry(registry)
    return str(previous_id) if previous_id else ""


def delete_dataset(dataset_id: str) -> None:
    registry = ensure_registry_seeded()
    entry = _find_dataset(registry, dataset_id)
    if not entry:
        raise ValueError(f"Unknown dataset id: {dataset_id}")

    if bool(entry.get("isBaseline")):
        raise ValueError("Cannot delete the baseline dataset.")

    if registry.get("activeId") == dataset_id:
        raise ValueError("Cannot delete the active dataset. Switch to another dataset first.")

    csv_path = _dataset_csv_path(dataset_id)
    if os.path.exists(csv_path):
        os.remove(csv_path)

    registry["datasets"] = [
        ds for ds in registry.get("datasets", []) if ds.get("id") != dataset_id
    ]
    _write_registry(registry)


def get_dataset_meta(dataset_id: str) -> dict[str, Any]:
    registry = ensure_registry_seeded()
    entry = _find_dataset(registry, dataset_id)
    if not entry:
        raise ValueError(f"Unknown dataset id: {dataset_id}")
    active_id = registry.get("activeId")
    return {
        **entry,
        "isActive": entry.get("id") == active_id,
    }
