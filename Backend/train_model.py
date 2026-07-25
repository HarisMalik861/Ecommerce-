"""
XGBoost Multi-Category Sales Trend Prediction
==============================================
Trains on the 500k realistic Pakistani e-commerce dataset
(100k rows x 5 categories: T-Shirt, Jeans, Shoes, Socks, Shorts).

Features match user-provided inputs only: price, discount, month, year, city,
combo, flash_sale, material, gender, color, category, sleeve type.
"""

import pandas as pd
import numpy as np
import xgboost as xgb
import pickle
import json
import warnings
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from preprocessing_pipeline import (
    apply_training_defaults,
    add_engineered_features,
    encode_categoricals,
)
warnings.filterwarnings('ignore')

from dataset_registry import ensure_registry_seeded, get_active_path

ensure_registry_seeded()
DATASET_FILE  = get_active_path()
MODEL_FILE    = 'sales_trend_model.json'
ENCODERS_FILE = 'label_encoders.pkl'
FEATURES_FILE = 'feature_columns.json'
META_FILE     = 'model_meta.json'

print("=" * 80)
print("  MULTI-CATEGORY SALES TREND MODEL — PAKISTANI E-COMMERCE (500k)")
print("  Categories: T-Shirt | Jeans | Shoes | Socks | Shorts")
print("=" * 80)

# ─── 1. LOAD ────────────────────────────────────────────────────────────────
print("\n[1/7] Loading dataset...")
try:
    df = pd.read_csv(DATASET_FILE)
    print(f"  OK  {df.shape[0]:,} rows x {df.shape[1]} columns")
    print(f"  Columns: {list(df.columns)}")
    print(f"  Category counts: {df['Category'].value_counts().to_dict()}")
except FileNotFoundError:
    print(f"  ERROR: '{DATASET_FILE}' not found.")
    print("  Run: python generate_multicategory_dataset.py")
    exit(1)

# ─── 2. CLEAN ───────────────────────────────────────────────────────────────
print("\n[2/7] Preprocessing...")
df = apply_training_defaults(df)

print(f"  Nulls remaining: {df.isnull().sum().sum()}")

# ─── 3. FEATURE ENGINEERING ─────────────────────────────────────────────────
print("\n[3/7] Feature engineering...")
df = add_engineered_features(df)

# ─── 4. ENCODE ──────────────────────────────────────────────────────────────
print("\n[4/7] Encoding categorical features...")
df, label_encoders = encode_categoricals(df, label_encoders=None)
for col in [
    'Category', 'Gender', 'Color', 'Sleeve_Type', 'Material',
    'Month', 'Year', 'City', 'Price_Category', 'Discount_Category',
]:
    print(f"  {col:22s}: {list(label_encoders[col].classes_)}")

# ─── 5. TRAIN ───────────────────────────────────────────────────────────────
feature_columns = [
    # Core price & discount
    'Price', 'Log_Price', 'Discount_Pct', 'Discounted_Price', 'Value_Score',
    'Price_Discount_Interaction',

    # Promotional
    'Is_Combo', 'Is_Flash_Sale', 'Combo_Discount_Interaction',

    # Category / context encodings
    'Category_Encoded', 'Month_Encoded', 'Year_Encoded', 'City_Encoded',
    'Gender_Encoded', 'Color_Encoded', 'Sleeve_Type_Encoded',
    'Material_Encoded', 'Price_Category_Encoded', 'Discount_Category_Encoded',
]
feature_columns = [c for c in feature_columns if c in df.columns]
print(f"\n  Using {len(feature_columns)} features: {feature_columns}")

X = df[feature_columns].fillna(0)
y_raw = df['Sales'].astype(float)

X_train, X_test, y_train_raw, y_test_raw = train_test_split(
    X, y_raw, test_size=0.2, random_state=42, shuffle=True)
# Train on log1p(Sales) so tree outputs stay in a stable range and decoded preds are ≥ 0.
y_train = np.log1p(y_train_raw.values)
y_test_log = np.log1p(y_test_raw.values)
print(f"\n[5/7] Training split — train: {len(X_train):,}  test: {len(X_test):,}")
print("  Target: log1p(Sales) (inference uses expm1)")

xgb_params = {
    'objective':        'reg:squarederror',
    'max_depth':        6,
    'learning_rate':    0.05,
    'n_estimators':     600,
    'subsample':        0.75,
    'colsample_bytree': 0.75,
    'min_child_weight': 10,
    'gamma':            0.1,
    'reg_alpha':        0.5,
    'reg_lambda':       1.5,
    'random_state':     42,
    'n_jobs':           -1,
    'tree_method':      'hist',
}

print("\n  Training XGBoost (600 trees, depth 6)...")
model = xgb.XGBRegressor(**xgb_params)
model.fit(
    X_train, y_train,
    eval_set=[(X_train, y_train), (X_test, y_test_log)],
    verbose=100,
)

# ─── 6. EVALUATE ────────────────────────────────────────────────────────────
print("\n[6/7] Evaluation...")
y_pred_train = model.predict(X_train)
y_pred_test  = model.predict(X_test)

def _decode_sales(raw):
    return np.maximum(np.expm1(np.clip(raw, -50.0, 50.0)), 0.0)

y_pred_train_sales = _decode_sales(y_pred_train)
y_pred_test_sales = _decode_sales(y_pred_test)

train_r2_log = r2_score(y_train, y_pred_train)
test_r2_log  = r2_score(y_test_log, y_pred_test)
train_r2     = r2_score(y_train_raw, y_pred_train_sales)
test_r2      = r2_score(y_test_raw, y_pred_test_sales)
train_rmse = np.sqrt(mean_squared_error(y_train_raw, y_pred_train_sales))
test_rmse  = np.sqrt(mean_squared_error(y_test_raw, y_pred_test_sales))
train_mae  = mean_absolute_error(y_train_raw, y_pred_train_sales)
test_mae   = mean_absolute_error(y_test_raw, y_pred_test_sales)

print(f"\n  {'Metric':14s}  {'Train':>10s}  {'Test':>10s}")
print(f"  {'-'*38}")
print(f"  {'R2 (log)':14s}  {train_r2_log:>10.4f}  {test_r2_log:>10.4f}")
print(f"  {'R2 (units)':14s}  {train_r2:>10.4f}  {test_r2:>10.4f}")
print(f"  {'RMSE (units)':14s}  {train_rmse:>10.1f}  {test_rmse:>10.1f}")
print(f"  {'MAE (units)':14s}  {train_mae:>10.1f}  {test_mae:>10.1f}")

print("\n  Per-category R2 (units, full data):")
for cat in sorted(df['Category'].unique()):
    mask = df['Category'] == cat
    y_cat = df.loc[mask, 'Sales'].astype(float)
    pred_sale = _decode_sales(model.predict(X[mask]))
    r2_cat = r2_score(y_cat, pred_sale)
    print(f"    {cat:10s}: R2 = {r2_cat:.4f}")

cv_splits = min(5, len(X_train))
if cv_splits >= 2:
    kfold = KFold(n_splits=cv_splits, shuffle=True, random_state=42)
    cv_r2 = cross_val_score(model, X_train, y_train, cv=kfold, scoring='r2', n_jobs=-1)
    print(f"\n  {cv_splits}-Fold CV R2 (log target): {cv_r2.mean():.4f} +/- {cv_r2.std():.4f}")
else:
    print("\n  Skipping CV: at least 2 training rows are required.")

# Feature importance plot
fi = pd.DataFrame({'Feature': feature_columns, 'Importance': model.feature_importances_})
fi = fi.sort_values('Importance', ascending=True).tail(20)
plt.figure(figsize=(10, 9))
plt.barh(fi['Feature'], fi['Importance'], color='steelblue', alpha=0.8)
plt.xlabel('Importance Score')
plt.title('Feature Importance — Multi-Category Model (500k rows)', fontweight='bold')
plt.tight_layout()
plt.savefig('feature_importance.png', dpi=150, bbox_inches='tight')
plt.close()
print("\n  Saved: feature_importance.png")

# ─── 7. SAVE ────────────────────────────────────────────────────────────────
print("\n[7/7] Saving artifacts...")
model.save_model(MODEL_FILE)
print(f"  Saved model    -> {MODEL_FILE}")

with open(ENCODERS_FILE, 'wb') as f:
    pickle.dump(label_encoders, f)
print(f"  Saved encoders -> {ENCODERS_FILE}")

with open(FEATURES_FILE, 'w') as f:
    json.dump(feature_columns, f, indent=2)
print(f"  Saved features -> {FEATURES_FILE}")

with open(META_FILE, 'w', encoding='utf-8') as f:
    json.dump({'target_transform': 'log1p'}, f, indent=2)
print(f"  Saved meta     -> {META_FILE}  (predict scripts use expm1)")

print("\n" + "=" * 80)
print(f"  DONE — Test R2 = {test_r2:.4f}  |  {len(feature_columns)} features  |  {len(df):,} rows")
print("=" * 80)
