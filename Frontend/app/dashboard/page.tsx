"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendingUp, BarChart3, Lightbulb, Users } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { getClientCache, setClientCache } from "@/lib/client-cache";
import { PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

const DashboardCharts = dynamic(
  () =>
    import("@/components/dashboard/dashboard-charts").then(
      (m) => m.DashboardCharts,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="mb-10 grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-2xl border border-border bg-muted/50 lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-2xl border border-border bg-muted/50" />
      </div>
    ),
  },
);

interface TrendData {
  trendData: any[];
  trendCategories: any[];
  predictions: any[];
  summary: {
    totalTrends: number;
    activeUsers: number;
    accuracy: number;
    marketGrowth: number;
    cardChanges?: {
      totalTrends?: number;
      activeUsers?: number;
      accuracy?: number;
      marketGrowth?: number;
    };
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const CACHE_KEY = "dashboard_trends_v3";
  const CACHE_TTL_MS = 15_000;

  useEffect(() => {
    const fetchTrends = async () => {
      const cached = getClientCache<TrendData>(CACHE_KEY);
      if (cached) {
        setData(cached);
        setLoading(false);
      }
      try {
        const response = await fetch("/api/trends");
        const trendData = await response.json();
        setData(trendData);
        setClientCache(CACHE_KEY, trendData, CACHE_TTL_MS);
      } catch (error) {
        console.error("[v0] Failed to fetch trends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="font-medium text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-20">
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <PageHeader
            title="Your overview"
            description="Quick look at your business — what sells, what grows, and what to expect next."
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8 flex flex-wrap gap-3"
        >
          <Button
            asChild
            size="lg"
            className="gap-2 rounded-xl font-bold shadow-lg shadow-primary/20"
          >
            <Link href="/dashboard/trends">
              <TrendingUp className="h-5 w-5" />
              See what sells
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-xl border-2 font-bold"
          >
            <Link href="/dashboard/users">
              <Users className="h-5 w-5" />
              Manage users
            </Link>
          </Button>
        </motion.div>

        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
          <StatCard
            title="Products We Track"
            value={Number(data?.summary.totalTrends ?? 0).toLocaleString()}
            subtitle={`${data?.summary.cardChanges?.totalTrends ?? 0}% growing`}
            icon={<BarChart3 className="h-6 w-6" />}
            delay={0.1}
          />
          <StatCard
            title="Top Potential"
            value={Number(data?.summary.activeUsers ?? 0).toLocaleString()}
            subtitle={`${data?.summary.cardChanges?.activeUsers ?? 0}% of products`}
            icon={<TrendingUp className="h-6 w-6" />}
            delay={0.15}
          />
          <StatCard
            title="Prediction Accuracy"
            value={`${data?.summary.accuracy ?? 0}%`}
            hideChange
            icon={<Lightbulb className="h-6 w-6" />}
            delay={0.2}
          />
        </div>

        <DashboardCharts data={data} />
      </div>
    </div>
  );
}

