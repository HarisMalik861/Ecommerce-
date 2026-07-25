"""
Generic prediction — rank top products in a category using dataset baselines.

Uses the same model, features, and forecast-year rule as predict_new_product_json.
For each unique product name in the category, builds a representative input profile
(median price/discount, modal categoricals) from the active dataset, runs monthly
predictions for the forecast year, and returns the top 3 by average potential score.
"""

from __future__ import annotations

import json
import pickle
import sys

import numpy as np
import pandas as pd
import xgboost as xgb

from dataset_registry import ensure_registry_seeded, get_active_path, get_dataset_months, get_dataset_year_info
from predict_new_product_json import (
    META_FILE,
    categorize_potential,
    normalize_input,
    prepare_features,
    _raw_to_predicted_sales_scalar,
)

MODEL_FILE = "sales_trend_model.json"
ENCODERS_FILE = "label_encoders.pkl"
FEATURES_FILE = "feature_columns.json"

CATEGORY_ALIASES = {
    "t-shirts": "T-Shirt",
    "t-shirt": "T-Shirt",
    "jeans": "Jeans",
    "shoes": "Shoes",
    "socks": "Socks",
    "shorts": "Shorts",
}


def resolve_category(raw: str) -> str | None:
    cleaned = str(raw or "").strip()
    if not cleaned:
        return None
    key = cleaned.lower().replace("_", "-")
    if key in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[key]
    title = cleaned.title().replace("T-Shirts", "T-Shirt")
    valid = {"T-Shirt", "Jeans", "Shoes", "Socks", "Shorts"}
    return title if title in valid else None


def _mode_value(series: pd.Series, default: str) -> str:
    values = series.dropna().astype(str).str.strip()
    values = values[values != ""]
    if values.empty:
        return default
    return str(values.mode().iloc[0])


def _median_value(series: pd.Series, default: float = 0.0) -> float:
    parsed = pd.to_numeric(series, errors="coerce").dropna()
    if parsed.empty:
        return default
    return float(parsed.median())


def build_baseline_payload(group: pd.DataFrame, category: str) -> dict:
    name = str(group["Product_Name"].iloc[0]).strip()
    is_combo = _mode_value(group["Combo_Item"], "Single").lower() == "combo"
    is_flash = int(_median_value(group["Is_Flash_Sale"], 0)) == 1
    return {
        "productName": name,
        "category": category,
        "price": _median_value(group["Price"], 1.0),
        "discountPct": _median_value(group["Discount_Pct"], 0.0),
        "city": _mode_value(group["City"], "Karachi"),
        "gender": _mode_value(group["Gender"], "Unisex"),
        "color": _mode_value(group["Color"], "Black"),
        "material": _mode_value(group["Material"], "Cotton"),
        "sleeveType": _mode_value(group["Sleeve_Type"], "Half Sleeve"),
        "isCombo": is_combo,
        "isFlashSale": is_flash,
    }


def score_product(
    payload: dict,
    *,
    model,
    label_encoders,
    feature_columns,
    sales_distribution,
    forecast_year: int,
    months: list[str],
) -> dict:
    monthly_predictions = []
    scores: list[float] = []
    sales_values: list[float] = []

    for month in months:
        month_payload = dict(payload)
        month_payload["month"] = month
        product = normalize_input(month_payload, forecast_year)

        x_df, discounted_price, price_cat = prepare_features(
            product, label_encoders, feature_columns
        )
        raw = float(model.predict(x_df)[0])
        predicted_sales = _raw_to_predicted_sales_scalar(raw)

        if sales_distribution is not None and len(sales_distribution) > 0:
            percentile = (
                (sales_distribution <= predicted_sales).sum()
                / len(sales_distribution)
                * 100
            )
            potential_score = float(min(99.9, percentile))
        else:
            potential_score = min(
                99.9, max(0.0, (predicted_sales / 40000.0) * 100)
            )

        scores.append(potential_score)
        sales_values.append(predicted_sales)
        monthly_predictions.append(
            {
                "month": month,
                "year": forecast_year,
                "prediction": {
                    "productName": product["Product_Name"],
                    "category": product["Category"],
                    "month": month,
                    "year": forecast_year,
                    "predictedSales": round(predicted_sales, 2),
                    "salesPotentialScore": round(potential_score, 2),
                    "salesPotentialCategory": categorize_potential(potential_score),
                    "discountedPrice": round(discounted_price, 2),
                    "priceCategory": price_cat,
                },
            }
        )

    avg_score = float(np.mean(scores)) if scores else 0.0
    total_sales = float(np.sum(sales_values))

    return {
        "productName": payload["productName"],
        "category": payload["category"],
        "salesPotentialScore": round(avg_score, 2),
        "salesPotentialCategory": categorize_potential(avg_score),
        "predictedSales": round(total_sales, 2),
        "monthlyPredictions": monthly_predictions,
        "baselineInputs": payload,
    }


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(json.dumps({"error": "Invalid input JSON"}))
        return

    category = resolve_category(payload.get("category"))
    if not category:
        print(json.dumps({"error": "A valid category is required."}))
        return

    top_n = int(payload.get("topN") or 3)
    top_n = max(1, min(top_n, 10))

    try:
        ensure_registry_seeded()
        csv_path = get_active_path()
        df = pd.read_csv(csv_path)
        year_info = get_dataset_year_info()
        months = list(get_dataset_months())
        forecast_year = int(year_info["forecastYear"])
        sales_distribution = df["Sales"].to_numpy()
    except Exception as exc:
        print(json.dumps({"error": f"Dataset load failed: {exc}"}))
        return

    scoped = df[df["Category"].astype(str).str.strip() == category]
    if scoped.empty:
        print(json.dumps({"error": f"No products found for category {category}."}))
        return

    try:
        model = xgb.XGBRegressor()
        model.load_model(MODEL_FILE)
        with open(ENCODERS_FILE, "rb") as enc_file:
            label_encoders = pickle.load(enc_file)
        with open(FEATURES_FILE, "r", encoding="utf-8") as feature_file:
            feature_columns = json.load(feature_file)
    except Exception as exc:
        print(json.dumps({"error": f"Model load failed: {exc}"}))
        return

    ranked: list[dict] = []
    for product_name, group in scoped.groupby("Product_Name", sort=False):
        baseline = build_baseline_payload(group, category)
        if baseline["price"] <= 0:
            continue
        scored = score_product(
            baseline,
            model=model,
            label_encoders=label_encoders,
            feature_columns=feature_columns,
            sales_distribution=sales_distribution,
            forecast_year=forecast_year,
            months=months,
        )
        ranked.append(scored)

    if not ranked:
        print(json.dumps({"error": "Could not score any products in this category."}))
        return

    ranked.sort(
        key=lambda item: (item["salesPotentialScore"], item["predictedSales"]),
        reverse=True,
    )
    top_products = []
    for index, item in enumerate(ranked[:top_n], start=1):
        top_products.append(
            {
                "rank": index,
                "productName": item["productName"],
                "category": item["category"],
                "salesPotentialScore": item["salesPotentialScore"],
                "salesPotentialCategory": item["salesPotentialCategory"],
                "predictedSales": item["predictedSales"],
            }
        )

    leader = ranked[0]
    print(
        json.dumps(
            {
                "category": category,
                "forecastYear": forecast_year,
                "datasetYearMin": year_info["minYear"],
                "datasetYearMax": year_info["maxYear"],
                "topProducts": top_products,
                "leaderProductName": leader["productName"],
                "monthlyPredictions": leader["monthlyPredictions"],
            }
        )
    )


if __name__ == "__main__":
    main()
