"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Phone,
  Rocket,
  LineChart,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !formData.name ||
      !formData.contactNumber ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all required fields");
      return;
    }

    const contactRegex = /^\+?[0-9\s-]{7,20}$/;
    if (!contactRegex.test(formData.contactNumber)) {
      setError("Please enter a valid contact number");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await signup(
        formData.contactNumber,
        formData.password,
        formData.name,
        formData.email || undefined,
      );
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    }
  };

  const passwordStrength = formData.password.length;
  const isStrong = passwordStrength >= 8;
  const hasMixed =
    /[a-z]/.test(formData.password) &&
    /[A-Z]/.test(formData.password) &&
    /\d/.test(formData.password);

  const benefits = [
    {
      icon: Rocket,
      title: "Set up in under five minutes",
      copy: "Upload your first CSV and get an instant forecast — no engineers required.",
    },
    {
      icon: LineChart,
      title: "30+ engineered demand features",
      copy: "Price, reviews, ratings, seasonality, city, material — all baked into every prediction.",
    },
    {
      icon: Zap,
      title: "Cached models for instant switching",
      copy: "Train once per dataset. Switch active datasets and the cached model loads instantly.",
    },
    {
      icon: ShieldCheck,
      title: "Honest confidence scoring",
      copy: "We tell you when the model isn't sure — no inflated numbers, no black box.",
    },
  ];

  return (
    <MarketingShell>
      <section className="relative isolate flex flex-1 items-stretch overflow-hidden pt-24 pb-16">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-0 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.20),transparent_60%)] blur-3xl" />
          <div className="absolute -bottom-32 right-1/4 h-[400px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.12),transparent_60%)] blur-3xl" />
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
                Start free, forecast today
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mt-6 text-balance text-5xl font-extrabold leading-[0.95] tracking-tighter sm:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Predict demand,{" "}
              <span className="gradient-text">stock with confidence.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-5 max-w-md text-pretty text-lg font-medium leading-relaxed text-muted-foreground"
            >
              Create your free TrendInsight account and turn raw e-commerce
              data into clear stock decisions in under five minutes.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-10 space-y-4">
              {benefits.map(({ icon: Icon, title, copy }) => (
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

            <motion.p
              variants={itemVariants}
              className="mt-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              No credit card required · cancel any time
            </motion.p>
          </motion.aside>

          {/* ───────────── FORM PANEL ───────────── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.1 }}
            className="relative mx-auto w-full max-w-md lg:max-w-xl"
          >
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
                  Create your account
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  Free trial · cancel any time · no card required.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="relative space-y-5">
                <AnimatePresence mode="wait">
                  {error && (
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
                  )}
                </AnimatePresence>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="name"
                      className="ml-1 text-xs font-black uppercase tracking-widest text-muted-foreground"
                    >
                      Your name
                    </label>
                    <div className="group relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                        className="h-12 rounded-xl border-border bg-background/70 pl-11 font-medium transition-all focus-visible:ring-primary/30"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="ml-1 text-xs font-black uppercase tracking-widest text-muted-foreground"
                    >
                      Email{" "}
                      <span className="font-bold normal-case text-muted-foreground/60">
                        (optional)
                      </span>
                    </label>
                    <div className="group relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@domain.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="h-12 rounded-xl border-border bg-background/70 pl-11 font-medium transition-all focus-visible:ring-primary/30"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="contactNumber"
                    className="ml-1 text-xs font-black uppercase tracking-widest text-muted-foreground"
                  >
                    Phone number
                  </label>
                  <div className="group relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="contactNumber"
                      name="contactNumber"
                      type="tel"
                      placeholder="+92 300 1234567"
                      value={formData.contactNumber}
                      onChange={handleChange}
                      className="h-12 rounded-xl border-border bg-background/70 pl-11 font-medium transition-all focus-visible:ring-primary/30"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="ml-1 text-xs font-black uppercase tracking-widest text-muted-foreground"
                  >
                    Password
                  </label>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={formData.password}
                      onChange={handleChange}
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

                  {formData.password && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2 px-1 pt-2"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                        <span className="text-muted-foreground">
                          Password strength
                        </span>
                        <span
                          className={
                            isStrong && hasMixed
                              ? "text-primary"
                              : isStrong
                                ? "text-foreground"
                                : "text-muted-foreground"
                          }
                        >
                          {isStrong && hasMixed
                            ? "Strong"
                            : isStrong
                              ? "Okay"
                              : "Weak"}
                        </span>
                      </div>
                      <div className="flex h-1.5 gap-1.5">
                        <div
                          className={`flex-1 rounded-full transition-all duration-700 ${
                            passwordStrength > 0
                              ? isStrong
                                ? "bg-primary"
                                : "bg-muted-foreground/60"
                              : "bg-muted"
                          }`}
                        />
                        <div
                          className={`flex-1 rounded-full transition-all duration-700 ${
                            passwordStrength >= 8
                              ? hasMixed
                                ? "bg-primary"
                                : "bg-muted-foreground/60"
                              : "bg-muted"
                          }`}
                        />
                        <div
                          className={`flex-1 rounded-full transition-all duration-700 ${
                            isStrong && hasMixed ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="ml-1 text-xs font-black uppercase tracking-widest text-muted-foreground"
                  >
                    Confirm password
                  </label>
                  <div className="group relative">
                    <Check className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="h-12 rounded-xl border-border bg-background/70 pl-11 font-medium transition-all focus-visible:ring-primary/30"
                      disabled={isLoading}
                    />
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
                      Creating account…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Create account
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  )}
                </Button>

                <p className="px-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                  By creating an account you agree to TrendInsight&apos;s
                  Terms of Service and Privacy Policy.
                </p>

                <div className="pt-1 text-center text-sm font-medium text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-primary hover:underline"
                  >
                    Sign in
                  </Link>
                </div>
              </form>
            </div>

            <p className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Your data stays private and secure.
            </p>
          </motion.div>
        </div>
      </section>
    </MarketingShell>
  );
}
