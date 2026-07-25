"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  TrendingUp,
  Activity,
  Zap,
  Shield,
  Sun,
  Sparkles,
  BarChart3,
  Calendar,
  Brain,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const categories = [
  {
    id: "t-shirts",
    emoji: "👕",
    name: "T-Shirts",
    tag: "Sells best in summer",
    tagColor: "text-orange-600 bg-orange-500/15 dark:text-orange-400",
    description: "Sells more when it gets hot. Good for holidays and festivals.",
    icon: Zap,
    gradient: "from-orange-500 to-red-600",
  },
  {
    id: "jeans",
    emoji: "👖",
    name: "Jeans",
    tag: "Steady seller",
    tagColor: "text-primary bg-primary/15",
    description: "Always sells. Grows slowly but steady.",
    icon: Shield,
    gradient: "from-blue-600 to-indigo-700",
  },
  {
    id: "shoes",
    emoji: "👟",
    name: "Shoes",
    tag: "Sells best in fall",
    tagColor: "text-emerald-600 bg-emerald-500/15 dark:text-emerald-400",
    description: "Sells more when school starts and festivals come.",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-teal-700",
  },
  {
    id: "socks",
    emoji: "🧦",
    name: "Socks",
    tag: "Always sells",
    tagColor: "text-muted-foreground bg-muted",
    description: "People always need socks. Steady sales.",
    icon: Activity,
    gradient: "from-slate-600 to-slate-900",
  },
  {
    id: "shorts",
    emoji: "🩳",
    name: "Shorts",
    tag: "Sells best in summer",
    tagColor: "text-amber-700 bg-amber-500/15 dark:text-amber-400",
    description: "Sells more when it gets hot. Spring and summer.",
    icon: Sun,
    gradient: "from-yellow-400 to-orange-600",
  },
];

export default function TrendsPage() {
  return (
    <div className="space-y-12 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Badge className="rounded-full border-none bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
          Product Types
        </Badge>
        <h1
          className="text-5xl font-extrabold leading-none tracking-tighter md:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What <span className="gradient-text">Sells.</span>
        </h1>
        <p className="max-w-2xl text-xl font-medium leading-relaxed text-muted-foreground">
          Click a product type to see how it sells and what we expect next.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -8 }}
              className="h-full"
            >
              <Link href={`/dashboard/trends/${category.id}`} className="block h-full">
                <Card className="glass-card glass-hover group relative flex h-full flex-col overflow-hidden border-border/60 shadow-xl transition-all duration-500">
                  <div
                    className={`absolute right-0 top-0 h-32 w-32 bg-gradient-to-br ${category.gradient} opacity-[0.04] blur-3xl transition-opacity group-hover:opacity-[0.1]`}
                  />

                  <div className="relative z-10 flex h-full flex-col p-8">
                    <div className="mb-6 flex items-start justify-between">
                      <div className="text-6xl transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                        {category.emoji}
                      </div>
                      <Badge
                        className={`rounded-lg border-none px-3 py-1 text-[9px] font-bold uppercase tracking-wider ${category.tagColor}`}
                      >
                        {category.tag}
                      </Badge>
                    </div>

                    <div className="mb-8 space-y-3">
                      <h3
                        className="text-3xl font-black tracking-tight text-foreground transition-colors group-hover:text-primary"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {category.name}
                      </h3>
                      <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                        {category.description}
                      </p>
                    </div>

                    <div className="mt-auto space-y-6">
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>Analysis ready</span>
                        </div>
                        <div className="h-1 w-1 rounded-full bg-border" />
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>AI Forecast</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        className="group/btn h-12 w-full justify-between rounded-xl bg-muted/50 font-bold transition-all group-hover:bg-primary group-hover:text-primary-foreground"
                      >
                        <span className="text-sm">Explore Dataset</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </div>
                  </div>

                  <div className="pointer-events-none absolute -bottom-6 -right-6 rotate-12 opacity-[0.03] transition-all duration-700 group-hover:rotate-0 group-hover:scale-125">
                    <Icon className="h-40 w-40" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <Card className="glass-card relative overflow-hidden border-border/60 bg-muted/20 p-10 md:p-12">
          <div className="absolute right-0 top-0 h-full w-1/3 skew-x-12 translate-x-1/2 bg-gradient-to-l from-primary/10 to-transparent" />

          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Brain className="h-4 w-4" />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">
                  Strategic Intelligence
                </span>
              </div>
              <h2
                className="text-4xl font-black leading-tight tracking-tighter md:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Global Category <br />
                <span className="italic text-primary">Briefing.</span>
              </h2>
              <p className="text-xl font-medium leading-relaxed text-foreground/90">
                Aggregated market signals suggest a major shift in consumer sentiment toward
                high-durability apparel and eco-conscious manufacturing.
              </p>

              <div className="grid gap-6 pt-4 sm:grid-cols-2">
                {[
                  "Micro-capsule collection planning is critical.",
                  "Supply chain agility will be the major differentiator.",
                  "Personalization APIs are seeing 40% higher adoption.",
                ].map((text, i) => (
                  <div key={i} className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm font-bold leading-tight text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div className="glass-card space-y-4 border-border/60 bg-card/90 p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Next Cycle Peak
                    </span>
                  </div>
                  <Badge className="border-none bg-orange-500/15 font-black text-xs text-orange-700 dark:text-orange-400">
                    MAY 2026
                  </Badge>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "75%" }}
                    viewport={{ once: true }}
                    className="h-full bg-primary"
                  />
                </div>
                <Button
                  asChild
                  className="h-14 w-full rounded-xl bg-foreground font-black text-background shadow-lg shadow-primary/10 transition-shadow hover:bg-foreground/90 hover:shadow-primary/25"
                >
                  <Link href="/dashboard/trends/t-shirts">View Full Forecast</Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
