"use client";

import React from "react";

import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  delay?: number;
  subtitle?: string;
  hideChange?: boolean;
}

export function StatCard({
  title,
  value,
  change = 0,
  icon,
  delay = 0,
  subtitle,
  hideChange,
}: StatCardProps) {
  const isPositive = change >= 0;
  const showChange = !hideChange && subtitle === undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="glass-card glass-hover border-border/60 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {title}
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <p
                className="text-3xl font-semibold tracking-[-0.04em] text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {value}
              </p>
              {showChange ? (
                <div
                  className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${
                    isPositive
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-destructive/20 bg-destructive/10 text-destructive"
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(change)}%</span>
                </div>
              ) : null}
              {subtitle ? (
                <span className="text-xs text-muted-foreground">
                  {subtitle}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-foreground text-background shadow-lg shadow-foreground/10 dark:bg-background dark:text-foreground">
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
