"""
Simplify Product_Name so it only keeps style/type.
Color, material, gender, sleeve, brand, and category are already in other columns.
"""

from __future__ import annotations

import argparse
import os
import re

import pandas as pd

from generate_multicategory_dataset import PRODUCT_STYLES

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

# Longest-first keyword match so "Straight Leg" wins over "Leg", etc.
STYLE_KEYWORDS: dict[str, list[tuple[str, str]]] = {
    "T-Shirt": [
        ("drop shoulder", "Oversized"),
        ("oversized", "Oversized"),
        ("round neck", "Round Neck"),
        ("v-neck", "V-Neck"),
        ("v neck", "V-Neck"),
        ("graphic tee", "Graphic Tee"),
        ("graphic", "Graphic Tee"),
        ("polo", "Polo"),
        ("printed", "Printed"),
        ("plain", "Plain"),
        ("casual", "Casual"),
    ],
    "Jeans": [
        ("straight leg", "Straight Leg"),
        ("high-waist", "High-Waist"),
        ("high waist", "High-Waist"),
        ("regular fit", "Regular Fit"),
        ("slim fit", "Slim Fit"),
        ("skinny", "Skinny"),
        ("bootcut", "Bootcut"),
        ("ripped", "Ripped"),
        ("slim", "Slim Fit"),
        ("regular", "Regular Fit"),
    ],
    "Shoes": [
        ("sports sneakers", "Sports Sneakers"),
        ("running shoes", "Running Shoes"),
        ("casual shoes", "Casual Shoes"),
        ("formal", "Formal Shoes"),
        ("ankle boots", "Ankle Boots"),
        ("trainers", "Trainers"),
        ("loafers", "Loafers"),
        ("sneakers", "Sports Sneakers"),
        ("running", "Running Shoes"),
        ("boots", "Ankle Boots"),
    ],
    "Socks": [
        ("woolen winter", "Woolen Winter Socks"),
        ("winter socks", "Woolen Winter Socks"),
        ("no-show", "No-Show Socks"),
        ("thermal", "Thermal Socks"),
        ("athletic", "Athletic Socks"),
        ("sports", "Sports Socks"),
        ("ankle", "Ankle Socks"),
        ("crew", "Crew Socks"),
        ("pack", "Crew Socks"),
    ],
    "Shorts": [
        ("athletic shorts", "Athletic Shorts"),
        ("running shorts", "Running Shorts"),
        ("board shorts", "Board Shorts"),
        ("beach shorts", "Beach Shorts"),
        ("cargo shorts", "Cargo Shorts"),
        ("gym shorts", "Gym Shorts"),
        ("denim shorts", "Denim Shorts"),
        ("athletic", "Athletic Shorts"),
        ("running", "Running Shorts"),
        ("board", "Board Shorts"),
        ("beach", "Beach Shorts"),
        ("cargo", "Cargo Shorts"),
        ("gym", "Gym Shorts"),
        ("denim", "Denim Shorts"),
    ],
}


def simplify_name(name: str, category: str, fallback_index: int = 0) -> str:
    text = str(name or "").strip().lower()
    text = re.sub(r"\s+", " ", text)
    for keyword, style in STYLE_KEYWORDS.get(category, []):
        if keyword in text:
            return style

    styles = PRODUCT_STYLES.get(category) or ["Standard"]
    return styles[fallback_index % len(styles)]


def fix_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    if "Product_Name" not in df.columns or "Category" not in df.columns:
        raise ValueError("CSV must include Product_Name and Category columns")

    out = df.copy()
    counters: dict[str, int] = {}
    new_names: list[str] = []
    for category, old_name in zip(out["Category"].astype(str), out["Product_Name"]):
        cat = category.strip()
        idx = counters.get(cat, 0)
        new_names.append(simplify_name(str(old_name), cat, idx))
        counters[cat] = idx + 1
    out["Product_Name"] = new_names
    return out


def fix_file(path: str) -> None:
    if not os.path.exists(path):
        print(f"  skip (missing): {path}")
        return

    print(f"  fixing: {path}")
    df = pd.read_csv(path)
    before = df["Product_Name"].nunique() if "Product_Name" in df.columns else 0
    fixed = fix_dataframe(df)
    fixed.to_csv(path, index=False)
    after = fixed["Product_Name"].nunique()
    print(f"    rows={len(fixed):,}  unique names {before} -> {after}")
    for cat in sorted(fixed["Category"].dropna().astype(str).unique()):
        samples = (
            fixed.loc[fixed["Category"].astype(str) == cat, "Product_Name"]
            .drop_duplicates()
            .head(8)
            .tolist()
        )
        print(f"    {cat}: {samples}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Simplify Product_Name values")
    parser.add_argument(
        "paths",
        nargs="*",
        help="CSV paths to fix (default: main 500k + active baseline copy)",
    )
    args = parser.parse_args()

    defaults = [
        os.path.join(BACKEND_DIR, "daraz_multicategory_pakistan_500k.csv"),
        os.path.join(BACKEND_DIR, "datasets", "baseline-500k.csv"),
        os.path.join(BACKEND_DIR, "future_sales_predictions.csv"),
    ]
    paths = args.paths or defaults

    print("=" * 70)
    print("  SIMPLIFY PRODUCT_NAME (style only)")
    print("=" * 70)
    for path in paths:
        fix_file(os.path.abspath(path))
    print("\nDone.")


if __name__ == "__main__":
    main()
