"use client";

import React, { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  LineChart,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "./loading";
import { MarketingShell } from "@/components/marketing-shell";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      await login(identifier, password);
      await new Promise((resolve) => setTimeout(resolve, 100));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const perks = [
    {
      icon: LineChart,
      title: "Pick up right where you left off",
      copy: "Saved datasets, cached models, and dashboards stay exactly as you left them.",
    },
    {
      icon: Zap,
      title: "Forecasts in seconds",
      copy: "No retraining wait — switch active datasets and the cache loads instantly.",
    },
    {
      icon: ShieldCheck,
      title: "Your data, your account",
      copy: "Sessions are encrypted and your CSVs never leave your workspace.",
    },
  ];

  return (
    <MarketingShell>
      <section className="relative isolate flex flex-1 items-stretch overflow-hidden pt-24 pb-16">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-0 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.20),transparent_60%)] blur-3xl" />
          <div className="absolute -bottom-32 right-1/4 h-[400px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_60%)] blur-3xl" />
        </div>

        <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          {/* ───────────── BRAND / MARKETING PANEL ───────────── */}
          <motion.aside
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative hidden flex-col justify-center lg:flex"
          >
            <motion.div variants={itemVariants}>
              <Link href="/" className="inline-flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="TrendInsight"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-xl shadow-md"
                  priority
                />
                <span
                  className="text-2xl font-extrabold tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  TrendInsight
                </span>
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-10">
              <Badge className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 font-bold tracking-wide text-primary backdrop-blur-sm hover:bg-primary/15">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Welcome back
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mt-6 text-balance text-5xl font-extrabold leading-[0.95] tracking-tighter sm:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Good to see you{" "}
              <span className="gradient-text">again.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-5 max-w-md text-pretty text-lg font-medium leading-relaxed text-muted-foreground"
            >
              Sign in to keep forecasting demand, manage your datasets, and act
              on the latest sales signals from your store.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-10 space-y-5">
              {perks.map(({ icon: Icon, title, copy }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-foreground text-background dark:bg-background dark:text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold tracking-tight">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {copy}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.aside>

          {/* ───────────── FORM PANEL ───────────── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.1 }}
            className="relative mx-auto w-full max-w-md lg:max-w-lg"
          >
            <Suspense fallback={<Loading />}>
              <div className="glass-card relative overflow-hidden rounded-3xl border-border/60 p-8 shadow-2xl shadow-primary/10 sm:p-10">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
                <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

                {/* Mobile-only logo */}
                <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
                  <Image
                    src="/logo.png"
                    alt="TrendInsight"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-lg shadow-md"
                    priority
                  />
                  <span
                    className="text-xl font-extrabold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    TrendInsight
                  </span>
                </div>

                <div className="relative mb-8 space-y-2 text-center lg:text-left">
                  <h2
                    className="text-3xl font-extrabold tracking-tight sm:text-4xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Log in
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground">
                    Use your email or phone number to continue.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="relative space-y-5">
                  <AnimatePresence mode="wait">
                    {error ? (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 p-4"
                      >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <span className="text-sm font-semibold text-destructive">
                          {error}
                        </span>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <label
                      htmlFor="identifier"
                      className="ml-1 text-xs font-black uppercase tracking-widest text-muted-foreground"
                    >
                      Email or phone
                    </label>
                    <div className="group relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="identifier"
                        type="text"
                        placeholder="email@example.com or 03001234567"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="h-12 rounded-xl border-border bg-background/70 pl-11 font-medium transition-all focus-visible:ring-primary/30"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="ml-1 flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="text-xs font-black uppercase tracking-widest text-muted-foreground"
                      >
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="group relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl border-border bg-background/70 pl-11 pr-12 font-medium transition-all focus-visible:ring-primary/30"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    size="lg"
                    className="group mt-2 h-13 w-full rounded-xl font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-3">
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Signing in…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Log in
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>

                  <div className="pt-2 text-center text-sm font-medium text-muted-foreground">
                    New to TrendInsight?{" "}
                    <Link
                      href="/signup"
                      className="font-bold text-primary hover:underline"
                    >
                      Create an account
                    </Link>
                  </div>
                </form>
              </div>

              <p className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Your session is encrypted end-to-end.
              </p>
            </Suspense>
          </motion.div>
        </div>
      </section>
    </MarketingShell>
  );
}
