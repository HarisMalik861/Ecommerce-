import json
import sys
import pickle
import os
import numpy as np
import pandas as pd
import xgboost as xgb
from preprocessing_pipeline import (
    assign_price_category,
    assign_discount_category,
)
from dataset_registry import get_active_path, get_dataset_year_info, get_dataset_months

META_FILE = "model_meta.json"
_DATASET_CONSTRAINTS_CACHE: dict[str, dict] | None = None


def _unique_lower_map(series: pd.Series) -> dict[str, str]:
    """Map lowercase trimmed value -> canonical dataset value."""
    mapping: dict[str, str] = {}
    for value in series.dropna().astype(str):
        cleaned = value.strip()
        if not cleaned:
            continue
        mapping.setdefault(cleaned.lower(), cleaned)
    return mapping


def _load_category_constraints(category: str) -> dict:
    """Allowed categorical values + numeric ranges for one category."""
    global _DATASET_CONSTRAINTS_CACHE
    cache_key = category.strip()
    if (
        _DATASET_CONSTRAINTS_CACHE is not None
        and cache_key in _DATASET_CONSTRAINTS_CACHE
    ):
        return _DATASET_CONSTRAINTS_CACHE[cache_key]

    csv_path = get_active_path()
    df = pd.read_csv(
        csv_path,
        usecols=[
            "Category",
            "Product_Name",
            "City",
            "Gender",
            "Color",
            "Sleeve_Type",
            "Material",
            "Price",
            "Discount_Pct",
        ],
    )
    scoped = df[df["Category"].astype(str).str.strip() == cache_key]
    if scoped.empty:
        scoped = df

    constraints = {
        "product_names": _unique_lower_map(scoped["Product_Name"]),
        "cities": _unique_lower_map(scoped["City"]),
        "genders": _unique_lower_map(scoped["Gender"]),
        "colors": _unique_lower_map(scoped["Color"]),
        "sleeve_types": _unique_lower_map(scoped["Sleeve_Type"]),
        "materials": _unique_lower_map(scoped["Material"]),
        "price_min": float(pd.to_numeric(scoped["Price"], errors="coerce").min()),
        "price_max": float(pd.to_numeric(scoped["Price"], errors="coerce").max()),
        "discount_min": float(
            pd.to_numeric(scoped["Discount_Pct"], errors="coerce").min()
        ),
        "discount_max": float(
            pd.to_numeric(scoped["Discount_Pct"], errors="coerce").max()
        ),
    }
    if _DATASET_CONSTRAINTS_CACHE is None:
        _DATASET_CONSTRAINTS_CACHE = {}
    _DATASET_CONSTRAINTS_CACHE[cache_key] = constraints
    return constraints


def _missing_value_message(field_label: str, value: str, category: str) -> str:
    return (
        f'This {field_label} "{value}" does not exist in the dataset for {category}. '
        f"Please choose a value that is present in the active dataset."
    )


def validate_against_dataset(product: dict) -> str | None:
    """Reject inputs that are not present / in-range in the active dataset."""
    try:
        constraints = _load_category_constraints(str(product.get("Category") or ""))
    except Exception:
        return None

    category = str(product.get("Category") or "this category")

    product_name = str(product.get("Product_Name") or "").strip()
    if not product_name:
        return "Product name is required."
    if product_name.lower() not in constraints["product_names"]:
        return (
            f'This name "{product_name}" does not exist in the dataset for {category}. '
            "Please select a product name that is present in the active dataset."
        )

    city = str(product.get("City") or "").strip()
    if city.lower() not in constraints["cities"]:
        return _missing_value_message("city", city, category)

    gender = str(product.get("Gender") or "").strip()
    if gender.lower() not in constraints["genders"]:
        return _missing_value_message("gender", gender, category)

    color = str(product.get("Color") or "").strip()
    if color.lower() not in constraints["colors"]:
        return _missing_value_message("color", color, category)

    sleeve = str(product.get("Sleeve_Type") or "").strip()
    if sleeve.lower() not in constraints["sleeve_types"]:
        return _missing_value_message("sleeve type", sleeve, category)

    material = str(product.get("Material") or "").strip()
    if material.lower() not in constraints["materials"]:
        return _missing_value_message("material", material, category)

    price = float(product.get("Price") or 0)
    discount = float(product.get("Discount_Pct") or 0)
    price_min = constraints["price_min"]
    price_max = constraints["price_max"]
    if price < price_min or price > price_max:
        return (
            f"This price is not present in the dataset for {category}. "
            f"Allowed range is PKR {price_min:,.0f} – PKR {price_max:,.0f} "
            f"(maximum dataset value: PKR {price_max:,.0f})."
        )

    discount_min = constraints["discount_min"]
    discount_max = constraints["discount_max"]
    if discount < discount_min or discount > discount_max:
        return (
            f"This discount is not present in the dataset for {category}. "
            f"Allowed range is {discount_min:g}% – {discount_max:g}% "
            f"(maximum dataset value: {discount_max:g}%)."
        )

    return None


def _raw_to_predicted_sales_scalar(raw: float) -> float:
    """Decode model output to units sold (non-negative)."""
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        meta_path = os.path.join(backend_dir, META_FILE)
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
        if meta.get("target_transform") == "log1p":
            return float(
                max(0.0, np.expm1(np.clip(float(raw), -50.0, 50.0))),
            )
    except Exception:
        pass
    return float(max(0.0, raw))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def to_float(value, default=0.0):
    try:
        if value is None or value == "":
            return float(default)
        return float(value)
    except Exception:
        return float(default)


def safe_encode(label_encoders, col, value):
    """Encode a value; fall back to 0 if the column or value is unknown."""
    if col not in label_encoders:
        return 0
    le = label_encoders[col]
    val_str = str(value)
    if val_str not in le.classes_:
        le.classes_ = np.append(le.classes_, val_str)
    try:
        return int(le.transform([val_str])[0])
    except Exception:
        return 0


# ---------------------------------------------------------------------------
# Input normalisation
# ---------------------------------------------------------------------------

def normalize_input(payload, forecast_year: int):
    product = {}
    product["Product_Name"] = str(payload.get("productName") or "New Product").strip()

    category = str(payload.get("category") or "T-Shirt").strip().title()
    valid_categories = ["T-Shirt", "Jeans", "Shoes", "Socks", "Shorts"]
    product["Category"] = category if category in valid_categories else "T-Shirt"

    gender = str(payload.get("gender") or "Unisex").strip().title()
    product["Gender"] = gender if gender in ["Male", "Female", "Unisex"] else "Unisex"

    product["Color"] = str(payload.get("color") or "Black").strip() or "Black"
    # Sleeve_Type only applies to T-Shirt; training data uses "Not Specified" for Jeans, Shoes, Socks, Shorts
    if product["Category"] == "T-Shirt":
        product["Sleeve_Type"] = str(payload.get("sleeveType") or "Half Sleeve").strip() or "Half Sleeve"
    else:
        product["Sleeve_Type"] = "Not Specified"
    product["Material"] = str(payload.get("material") or "Cotton").strip() or "Cotton"

    valid_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    month = str(payload.get("month") or "Jan").strip().title()
    if len(month) == 3:
        month = month[:1].upper() + month[1:].lower()
    product["Month"] = month if month in valid_months else "Jan"
    product["Year"] = int(forecast_year)

    product["City"] = str(payload.get("city") or "Karachi").strip() or "Karachi"

    product["Price"] = max(0.0, to_float(payload.get("price"), 0))
    product["Discount_Pct"] = min(100.0, max(0.0, to_float(payload.get("discountPct"), 0)))

    is_flash = payload.get("isFlashSale", False)
    if isinstance(is_flash, str):
        is_flash = is_flash.lower() in ["yes", "true", "1", "y"]
    product["Is_Flash_Sale"] = 1 if is_flash else 0

    is_combo = payload.get("isCombo", False)
    if isinstance(is_combo, str):
        is_combo = is_combo.lower() in ["yes", "true", "1", "y"]
    product["Is_Combo"] = 1 if is_combo else 0

    return product


# ---------------------------------------------------------------------------
# Feature engineering  –  must exactly mirror train_model.py logic
# ---------------------------------------------------------------------------

def prepare_features(product, label_encoders, feature_columns):
    price = product["Price"]
    discount_pct = product["Discount_Pct"]
    is_combo = product["Is_Combo"]
    is_flash_sale = product["Is_Flash_Sale"]

    # Numeric derived features
    log_price = np.log1p(price)
    discounted_price = price * (1 - discount_pct / 100)
    value_score = (discounted_price / (price + 1)) * (1 + discount_pct / 100)
    price_discount_interaction = price * (discount_pct / 100)
    combo_discount_interaction = is_combo * discount_pct

    # Categorical derived
    price_category = assign_price_category(price)
    discount_category = assign_discount_category(discount_pct)

    # Label-encode all categoricals
    cat_map = {
        "Category": product["Category"],
        "Gender": product["Gender"],
        "Color": product["Color"],
        "Sleeve_Type": product["Sleeve_Type"],
        "Material": product["Material"],
        "Month": product["Month"],
        "Year": str(product["Year"]),
        "City": product["City"],
        "Price_Category": price_category,
        "Discount_Category": discount_category,
    }
    enc = {k: safe_encode(label_encoders, k, v) for k, v in cat_map.items()}

    row = {
        "Price": price,
        "Log_Price": log_price,
        "Discount_Pct": discount_pct,
        "Discounted_Price": discounted_price,
        "Value_Score": value_score,
        "Price_Discount_Interaction": price_discount_interaction,
        "Is_Combo": is_combo,
        "Is_Flash_Sale": is_flash_sale,
        "Combo_Discount_Interaction": combo_discount_interaction,
        "Category_Encoded": enc["Category"],
        "Month_Encoded": enc["Month"],
        "Year_Encoded": enc["Year"],
        "City_Encoded": enc["City"],
        "Gender_Encoded": enc["Gender"],
        "Color_Encoded": enc["Color"],
        "Sleeve_Type_Encoded": enc["Sleeve_Type"],
        "Material_Encoded": enc["Material"],
        "Price_Category_Encoded": enc["Price_Category"],
        "Discount_Category_Encoded": enc["Discount_Category"],
    }

    # Fill any features the model expects but weren't computed
    for col in feature_columns:
        if col not in row:
            row[col] = 0

    x_df = pd.DataFrame([{col: row[col] for col in feature_columns}])
    return x_df, discounted_price, price_category


# ---------------------------------------------------------------------------
# Potential category label
# ---------------------------------------------------------------------------

def categorize_potential(score):
    if score >= 75:
        return "High Potential"
    if score >= 50:
        return "Medium Potential"
    if score >= 25:
        return "Low-Medium Potential"
    return "Low Potential"


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(json.dumps({"error": "Invalid input JSON"}))
        return

    try:
        model = xgb.XGBRegressor()
        model.load_model("sales_trend_model.json")
    except Exception as exc:
        print(json.dumps({"error": f"Model load failed: {exc}"}))
        return

    try:
        with open("label_encoders.pkl", "rb") as enc_file:
            label_encoders = pickle.load(enc_file)
    except Exception as exc:
        print(json.dumps({"error": f"Encoder load failed: {exc}"}))
        return

    try:
        with open("feature_columns.json", "r", encoding="utf-8") as feature_file:
            feature_columns = json.load(feature_file)
        if not isinstance(feature_columns, list) or not feature_columns:
            raise ValueError("feature schema is empty")
    except Exception as exc:
        print(json.dumps({"error": f"Feature schema load failed: {exc}"}))
        return

    sales_distribution = None
    year_info = {"minYear": 2020, "maxYear": 2025, "forecastYear": 2026}
    forecast_months = list(get_dataset_months())
    try:
        from dataset_registry import ensure_registry_seeded, get_active_path

        ensure_registry_seeded()
        sales_distribution = pd.read_csv(get_active_path())["Sales"].to_numpy()
        year_info = get_dataset_year_info()
        forecast_months = list(get_dataset_months())
    except Exception:
        pass

    forecast_year = int(year_info["forecastYear"])

    def predict_single(single_payload):
        product = normalize_input(single_payload, forecast_year)
        if product["Price"] <= 0:
            return {"error": "Price must be greater than 0"}

        range_error = validate_against_dataset(product)
        if range_error:
            return {"error": range_error}

        x_df, discounted_price, price_cat = prepare_features(
            product, label_encoders, feature_columns
        )
        raw = float(model.predict(x_df)[0])
        predicted_sales = _raw_to_predicted_sales_scalar(raw)

        # Percentile score against training distribution
        try:
            if sales_distribution is None or len(sales_distribution) == 0:
                raise ValueError("missing sales distribution")
            percentile = (sales_distribution <= predicted_sales).sum() / len(sales_distribution) * 100
            potential_score = float(min(99.9, percentile))
        except Exception:
            max_sales = 40000
            potential_score = min(99.9, max(0.0, (predicted_sales / max_sales) * 100))

        return {
            "productName": product["Product_Name"],
            "category": product["Category"],
            "month": product["Month"],
            "year": forecast_year,
            "predictedSales": round(predicted_sales, 2),
            "salesPotentialScore": round(potential_score, 2),
            "salesPotentialCategory": categorize_potential(potential_score),
            "discountedPrice": round(discounted_price, 2),
            "priceCategory": price_cat,
        }

    def prediction_meta(extra=None):
        meta = {
            "forecastYear": forecast_year,
            "datasetYearMin": year_info["minYear"],
            "datasetYearMax": year_info["maxYear"],
            "forecastMonths": forecast_months,
        }
        if extra:
            meta.update(extra)
        return meta

    months = payload.get("months")
    if isinstance(months, list) and len(months) > 0:
        monthly_predictions = []
        first_prediction = None
        for month in months:
            month_payload = dict(payload)
            month_payload["month"] = month
            prediction = predict_single(month_payload)
            if "error" in prediction:
                print(json.dumps(prediction))
                return
            monthly_predictions.append({
                "month": month,
                "year": forecast_year,
                "prediction": prediction,
            })
            if first_prediction is None:
                first_prediction = prediction
        print(json.dumps({
            "monthlyPredictions": monthly_predictions,
            **prediction_meta(first_prediction or {}),
        }))
        return

    result = predict_single(payload)
    print(json.dumps(prediction_meta(result)))


if __name__ == "__main__":
    main()
