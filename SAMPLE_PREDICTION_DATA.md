# Sample Data for Product Sales Prediction

Use these values in the **Predict a Product** form to test the XGBoost model. Copy the values for each scenario.

---

## Scenario 1: T-Shirt – Budget, New, Summer
| Field | Value |
|-------|-------|
| Product Name | Cotton Summer Tee |
| Category | T-Shirt |
| Price (PKR) | 800 |
| Discount (%) | 25 |
| Reviews | 0 |
| Avg Rating (1–5) | 4.0 |
| Seller Rating (1–5) | 3.5 |
| Product Age (days) | 45 |
| Season | Summer |
| City | Karachi |
| Gender | Unisex |
| Color | White |
| Sleeve Type | Half Sleeve |
| Material | Cotton |
| Combo Item | ☐ |
| Flash Sale | ☐ |

---

## Scenario 2: T-Shirt – Premium, Established, Flash Sale
| Field | Value |
|-------|-------|
| Product Name | Premium Graphic Tee |
| Category | T-Shirt |
| Price (PKR) | 2500 |
| Discount (%) | 40 |
| Reviews | 180 |
| Avg Rating (1–5) | 4.5 |
| Seller Rating (1–5) | 4.2 |
| Product Age (days) | 200 |
| Season | Spring |
| City | Lahore |
| Gender | Male |
| Color | Black |
| Sleeve Type | Full Sleeve |
| Material | Cotton Blend |
| Combo Item | ☐ |
| Flash Sale | ☑ |

---

## Scenario 3: Jeans – Mid-range, Seasonal
| Field | Value |
|-------|-------|
| Product Name | Slim Fit Denim Jeans |
| Category | Jeans |
| Price (PKR) | 3500 |
| Discount (%) | 15 |
| Reviews | 65 |
| Avg Rating (1–5) | 4.2 |
| Seller Rating (1–5) | 4.0 |
| Product Age (days) | 120 |
| Season | Fall |
| City | Islamabad |
| Gender | Male |
| Color | Blue |
| Material | Denim |
| Combo Item | ☐ |
| Flash Sale | ☐ |

---

## Scenario 4: Shoes – High Price, Low Discount
| Field | Value |
|-------|-------|
| Product Name | Leather Formal Shoes |
| Category | Shoes |
| Price (PKR) | 5500 |
| Discount (%) | 10 |
| Reviews | 42 |
| Avg Rating (1–5) | 4.3 |
| Seller Rating (1–5) | 3.8 |
| Product Age (days) | 90 |
| Season | Winter |
| City | Karachi |
| Gender | Unisex |
| Color | Black |
| Material | Leather |
| Combo Item | ☐ |
| Flash Sale | ☐ |

---

## Scenario 5: Socks – Budget, Combo
| Field | Value |
|-------|-------|
| Product Name | Cotton Ankle Socks Pack |
| Category | Socks |
| Price (PKR) | 350 |
| Discount (%) | 30 |
| Reviews | 250 |
| Avg Rating (1–5) | 4.6 |
| Seller Rating (1–5) | 4.5 |
| Product Age (days) | 180 |
| Season | Winter |
| City | Lahore |
| Gender | Unisex |
| Color | White |
| Material | Cotton |
| Combo Item | ☑ |
| Flash Sale | ☐ |

---

## Scenario 6: Shorts – New Arrival, Summer Peak
| Field | Value |
|-------|-------|
| Product Name | Athletic Running Shorts |
| Category | Shorts |
| Price (PKR) | 1200 |
| Discount (%) | 20 |
| Reviews | 0 |
| Avg Rating (1–5) | 4.0 |
| Seller Rating (1–5) | 3.5 |
| Product Age (days) | 10 |
| Season | Summer |
| City | Karachi |
| Gender | Male |
| Color | Blue |
| Material | Polyester |
| Combo Item | ☐ |
| Flash Sale | ☑ |

---

## Quick Copy (T-Shirt – simple case)

```
Product Name: Test T-Shirt
Price: 1000
Discount: 30
Reviews: 0
Avg Rating: 4.0
Seller Rating: 3.5
Product Age: 90
Season: Summer
City: Karachi
Gender: Unisex
Color: Black
Sleeve Type: Half Sleeve
Material: Cotton
```

---

## Tips

- **New products**: Use Reviews = 0 and Product Age < 30 days.
- **Seasonal**: Try Summer for T-Shirts/Shorts, Winter for Socks.
- **Higher predictions**: Good rating, more reviews, moderate discount, and strong season/city.
- **Test trend chart**: Run prediction and review the “Predicted Sales Trend by Season” line across Spring, Summer, Fall, Winter.
