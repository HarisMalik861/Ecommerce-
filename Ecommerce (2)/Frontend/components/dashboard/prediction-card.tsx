"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PredictionCardProps {
  category: string;
  description: string;
  confidence: number;
  impact: "High" | "Medium" | "Low";
  timeline: string;
  delay?: number;
}

export function PredictionCard({ category, description, delay = 0 }: PredictionCardProps) {
  const salesMatch = description.match(/Predicted ([\d,]+) sales/);
  const growthMatch = description.match(/\(([+-]?[\d.]+)% growth\)/);
  const salesNum = salesMatch ? salesMatch[1] : "";
  const growth = growthMatch ? parseFloat(growthMatch[1]) : 0;
  const isPositive = growth >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg">
        <div className="space-y-3">
          <h4 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
            {category}
          </h4>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-lg font-bold text-foreground">{salesNum} expected</span>
            <span
              className={`inline-flex shrink-0 items-center gap-1 text-sm font-bold ${
                isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              }`}
            >
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPositive ? "+" : ""}
              {growth}%
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
