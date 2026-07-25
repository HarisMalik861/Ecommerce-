"""
Return distinct categorical values from the active dataset for UI dropdowns.
"""

from __future__ import annotations

import json
import sys

import pandas as pd

from dataset_registry import get_active_id, get_active_path, get_dataset_year_info, get_dataset_months

COLUMNS = [
    "Category",
    "Product_Name",
    "City",
    "Gender",
    "Color",
    "Sleeve_Type",
    "Material",
    "Price",
    "Discount_Pct",
    "Year",
    "Month",
]


def unique_sorted(series: pd.Series) -> list[str]:
    values = (
        series.dropna()
        .astype(str)
        .str.strip()
        .replace("", pd.NA)
        .dropna()
        .unique()
        .tolist()
    )
    return sorted(values, key=lambda v: v.lower())


def numeric_range(series: pd.Series) -> dict[str, float]:
    clean = pd.to_numeric(series, errors="coerce").dropna()
    if clean.empty:
        return {"min": 0.0, "max": 0.0}
    return {
        "min": float(round(float(clean.min()), 2)),
        "max": float(round(float(clean.max()), 2)),
    }


def build_options(category: str | None = None) -> dict:
    csv_path = get_active_path()
    df = pd.read_csv(csv_path, usecols=COLUMNS)

    cities = unique_sorted(df["City"])
    year_info = get_dataset_year_info()
    payload: dict = {
        "datasetId": get_active_id(),
        "cities": cities,
        "cityCount": len(cities),
        "years": sorted(
            int(v) for v in pd.to_numeric(df["Year"], errors="coerce").dropna().unique()
        ),
        "datasetYearMin": year_info["minYear"],
        "datasetYearMax": year_info["maxYear"],
        "forecastYear": year_info["forecastYear"],
        "months": get_dataset_months(),
        "productNames": [],
        "gender": [],
        "color": [],
        "sleeveType": [],
        "material": [],
        "categories": unique_sorted(df["Category"]),
        "ranges": {
            "price": numeric_range(df["Price"]),
            "discountPct": numeric_range(df["Discount_Pct"]),
        },
    }

    if category:
        scoped = df[df["Category"].astype(str).str.strip() == category]
        if scoped.empty:
            # Fall back to whole dataset if category filter misses.
            scoped = df
        payload["category"] = category
        payload["productNames"] = unique_sorted(scoped["Product_Name"])
        payload["gender"] = unique_sorted(scoped["Gender"])
        payload["color"] = unique_sorted(scoped["Color"])
        payload["sleeveType"] = unique_sorted(scoped["Sleeve_Type"])
        payload["material"] = unique_sorted(scoped["Material"])
        payload["ranges"] = {
            "price": numeric_range(scoped["Price"]),
            "discountPct": numeric_range(scoped["Discount_Pct"]),
        }
    else:
        payload["productNames"] = unique_sorted(df["Product_Name"])
        payload["gender"] = unique_sorted(df["Gender"])
        payload["color"] = unique_sorted(df["Color"])
        payload["sleeveType"] = unique_sorted(df["Sleeve_Type"])
        payload["material"] = unique_sorted(df["Material"])

    return payload


def main() -> None:
    category = None
    if len(sys.argv) > 1 and sys.argv[1].strip():
        category = sys.argv[1].strip()
    print(json.dumps(build_options(category)))


if __name__ == "__main__":
    main()
