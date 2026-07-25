"""
Per-dataset model artifact cache.

Each dataset id has its own folder under Backend/models/<id>/ containing the
trained artifacts. When a dataset is re-activated and a cache exists, we just
swap files into the working location instead of retraining.
"""

from __future__ import annotations

import os
import shutil
from typing import Iterable

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BACKEND_DIR, "models")

# Files in the Backend/ root that make up a "trained state".
ARTIFACT_FILES: tuple[str, ...] = (
    "sales_trend_model.json",
    "label_encoders.pkl",
    "feature_columns.json",
    "model_meta.json",
    "future_sales_predictions.csv",
    "top_20_products.csv",
    "feature_importance.png",
)

# Subset that must be present for a cache to be considered valid.
REQUIRED_ARTIFACTS: tuple[str, ...] = (
    "sales_trend_model.json",
    "label_encoders.pkl",
    "feature_columns.json",
    "model_meta.json",
    "future_sales_predictions.csv",
)


def _ensure_models_dir() -> None:
    os.makedirs(MODELS_DIR, exist_ok=True)


def get_cache_dir(dataset_id: str) -> str:
    return os.path.join(MODELS_DIR, dataset_id)


def has_cached_model(dataset_id: str) -> bool:
    cache_dir = get_cache_dir(dataset_id)
    if not os.path.isdir(cache_dir):
        return False
    return all(
        os.path.exists(os.path.join(cache_dir, name)) for name in REQUIRED_ARTIFACTS
    )


def save_cache(dataset_id: str) -> list[str]:
    """Copy current Backend/ artifacts into the cache dir for this dataset."""
    _ensure_models_dir()
    cache_dir = get_cache_dir(dataset_id)
    os.makedirs(cache_dir, exist_ok=True)

    saved: list[str] = []
    for name in ARTIFACT_FILES:
        src = os.path.join(BACKEND_DIR, name)
        if not os.path.exists(src):
            continue
        dest = os.path.join(cache_dir, name)
        shutil.copy2(src, dest)
        saved.append(name)
    return saved


def load_cache(dataset_id: str) -> list[str]:
    """Copy cached artifacts back into Backend/ root. Raises if cache invalid."""
    if not has_cached_model(dataset_id):
        raise FileNotFoundError(
            f"No cached model artifacts for dataset {dataset_id}"
        )

    cache_dir = get_cache_dir(dataset_id)
    restored: list[str] = []
    for name in ARTIFACT_FILES:
        src = os.path.join(cache_dir, name)
        if not os.path.exists(src):
            continue
        dest = os.path.join(BACKEND_DIR, name)
        shutil.copy2(src, dest)
        restored.append(name)
    return restored


def delete_cache(dataset_id: str) -> bool:
    cache_dir = get_cache_dir(dataset_id)
    if not os.path.isdir(cache_dir):
        return False
    shutil.rmtree(cache_dir, ignore_errors=True)
    return True


def list_cached_ids() -> Iterable[str]:
    if not os.path.isdir(MODELS_DIR):
        return []
    return [
        entry
        for entry in os.listdir(MODELS_DIR)
        if os.path.isdir(os.path.join(MODELS_DIR, entry))
    ]
