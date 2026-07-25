"""Port of Frontend trends CSV aggregation (keeps response shape identical)."""

from __future__ import annotations

import csv
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .runner import BACKEND_DIR


def _parse_number(value: str | None, fallback: float = 0.0) -> float:
    if value is None:
        return fallback
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return fallback


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return [
            {k: (v or "").strip() for k, v in row.items() if k is not None}
            for row in reader
        ]


def _unique_by_product(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: dict[str, dict[str, str]] = {}
    for row in rows:
        key = (row.get("Product_Name") or "").lower().strip()
        seen[key] = row
    return list(seen.values())


def build_trends_payload(*, refresh: bool = False) -> dict[str, Any]:
    if refresh:
        # predict_future_sales.py writes CSVs; stdout is not always JSON
        import os
        import subprocess
        import sys

        completed = subprocess.run(
            [sys.executable, str(BACKEND_DIR / "predict_future_sales.py")],
            cwd=str(BACKEND_DIR),
            capture_output=True,
            text=True,
            timeout=1800,
            env={**os.environ, "PYTHONUNBUFFERED": "1"},
            check=False,
        )
        if completed.returncode != 0:
            raise RuntimeError(
                completed.stderr.strip()
                or completed.stdout.strip()
                or "predict_future_sales.py failed"
            )

    predictions_path = BACKEND_DIR / "future_sales_predictions.csv"
    top20_path = BACKEND_DIR / "top_20_products.csv"
    if not predictions_path.is_file() or not top20_path.is_file():
        raise FileNotFoundError("Prediction CSV files are missing on the backend")

    prediction_rows = _unique_by_product(_read_csv(predictions_path))
    top_rows = _unique_by_product(_read_csv(top20_path))
    mtime = datetime.fromtimestamp(predictions_path.stat().st_mtime, tz=timezone.utc)

    category_color_map = {
        "High Potential": "#22c55e",
        "Medium Potential": "#f59e0b",
        "Low-Medium Potential": "#f97316",
        "Low Potential": "#ef4444",
    }
    bucket_headline = {
        "High Potential": "Top sellers",
        "Medium Potential": "Steady earners",
        "Low-Medium Potential": "Slow movers",
        "Low Potential": "Underperformers",
        "Uncategorized": "Unclassified",
    }
    bucket_action = {
        "High Potential": (
            "Top performers — stock generously and prioritize ad spend to maximise revenue."
        ),
        "Medium Potential": (
            "Steady mid-volume sellers. Maintain balanced stock; reorder cautiously."
        ),
        "Low-Medium Potential": (
            "Slow but stable. Keep minimal stock and consider bundle promos to lift demand."
        ),
        "Low Potential": (
            "Bottom segment. Clear remaining stock, avoid reorders, consider discontinuing."
        ),
        "Uncategorized": (
            "Products without a confident forecast. Review their attributes before stocking."
        ),
    }
    bucket_order = [
        "High Potential",
        "Medium Potential",
        "Low-Medium Potential",
        "Low Potential",
    ]

    grouped: dict[str, dict[str, Any]] = {}
    for row in prediction_rows:
        category = row.get("Sales_Potential_Category") or "Uncategorized"
        bucket = grouped.setdefault(
            category,
            {
                "count": 0,
                "predictedSalesSum": 0.0,
                "topProductName": "",
                "topProductPredicted": 0.0,
            },
        )
        predicted = _parse_number(row.get("Predicted_Future_Sales"))
        bucket["count"] += 1
        bucket["predictedSalesSum"] += predicted
        if predicted > bucket["topProductPredicted"]:
            bucket["topProductPredicted"] = predicted
            bucket["topProductName"] = row.get("Product_Name") or ""

    total_products_all = len(prediction_rows) or 1

    def sort_key(name: str) -> int:
        try:
            return bucket_order.index(name)
        except ValueError:
            return 999

    trend_categories = []
    for index, (name, values) in enumerate(
        sorted(grouped.items(), key=lambda item: sort_key(item[0])),
        start=1,
    ):
        share_pct = round((values["count"] / total_products_all) * 100, 1)
        avg_predicted = (
            round(values["predictedSalesSum"] / values["count"])
            if values["count"] > 0
            else 0
        )
        trend_categories.append(
            {
                "id": index,
                "name": name,
                "color": category_color_map.get(name, "#3b82f6"),
                "value": f"{values['count']:,} products",
                "sharePct": share_pct,
                "avgPredicted": avg_predicted,
                "totalPredicted": round(values["predictedSalesSum"]),
                "topProduct": values["topProductName"],
                "headline": bucket_headline.get(name, name),
                "insight": bucket_action.get(name, "Review this segment."),
            }
        )

    category_buckets: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in prediction_rows:
        cat = (row.get("Category") or "Other").strip()
        category_buckets[cat].append(row)

    top_by_predicted: list[dict[str, str]] = []
    for rows in category_buckets.values():
        top_by_predicted.extend(
            sorted(
                rows,
                key=lambda r: _parse_number(r.get("Predicted_Future_Sales")),
                reverse=True,
            )[:2]
        )
    top_by_predicted.sort(
        key=lambda r: _parse_number(r.get("Predicted_Future_Sales")),
        reverse=True,
    )
    chart_rows = top_by_predicted[:10]

    trend_data = []
    for row in chart_rows:
        words = (row.get("Product_Name") or "Product").strip().split()
        label = " ".join(words[:4])
        trend_data.append(
            {
                "month": label,
                "value": round(_parse_number(row.get("Predicted_Future_Sales"))),
                "productName": row.get("Product_Name") or "Product",
                "category": row.get("Category") or "Uncategorized",
            }
        )

    top4 = top_rows[:4]
    top4_predicted = [_parse_number(r.get("Predicted_Future_Sales")) for r in top4]
    max_pred = max(top4_predicted + [1.0])
    min_pred = min(top4_predicted + [0.0])
    pred_range = max_pred - min_pred or 1.0

    predictions = []
    for index, row in enumerate(top4, start=1):
        growth = _parse_number(row.get("Growth_Percentage"))
        predicted = _parse_number(row.get("Predicted_Future_Sales"))
        confidence = round(70 + ((predicted - min_pred) / pred_range) * 30)
        cat = row.get("Sales_Potential_Category") or ""
        if "High" in cat:
            impact = "High"
        elif "Medium" in cat:
            impact = "Medium"
        else:
            impact = "Low"
        predictions.append(
            {
                "id": index,
                "category": row.get("Product_Name") or f"Product {index}",
                "confidence": max(70, min(100, confidence)),
                "impact": impact,
                "timeline": "Next 30 Days",
                "description": (
                    f"Predicted {round(predicted):,} sales "
                    f"({'+' if growth >= 0 else ''}{growth:.1f}% growth)."
                ),
            }
        )

    total_current_sales = sum(_parse_number(r.get("Sales")) for r in prediction_rows)
    total_predicted_sales = sum(
        _parse_number(r.get("Predicted_Future_Sales")) for r in prediction_rows
    )
    high_potential_count = sum(
        1
        for r in prediction_rows
        if r.get("Sales_Potential_Category") == "High Potential"
    )
    positive_growth_count = sum(
        1 for r in prediction_rows if _parse_number(r.get("Growth_Percentage")) > 0
    )
    market_growth = (
        round(
            ((total_predicted_sales - total_current_sales) / total_current_sales) * 100,
            1,
        )
        if total_current_sales > 0
        else 0.0
    )
    high_potential_rate = (
        round((high_potential_count / len(prediction_rows)) * 100, 1)
        if prediction_rows
        else 0.0
    )
    positive_growth_rate = (
        round((positive_growth_count / len(prediction_rows)) * 100, 1)
        if prediction_rows
        else 0.0
    )

    accuracy = 98.15
    if len(prediction_rows) > 1:
        sales = [_parse_number(r.get("Sales")) for r in prediction_rows]
        predicted = [
            _parse_number(r.get("Predicted_Future_Sales")) for r in prediction_rows
        ]
        mean_actual = sum(sales) / len(sales)
        ss_tot = sum((y - mean_actual) ** 2 for y in sales)
        ss_res = sum((y - predicted[i]) ** 2 for i, y in enumerate(sales))
        if ss_tot > 0:
            r2 = max(0.0, min(1.0, 1 - ss_res / ss_tot))
            accuracy = round(r2 * 100, 2)

    return {
        "trendData": trend_data,
        "trendCategories": trend_categories,
        "predictions": predictions,
        "summary": {
            "totalTrends": len(prediction_rows),
            "activeUsers": high_potential_count,
            "accuracy": accuracy,
            "marketGrowth": market_growth,
            "cardChanges": {
                "totalTrends": positive_growth_rate,
                "activeUsers": high_potential_rate,
                "accuracy": round(market_growth / 2, 1),
                "marketGrowth": market_growth,
            },
            "lastUpdated": mtime.isoformat(),
        },
    }


def build_category_payload(category_id: str) -> dict[str, Any]:
    slug_to_category = {
        "t-shirts": "T-Shirt",
        "jeans": "Jeans",
        "shoes": "Shoes",
        "socks": "Socks",
        "shorts": "Shorts",
    }
    month_order = [
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

    category = slug_to_category.get(category_id)
    if not category:
        raise KeyError("Unknown category")

    predictions_path = BACKEND_DIR / "future_sales_predictions.csv"
    rows = [
        row
        for row in _read_csv(predictions_path)
        if row.get("Category") == category
    ]

    month_map: dict[str, dict[str, float]] = {}
    for row in rows:
        month = row.get("Month") or "Unknown"
        bucket = month_map.setdefault(
            month,
            {"currentSales": 0.0, "predictedSales": 0.0, "products": 0.0},
        )
        bucket["currentSales"] += _parse_number(row.get("Sales"))
        bucket["predictedSales"] += _parse_number(row.get("Predicted_Future_Sales"))
        bucket["products"] += 1

    chart_data = [
        {
            "label": month,
            "currentSales": round(month_map[month]["currentSales"]),
            "predictedSales": round(month_map[month]["predictedSales"]),
            "products": round(month_map[month]["products"]),
        }
        for month in month_order
        if month in month_map
    ]

    total_sales = sum(_parse_number(r.get("Sales")) for r in rows)
    total_predicted_sales = sum(
        _parse_number(r.get("Predicted_Future_Sales")) for r in rows
    )
    total_products = len(rows)
    avg_price = (
        sum(_parse_number(r.get("Price")) for r in rows) / total_products
        if total_products
        else 0.0
    )
    growth_pct = (
        ((total_predicted_sales - total_sales) / total_sales) * 100
        if total_sales > 0
        else 0.0
    )

    peak_month = None
    if chart_data:
        peak_month = max(chart_data, key=lambda item: item["currentSales"])["label"]

    material_sales: dict[str, float] = defaultdict(float)
    for row in rows:
        material_sales[row.get("Material") or "Other"] += _parse_number(row.get("Sales"))
    top_materials = [
        name
        for name, _ in sorted(material_sales.items(), key=lambda item: item[1], reverse=True)[
            :3
        ]
    ]

    insights: list[str] = []
    if peak_month:
        insights.append(f"Peak month: {peak_month}")
    if top_materials:
        insights.append(f"Top materials by sales: {', '.join(top_materials)}")
    insights.append(f"Average price: PKR {round(avg_price):,}")
    if abs(growth_pct) >= 0.1:
        insights.append(
            f"Predicted growth: {'+' if growth_pct >= 0 else ''}{growth_pct:.1f}%"
        )
    insights.append(f"{total_products:,} products in dataset")
    years = [
        _parse_number(r.get("Year"), float("nan"))
        for r in rows
        if r.get("Year")
    ]
    years = [y for y in years if not math.isnan(y)]
    if years:
        min_year = int(min(years))
        max_year = int(max(years))
        insights.append(f"Historical data: {min_year}–{max_year}")
        insights.append(f"Forecast target year: {max_year + 1}")

    return {
        "category": category,
        "chartData": chart_data,
        "insights": insights,
        "summary": {
            "totalSales": round(total_sales),
            "totalPredictedSales": round(total_predicted_sales),
            "totalProducts": total_products,
            "avgPrice": round(avg_price),
            "growthPct": round(growth_pct, 1),
        },
    }
