"""
Return distinct categorical values from the active dataset for UI dropdowns.

Streams the CSV once (no full pandas load) and caches per datasetId+category so
Trends prediction forms stay fast after dataset switches.
"""

from __future__ import annotations

import csv
import json
import os
import sys
from pathlib import Path
from typing import Any

from dataset_registry import get_active_id, get_active_path

BACKEND_DIR = Path(__file__).resolve().parent
OPTIONS_CACHE_DIR = BACKEND_DIR / "datasets" / "options_cache"

MONTH_ORDER = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]

KNOWN_CATEGORIES = ["T-Shirt", "Jeans", "Shoes", "Socks", "Shorts"]
MAX_PRODUCT_NAMES = int(os.environ.get("OPTIONS_MAX_PRODUCT_NAMES", "2500"))


def _cache_path(dataset_id: str, category: str | None) -> Path:
    safe_cat = (category or "_all").replace("/", "_").replace("\\", "_").strip() or "_all"
    return OPTIONS_CACHE_DIR / f"{dataset_id}__{safe_cat}.json"


def _unique_sorted(values: set[str]) -> list[str]:
    return sorted((v for v in values if v), key=lambda v: v.lower())


def _read_cache(dataset_id: str, category: str | None) -> dict[str, Any] | None:
    path = _cache_path(dataset_id, category)
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, dict) and payload.get("datasetId") == dataset_id:
            return payload
    except Exception:
        return None
    return None


def _write_cache(dataset_id: str, category: str | None, payload: dict[str, Any]) -> None:
    OPTIONS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = _cache_path(dataset_id, category)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _empty_bucket() -> dict[str, Any]:
    return {
        "cities": set(),
        "genders": set(),
        "colors": set(),
        "sleeves": set(),
        "materials": set(),
        "months": set(),
        "years": set(),
        "product_names": set(),
        "price_min": float("inf"),
        "price_max": float("-inf"),
        "discount_min": float("inf"),
        "discount_max": float("-inf"),
        "rows": 0,
    }


def _finalize_bucket(
    *,
    dataset_id: str,
    bucket: dict[str, Any],
    all_categories: set[str],
    category: str | None,
) -> dict[str, Any]:
    year_list = sorted(bucket["years"])
    min_year = year_list[0] if year_list else 2020
    max_year = year_list[-1] if year_list else 2025
    months = bucket["months"]
    month_list = [m for m in MONTH_ORDER if m in months] + sorted(
        (m for m in months if m not in MONTH_ORDER), key=str.lower
    )
    product_list = _unique_sorted(bucket["product_names"])
    payload: dict[str, Any] = {
        "datasetId": dataset_id,
        "cacheHit": False,
        "cities": _unique_sorted(bucket["cities"]),
        "cityCount": len(bucket["cities"]),
        "years": year_list,
        "datasetYearMin": min_year,
        "datasetYearMax": max_year,
        "forecastYear": max_year + 1,
        "months": month_list or list(MONTH_ORDER),
        "productNames": product_list,
        "productNameCount": len(product_list),
        "productNamesTruncated": len(product_list) >= MAX_PRODUCT_NAMES,
        "gender": _unique_sorted(bucket["genders"]),
        "color": _unique_sorted(bucket["colors"]),
        "sleeveType": _unique_sorted(bucket["sleeves"]),
        "material": _unique_sorted(bucket["materials"]),
        "categories": _unique_sorted(all_categories),
        "ranges": {
            "price": {
                "min": float(round(bucket["price_min"], 2))
                if bucket["price_min"] != float("inf")
                else 0.0,
                "max": float(round(bucket["price_max"], 2))
                if bucket["price_max"] != float("-inf")
                else 0.0,
            },
            "discountPct": {
                "min": float(round(bucket["discount_min"], 2))
                if bucket["discount_min"] != float("inf")
                else 0.0,
                "max": float(round(bucket["discount_max"], 2))
                if bucket["discount_max"] != float("-inf")
                else 100.0,
            },
        },
    }
    if category:
        payload["category"] = category
    return payload


def _absorb_row(bucket: dict[str, Any], row: dict[str, str]) -> None:
    bucket["rows"] += 1
    city = (row.get("City") or "").strip()
    if city:
        bucket["cities"].add(city)
    gender = (row.get("Gender") or "").strip()
    if gender:
        bucket["genders"].add(gender)
    color = (row.get("Color") or "").strip()
    if color:
        bucket["colors"].add(color)
    sleeve = (row.get("Sleeve_Type") or "").strip()
    if sleeve:
        bucket["sleeves"].add(sleeve)
    material = (row.get("Material") or "").strip()
    if material:
        bucket["materials"].add(material)
    month = (row.get("Month") or "").strip()
    if month:
        bucket["months"].add(month)
    name = (row.get("Product_Name") or "").strip()
    if name and len(bucket["product_names"]) < MAX_PRODUCT_NAMES:
        bucket["product_names"].add(name)
    try:
        year = int(float(str(row.get("Year") or "").strip()))
        bucket["years"].add(year)
    except (TypeError, ValueError):
        pass
    try:
        price = float(str(row.get("Price") or "").replace(",", "").strip())
        bucket["price_min"] = min(bucket["price_min"], price)
        bucket["price_max"] = max(bucket["price_max"], price)
    except (TypeError, ValueError):
        pass
    try:
        discount = float(
            str(row.get("Discount_Pct") or "").replace("%", "").replace(",", "").strip()
        )
        bucket["discount_min"] = min(bucket["discount_min"], discount)
        bucket["discount_max"] = max(bucket["discount_max"], discount)
    except (TypeError, ValueError):
        pass


def build_all_option_caches() -> dict[str, Any]:
    """Single CSV pass → write caches for _all and each known category."""
    dataset_id = get_active_id()
    csv_path = get_active_path()

    all_bucket = _empty_bucket()
    by_category: dict[str, dict[str, Any]] = {
        cat: _empty_bucket() for cat in KNOWN_CATEGORIES
    }
    all_categories: set[str] = set()

    with open(csv_path, "r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            cat = (row.get("Category") or "").strip()
            if cat:
                all_categories.add(cat)
            _absorb_row(all_bucket, row)
            if cat in by_category:
                _absorb_row(by_category[cat], row)

    payloads: dict[str, dict[str, Any]] = {
        "_all": _finalize_bucket(
            dataset_id=dataset_id,
            bucket=all_bucket,
            all_categories=all_categories,
            category=None,
        )
    }
    for cat, bucket in by_category.items():
        payloads[cat] = _finalize_bucket(
            dataset_id=dataset_id,
            bucket=bucket if bucket["rows"] > 0 else all_bucket,
            all_categories=all_categories,
            category=cat,
        )

    for key, payload in payloads.items():
        _write_cache(dataset_id, None if key == "_all" else key, payload)

    return {
        "datasetId": dataset_id,
        "cachedCategories": list(payloads.keys()),
        "productNames": len(payloads["_all"]["productNames"]),
    }


def build_options(category: str | None = None, *, use_cache: bool = True) -> dict[str, Any]:
    dataset_id = get_active_id()
    category_filter = (category or "").strip() or None
    if use_cache:
        cached = _read_cache(dataset_id, category_filter)
        if cached is not None:
            cached = dict(cached)
            cached["cacheHit"] = True
            return cached

    # Build every category cache in one pass, then return the requested one.
    build_all_option_caches()
    cached = _read_cache(dataset_id, category_filter)
    if cached is not None:
        cached = dict(cached)
        cached["cacheHit"] = False
        return cached

    # Extremely defensive fallback.
    return {
        "datasetId": dataset_id,
        "cacheHit": False,
        "cities": [],
        "cityCount": 0,
        "years": [],
        "datasetYearMin": 2020,
        "datasetYearMax": 2025,
        "forecastYear": 2026,
        "months": list(MONTH_ORDER),
        "productNames": [],
        "gender": [],
        "color": [],
        "sleeveType": [],
        "material": [],
        "categories": [],
        "ranges": {
            "price": {"min": 0.0, "max": 0.0},
            "discountPct": {"min": 0.0, "max": 100.0},
        },
    }


def precompute_options_for_active_dataset() -> dict[str, Any]:
    return build_all_option_caches()


def main() -> None:
    category = None
    if len(sys.argv) > 1 and sys.argv[1].strip():
        category = sys.argv[1].strip()
    print(json.dumps(build_options(category)))


if __name__ == "__main__":
    main()
