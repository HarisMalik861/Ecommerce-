"use client";

import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

interface TrendCardProps {
  name: string;
  value: string;
  growth: number;
  color: string;
  delay?: number;
}

export function TrendCard({ name, value, growth, delay = 0 }: TrendCardProps) {
  const isPositive = growth >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
    >
      <Card className="rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-base font-semibold text-foreground">{name}</h3>
            <p className="text-sm text-muted-foreground">{value}</p>
          </div>
          <div
            className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold ${
              isPositive
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isPositive ? "+" : ""}
            {growth}%
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
