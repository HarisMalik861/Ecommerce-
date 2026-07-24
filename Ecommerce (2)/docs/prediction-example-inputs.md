# Example prediction inputs by category and potential band

Use these values on the category **Predict a … Product** form, then click **Run Prediction**.  
**Potential band** comes from the **sales potential score** (percentile vs training `Sales` in `daraz_multicategory_pakistan_500k.csv`): **≥75** High, **50–74.99** Medium, **25–49.99** Low–Medium, **&lt;25** Low.

The rows below were checked against the **current** model and dataset in this repo (same logic as `predict_new_product_json.py`). If you retrain the model or change the CSV, predicted numbers and bands may shift slightly.

**Defaults used everywhere unless overridden:** Seller rating **4.0**, Product age (days) **45**, Gender **Male**, Color **Black**, Combo **off**, Flash sale **off**.

---

## T-Shirt

| Band | Expected band | Product name | Price (PKR) | Discount % | Reviews | Avg rating | Sleeve | Material | Month | City |
|------|----------------|-------------|------------:|-----------:|--------:|-----------|--------|----------|-------|------|
| **Low** | Low Potential | Budget Tee — Low Signal | 6000 | 0 | 0 | 2.0 | Half Sleeve | Cotton | Dec | Sukkur |
| **Medium** | Medium Potential | Mid Tee — Dec Karachi | 300 | 0 | 50 | 2.0 | Half Sleeve | Cotton | Dec | Karachi |
| **High** | High Potential | Viral Drop — Summer Karachi | 300 | 40 | 15000 | 5.0 | Half Sleeve | Cotton | Jun | Karachi |

**High row:** also enable **Combo item** and **Flash sale**.

---

## Jeans

| Band | Expected band | Product name | Price (PKR) | Discount % | Reviews | Avg rating | Material | Month | City |
|------|----------------|-------------|------------:|-----------:|--------:|-----------|----------|-------|------|
| **Low** | Low Potential | Premium Jeans — Weak Season | 15000 | 0 | 0 | 2.0 | Denim | Jun | Sukkur |
| **Medium** | Medium Potential | Mid Jeans — Discount Flash | 2500 | 40 | 0 | 2.0 | Denim | Dec | Sukkur |
| **High** | High Potential | Volume Jeans — Peak Karachi | 300 | 40 | 15000 | 5.0 | Denim | Jun | Karachi |

**Medium row:** also enable **Combo item** and **Flash sale**.  
**High row:** also enable **Combo item** and **Flash sale**.

---

## Shoes

| Band | Expected band | Product name | Price (PKR) | Discount % | Reviews | Avg rating | Material | Month | City |
|------|----------------|-------------|------------:|-----------:|--------:|-----------|----------|-------|------|
| **Low** | Low Potential | Luxury Shoes — Low Demand | 15000 | 0 | 0 | 2.0 | Leather | Dec | Sukkur |
| **Medium** | Medium Potential | Mid Shoes — Flash Winter | 2500 | 0 | 3000 | 4.0 | Leather | Dec | Sukkur |
| **High** | High Potential | Mass Shoes — Peak Karachi | 300 | 40 | 15000 | 5.0 | Leather | Jun | Karachi |

**Medium row:** enable **Flash sale** only (Combo off).  
**High row:** enable **Combo item** and **Flash sale**.

---

## Socks

| Band | Expected band | Product name | Price (PKR) | Discount % | Reviews | Avg rating | Material | Month | City |
|------|----------------|-------------|------------:|-----------:|--------:|-----------|----------|-------|------|
| **Low** | Low Potential | Pricy Socks — Low Activity | 6000 | 0 | 0 | 2.0 | Cotton | Jun | Sukkur |
| **Medium** | Medium Potential | Everyday Socks — Karachi | 300 | 0 | 0 | 4.0 | Cotton | Jun | Karachi |
| **High** | High Potential | Viral Socks — Winter Karachi | 300 | 40 | 15000 | 5.0 | Cotton | Dec | Karachi |

**High row:** enable **Combo item** and **Flash sale**.

---

## Shorts

| Band | Expected band | Product name | Price (PKR) | Discount % | Reviews | Avg rating | Material | Month | City |
|------|----------------|-------------|------------:|-----------:|--------:|-----------|----------|-------|------|
| **Low** | Low Potential | Shorts — Off Season | 6000 | 0 | 0 | 2.0 | Cotton | Dec | Sukkur |
| **Medium** | Medium Potential | Shorts — Promo Bundle | 2500 | 40 | 50 | 5.0 | Cotton | Jun | Sukkur |
| **High** | High Potential | Shorts — Peak Karachi | 300 | 40 | 15000 | 5.0 | Cotton | Jun | Karachi |

**Medium row:** enable **Combo item** and **Flash sale**.  
**High row:** enable **Combo item** and **Flash sale**.

---

## Why these patterns move the band

- **Lower predicted sales → lower score → Low potential:** very high **price**, **no reviews**, **low star rating**, weaker **city/season** combo, no flash/combo.
- **Higher predicted sales → higher score → High potential:** low **price**, very high **reviews**, **5★** rating, strong **discount**, **Karachi**, season that matches the category, plus **flash** and **combo** where noted.

---

## API / JSON (optional)

Same payload shape as `POST /api/trends/predict`: include `months` as all twelve month codes if you call the API from code (`Jan` … `Dec`).
