"""
Bulk Sales Prediction - Multi-Category
Reads the 500k dataset, runs predictions, and writes:
  - future_sales_predictions.csv   (all products)
  - top_20_products.csv            (top 20 by predicted sales)
"""

import pandas as pd
import numpy as np
import xgboost as xgb
import pickle
import json
import warnings
from preprocessing_pipeline import (
    apply_training_defaults,
    add_engineered_features,
    encode_categoricals,
    build_feature_matrix,
)
warnings.filterwarnings('ignore')

from dataset_registry import ensure_registry_seeded, get_active_path

ensure_registry_seeded()
DATASET_FILE  = get_active_path()
MODEL_FILE    = 'sales_trend_model.json'
ENCODERS_FILE = 'label_encoders.pkl'
FEATURES_FILE = 'feature_columns.json'
META_FILE     = 'model_meta.json'


def _raw_to_predicted_sales(raw_arr):
    """Match train_model target: log1p in training → expm1 at inference."""
    raw_arr = np.asarray(raw_arr, dtype=float)
    try:
        with open(META_FILE, encoding='utf-8') as f:
            meta = json.load(f)
        if meta.get('target_transform') == 'log1p':
            return np.maximum(np.expm1(np.clip(raw_arr, -50.0, 50.0)), 0.0)
    except Exception:
        pass
    return np.maximum(raw_arr, 0.0)

CATEGORIES = ['T-Shirt', 'Jeans', 'Shoes', 'Socks', 'Shorts']

print("=" * 70)
print("  BULK PREDICTION - MULTI-CATEGORY SALES TRENDS (500k)")
print("=" * 70)

# Load artifacts
print("\n[1/4] Loading model and dataset...")
model = xgb.XGBRegressor()
model.load_model(MODEL_FILE)

with open(ENCODERS_FILE, 'rb') as f:
    label_encoders = pickle.load(f)

with open(FEATURES_FILE) as f:
    feature_columns = json.load(f)

df = pd.read_csv(DATASET_FILE)
print(f"  Dataset: {len(df):,} rows  |  Features: {len(feature_columns)}")

# -----------------------------------------------------------------------
# Preprocess - mirrors train_model.py exactly
# -----------------------------------------------------------------------
print("\n[2/4] Preprocessing...")
df = apply_training_defaults(df)
df = add_engineered_features(df)
df, _ = encode_categoricals(df, label_encoders=label_encoders)
X = build_feature_matrix(df, feature_columns)

# -----------------------------------------------------------------------
# Predict
# -----------------------------------------------------------------------
print("\n[3/4] Running predictions...")
predicted = _raw_to_predicted_sales(model.predict(X))

df['Predicted_Future_Sales'] = np.round(predicted, 2)
df['Growth_Potential']       = df['Predicted_Future_Sales'] - df['Sales']
df['Growth_Percentage']      = np.where(
    df['Sales'] > 0,
    (df['Growth_Potential'] / df['Sales']) * 100,
    0
)
# Percentile rank: each product's score = its position in the distribution (0-100)
# This ensures a natural spread across all four potential categories.
df['Sales_Potential_Score'] = df['Predicted_Future_Sales'].rank(pct=True) * 100

def potential_category(score):
    if score >= 75: return 'High Potential'
    if score >= 50: return 'Medium Potential'
    if score >= 25: return 'Low-Medium Potential'
    return 'Low Potential'

df['Sales_Potential_Category'] = df['Sales_Potential_Score'].apply(potential_category)

# -----------------------------------------------------------------------
# Write outputs
# -----------------------------------------------------------------------
print("\n[4/4] Writing output files...")
output_cols = [
    'Product_Name', 'Category', 'Gender', 'Color', 'Sleeve_Type', 'Material',
    'Month', 'Year', 'City', 'Price', 'Discount_Pct', 'Is_Flash_Sale', 'Is_Combo',
    'Sales', 'Predicted_Future_Sales',
    'Sales_Potential_Score', 'Sales_Potential_Category',
    'Growth_Potential', 'Growth_Percentage',
]
out_df = df[[c for c in output_cols if c in df.columns]]
out_df.to_csv('future_sales_predictions.csv', index=False)
print(f"  future_sales_predictions.csv  ({len(out_df):,} rows)")

top20 = (
    df.sort_values('Predicted_Future_Sales', ascending=False)
    .drop_duplicates(subset=['Product_Name', 'Category'])
    .head(20)[[c for c in output_cols if c in df.columns]]
)
top20.to_csv('top_20_products.csv', index=False)
print(f"  top_20_products.csv           ({len(top20)} rows)")

print("\n" + "=" * 70)
print("  SUMMARY")
print("=" * 70)
for cat in CATEGORIES:
    sub = df[df['Category'] == cat]
    high = (sub['Sales_Potential_Category'] == 'High Potential').sum()
    med_g = sub[sub['Sales'] > 0]['Growth_Percentage'].median()
    print(f"  {cat:10s}  high-potential: {high:5,d}  median growth: {med_g:+.1f}%")

print(f"\n  Total: {len(df):,}  |  High-potential: {(df['Sales_Potential_Category']=='High Potential').sum():,}")
print("=" * 70)
