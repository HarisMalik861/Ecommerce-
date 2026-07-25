export type PredictionInsightTier = "high" | "medium" | "low";

export interface StockRecommendation {
  minUnits: number;
  recommendedUnits: number;
  maxUnits: number;
  bufferPct: number;
}

export interface PredictionInsight {
  tier: PredictionInsightTier;
  tierLabel: string;
  summary: string;
  recommendation: string;
  stock: StockRecommendation;
  stockMessage: string;
}

function tierFromScore(scorePct: number): PredictionInsightTier {
  if (scorePct >= 75) return "high";
  if (scorePct >= 40) return "medium";
  return "low";
}

function tierLabel(tier: PredictionInsightTier): string {
  if (tier === "high") return "High Confidence";
  if (tier === "medium") return "Moderate";
  return "Low Confidence";
}

function tierStockProfile(tier: PredictionInsightTier): {
  recommendMultiplier: number;
  minMultiplier: number;
  maxMultiplier: number;
  bufferPct: number;
} {
  if (tier === "high") {
    return {
      recommendMultiplier: 1.2,
      minMultiplier: 1.0,
      maxMultiplier: 1.4,
      bufferPct: 20,
    };
  }
  if (tier === "medium") {
    return {
      recommendMultiplier: 0.9,
      minMultiplier: 0.7,
      maxMultiplier: 1.1,
      bufferPct: -10,
    };
  }
  return {
    recommendMultiplier: 0.5,
    minMultiplier: 0.3,
    maxMultiplier: 0.7,
    bufferPct: -50,
  };
}

function ceilTo(value: number, step: number): number {
  if (step <= 1) return Math.max(0, Math.ceil(value));
  return Math.max(0, Math.ceil(value / step) * step);
}

function pickRoundingStep(value: number): number {
  if (value < 20) return 1;
  if (value < 100) return 5;
  if (value < 500) return 10;
  if (value < 2000) return 25;
  if (value < 10000) return 50;
  return 100;
}

export function buildPredictionInsight(
  predictedSales: number,
  scorePct: number,
  avgCategorySales: number,
): PredictionInsight {
  const safeScore = Number.isFinite(scorePct) ? scorePct : 0;
  const safeSales = Number.isFinite(predictedSales) ? predictedSales : 0;
  const safeAvg =
    Number.isFinite(avgCategorySales) && avgCategorySales > 0
      ? avgCategorySales
      : 500;

  const tier = tierFromScore(safeScore);
  const salesHigh = safeSales >= safeAvg;

  const summary = `According to this prediction, the future sales of this product may reach around ${safeScore.toFixed(0)}%, so you should manage your store stock accordingly.`;

  let recommendation: string;
  if (tier === "high" && salesHigh) {
    recommendation =
      "Increase inventory to avoid stockouts and maximize profit.";
  } else if (tier === "high") {
    recommendation =
      "Strong sales confidence detected — prepare for high demand, but scale stock gradually since unit volume is moderate.";
  } else if (tier === "medium" && salesHigh) {
    recommendation =
      "Maintain balanced stock; cautious reordering recommended while demand stabilizes.";
  } else if (tier === "medium") {
    recommendation =
      "Order conservatively — demand looks moderate and uncertain.";
  } else if (tier === "low" && salesHigh) {
    recommendation =
      "Demand is uncertain; monitor trends before stocking heavily.";
  } else {
    recommendation =
      "Keep minimal stock to reduce holding cost and avoid overstock.";
  }

  const stockAdvice =
    "Based on the expected demand of this product, you can keep an appropriate quantity in your store to maximize profit and make stock management easier.";

  const profile = tierStockProfile(tier);
  const baseUnits = Math.max(1, safeSales);
  const step = pickRoundingStep(baseUnits);

  const minUnits = ceilTo(baseUnits * profile.minMultiplier, step);
  const recommendedUnits = ceilTo(
    baseUnits * profile.recommendMultiplier,
    step,
  );
  const maxUnits = ceilTo(baseUnits * profile.maxMultiplier, step);

  const bufferText =
    profile.bufferPct >= 0
      ? `+${profile.bufferPct}% safety buffer`
      : `${profile.bufferPct}% reduction vs. predicted demand`;

  const stockMessage = `Based on a predicted demand of ~${Math.round(baseUnits).toLocaleString()} units and a ${safeScore.toFixed(0)}% potential score, plan to stock around ${recommendedUnits.toLocaleString()} units (range ${minUnits.toLocaleString()}–${maxUnits.toLocaleString()}, ${bufferText}) to balance stockouts and holding cost.`;

  return {
    tier,
    tierLabel: tierLabel(tier),
    summary,
    recommendation: `${recommendation} ${stockAdvice}`,
    stock: {
      minUnits,
      recommendedUnits,
      maxUnits,
      bufferPct: profile.bufferPct,
    },
    stockMessage,
  };
}
