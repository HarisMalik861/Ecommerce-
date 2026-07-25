"""
Realistic Synthetic Dataset — Pakistani E-Commerce (500 k rows)
================================================================
500,000 rows | 100,000 per category: T-Shirt, Jeans, Shoes, Socks, Shorts

Columns match user-provided prediction inputs only:
  category, gender, color, sleeve, material, combo, flash sale,
  price, discount, month, year, city  (+ product name and sales target).

Historical coverage: 2020–2025 (6 years), ~500k rows total.
"""

import numpy as np
import pandas as pd
from numpy.random import default_rng
import time

RNG  = default_rng(42)
ROWS = 100_000          # default per category (500k total)
CATS = ['T-Shirt', 'Jeans', 'Shoes', 'Socks', 'Shorts']

# ─── PER-CATEGORY CONFIG ────────────────────────────────────────────────────
CAT_CFG = {
    'T-Shirt': dict(
        price_mu=900,   price_sig=600,   price_min=250,   price_max=4500,
        base_demand=450,   price_elasticity=1.1,
        genders=['Male', 'Female', 'Unisex'],    gender_w=[0.50, 0.30, 0.20],
        colors=['White','Black','Grey','Blue','Red','Green','Navy','Yellow','Pink','Maroon','Brown','Olive'],
        color_w=[0.14,0.14,0.12,0.11,0.09,0.08,0.08,0.07,0.06,0.05,0.04,0.02],
        sleeve=['Half Sleeve','Full Sleeve','Sleeveless'], sleeve_w=[0.55,0.35,0.10],
        materials=['Cotton','Polyester','Cotton Blend','Jersey','Linen'],
        mat_w=[0.45,0.25,0.18,0.08,0.04],
        month_boost={
            'Jan': 0.55, 'Feb': 0.55, 'Mar': 1.15, 'Apr': 1.15, 'May': 1.15,
            'Jun': 1.60, 'Jul': 1.60, 'Aug': 1.60, 'Sep': 0.80, 'Oct': 0.80, 'Nov': 0.80, 'Dec': 0.55,
        },
        combo_rate=0.18, flash_rate=0.04,
    ),
    'Jeans': dict(
        price_mu=2200,  price_sig=1100,  price_min=600,   price_max=9000,
        base_demand=220,   price_elasticity=0.9,
        genders=['Male','Female','Unisex'],       gender_w=[0.58,0.38,0.04],
        colors=['Blue','Black','Grey','Navy','Dark Blue','Brown','White'],
        color_w=[0.28,0.22,0.15,0.14,0.10,0.07,0.04],
        sleeve=['Not Specified'], sleeve_w=[1.0],
        materials=['Denim','Stretch Denim','Slim Denim','Cotton Denim'],
        mat_w=[0.42,0.28,0.20,0.10],
        month_boost={
            'Jan': 1.45, 'Feb': 1.45, 'Mar': 1.05, 'Apr': 1.05, 'May': 1.05,
            'Jun': 0.75, 'Jul': 0.75, 'Aug': 0.75, 'Sep': 1.25, 'Oct': 1.25, 'Nov': 1.25, 'Dec': 1.45,
        },
        combo_rate=0.10, flash_rate=0.05,
    ),
    'Shoes': dict(
        price_mu=3500,  price_sig=2500,  price_min=400,   price_max=20000,
        base_demand=180,   price_elasticity=0.8,
        genders=['Male','Female','Unisex'],       gender_w=[0.52,0.40,0.08],
        colors=['Black','White','Brown','Navy','Grey','Blue','Red','Beige','Green'],
        color_w=[0.22,0.18,0.15,0.12,0.10,0.08,0.07,0.05,0.03],
        sleeve=['Not Specified'], sleeve_w=[1.0],
        materials=['Leather','Synthetic','Canvas','Mesh','Suede','Rubber'],
        mat_w=[0.28,0.30,0.18,0.12,0.08,0.04],
        month_boost={
            'Jan': 0.70, 'Feb': 0.70, 'Mar': 1.20, 'Apr': 1.20, 'May': 1.20,
            'Jun': 1.10, 'Jul': 1.10, 'Aug': 1.10, 'Sep': 1.10, 'Oct': 1.10, 'Nov': 1.10, 'Dec': 0.70,
        },
        combo_rate=0.06, flash_rate=0.06,
    ),
    'Socks': dict(
        price_mu=280,   price_sig=180,   price_min=80,    price_max=1200,
        base_demand=900,   price_elasticity=1.3,
        genders=['Male','Female','Unisex'],       gender_w=[0.40,0.35,0.25],
        colors=['White','Black','Grey','Blue','Brown','Multicolor','Navy','Red','Pink'],
        color_w=[0.25,0.22,0.15,0.10,0.08,0.08,0.06,0.04,0.02],
        sleeve=['Not Specified'], sleeve_w=[1.0],
        materials=['Cotton','Wool','Polyester','Nylon','Spandex'],
        mat_w=[0.45,0.20,0.18,0.12,0.05],
        month_boost={
            'Jan': 1.60, 'Feb': 1.60, 'Mar': 0.90, 'Apr': 0.90, 'May': 0.90,
            'Jun': 0.80, 'Jul': 0.80, 'Aug': 0.80, 'Sep': 1.10, 'Oct': 1.10, 'Nov': 1.10, 'Dec': 1.60,
        },
        combo_rate=0.40, flash_rate=0.08,
    ),
    'Shorts': dict(
        price_mu=950,   price_sig=550,   price_min=200,   price_max=4000,
        base_demand=320,   price_elasticity=1.1,
        genders=['Male','Female','Unisex'],       gender_w=[0.60,0.30,0.10],
        colors=['Blue','Black','Grey','White','Navy','Green','Brown','Red','Olive'],
        color_w=[0.18,0.18,0.14,0.12,0.10,0.10,0.08,0.06,0.04],
        sleeve=['Not Specified'], sleeve_w=[1.0],
        materials=['Cotton','Polyester','Nylon','Denim','Linen'],
        mat_w=[0.40,0.28,0.16,0.10,0.06],
        month_boost={
            'Jan': 0.30, 'Feb': 0.30, 'Mar': 1.30, 'Apr': 1.30, 'May': 1.30,
            'Jun': 1.75, 'Jul': 1.75, 'Aug': 1.75, 'Sep': 0.65, 'Oct': 0.65, 'Nov': 0.65, 'Dec': 0.30,
        },
        combo_rate=0.12, flash_rate=0.04,
    ),
}

CITIES = ['Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad',
          'Multan','Peshawar','Hyderabad','Quetta','Sialkot',
          'Gujranwala','Abbottabad','Sargodha','Bahawalpur','Sukkur']
CITY_W  = [0.22,0.20,0.09,0.08,0.07,0.06,0.05,0.04,0.03,0.03,0.04,0.02,0.02,0.02,0.03]

CITY_DEMAND = {
    'Karachi':1.30,'Lahore':1.25,'Islamabad':1.10,'Rawalpindi':1.05,
    'Faisalabad':1.00,'Multan':0.95,'Peshawar':0.90,'Hyderabad':0.88,
    'Quetta':0.80,'Sialkot':0.92,'Gujranwala':0.90,'Abbottabad':0.78,
    'Sargodha':0.82,'Bahawalpur':0.80,'Sukkur':0.75,
}

MONTHS  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
MONTH_W = [1 / 12] * 12

YEARS = [2020, 2021, 2022, 2023, 2024, 2025]
# Gradual e-commerce growth across the historical window.
YEAR_GROWTH = {
    2020: 0.82,
    2021: 0.88,
    2022: 0.94,
    2023: 1.00,
    2024: 1.08,
    2025: 1.15,
}

# Style-only product names.
PRODUCT_STYLES = {
    'T-Shirt': [
        'Round Neck',
        'V-Neck',
        'Polo',
        'Graphic Tee',
        'Plain',
        'Printed',
        'Casual',
        'Oversized',
    ],
    'Jeans': [
        'Slim Fit',
        'Regular Fit',
        'Skinny',
        'High-Waist',
        'Bootcut',
        'Straight Leg',
        'Ripped',
    ],
    'Shoes': [
        'Casual Shoes',
        'Running Shoes',
        'Loafers',
        'Sports Sneakers',
        'Formal Shoes',
        'Trainers',
        'Ankle Boots',
    ],
    'Socks': [
        'Ankle Socks',
        'Sports Socks',
        'Thermal Socks',
        'Woolen Winter Socks',
        'No-Show Socks',
        'Athletic Socks',
        'Crew Socks',
    ],
    'Shorts': [
        'Cargo Shorts',
        'Athletic Shorts',
        'Beach Shorts',
        'Board Shorts',
        'Gym Shorts',
        'Denim Shorts',
        'Running Shorts',
    ],
}

def make_name(cat, color, material, sleeve, gender, rng):
    styles = PRODUCT_STYLES.get(cat) or ['Standard']
    return str(rng.choice(styles))

# ─── MAIN GENERATION PER CATEGORY ───────────────────────────────────────────
def generate_category(cat, n, rng, year):
    cfg = CAT_CFG[cat]
    print(f"  Generating {cat:10s} {year} ({n:,} rows)...", flush=True)

    # --- Price (log-normal, clipped) ---
    log_mu  = np.log(cfg['price_mu'])
    log_sig = np.log(1 + cfg['price_sig'] / cfg['price_mu'])
    price   = np.clip(rng.lognormal(log_mu, log_sig, n),
                      cfg['price_min'], cfg['price_max']).round(2)

    # --- Discount: bimodal ---
    disc_low  = rng.uniform(0,  20, n)
    disc_high = rng.uniform(20, 65, n)
    discount  = np.where(rng.random(n) < 0.30, disc_high, disc_low).round(1)

    gender   = rng.choice(cfg['genders'],   n, p=cfg['gender_w'])
    color    = rng.choice(cfg['colors'],    n, p=cfg['color_w'])
    sleeve   = rng.choice(cfg['sleeve'],    n, p=cfg['sleeve_w'])
    material = rng.choice(cfg['materials'], n, p=cfg['mat_w'])
    city     = rng.choice(CITIES,           n, p=CITY_W)
    month    = rng.choice(MONTHS,           n, p=MONTH_W)
    combo    = rng.random(n) < cfg['combo_rate']
    flash    = rng.random(n) < cfg['flash_rate']

    # --- Sales (driven by user-input features only) ---
    base            = cfg['base_demand']
    avg_price       = cfg['price_mu']

    price_effect    = np.exp(-cfg['price_elasticity'] * (price - avg_price) / avg_price)
    discount_effect = 1 + 1.80 * (discount / 100) ** 0.45
    month_effect    = np.array([cfg['month_boost'][m] for m in month])
    combo_effect    = np.where(combo, 1.25, 1.0)
    flash_effect    = np.where(flash, rng.uniform(1.8, 3.2, n), 1.0)
    city_effect     = np.array([CITY_DEMAND[c] for c in city])
    year_effect     = YEAR_GROWTH[year]

    demand = (base * price_effect * discount_effect
              * month_effect * combo_effect * flash_effect * city_effect * year_effect)

    noise = rng.lognormal(0, 0.32, n)
    sales = np.round(demand * noise).astype(int).clip(0, 200_000)

    # --- Product names ---
    product_names = [make_name(cat, color[i], material[i], sleeve[i], gender[i], rng)  # style-only
                     for i in range(n)]

    return pd.DataFrame({
        'Product_Name':     product_names,
        'Category':         cat,
        'Gender':           gender,
        'Color':            color,
        'Sleeve_Type':      sleeve,
        'Material':         material,
        'Combo_Item':       np.where(combo, 'Combo', 'Single'),
        'Is_Flash_Sale':    flash.astype(int),
        'Price':            price,
        'Discount_Pct':     discount,
        'Month':            month,
        'Year':             year,
        'City':             city,
        'Sales':            sales,
    })

def generate_dataset(total_rows: int, out_path: str | None = None, seed: int = 42):
    """Generate a balanced multicategory dataset with the same schema as the 500k file."""
    if total_rows % len(CATS) != 0:
        raise ValueError(
            f"total_rows must be divisible by {len(CATS)} categories; got {total_rows}"
        )

    rows_per_cat = total_rows // len(CATS)
    rng = default_rng(seed)
    t0 = time.time()

    print("=" * 70)
    print("  REALISTIC PAKISTANI E-COMMERCE DATASET GENERATOR")
    print(
        f"  Target: {total_rows:,} rows | {rows_per_cat:,} per category "
        f"| years {YEARS[0]}–{YEARS[-1]}"
    )
    print("=" * 70)

    rows_per_year = rows_per_cat // len(YEARS)
    frames = []
    for cat in CATS:
        for i, year in enumerate(YEARS):
            n = rows_per_year
            if i == len(YEARS) - 1:
                n = rows_per_cat - rows_per_year * (len(YEARS) - 1)
            frames.append(generate_category(cat, n, rng, year))

    print("\nShuffling...", flush=True)
    df = (
        pd.concat(frames, ignore_index=True)
        .sample(frac=1, random_state=seed)
        .reset_index(drop=True)
    )

    if out_path is None:
        label = f"{total_rows // 1000}k"
        out_path = f"daraz_multicategory_pakistan_{label}.csv"

    # Save first so a console encoding error cannot lose the file.
    df.to_csv(out_path, index=False)
    print(f"\n  Saved -> {out_path}  ({df.shape[0]:,} rows x {df.shape[1]} cols)")

    print("\n-- Dataset Summary ---------------------------------------------")
    print(f"  Shape     : {df.shape}")
    print(f"  Columns   : {list(df.columns)}\n")
    print(df["Category"].value_counts().to_string())
    print("\n  Sales per category:")
    print(
        df.groupby("Category")["Sales"]
        .describe()[["mean", "std", "min", "50%", "max"]]
        .round(0)
        .to_string()
    )
    print("\n  Rows per year:")
    print(df["Year"].value_counts().sort_index().to_string())
    print(f"\n  Corr Price vs Sales    : {df['Price'].corr(df['Sales']):.3f}")
    print(f"  Corr Discount vs Sales : {df['Discount_Pct'].corr(df['Sales']):.3f}")
    print(f"  Time  : {time.time() - t0:.1f}s")
    print("=" * 70)
    return df


# ─── RUN ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate Daraz-style Pakistani multicategory ecommerce CSVs",
    )
    parser.add_argument(
        "--rows",
        type=int,
        default=len(CATS) * ROWS,
        help="Total rows (must be divisible by 5). Examples: 200000, 300000, 500000",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output CSV path (default: daraz_multicategory_pakistan_<Nk>.csv)",
    )
    parser.add_argument("--seed", type=int, default=42, help="RNG seed")
    args = parser.parse_args()
    generate_dataset(args.rows, args.output, args.seed)
