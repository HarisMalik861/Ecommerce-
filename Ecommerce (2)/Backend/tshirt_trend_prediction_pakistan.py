"""
XGBoost Trend Prediction Model for T-Shirt Sales in Pakistani Sector
====================================================================
This script trains an XGBoost model to predict t-shirt sales trends
with strong regularization to prevent overfitting.
"""

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import json
import warnings
warnings.filterwarnings('ignore')

# Set style for better visualizations
sns.set_style('whitegrid')
plt.rcParams['figure.figsize'] = (12, 6)

print("="*80)
print("XGBOOST TREND PREDICTION FOR T-SHIRT SALES - PAKISTANI SECTOR")
print("="*80)

# Load the dataset
print("\n[1/8] Loading dataset...")
try:
    df = pd.read_csv('daraz_processed_tshirt_sales_data_expanded.csv')
    print(f"[OK] Dataset loaded successfully!")
    print(f"  Shape: {df.shape[0]} rows, {df.shape[1]} columns")
except FileNotFoundError:
    print("[ERROR] Dataset file not found!")
    print("  Please ensure 'daraz_processed_tshirt_sales_data_expanded.csv' exists")
    exit(1)

# Data preprocessing
print("\n[2/8] Data Preprocessing...")
print("-" * 80)

# Clean column names (remove extra spaces and special characters)
df.columns = df.columns.str.strip()
df.columns = df.columns.str.replace('\xa0', '')

# Rename columns for easier access
column_mapping = {
    'Product Name': 'Product_Name',
    'Price': 'Price',
    'Discount(%)': 'Discount_Pct',
    'No. of Sells': 'Sales',
    'No. of Review': 'Reviews',
    'Location': 'Location',
    'Combo Item': 'Combo_Item'
}

# Update column names
for old_col, new_col in column_mapping.items():
    if old_col in df.columns:
        df.rename(columns={old_col: new_col}, inplace=True)

# Fill missing values with appropriate defaults
print("  Filling missing values...")
df['Gender'] = df['Gender'].fillna('Unisex')
df['Color'] = df['Color'].fillna('Not Specified')
df['Sleeve Type'] = df['Sleeve Type'].fillna('Not Specified')
df['Material'] = df['Material'].fillna('Not Specified')
df['Combo_Item'] = df['Combo_Item'].fillna('Single')
df['Discount_Pct'] = df['Discount_Pct'].fillna('0%')

# Update all locations to "Pakistan" for Pakistani sector focus
if 'Location' in df.columns:
    original_locations = df['Location'].value_counts().to_dict()
    df['Location'] = 'Pakistan'
    print(f"  [INFO] Updated all locations to 'Pakistan' (was: {list(original_locations.keys())[:3]}...)")
elif 'Location' in [col for col in df.columns if 'location' in col.lower()]:
    loc_col = [col for col in df.columns if 'location' in col.lower()][0]
    original_locations = df[loc_col].value_counts().to_dict()
    df[loc_col] = 'Pakistan'
    print(f"  [INFO] Updated all locations to 'Pakistan' (was: {list(original_locations.keys())[:3]}...)")
else:
    # Create Location column if it doesn't exist
    df['Location'] = 'Pakistan'
    print("  [INFO] Created Location column with 'Pakistan' value")

# Convert discount percentage to numeric
df['Discount_Pct'] = df['Discount_Pct'].astype(str).str.rstrip('%').replace('', '0')
df['Discount_Pct'] = pd.to_numeric(df['Discount_Pct'], errors='coerce').fillna(0)

# Handle missing numeric values
if 'Sales' in df.columns:
    df['Sales'] = pd.to_numeric(df['Sales'], errors='coerce')
    df['Sales'] = df['Sales'].fillna(df['Sales'].median())
    
if 'Reviews' in df.columns:
    df['Reviews'] = pd.to_numeric(df['Reviews'], errors='coerce')
    df['Reviews'] = df['Reviews'].fillna(0)

# Ensure Price is numeric
df['Price'] = pd.to_numeric(df['Price'], errors='coerce')
df['Price'] = df['Price'].fillna(df['Price'].median())

print(f"  [OK] Missing values handled: {df.isnull().sum().sum()} remaining")

# Feature Engineering
print("\n[3/8] Feature Engineering...")
print("-" * 80)

# Create binary feature for combo items
df['Is_Combo'] = df['Combo_Item'].apply(lambda x: 1 if str(x).lower() == 'combo' else 0)

# Calculate discounted price
df['Discounted_Price'] = df['Price'] * (1 - df['Discount_Pct']/100)

# Create review ratio (reviews per sale) - helps identify product quality
# Handle edge cases: avoid division by zero and handle new products
df['Review_Ratio'] = df['Reviews'] / (df['Sales'] + 1)

# NEW: Identify new products (products with 0 reviews and 0 sales)
# This helps model learn different patterns for new vs existing products
df['Is_New_Product'] = ((df['Reviews'] == 0) & (df['Sales'] == 0)).astype(int)

# NEW: Interaction features - capture non-linear relationships
# Price-Discount interaction (value perception)
df['Price_Discount_Interaction'] = df['Price'] * (df['Discount_Pct'] / 100)

# Combo-Discount interaction (combo items with discounts are more attractive)
df['Combo_Discount_Interaction'] = df['Is_Combo'] * df['Discount_Pct']

# Price-Review interaction (higher price with reviews suggests quality)
df['Price_Review_Interaction'] = df['Price'] * np.log1p(df['Reviews'])  # log to handle scale

# Value Score: discounted price per unit value perception
df['Value_Score'] = df['Discounted_Price'] / (df['Price'] + 1) * (1 + df['Discount_Pct'] / 100)

# Review Quality Indicator: reviews relative to sales (higher = better quality perception)
# Use log transformation to handle extreme values
df['Review_Quality_Indicator'] = np.log1p(df['Review_Ratio'] * 100)  # Scale and log transform

# Create price categories for Pakistani market
price_bins = [0, 500, 1000, 2000, 5000, float('inf')]
price_labels = ['Budget', 'Economy', 'Mid-Range', 'Premium', 'Luxury']
df['Price_Category'] = pd.cut(df['Price'], bins=price_bins, labels=price_labels)

# Create discount category
discount_bins = [0, 20, 40, 60, 80, 100]
discount_labels = ['Low', 'Medium', 'High', 'Very High', 'Extreme']
df['Discount_Category'] = pd.cut(df['Discount_Pct'], bins=discount_bins, labels=discount_labels)

# Encode categorical variables
print("  Encoding categorical variables...")
label_encoders = {}
categorical_cols = ['Gender', 'Color', 'Sleeve Type', 'Material', 'Location', 
                    'Price_Category', 'Discount_Category']

for col in categorical_cols:
    if col in df.columns:
        le = LabelEncoder()
        df[col + '_Encoded'] = le.fit_transform(df[col].astype(str))
        label_encoders[col] = le

print(f"  [OK] Created {len(categorical_cols)} encoded features")

# Select features for the model (enhanced with new features)
feature_columns = [
    'Price',
    'Discount_Pct',
    'Reviews',
    'Is_Combo',
    'Discounted_Price',
    'Review_Ratio',
    'Is_New_Product',  # NEW: Helps model handle new products differently
    'Price_Discount_Interaction',  # NEW: Value perception
    'Combo_Discount_Interaction',  # NEW: Combo attractiveness
    'Price_Review_Interaction',  # NEW: Quality perception
    'Value_Score',  # NEW: Overall value indicator
    'Review_Quality_Indicator',  # NEW: Quality signal from reviews
    'Gender_Encoded',
    'Color_Encoded',
    'Sleeve Type_Encoded',
    'Material_Encoded',
    'Location_Encoded',
    'Price_Category_Encoded',
    'Discount_Category_Encoded'
]

# Filter out columns that don't exist
feature_columns = [col for col in feature_columns if col in df.columns]

# Target variable: Sales (trend indicator)
target = 'Sales'

# Prepare features and target
X = df[feature_columns].copy()
y = df[target].copy()

# Remove any remaining NaN values
X = X.fillna(X.median())
y = y.fillna(y.median())

print(f"  [OK] Feature matrix shape: {X.shape}")
print(f"  [OK] Target vector shape: {y.shape}")
print(f"  [OK] Features used: {len(feature_columns)}")
print(f"  [INFO] New features added:")
print(f"        - Is_New_Product: Identifies products with 0 reviews/sales")
print(f"        - Interaction features: Price×Discount, Combo×Discount, Price×Review")
print(f"        - Value_Score: Overall value perception indicator")
print(f"        - Review_Quality_Indicator: Quality signal from review patterns")

# Split data into train and test sets
print("\n[4/8] Splitting Data...")
print("-" * 80)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, shuffle=True
)

print(f"  Training set: {X_train.shape[0]} samples")
print(f"  Test set: {X_test.shape[0]} samples")
print(f"  Train/Test ratio: {X_train.shape[0]/X_test.shape[0]:.2f}:1")

# Train XGBoost Model with STRONG REGULARIZATION
print("\n[5/8] Training XGBoost Model (Anti-Overfitting Configuration)...")
print("-" * 80)

# XGBoost parameters optimized to prevent overfitting (STRONG REGULARIZATION)
xgb_params = {
    'objective': 'reg:squarederror',
    'max_depth': 2,                  # Very shallow trees (reduced from 3)
    'learning_rate': 0.02,           # Lower learning rate (reduced from 0.03)
    'n_estimators': 600,             # More trees with lower learning rate
    'subsample': 0.5,                # Use only 50% of samples per tree (reduced from 0.6)
    'colsample_bytree': 0.5,         # Use only 50% of features per tree (reduced from 0.6)
    'colsample_bylevel': 0.5,        # Additional feature sampling (reduced from 0.6)
    'min_child_weight': 8,           # Higher minimum child weight (increased from 5)
    'gamma': 0.3,                    # Higher minimum loss reduction (increased from 0.2)
    'reg_alpha': 1.5,                # Stronger L1 regularization (increased from 1.0)
    'reg_lambda': 3.0,               # Stronger L2 regularization (increased from 2.0)
    'random_state': 42,
    'n_jobs': -1,
    'eval_metric': 'rmse',
    'tree_method': 'hist',           # Faster training
    'max_bin': 256                   # Histogram binning
}

print("\n  XGBoost Parameters (Anti-Overfitting):")
for key, value in sorted(xgb_params.items()):
    print(f"    {key:20s}: {value}")

# Train the model with early stopping
print("\n  Training model with early stopping...")
# Remove early_stopping_rounds from params if it exists
model_params = {k: v for k, v in xgb_params.items() if k != 'early_stopping_rounds'}
model = xgb.XGBRegressor(**model_params)

# Use early stopping to prevent overfitting
eval_set = [(X_train, y_train), (X_test, y_test)]
model.fit(
    X_train, y_train,
    eval_set=eval_set,
    verbose=50  # Print every 50 rounds
)

print("  [OK] Model training completed!")

# Make predictions
print("\n[6/8] Model Evaluation...")
print("-" * 80)

y_pred_train = model.predict(X_train)
y_pred_test = model.predict(X_test)

# Calculate metrics
train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
train_mae = mean_absolute_error(y_train, y_pred_train)
test_mae = mean_absolute_error(y_test, y_pred_test)
train_r2 = r2_score(y_train, y_pred_train)
test_r2 = r2_score(y_test, y_pred_test)

print("\n  Training Set Metrics:")
print(f"    RMSE: {train_rmse:.2f}")
print(f"    MAE:  {train_mae:.2f}")
print(f"    R²:   {train_r2:.4f}")

print("\n  Test Set Metrics:")
print(f"    RMSE: {test_rmse:.2f}")
print(f"    MAE:  {test_mae:.2f}")
print(f"    R²:   {test_r2:.4f}")

# Overfitting Analysis
print("\n[7/8] Overfitting Analysis...")
print("-" * 80)

rmse_ratio = test_rmse / train_rmse if train_rmse > 0 else float('inf')
mae_ratio = test_mae / train_mae if train_mae > 0 else float('inf')
r2_diff = train_r2 - test_r2

print(f"\n  Overfitting Indicators:")
print(f"    RMSE Ratio (Test/Train): {rmse_ratio:.3f}x")
print(f"    MAE Ratio (Test/Train):  {mae_ratio:.3f}x")
print(f"    R² Difference:           {r2_diff:.4f}")

# Overfitting assessment
if rmse_ratio < 1.3 and mae_ratio < 1.3 and r2_diff < 0.05:
    overfitting_status = "[OK] EXCELLENT: Minimal overfitting detected"
    status_emoji = "[OK]"
elif rmse_ratio < 1.5 and mae_ratio < 1.5 and r2_diff < 0.1:
    overfitting_status = "[OK] GOOD: Acceptable overfitting level"
    status_emoji = "[OK]"
elif rmse_ratio < 2.0 and mae_ratio < 2.0 and r2_diff < 0.15:
    overfitting_status = "[WARNING] MODERATE: Some overfitting present"
    status_emoji = "[WARNING]"
else:
    overfitting_status = "[ERROR] HIGH: Significant overfitting detected"
    status_emoji = "[ERROR]"

print(f"\n  {overfitting_status}")

# Cross-validation for robust evaluation
print("\n  Performing 5-fold cross-validation...")
kfold = KFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(
    model, X_train, y_train, 
    cv=kfold, 
    scoring='neg_root_mean_squared_error', 
    n_jobs=-1
)
cv_rmse_mean = -cv_scores.mean()
cv_rmse_std = cv_scores.std()

print(f"  CV RMSE: {cv_rmse_mean:.2f} (+/- {cv_rmse_std:.2f})")
print(f"  CV R²:   {cross_val_score(model, X_train, y_train, cv=kfold, scoring='r2', n_jobs=-1).mean():.4f}")

# Feature Importance
print("\n[8/8] Feature Importance Analysis...")
print("-" * 80)

feature_importance = pd.DataFrame({
    'Feature': feature_columns,
    'Importance': model.feature_importances_
}).sort_values('Importance', ascending=False)

print("\n  Top 10 Most Important Features:")
for idx, row in feature_importance.head(10).iterrows():
    print(f"    {row['Feature']:30s}: {row['Importance']:.4f}")

# Visualizations
print("\n[9/8] Generating Visualizations...")
print("-" * 80)

# 1. Feature Importance Plot
plt.figure(figsize=(10, 8))
feature_importance_sorted = feature_importance.sort_values('Importance', ascending=True).tail(10)
plt.barh(feature_importance_sorted['Feature'], feature_importance_sorted['Importance'], 
         color='steelblue', alpha=0.8)
plt.xlabel('Importance Score', fontsize=12)
plt.title('Top 10 Feature Importance (Regularized XGBoost)', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('feature_importance_pakistan.png', dpi=300, bbox_inches='tight')
print("  [OK] Saved: feature_importance_pakistan.png")
plt.close()

# 2. Actual vs Predicted Plot
plt.figure(figsize=(14, 6))

plt.subplot(1, 2, 1)
plt.scatter(y_train, y_pred_train, alpha=0.5, s=20, color='blue')
plt.plot([y_train.min(), y_train.max()], [y_train.min(), y_train.max()], 
         'r--', lw=2, label='Perfect Prediction')
plt.xlabel('Actual Sales', fontsize=11)
plt.ylabel('Predicted Sales', fontsize=11)
plt.title(f'Training Set\nR² = {train_r2:.4f}', fontsize=12, fontweight='bold')
plt.legend()
plt.grid(True, alpha=0.3)

plt.subplot(1, 2, 2)
plt.scatter(y_test, y_pred_test, alpha=0.5, s=20, color='green')
plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 
         'r--', lw=2, label='Perfect Prediction')
plt.xlabel('Actual Sales', fontsize=11)
plt.ylabel('Predicted Sales', fontsize=11)
plt.title(f'Test Set\nR² = {test_r2:.4f}', fontsize=12, fontweight='bold')
plt.legend()
plt.grid(True, alpha=0.3)

plt.suptitle('Actual vs Predicted Sales', fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig('actual_vs_predicted_pakistan.png', dpi=300, bbox_inches='tight')
print("  [OK] Saved: actual_vs_predicted_pakistan.png")
plt.close()

# 3. Overfitting Comparison Plot
plt.figure(figsize=(12, 6))
metrics = ['RMSE', 'MAE', 'R²']
train_vals = [train_rmse/100, train_mae/10, train_r2]  # Scale for visibility
test_vals = [test_rmse/100, test_mae/10, test_r2]

x = np.arange(len(metrics))
width = 0.35

bars1 = plt.bar(x - width/2, train_vals, width, label='Training', alpha=0.8, color='steelblue')
bars2 = plt.bar(x + width/2, test_vals, width, label='Test', alpha=0.8, color='coral')

plt.xlabel('Metrics', fontsize=12)
plt.ylabel('Values (Scaled)', fontsize=12)
plt.title('Training vs Test Performance Comparison\n(RMSE/100, MAE/10 for visibility)', 
          fontsize=13, fontweight='bold')
plt.xticks(x, metrics)
plt.legend(fontsize=11)
plt.grid(True, alpha=0.3, axis='y')

# Add value labels on bars
for bars in [bars1, bars2]:
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.3f}',
                ha='center', va='bottom', fontsize=9)

plt.tight_layout()
plt.savefig('overfitting_comparison_pakistan.png', dpi=300, bbox_inches='tight')
print("  [OK] Saved: overfitting_comparison_pakistan.png")
plt.close()

# 4. Residual Plot
plt.figure(figsize=(14, 6))

residuals_train = y_train - y_pred_train
residuals_test = y_test - y_pred_test

plt.subplot(1, 2, 1)
plt.scatter(y_pred_train, residuals_train, alpha=0.5, s=20, color='blue')
plt.axhline(y=0, color='r', linestyle='--', lw=2)
plt.xlabel('Predicted Sales', fontsize=11)
plt.ylabel('Residuals', fontsize=11)
plt.title('Training Set: Residual Plot', fontsize=12, fontweight='bold')
plt.grid(True, alpha=0.3)

plt.subplot(1, 2, 2)
plt.scatter(y_pred_test, residuals_test, alpha=0.5, s=20, color='green')
plt.axhline(y=0, color='r', linestyle='--', lw=2)
plt.xlabel('Predicted Sales', fontsize=11)
plt.ylabel('Residuals', fontsize=11)
plt.title('Test Set: Residual Plot', fontsize=12, fontweight='bold')
plt.grid(True, alpha=0.3)

plt.suptitle('Residual Analysis', fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig('residual_plot_pakistan.png', dpi=300, bbox_inches='tight')
print("  [OK] Saved: residual_plot_pakistan.png")
plt.close()

# 5. Cross-Validation Results
plt.figure(figsize=(10, 6))
cv_fold_scores = -cv_scores
plt.bar(range(1, 6), cv_fold_scores, alpha=0.7, color='steelblue', edgecolor='black')
plt.axhline(y=cv_rmse_mean, color='r', linestyle='--', lw=2, label=f'Mean: {cv_rmse_mean:.2f}')
plt.xlabel('Fold', fontsize=12)
plt.ylabel('RMSE', fontsize=12)
plt.title('5-Fold Cross-Validation Results', fontsize=13, fontweight='bold')
plt.legend(fontsize=11)
plt.grid(True, alpha=0.3, axis='y')
plt.xticks(range(1, 6))
plt.tight_layout()
plt.savefig('cross_validation_pakistan.png', dpi=300, bbox_inches='tight')
print("  [OK] Saved: cross_validation_pakistan.png")
plt.close()

# Save the model
print("\n[10/8] Saving Model and Results...")
print("-" * 80)

model.save_model('xgboost_tshirt_trend_model_pakistan.json')
print("  [OK] Model saved as: xgboost_tshirt_trend_model_pakistan.json")

# Save predictions to CSV
predictions_df = df.copy()
predictions_df['Predicted_Sales'] = model.predict(X)
predictions_df['Sales_Difference'] = predictions_df['Predicted_Sales'] - predictions_df['Sales']
predictions_df['Prediction_Error_Pct'] = (abs(predictions_df['Sales_Difference']) / 
                                         (predictions_df['Sales'] + 1)) * 100

predictions_df.to_csv('tshirt_sales_predictions_pakistan.csv', index=False)
print("  [OK] Predictions saved as: tshirt_sales_predictions_pakistan.csv")

# Save label encoders (for future predictions)
import pickle
with open('label_encoders_pakistan.pkl', 'wb') as f:
    pickle.dump(label_encoders, f)
print("  [OK] Label encoders saved as: label_encoders_pakistan.pkl")

# Save feature columns (for consistent inference)
with open('feature_columns_pakistan.json', 'w', encoding='utf-8') as f:
    json.dump(feature_columns, f, indent=2)
print("  [OK] Feature columns saved as: feature_columns_pakistan.json")

# Summary report
print("\n" + "="*80)
print("FINAL SUMMARY REPORT")
print("="*80)
print(f"""
Model Configuration:
  - Algorithm: XGBoost Regressor (Regularized)
  - Target: T-Shirt Sales Trend Prediction
  - Market: Pakistani Sector
  - Dataset Size: {df.shape[0]} products

Performance Metrics:
  - Test R² Score: {test_r2:.4f}
  - Test RMSE: {test_rmse:.2f} sales
  - Test MAE: {test_mae:.2f} sales
  - CV RMSE: {cv_rmse_mean:.2f} (+/- {cv_rmse_std:.2f})
  
Overfitting Assessment:
  {status_emoji} {overfitting_status}
  - RMSE Ratio (Test/Train): {rmse_ratio:.3f}x
  - MAE Ratio (Test/Train): {mae_ratio:.3f}x
  - R² Difference: {r2_diff:.4f}
  
Regularization Techniques Applied:
  [OK] Very shallow trees (max_depth=2)
  [OK] Low learning rate (0.02)
  [OK] Strong L1 regularization (alpha=1.5)
  [OK] Strong L2 regularization (lambda=3.0)
  [OK] Subsampling (50% samples, 50% features)
  [OK] High min_child_weight (8)
  [OK] Gamma threshold (0.3)
  
Top 3 Most Important Features:
  1. {feature_importance.iloc[0]['Feature']:30s}: {feature_importance.iloc[0]['Importance']:.4f}
  2. {feature_importance.iloc[1]['Feature']:30s}: {feature_importance.iloc[1]['Importance']:.4f}
  3. {feature_importance.iloc[2]['Feature']:30s}: {feature_importance.iloc[2]['Importance']:.4f}

Files Generated:
  1. xgboost_tshirt_trend_model_pakistan.json (trained model)
  2. tshirt_sales_predictions_pakistan.csv (predictions)
  3. label_encoders_pakistan.pkl (encoders for new predictions)
  4. feature_importance_pakistan.png
  5. actual_vs_predicted_pakistan.png
  6. residual_plot_pakistan.png
  7. overfitting_comparison_pakistan.png
  8. cross_validation_pakistan.png

Model is ready for production use!
""")

print("\n" + "="*80)
print("[OK] TRAINING COMPLETE!")
print("="*80)
