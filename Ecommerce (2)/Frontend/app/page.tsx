"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarketingShell } from "@/components/marketing-shell";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Sparkles,
  Brain,
  LineChart as LineChartIcon,
  Boxes,
  Upload,
  Cpu,
  Target,
  ChevronDown,
  ShieldCheck,
  Rocket,
  BarChart3,
  Layers,
  CheckCircle2,
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

function SearchParamsToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("message") === "admin-required") {
      toast.info("Admin access required", {
        description: "The dashboard is only available to administrators.",
      });
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams]);

  return null;
}

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroImageY = useTransform(heroScroll, [0, 1], [0, 160]);
  const heroImageScale = useTransform(heroScroll, [0, 1], [1, 0.92]);
  const heroFade = useTransform(heroScroll, [0, 1], [1, 0.3]);

  const stats = [
    { value: "89%", label: "Forecast accuracy", icon: Target },
    { value: "10K+", label: "Merchants served", icon: Rocket },
    { value: "2.5M+", label: "SKUs analyzed", icon: Layers },
    { value: "<2s", label: "Avg. prediction time", icon: Cpu },
  ];

  const steps = [
    {
      icon: Upload,
      title: "Upload your sales data",
      copy:
        "Drop in your product catalog and historical sales as CSV. Schema validation happens instantly — no plumbing required.",
    },
    {
      icon: Cpu,
      title: "AI learns your patterns",
      copy:
        "Our XGBoost engine engineers 30+ features from price, seasonality, ratings, and city data to model demand drivers.",
    },
    {
      icon: Target,
      title: "Act on predictions",
      copy:
        "Get per-product forecasts, sales potential scores, and stock recommendations you can apply to your store today.",
    },
  ];

  const features = [
    {
      eyebrow: "AI predictions",
      title: "Forecast tomorrow's bestsellers,\nnot last month's leftovers.",
      copy:
        "TrendInsight scores every product on a 0–100 sales potential percentile and predicts unit demand per month, city, and season — so you stock what will actually move.",
      bullets: [
        "Per-month, per-city demand forecasts",
        "Sales potential bands: High / Medium / Low",
        "Adaptive recommendations on every prediction",
      ],
      image: "/landing/feature-ai.png",
      icon: Brain,
      reverse: false,
    },
    {
      eyebrow: "Live analytics",
      title: "A control room for every\nSKU in your catalog.",
      copy:
        "Monitor segment health, peak months, top materials, and pricing power in real time. Drill into any product type and see the model's reasoning behind every forecast.",
      bullets: [
        "Real-time category dashboards",
        "Peak-month and material insights",
        "Exportable PDF reports per category",
      ],
      image: "/landing/feature-realtime.png",
      icon: LineChartIcon,
      reverse: true,
    },
    {
      eyebrow: "Smart inventory",
      title: "Know how much to stock —\ndown to the unit.",
      copy:
        "Every prediction comes with a recommended quantity range and a safety buffer tuned to the confidence level. Stop guessing reorder amounts.",
      bullets: [
        "Minimum / recommended / maximum quantities",
        "Confidence-aware safety buffers",
        "Plain-language stock guidance",
      ],
      image: "/landing/feature-inventory.png",
      icon: Boxes,
      reverse: false,
    },
  ];

  const audiences = [
    {
      title: "Inventory leads",
      copy:
        "Order the right quantities of the right products and stop tying up cash in dead stock.",
      icon: Boxes,
    },
    {
      title: "Growth & marketing",
      copy:
        "Find which products and cities to push next quarter before the trend hits the mainstream.",
      icon: Rocket,
    },
    {
      title: "Founders & ops",
      copy:
        "A single dashboard for sales potential, accuracy, and forecast quality across the entire catalog.",
      icon: ShieldCheck,
    },
  ];

  return (
    <MarketingShell>
      <Suspense fallback={null}>
        <SearchParamsToast />
      </Suspense>
      {/* ───────────────────────────── HERO ───────────────────────────── */}
      <section
        ref={heroRef}
        className="relative isolate overflow-hidden pt-32 pb-32 lg:pt-40 lg:pb-40"
      >
        {/* Background gradients */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.20),transparent_60%)] blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-[400px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_60%)] blur-3xl" />
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
              AI sales prediction for modern commerce
            </Badge>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mt-8 text-balance text-5xl font-extrabold leading-[0.9] tracking-tighter sm:text-7xl lg:text-8xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            See the next bestseller{" "}
            <span className="gradient-text">before it sells.</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-8 max-w-2xl text-pretty text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl"
          >
            TrendInsight predicts demand, scores sales potential, and tells you
            exactly how much stock to keep — so your store always carries what
            customers actually want.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-12 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Link href="/signup">
              <Button
                size="lg"
                className="group h-14 rounded-2xl px-8 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.03]"
              >
                Start free trial
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/dashboard/trends">
              <Button
                variant="outline"
                size="lg"
                className="h-14 rounded-2xl border-2 px-8 font-bold"
              >
                Explore live demo
              </Button>
            </Link>
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/80"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            No credit card · 14-day free trial · Cancel anytime
          </motion.p>
        </motion.div>

        {/* Hero showcase image */}
        <motion.div
          style={{ y: heroImageY, scale: heroImageScale, opacity: heroFade }}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease }}
          className="relative mx-auto mt-20 max-w-6xl px-4 sm:px-6 lg:px-8"
        >
          <div className="relative">
            <div className="pointer-events-none absolute -inset-x-20 -inset-y-10 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25),transparent_60%)] blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl shadow-primary/10 ring-1 ring-white/5">
              <Image
                src="/landing/hero.png"
                alt="TrendInsight dashboard preview"
                width={1920}
                height={1080}
                priority
                className="h-auto w-full object-cover"
              />
            </div>
          </div>

          {/* Scroll cue */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            onClick={() =>
              window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
            }
            className="mx-auto mt-12 flex flex-col items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">
              Explore
            </span>
            <motion.span
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </motion.button>
        </motion.div>
      </section>

      {/* ───────────────────────────── STATS ───────────────────────────── */}
      <section className="relative border-y border-border/70 bg-muted/20 py-14 backdrop-blur-sm">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6, ease }}
                className="flex flex-col items-center gap-2 text-center md:items-start md:text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span
                  className="gradient-text text-3xl font-extrabold tracking-tight sm:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {stat.value}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  {stat.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────── HOW IT WORKS ─────────────────────── */}
      <section className="relative py-28">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8"
        >
          <Badge className="rounded-full border border-border bg-muted/50 px-4 py-1.5 font-bold text-foreground">
            How it works
          </Badge>
          <h2
            className="mt-6 text-balance text-4xl font-extrabold tracking-tight sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            From CSV to confident <span className="gradient-text">forecasts</span>
            <br className="hidden sm:inline" /> in three steps.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            No data team required. Bring your numbers, the AI handles the rest.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease }}
          className="mx-auto mt-16 max-w-6xl px-4 sm:px-6 lg:px-8"
        >
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/40">
            <Image
              src="/landing/how-it-works.png"
              alt="Three-step data flow: upload, AI, predict"
              width={1920}
              height={1080}
              className="h-auto w-full object-cover"
            />
          </div>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease }}
                className="glass-card group relative overflow-hidden rounded-3xl border-border/60 p-7"
              >
                <div className="absolute -right-4 -top-4 text-7xl font-black text-foreground/4">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="relative">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-foreground text-background shadow-sm transition-transform group-hover:scale-110 dark:bg-background dark:text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {step.copy}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────── FEATURES ───────────────────────── */}
      <section
        id="features"
        className="relative border-t border-border/60 bg-muted/15 py-28"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8"
        >
          <Badge className="rounded-full border border-border bg-muted/50 px-4 py-1.5 font-bold text-foreground">
            What you get
          </Badge>
          <h2
            className="mt-6 text-balance text-4xl font-extrabold tracking-tight sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The intelligence layer for{" "}
            <span className="gradient-text">profitable stock decisions.</span>
          </h2>
        </motion.div>

        <div className="mx-auto mt-20 flex max-w-6xl flex-col gap-28 px-4 sm:px-6 lg:px-8">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.eyebrow}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.8, ease }}
                className={`grid gap-12 lg:grid-cols-2 lg:items-center ${
                  feature.reverse ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-foreground text-background dark:bg-background dark:text-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">
                      {feature.eyebrow}
                    </span>
                  </div>
                  <h3
                    className="whitespace-pre-line text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {feature.copy}
                  </p>
                  <ul className="space-y-2.5">
                    {feature.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-3 text-sm font-medium"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 1, ease }}
                  className="relative"
                >
                  <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.20),transparent_60%)] blur-3xl" />
                  <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl ring-1 ring-white/5">
                    <Image
                      src={feature.image}
                      alt={feature.eyebrow}
                      width={1024}
                      height={1024}
                      className="h-auto w-full object-cover"
                    />
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────── BUILT FOR ─────────────────────── */}
      <section className="relative py-28">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8"
        >
          <Badge className="rounded-full border border-border bg-muted/50 px-4 py-1.5 font-bold text-foreground">
            Built for e-commerce teams
          </Badge>
          <h2
            className="mt-6 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            One platform, every role on{" "}
            <span className="gradient-text">the same page.</span>
          </h2>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {audiences.map((aud, i) => {
            const Icon = aud.icon;
            return (
              <motion.div
                key={aud.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease }}
                whileHover={{ y: -6 }}
                className="glass-card group relative flex h-full flex-col overflow-hidden rounded-3xl border-border/60 p-7"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-foreground text-background shadow-sm transition-transform group-hover:scale-110 dark:bg-background dark:text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  {aud.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {aud.copy}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────── TESTIMONIAL / TRUST ─────────────────────── */}
      <section className="relative border-y border-border/60 bg-muted/15 py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease }}
            className="glass-card relative overflow-hidden rounded-[2.5rem] border-border/60 p-10 md:p-16"
          >
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 skew-x-12 translate-x-1/3 bg-linear-to-l from-primary/10 to-transparent" />
            <div className="relative">
              <Sparkles className="h-7 w-7 text-primary" />
              <p
                className="mt-6 text-balance text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                "We stopped over-ordering by 38% and our stockout rate dropped
                to almost zero. TrendInsight pays for itself every month."
              </p>
              <div className="mt-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-foreground text-background font-bold dark:bg-background dark:text-foreground">
                  AM
                </div>
                <div>
                  <p className="font-bold tracking-tight">Areeba Malik</p>
                  <p className="text-sm text-muted-foreground">
                    Inventory Lead · Karachi-based apparel retailer
                  </p>
                </div>
              </div>
              <div className="mt-12 grid gap-6 border-t border-border/60 pt-8 sm:grid-cols-3">
                <div>
                  <p
                    className="gradient-text text-3xl font-extrabold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    -38%
                  </p>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Over-ordering
                  </p>
                </div>
                <div>
                  <p
                    className="gradient-text text-3xl font-extrabold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    +24%
                  </p>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Quarterly revenue
                  </p>
                </div>
                <div>
                  <p
                    className="gradient-text text-3xl font-extrabold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    0.4%
                  </p>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Stockout rate
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────────────────────────── CTA ───────────────────────────── */}
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
            <BarChart3 className="mr-2 h-3.5 w-3.5" />
            Start in under 5 minutes
          </Badge>
          <h2
            className="mt-6 text-balance text-5xl font-extrabold leading-[0.95] tracking-tighter sm:text-7xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Stop guessing.{" "}
            <span className="gradient-text">Start knowing.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Bring your sales data, get your first prediction in minutes, and
            ship smarter stock decisions tomorrow morning.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button
                size="lg"
                className="group h-14 rounded-2xl px-10 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.03]"
              >
                Get started free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                size="lg"
                className="h-14 rounded-2xl border-2 px-10 font-bold"
              >
                Talk to sales
              </Button>
            </Link>
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            14-day free trial · No card required · Cancel anytime
          </p>
        </motion.div>
      </section>
    </MarketingShell>
  );
}
