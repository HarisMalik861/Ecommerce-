"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHART_FILLS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--card-foreground)",
  fontSize: "12px",
  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.12)",
};

const tooltipItemStyle = {
  color: "var(--card-foreground)",
};

const tooltipLabelStyle = {
  color: "var(--card-foreground)",
  fontWeight: 600,
};

export function DashboardCharts({ data }: { data: any }) {
  const raw = (data?.trendData || []) as {
    productName: string;
    value: number;
  }[];
  const top5 = raw.slice(0, 5);
  const rest = raw.slice(5);
  const otherValue = rest.reduce((s, d) => s + Number(d.value), 0);
  const pieData = [
    ...top5.map((d) => ({
      name:
        d.productName.length > 24
          ? d.productName.slice(0, 24) + "…"
          : d.productName,
      fullName: d.productName,
      value: Number(d.value),
    })),
    ...(otherValue > 0
      ? [
          {
            name: "Other",
            fullName: rest.map((r) => r.productName).join(", "),
            value: otherValue,
          },
        ]
      : []),
  ];
  const totalSales = pieData.reduce((sum, item) => sum + Number(item.value), 0);
  const topItem = pieData[0];
  const topShare =
    totalSales > 0 && topItem ? (topItem.value / totalSales) * 100 : 0;

  return (
    <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm md:p-8">
          <div className="space-y-6">
            <div className="flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Sales mix
                </p>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground md:text-3xl">
                  What sells best
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                A compact view of category share, with the heaviest contributors
                emphasized first.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Total sales
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                  {totalSales.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Top item
                </p>
                <p className="mt-2 truncate text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {topItem?.name ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Top share
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                  {topShare.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="pt-1">
              <ResponsiveContainer width="100%" height={320} minWidth={0}>
                <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="78%"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ percent }) =>
                      percent >= 0.06 ? `${(percent * 100).toFixed(0)}%` : ""
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_FILLS[i % CHART_FILLS.length]}
                        stroke="var(--card)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                    labelStyle={tooltipLabelStyle}
                    cursor={{ fill: "transparent" }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{
                      color: "var(--muted-foreground)",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="h-full rounded-3xl border border-border/80 bg-card p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
            Sales Potential Segments
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Actionable read of how products are distributed by forecast
            strength.
          </p>
          <div className="mt-5 space-y-3">
            {(data?.trendCategories ?? []).slice(0, 4).map((category: any) => (
              <div
                key={category.id}
                className="rounded-2xl border border-border/60 bg-muted/35 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <p className="truncate text-sm font-semibold text-foreground">
                        {category.name}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {category.value} · avg{" "}
                      {Number(category.avgPredicted ?? 0).toLocaleString()}{" "}
                      units forecast
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-base font-bold text-foreground">
                      {Number(category.sharePct ?? 0).toFixed(1)}%
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      of catalog
                    </span>
                  </div>
                </div>
                {category.insight && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {category.insight}
                  </p>
                )}
                {category.topProduct && (
                  <p className="mt-1 truncate text-[11px] text-muted-foreground/80">
                    Top:{" "}
                    <span className="font-medium text-foreground/80">
                      {category.topProduct}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
