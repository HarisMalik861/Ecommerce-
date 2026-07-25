"""
Predict Sales for New T-Shirt Products - User Input Version
===========================================================
This script allows you to input details about a new t-shirt product
and get a prediction of how well it will sell.
"""

import pandas as pd
import numpy as np
import xgboost as xgb
import pickle
import json
from sklearn.preprocessing import LabelEncoder
import warnings
import os
warnings.filterwarnings('ignore')

def print_header(title):
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def print_section(title):
    print(f"\n{'-'*80}")
    print(f"  {title}")
    print(f"{'-'*80}")

def format_number(num):
    if num >= 1000:
        return f"{num/1000:.1f}K"
    return f"{int(num)}"

def format_currency(amount):
    return f"PKR {int(amount):,}"

def get_user_input():
    """Get product details from user"""
    print_header("NEW PRODUCT SALES PREDICTION")
    print("\nPlease enter the following details about your t-shirt product:\n")
    
    product_data = {}
    
    # Product Name
    product_data['Product_Name'] = input("1. Product Name: ").strip() or "New T-Shirt Product"
    
    # Price
    while True:
        try:
            price = float(input("2. Price (PKR): "))
            if price > 0:
                product_data['Price'] = price
                break
            else:
                print("   [ERROR] Price must be greater than 0")
        except ValueError:
            print("   [ERROR] Please enter a valid number")
    
    # Discount
    while True:
        try:
            discount = float(input("3. Discount Percentage (0-100): "))
            if 0 <= discount <= 100:
                product_data['Discount_Pct'] = discount
                break
            else:
                print("   [ERROR] Discount must be between 0 and 100")
        except ValueError:
            print("   [ERROR] Please enter a valid number")
    
    # Reviews (optional - can be 0 for new products)
    while True:
        try:
            reviews = input("4. Number of Reviews (press Enter for 0): ").strip()
            product_data['Reviews'] = float(reviews) if reviews else 0
            if product_data['Reviews'] >= 0:
                break
            else:
                print("   [ERROR] Reviews cannot be negative")
        except ValueError:
            print("   [ERROR] Please enter a valid number")
    
    # Gender
    print("\n5. Gender:")
    print("   Options: Male, Female, Unisex")
    gender = input("   Enter gender (press Enter for 'Unisex'): ").strip().title()
    product_data['Gender'] = gender if gender in ['Male', 'Female', 'Unisex'] else 'Unisex'
    
    # Color
    print("\n6. Color:")
    print("   Common options: Black, White, Blue, Red, Grey, Multicolor")
    color = input("   Enter color (press Enter for 'Not Specified'): ").strip()
    product_data['Color'] = color if color else 'Not Specified'
    
    # Sleeve Type
    print("\n7. Sleeve Type:")
    print("   Options: Half Sleeve, Short Sleeve, Full Sleeve, Long Sleeve")
    sleeve = input("   Enter sleeve type (press Enter for 'Not Specified'): ").strip()
    product_data['Sleeve Type'] = sleeve if sleeve else 'Not Specified'
    
    # Material
    print("\n8. Material:")
    print("   Options: Cotton, Polyester, Cotton & Polyester, Jersey")
    material = input("   Enter material (press Enter for 'Not Specified'): ").strip()
    product_data['Material'] = material if material else 'Not Specified'
    
    # Combo Item
    print("\n9. Is this a Combo Item? (T-shirt + Pant set)")
    combo = input("   Enter 'yes' or 'no' (press Enter for 'no'): ").strip().lower()
    product_data['Combo_Item'] = 'Combo' if combo in ['yes', 'y'] else 'Single'
    product_data['Is_Combo'] = 1 if combo in ['yes', 'y'] else 0
    
    # Location (optional)
    print("\n10. Location:")
    location = input("   Enter location (press Enter for 'Pakistan'): ").strip()
    product_data['Location'] = location if location else 'Pakistan'
    
    # Current Sales (for existing products, 0 for new)
    while True:
        try:
            sales = input("\n11. Current Sales (press Enter for 0 if new product): ").strip()
            product_data['Sales'] = float(sales) if sales else 0
            if product_data['Sales'] >= 0:
                break
            else:
                print("   [ERROR] Sales cannot be negative")
        except ValueError:
            print("   [ERROR] Please enter a valid number")
    
    return product_data

def prepare_features(product_data, label_encoders, trained_feature_columns=None):
    """Prepare features for prediction"""
    # Calculate derived features (must match training script exactly)
    product_data['Discounted_Price'] = product_data['Price'] * (1 - product_data['Discount_Pct']/100)
    product_data['Review_Ratio'] = product_data['Reviews'] / (product_data['Sales'] + 1)
    
    # NEW: Identify new products (products with 0 reviews and 0 sales)
    product_data['Is_New_Product'] = 1 if (product_data['Reviews'] == 0 and product_data['Sales'] == 0) else 0
    
    # NEW: Interaction features - capture non-linear relationships
    # Price-Discount interaction (value perception)
    product_data['Price_Discount_Interaction'] = product_data['Price'] * (product_data['Discount_Pct'] / 100)
    
    # Combo-Discount interaction (combo items with discounts are more attractive)
    product_data['Combo_Discount_Interaction'] = product_data['Is_Combo'] * product_data['Discount_Pct']
    
    # Price-Review interaction (higher price with reviews suggests quality)
    product_data['Price_Review_Interaction'] = product_data['Price'] * np.log1p(product_data['Reviews'])
    
    # Value Score: discounted price per unit value perception
    product_data['Value_Score'] = product_data['Discounted_Price'] / (product_data['Price'] + 1) * (1 + product_data['Discount_Pct'] / 100)
    
    # Review Quality Indicator: reviews relative to sales (higher = better quality perception)
    product_data['Review_Quality_Indicator'] = np.log1p(product_data['Review_Ratio'] * 100)
    
    # Price category
    price = product_data['Price']
    if price <= 500:
        price_cat = 'Budget'
    elif price <= 1000:
        price_cat = 'Economy'
    elif price <= 2000:
        price_cat = 'Mid-Range'
    elif price <= 5000:
        price_cat = 'Premium'
    else:
        price_cat = 'Luxury'
    product_data['Price_Category'] = price_cat
    
    # Discount category
    discount = product_data['Discount_Pct']
    if discount <= 20:
        discount_cat = 'Low'
    elif discount <= 40:
        discount_cat = 'Medium'
    elif discount <= 60:
        discount_cat = 'High'
    elif discount <= 80:
        discount_cat = 'Very High'
    else:
        discount_cat = 'Extreme'
    product_data['Discount_Category'] = discount_cat
    
    # Encode categorical variables
    categorical_cols = ['Gender', 'Color', 'Sleeve Type', 'Material', 'Location', 
                        'Price_Category', 'Discount_Category']
    
    for col in categorical_cols:
        if col in label_encoders:
            le = label_encoders[col]
            val = str(product_data.get(col, 'Not Specified'))
            # Handle unseen categories
            if val not in le.classes_:
                # New category not seen in training - add it but warn user
                le.classes_ = np.append(le.classes_, val)
                print(f"   [INFO] New {col} value '{val}' detected (not in training data)")
                print(f"          Prediction may be slightly less accurate for this category")
            try:
                product_data[col + '_Encoded'] = le.transform([val])[0]
            except:
                product_data[col + '_Encoded'] = 0
                print(f"   [WARNING] Could not encode {col}='{val}', using default encoding")
        else:
            product_data[col + '_Encoded'] = 0
    
    # Feature columns (must match training script exactly)
    default_feature_columns = [
        'Price', 'Discount_Pct', 'Reviews', 'Is_Combo', 'Discounted_Price',
        'Review_Ratio', 'Is_New_Product', 'Price_Discount_Interaction',
        'Combo_Discount_Interaction', 'Price_Review_Interaction', 'Value_Score',
        'Review_Quality_Indicator', 'Gender_Encoded', 'Color_Encoded',
        'Sleeve Type_Encoded', 'Material_Encoded', 'Location_Encoded',
        'Price_Category_Encoded', 'Discount_Category_Encoded'
    ]

    feature_columns = trained_feature_columns if trained_feature_columns else default_feature_columns
    
    # Create feature vector (must include all new features)
    feature_payload = {
        'Price': product_data['Price'],
        'Discount_Pct': product_data['Discount_Pct'],
        'Reviews': product_data['Reviews'],
        'Is_Combo': product_data['Is_Combo'],
        'Discounted_Price': product_data['Discounted_Price'],
        'Review_Ratio': product_data['Review_Ratio'],
        'Is_New_Product': product_data['Is_New_Product'],
        'Price_Discount_Interaction': product_data['Price_Discount_Interaction'],
        'Combo_Discount_Interaction': product_data['Combo_Discount_Interaction'],
        'Price_Review_Interaction': product_data['Price_Review_Interaction'],
        'Value_Score': product_data['Value_Score'],
        'Review_Quality_Indicator': product_data['Review_Quality_Indicator'],
        'Gender_Encoded': product_data['Gender_Encoded'],
        'Color_Encoded': product_data['Color_Encoded'],
        'Sleeve Type_Encoded': product_data['Sleeve Type_Encoded'],
        'Material_Encoded': product_data['Material_Encoded'],
        'Location_Encoded': product_data['Location_Encoded'],
        'Price_Category_Encoded': product_data['Price_Category_Encoded'],
        'Discount_Category_Encoded': product_data['Discount_Category_Encoded']
    }

    for col in feature_columns:
        if col not in feature_payload:
            feature_payload[col] = 0

    X = pd.DataFrame([{col: feature_payload[col] for col in feature_columns}])
    
    return X, product_data

def categorize_potential(score):
    if score >= 75:
        return 'High Potential'
    elif score >= 50:
        return 'Medium Potential'
    elif score >= 25:
        return 'Low-Medium Potential'
    else:
        return 'Low Potential'

def main():
    # Load model
    print_section("[1] Loading AI Model")
    try:
        model = xgb.XGBRegressor()
        model.load_model('xgboost_tshirt_trend_model_pakistan.json')
        print("   [OK] Model loaded successfully")
    except FileNotFoundError:
        print("   [ERROR] Model file not found!")
        print("   -> Please run 'python tshirt_trend_prediction_pakistan.py' first")
        return
    
    # Load encoders
    try:
        with open('label_encoders_pakistan.pkl', 'rb') as f:
            label_encoders = pickle.load(f)
        print("   [OK] Encoders loaded")
    except FileNotFoundError:
        print("   [ERROR] Encoders not found!")
        return
    
    trained_feature_columns = None
    try:
        with open('feature_columns_pakistan.json', 'r', encoding='utf-8') as f:
            trained_feature_columns = json.load(f)
        if isinstance(trained_feature_columns, list) and trained_feature_columns:
            print(f"   [OK] Feature schema loaded ({len(trained_feature_columns)} features)")
        else:
            trained_feature_columns = None
    except FileNotFoundError:
        print("   [WARNING] feature_columns_pakistan.json not found, using default feature schema")

    # Get user input
    product_data = get_user_input()
    
    # Prepare features
    print_section("[2] Processing Product Data")
    X, product_data = prepare_features(product_data, label_encoders, trained_feature_columns)
    print("   [OK] Features prepared")
    if product_data['Is_New_Product'] == 1:
        print("   [INFO] Product identified as NEW (0 reviews, 0 sales)")
        print("          Model will use new product patterns for prediction")
    
    # Make prediction
    print_section("[3] Making Prediction")
    predicted_sales = model.predict(X)[0]
    product_data['Predicted_Future_Sales'] = predicted_sales
    
    # Calculate potential score (using actual min/max from training predictions)
    # Try to load actual ranges from predictions file, otherwise use estimates
    try:
        pred_df = pd.read_csv('future_sales_predictions.csv')
        max_sales = pred_df['Predicted_Future_Sales'].max()
        min_sales = pred_df['Predicted_Future_Sales'].min()
        # Use percentile-based scoring for better accuracy
        percentile = (pred_df['Predicted_Future_Sales'] <= predicted_sales).sum() / len(pred_df) * 100
        potential_score = percentile  # Use percentile as score
    except:
        # Fallback: use approximate ranges and percentile estimation
        max_sales = 40000
        min_sales = -2000  # Some predictions can be negative
        # Estimate percentile based on typical distribution
        if predicted_sales >= 30000:
            potential_score = 95
        elif predicted_sales >= 20000:
            potential_score = 80
        elif predicted_sales >= 10000:
            potential_score = 60
        elif predicted_sales >= 5000:
            potential_score = 40
        elif predicted_sales >= 2000:
            potential_score = 25
        else:
            potential_score = ((predicted_sales - min_sales) / (max_sales - min_sales + 1)) * 100
    
    product_data['Sales_Potential_Score'] = potential_score
    product_data['Sales_Potential_Category'] = categorize_potential(potential_score)
    
    # Calculate growth
    current_sales = product_data['Sales']
    growth = predicted_sales - current_sales
    growth_pct = ((predicted_sales - current_sales) / (current_sales + 1)) * 100 if current_sales > 0 else 0
    
    # Display results
    print_header("PREDICTION RESULTS")
    
    print(f"\n   Product: {product_data['Product_Name']}")
    print(f"   {'='*70}")
    print(f"\n   [SALES PREDICTION]")
    print(f"   Current Sales:        {format_number(current_sales)}")
    print(f"   Predicted Sales:      {format_number(predicted_sales)}")
    print(f"   Expected Change:     {growth:+.0f} units ({growth_pct:+.1f}%)")
    
    print(f"\n   [POTENTIAL ASSESSMENT]")
    print(f"   Sales Potential Score: {potential_score:.1f}/100")
    print(f"   Category:             {product_data['Sales_Potential_Category']}")
    
    if product_data['Sales_Potential_Category'] == 'High Potential':
        print(f"   [RECOMMENDATION] This product has HIGH sales potential!")
        print(f"                    Consider prioritizing this for marketing and inventory.")
    elif product_data['Sales_Potential_Category'] == 'Medium Potential':
        print(f"   [RECOMMENDATION] This product has MEDIUM sales potential.")
        print(f"                    Good candidate for standard marketing.")
    else:
        print(f"   [RECOMMENDATION] This product may need optimization.")
        print(f"                    Consider adjusting price, discount, or features.")
    
    print(f"\n   [PRODUCT DETAILS]")
    print(f"   Price:                {format_currency(product_data['Price'])}")
    print(f"   Discount:             {product_data['Discount_Pct']:.0f}%")
    print(f"   Discounted Price:     {format_currency(product_data['Discounted_Price'])}")
    print(f"   Gender:               {product_data['Gender']}")
    print(f"   Color:                {product_data['Color']}")
    print(f"   Sleeve Type:          {product_data['Sleeve Type']}")
    print(f"   Material:             {product_data['Material']}")
    print(f"   Combo Item:           {'Yes' if product_data['Is_Combo'] else 'No'}")
    print(f"   Reviews:              {int(product_data['Reviews'])}")
    
    print(f"\n   {'='*70}")
    print(f"\n   [SUCCESS] Prediction complete!")
    print(f"   Use this information to make informed decisions about your product.\n")
    
    # Generate charts
    print_section("[4] Generating Visualization Charts")
    try:
        from generate_prediction_charts import create_prediction_folder, generate_prediction_charts
        
        folder_path = create_prediction_folder()
        print(f"   [OK] Created prediction folder: {folder_path}")
        
        generate_prediction_charts(
            product_data, predicted_sales, potential_score, 
            product_data['Sales_Potential_Category'], folder_path
        )
        
        print(f"\n   [SUCCESS] All charts saved in folder: {folder_path}/")
        print(f"   Files generated:")
        print(f"      - 01_prediction_summary.png")
        print(f"      - 02_potential_score_gauge.png")
        print(f"      - 03_feature_analysis.png")
        print(f"      - 04_market_comparison.png")
        print(f"      - 05_recommendations.png")
        print(f"      - prediction_data.csv")
    except Exception as e:
        print(f"   [WARNING] Could not generate charts: {e}")
        print(f"   Prediction data is still available above.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[INFO] Prediction cancelled by user.")
    except Exception as e:
        print(f"\n[ERROR] An error occurred: {e}")
        print("Please check your inputs and try again.")
