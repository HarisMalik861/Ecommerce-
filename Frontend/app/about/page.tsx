"use client";

import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Sparkles,
  Target,
  Users,
  Zap,
  Rocket,
  Globe,
  Brain,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  LineChart,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

export default function AboutPage() {
  const values = [
    {
      icon: Target,
      title: "Accuracy first",
      copy:
        "Every forecast is grounded in 30+ engineered features and stress-tested with cross-validation before it ships.",
    },
    {
      icon: Zap,
      title: "Speed at scale",
      copy:
        "Predict, retrain, and refresh dashboards in seconds — never wait on a data team to answer a stock question.",
    },
    {
      icon: Users,
      title: "Built with operators",
      copy:
        "Designed alongside real inventory leads and founders so every metric maps to a real decision you make.",
    },
    {
      icon: ShieldCheck,
      title: "Honest signals",
      copy:
        "When confidence is low we say so. No black box, no inflated numbers — just signals you can act on.",
    },
  ];

  const timeline = [
    {
      year: "2024",
      title: "The frustration",
      copy:
        "Two e-commerce operators spent six months drowning in CSVs trying to forecast next quarter's stock.",
    },
    {
      year: "2025",
      title: "The model",
      copy:
        "We trained the first XGBoost engine on 500k Pakistani e-commerce rows and shipped the first dashboard.",
    },
    {
      year: "2026",
      title: "TrendInsight",
      copy:
        "Today, TrendInsight powers stock decisions for thousands of merchants, with per-dataset model caching and dynamic insights.",
    },
  ];

  const stack = [
    "XGBoost gradient-boosted trees",
    "30+ engineered demand features",
    "Percentile-ranked sales potential",
    "Per-dataset model artifact caching",
    "Adaptive stock recommendations",
    "PDF report generation",
  ];

  return (
    <MarketingShell>
      {/* ───────────────────────────── HERO ───────────────────────────── */}
      <section className="relative isolate overflow-hidden pt-32 pb-24 lg:pt-40">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.20),transparent_60%)] blur-3xl" />
          <div className="absolute -bottom-32 right-1/3 h-[400px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_60%)] blur-3xl" />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto flex max-w-6xl flex-col items-center px-4 text-center sm:px-6 lg:px-8"
        >
          <motion.div variants={itemVariants}>
            <Badge className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 font-bold tracking-wide text-primary backdrop-blur-sm hover:bg-primary/15">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Our story
            </Badge>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mt-8 text-balance text-5xl font-extrabold leading-[0.9] tracking-tighter sm:text-7xl lg:text-8xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            We turn messy sales data{" "}
            <span className="gradient-text">into clear decisions.</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-8 max-w-2xl text-pretty text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl"
          >
            TrendInsight was built by operators who got tired of guessing how
            much to stock. Today it helps thousands of e-commerce teams forecast
            demand with confidence — and stop tying up cash in dead stock.
          </motion.p>
        </motion.div>

        {/* Hero image */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease }}
          className="relative mx-auto mt-16 max-w-5xl px-4 sm:px-6 lg:px-8"
        >
          <div className="relative">
            <div className="pointer-events-none absolute -inset-x-20 -inset-y-10 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25),transparent_60%)] blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl shadow-primary/10 ring-1 ring-white/5">
              <Image
                src="/landing/about-hero.png"
                alt="TrendInsight — turning data into decisions"
                width={1920}
                height={1080}
                priority
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ───────────────────────────── MISSION ───────────────────────────── */}
      <section className="relative border-y border-border/70 bg-muted/15 py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="space-y-6"
          >
            <Badge className="rounded-full border border-border bg-muted/50 px-4 py-1.5 font-bold text-foreground">
              Our mission
            </Badge>
            <h2
              className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Make predictive intelligence{" "}
              <span className="gradient-text">work for everyone.</span>
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Big retailers have armies of data scientists. Independent
              merchants don&apos;t. We&apos;re closing that gap with a platform
              that gives every founder, operator, and inventory lead the same
              level of forecasting horsepower — without writing a line of code.
            </p>

            <div className="grid grid-cols-3 gap-6 pt-4">
              <div>
                <p
                  className="gradient-text text-3xl font-extrabold tracking-tight sm:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  89%
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Accuracy
                </p>
              </div>
              <div>
                <p
                  className="gradient-text text-3xl font-extrabold tracking-tight sm:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  10K+
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Merchants
                </p>
              </div>
              <div>
                <p
                  className="gradient-text text-3xl font-extrabold tracking-tight sm:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  50+
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Countries
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease }}
            className="glass-card relative overflow-hidden rounded-3xl border-border/60 p-10 shadow-xl"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
            <Rocket className="relative h-12 w-12 text-primary" />
            <h3
              className="mt-6 text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              The future is predictive
            </h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              We&apos;re not just building software — we&apos;re building the
              decision layer for modern commerce. Every day, our models
              learn from more data and get more confident in their forecasts.
            </p>
            <div className="mt-8 grid gap-3">
              {[
                "No data team required",
                "Honest confidence scoring",
                "Insights you can act on today",
              ].map((line) => (
                <div key={line} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="font-medium">{line}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────────────────────────── TIMELINE ───────────────────────────── */}
      <section className="relative py-28">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8"
        >
          <Badge className="rounded-full border border-border bg-muted/50 px-4 py-1.5 font-bold text-foreground">
            How we got here
          </Badge>
          <h2
            className="mt-6 text-balance text-4xl font-extrabold tracking-tight sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            From frustration to{" "}
            <span className="gradient-text">forecast engine.</span>
          </h2>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {timeline.map((item, i) => (
            <motion.div
              key={item.year}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, ease }}
              className="glass-card group relative overflow-hidden rounded-3xl border-border/60 p-7"
            >
              <div className="absolute -right-4 -top-4 text-7xl font-black text-foreground/4">
                {item.year}
              </div>
              <div className="relative">
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">
                  {item.year}
                </span>
                <h3 className="mt-4 text-xl font-bold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.copy}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───────────────────────────── VALUES ───────────────────────────── */}
      <section className="relative border-t border-border/60 bg-muted/15 py-28">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8"
        >
          <Badge className="rounded-full border border-border bg-muted/50 px-4 py-1.5 font-bold text-foreground">
            What we stand for
          </Badge>
          <h2
            className="mt-6 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Four principles that shape{" "}
            <span className="gradient-text">every decision.</span>
          </h2>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {values.map((value, i) => {
            const Icon = value.icon;
            return (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6, ease }}
                whileHover={{ y: -6 }}
                className="glass-card group flex h-full flex-col rounded-3xl border-border/60 p-7"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-foreground text-background shadow-sm transition-transform group-hover:scale-110 dark:bg-background dark:text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">
                  {value.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {value.copy}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────── UNDER THE HOOD ─────────────────────── */}
      <section className="relative py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease }}
            className="space-y-6"
          >
            <Badge className="rounded-full border border-border bg-muted/50 px-4 py-1.5 font-bold text-foreground">
              Under the hood
            </Badge>
            <h2
              className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Serious tech.{" "}
              <span className="gradient-text">Built to be trusted.</span>
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              We don&apos;t hide behind a black box. The engine that powers
              every forecast is a battle-tested gradient-boosted tree pipeline,
              tuned on real e-commerce data and stress-tested with
              cross-validation on every retrain.
            </p>

            <ul className="space-y-2.5 pt-2">
              {stack.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 text-sm font-medium"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease }}
            className="grid gap-5"
          >
            {[
              {
                icon: Brain,
                title: "30+ features",
                copy:
                  "Price, discount, reviews, ratings, seasonality, city, material, and more — engineered automatically.",
              },
              {
                icon: LineChart,
                title: "Percentile ranking",
                copy:
                  "Every product gets a 0–100 sales potential score based on its rank across your active dataset.",
              },
              {
                icon: Globe,
                title: "Adaptive insights",
                copy:
                  "Recommendations combine predicted units and confidence into one plain-language stock plan.",
              },
            ].map(({ icon: Icon, title, copy }) => (
              <div
                key={title}
                className="glass-card flex items-start gap-5 rounded-3xl border-border/60 p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-foreground text-background dark:bg-background dark:text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {copy}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────── CTA ─────────────────────── */}
      <section className="relative overflow-hidden py-32">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.28),transparent_60%)] blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"
        >
          <Badge className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 font-bold text-primary">
            <Rocket className="mr-2 h-3.5 w-3.5" />
            Ready when you are
          </Badge>
          <h2
            className="mt-6 text-balance text-5xl font-extrabold leading-[0.95] tracking-tighter sm:text-7xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            See it work on{" "}
            <span className="gradient-text">your data.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Upload a CSV, get your first forecast in minutes, and decide
            whether TrendInsight earns a spot in your stack.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button
                size="lg"
                className="group h-14 rounded-2xl px-10 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.03]"
              >
                Start free trial
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                size="lg"
                className="h-14 rounded-2xl border-2 px-10 font-bold"
              >
                Talk to the team
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </MarketingShell>
  );
}
