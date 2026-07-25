import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder


# Columns the user provides in the prediction form (plus Sales as training target).
REQUIRED_INPUT_COLUMNS = [
    "Product_Name",
    "Category",
    "Gender",
    "Color",
    "Sleeve_Type",
    "Material",
    "Combo_Item",
    "Is_Flash_Sale",
    "Price",
    "Discount_Pct",
    "Month",
    "Year",
    "City",
    "Sales",
]


def assign_product_age_stage(age_days):
    if age_days <= 14:
        return "New"
    if age_days <= 60:
        return "Growing"
    if age_days <= 180:
        return "Active"
    if age_days <= 540:
        return "Established"
    if age_days <= 1095:
        return "Mature"
    return "Old"


def assign_price_category(price):
    if price <= 500:
        return "Budget"
    if price <= 1500:
        return "Economy"
    if price <= 4000:
        return "Mid-Range"
    if price <= 8000:
        return "Premium"
    return "Luxury"


def assign_discount_category(discount):
    if discount <= 20:
        return "Low"
    if discount <= 40:
        return "Medium"
    if discount <= 60:
        return "High"
    if discount <= 80:
        return "Very High"
    return "Extreme"


def normalize_source_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = df.columns.str.strip()
    if "Sleeve Type" in df.columns and "Sleeve_Type" not in df.columns:
        df.rename(columns={"Sleeve Type": "Sleeve_Type"}, inplace=True)
    return df


def apply_training_defaults(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_source_columns(df)

    df["Gender"] = df.get("Gender", pd.Series(["Unisex"] * len(df))).fillna("Unisex")
    df["Color"] = df.get("Color", pd.Series(["Not Specified"] * len(df))).fillna("Not Specified")
    df["Sleeve_Type"] = df.get("Sleeve_Type", pd.Series(["Not Specified"] * len(df))).fillna("Not Specified")
    df["Material"] = df.get("Material", pd.Series(["Not Specified"] * len(df))).fillna("Not Specified")
    df["Combo_Item"] = df.get("Combo_Item", pd.Series(["Single"] * len(df))).fillna("Single")
    df["Category"] = df.get("Category", pd.Series(["T-Shirt"] * len(df))).fillna("T-Shirt")
    df["Month"] = df.get("Month", pd.Series(["Jan"] * len(df))).fillna("Jan")
    df["Year"] = pd.to_numeric(
        df.get("Year", pd.Series([2025] * len(df))), errors="coerce"
    ).fillna(2025).astype(int)
    df["City"] = df.get("City", pd.Series(["Karachi"] * len(df))).fillna("Karachi")

    df["Discount_Pct"] = pd.to_numeric(
        df.get("Discount_Pct", pd.Series([0] * len(df))).astype(str).str.rstrip("%").replace("", "0"),
        errors="coerce",
    ).fillna(0)
    df["Sales"] = pd.to_numeric(df.get("Sales", pd.Series([0] * len(df))), errors="coerce").fillna(0)
    df["Price"] = pd.to_numeric(df.get("Price", pd.Series([0] * len(df))), errors="coerce")
    df["Price"] = df["Price"].fillna(df["Price"].median() if df["Price"].notna().any() else 0)
    df["Is_Flash_Sale"] = (
        pd.to_numeric(df.get("Is_Flash_Sale", pd.Series([0] * len(df))), errors="coerce")
        .fillna(0)
        .astype(int)
    )

    return df


def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["Is_Combo"] = (df["Combo_Item"].astype(str).str.lower() == "combo").astype(int)
    df["Discounted_Price"] = df["Price"] * (1 - df["Discount_Pct"] / 100)
    df["Price_Discount_Interaction"] = df["Price"] * (df["Discount_Pct"] / 100)
    df["Combo_Discount_Interaction"] = df["Is_Combo"] * df["Discount_Pct"]
    df["Log_Price"] = np.log1p(df["Price"])
    df["Value_Score"] = (df["Discounted_Price"] / (df["Price"] + 1)) * (1 + df["Discount_Pct"] / 100)

    df["Price_Category"] = pd.cut(
        df["Price"],
        bins=[0, 500, 1500, 4000, 8000, float("inf")],
        labels=["Budget", "Economy", "Mid-Range", "Premium", "Luxury"],
    )
    df["Discount_Category"] = pd.cut(
        df["Discount_Pct"],
        bins=[0, 20, 40, 60, 80, 100],
        labels=["Low", "Medium", "High", "Very High", "Extreme"],
    )
    return df


def encode_categoricals(df: pd.DataFrame, label_encoders=None):
    df = df.copy()
    categorical_cols = [
        "Category",
        "Gender",
        "Color",
        "Sleeve_Type",
        "Material",
        "Month",
        "Year",
        "City",
        "Price_Category",
        "Discount_Category",
    ]
    created_encoders = {} if label_encoders is None else label_encoders

    for col in categorical_cols:
        if label_encoders is None:
            le = LabelEncoder()
            df[col + "_Encoded"] = le.fit_transform(df[col].astype(str))
            created_encoders[col] = le
        else:
            le = created_encoders[col]
            mapping = {cls: idx for idx, cls in enumerate(le.classes_)}
            df[col + "_Encoded"] = df[col].astype(str).map(mapping).fillna(0).astype(int)

    return df, created_encoders


def build_feature_matrix(df: pd.DataFrame, feature_columns):
    work = df.copy()
    for col in feature_columns:
        if col not in work.columns:
            work[col] = 0
    return work[feature_columns].fillna(0)


def clean_raw_dataset_for_append(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean uploaded raw rows to the same raw-schema baseline used by training.
    This is intentionally applied before appending into the training dataset.
    """
    work = apply_training_defaults(df)
    for col in REQUIRED_INPUT_COLUMNS:
        if col not in work.columns:
            work[col] = np.nan

    ordered = work[REQUIRED_INPUT_COLUMNS].copy()
    ordered["Product_Name"] = ordered["Product_Name"].astype(str).str.strip().replace("", "Unknown Product")
    ordered["Category"] = ordered["Category"].astype(str).str.strip()
    ordered["Gender"] = ordered["Gender"].astype(str).str.strip()
    ordered["Color"] = ordered["Color"].astype(str).str.strip()
    ordered["Sleeve_Type"] = ordered["Sleeve_Type"].astype(str).str.strip()
    ordered["Material"] = ordered["Material"].astype(str).str.strip()
    ordered["Combo_Item"] = ordered["Combo_Item"].astype(str).str.strip()
    ordered["Month"] = ordered["Month"].astype(str).str.strip()
    ordered["Year"] = ordered["Year"].clip(lower=2020, upper=2025).astype(int)
    ordered["City"] = ordered["City"].astype(str).str.strip()

    # Keep numeric columns in valid ranges where applicable.
    ordered["Discount_Pct"] = ordered["Discount_Pct"].clip(lower=0, upper=100)
    ordered["Price"] = ordered["Price"].clip(lower=0)
    ordered["Sales"] = ordered["Sales"].clip(lower=0)
    ordered["Is_Flash_Sale"] = ordered["Is_Flash_Sale"].clip(lower=0, upper=1).astype(int)

    return ordered


def clean_raw_dataset_for_append_with_report(df: pd.DataFrame, deduplicate: bool = False):
    original = normalize_source_columns(df)
    before_count = len(original)
    duplicate_count = int(original.duplicated().sum())

    # Count missing values before defaults are applied (for required training columns only).
    before_missing = {}
    for col in REQUIRED_INPUT_COLUMNS:
        series = original[col] if col in original.columns else pd.Series([np.nan] * before_count)
        before_missing[col] = int(series.isna().sum())

    # Capture non-numeric values before coercion for numeric columns.
    numeric_cols = [
        "Is_Flash_Sale",
        "Price",
        "Discount_Pct",
        "Year",
        "Sales",
    ]
    non_numeric_before = {}
    for col in numeric_cols:
        if col not in original.columns:
            non_numeric_before[col] = before_count
            continue
        raw = original[col]
        parsed = pd.to_numeric(raw.astype(str).str.rstrip("%").replace("", np.nan), errors="coerce")
        non_numeric_before[col] = int(((raw.notna()) & (parsed.isna())).sum())

    defaults_applied = apply_training_defaults(df)
    clip_stats = {
        "discountPctOutOfRangeBeforeClip": int(
            ((defaults_applied["Discount_Pct"] < 0) | (defaults_applied["Discount_Pct"] > 100)).sum()
        ),
        "negativePriceRowsBeforeClip": int((defaults_applied["Price"] < 0).sum()),
        "negativeSalesRowsBeforeClip": int((defaults_applied["Sales"] < 0).sum()),
    }

    cleaned = clean_raw_dataset_for_append(df)
    duplicate_rows_removed = 0
    if deduplicate:
        before_dedup_count = len(cleaned)
        cleaned = cleaned.drop_duplicates().reset_index(drop=True)
        duplicate_rows_removed = int(before_dedup_count - len(cleaned))
    after_missing = {col: int(cleaned[col].isna().sum()) for col in REQUIRED_INPUT_COLUMNS}

    report = {
        "inputRows": int(before_count),
        "rowsAfterCleaning": int(len(cleaned)),
        "duplicateRowsDetected": duplicate_count,
        "deduplicated": deduplicate,
        "duplicateRowsRemoved": duplicate_rows_removed,
        "missingValuesBefore": before_missing,
        "missingValuesAfter": after_missing,
        "nonNumericValuesCoerced": non_numeric_before,
        "rangeFixesApplied": clip_stats,
        "operationsApplied": [
            "trim_column_names",
            "rename_sleeve_type_alias",
            "fill_missing_defaults",
            "coerce_numeric_values",
            "clip_numeric_ranges",
            "normalize_string_fields",
            "drop_duplicates" if deduplicate else "preserve_rows_no_drop",
        ],
    }
    return cleaned, report
