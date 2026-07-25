"use client";

import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Sparkles,
  Rocket,
  Clock,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSubmitted(true);
    setIsSubmitting(false);
    setFormData({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setSubmitted(false), 6000);
  };

  const contactCards = [
    {
      icon: Mail,
      title: "Email us",
      lines: ["support@trendinsight.ai", "Replies within 24 hours"],
    },
    {
      icon: Phone,
      title: "Call us",
      lines: ["+1 (555) 000-TREND", "Mon–Fri · 9am – 6pm PST"],
    },
    {
      icon: MapPin,
      title: "Visit us",
      lines: ["123 Predictive Plaza", "San Francisco, CA 94105"],
    },
  ];

  const faqs = [
    {
      q: "Do I need a data team to use TrendInsight?",
      a: "No. If you can export a CSV from your store, you can use TrendInsight. The schema is validated on upload and cleaning happens automatically.",
    },
    {
      q: "How accurate are the predictions?",
      a: "Our XGBoost engine averages 89% accuracy on held-out test data. Every prediction comes with a confidence score so you know how much to trust it.",
    },
    {
      q: "Can I keep multiple datasets?",
      a: "Yes. Each upload is saved as a separate dataset. You can switch the active dataset anytime, and trained models are cached so switching back is instant.",
    },
    {
      q: "Is my data secure?",
      a: "Your data stays in your account and is never shared between tenants. Models are trained per active dataset and artifacts are stored privately.",
    },
  ];

  return (
    <MarketingShell>
      {/* ───────────────────────────── HERO ───────────────────────────── */}
      <section className="relative isolate overflow-hidden pt-32 pb-20 lg:pt-40">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.20),transparent_60%)] blur-3xl" />
          <div className="absolute -bottom-32 left-1/4 h-[400px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.12),transparent_60%)] blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.12 },
              },
            }}
            className="space-y-8"
          >
            <motion.div variants={fadeUp}>
              <Badge className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 font-bold tracking-wide text-primary backdrop-blur-sm hover:bg-primary/15">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                We&apos;d love to hear from you
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-balance text-5xl font-extrabold leading-[0.9] tracking-tighter sm:text-7xl lg:text-8xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Let&apos;s start a{" "}
              <span className="gradient-text">conversation.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="max-w-xl text-pretty text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl"
            >
              Questions about the model? Need an enterprise plan? Or just want
              to see TrendInsight on your own data? Drop us a line — we read
              every message and reply within a day.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center gap-6 pt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/80"
            >
              <span className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Avg. reply &lt; 24h
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                We never share your email
              </span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease }}
            className="relative"
          >
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25),transparent_60%)] blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl ring-1 ring-white/5">
              <Image
                src="/landing/contact-hero.png"
                alt="TrendInsight — get in touch"
                width={1024}
                height={1024}
                priority
                className="h-auto w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────────────────────────── FORM + INFO ───────────────────────────── */}
      <section className="relative border-y border-border/70 bg-muted/15 py-28">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-5 lg:px-8">
          {/* Form */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="glass-card relative h-full overflow-hidden rounded-3xl border-border/60 p-8 shadow-2xl md:p-12">
              <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, ease }}
                    className="flex min-h-[400px] flex-col items-center justify-center text-center"
                  >
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-10 w-10 text-primary" />
                    </div>
                    <h3
                      className="text-3xl font-bold tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Message received.
                    </h3>
                    <p className="mt-3 max-w-md font-medium text-muted-foreground">
                      Thanks for reaching out — someone from our team will get
                      back to you within 24 hours.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-8 rounded-xl border-2 px-8 font-bold"
                      onClick={() => setSubmitted(false)}
                    >
                      Send another message
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10 space-y-8"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-6 w-6 text-primary" />
                      <h3
                        className="text-2xl font-bold tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Send us a message
                      </h3>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2.5">
                          <label
                            htmlFor="name"
                            className="text-xs font-black uppercase tracking-widest text-muted-foreground"
                          >
                            Your name
                          </label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="John Doe"
                            required
                            className="h-12 rounded-xl border-border bg-background/60 font-medium"
                          />
                        </div>

                        <div className="space-y-2.5">
                          <label
                            htmlFor="email"
                            className="text-xs font-black uppercase tracking-widest text-muted-foreground"
                          >
                            Email
                          </label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            required
                            className="h-12 rounded-xl border-border bg-background/60 font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <label
                          htmlFor="subject"
                          className="text-xs font-black uppercase tracking-widest text-muted-foreground"
                        >
                          Subject
                        </label>
                        <Input
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder="How can we help?"
                          required
                          className="h-12 rounded-xl border-border bg-background/60 font-medium"
                        />
                      </div>

                      <div className="space-y-2.5">
                        <label
                          htmlFor="message"
                          className="text-xs font-black uppercase tracking-widest text-muted-foreground"
                        >
                          Message
                        </label>
                        <Textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Tell us a bit more about what you're working on…"
                          rows={6}
                          required
                          className="resize-none rounded-xl border-border bg-background/60 p-4 font-medium"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        size="lg"
                        className="group h-14 w-full rounded-xl font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.01]"
                      >
                        {isSubmitting ? (
                          "Sending…"
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send message
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Side info */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.1 }}
            className="space-y-4 lg:col-span-2"
          >
            {contactCards.map(({ icon: Icon, title, lines }, i) => (
              <motion.div
                key={title}
                whileHover={{ x: 6 }}
                transition={{ duration: 0.3, ease }}
                className="glass-card group flex items-start gap-5 rounded-3xl border-border/60 p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-foreground text-background shadow-sm transition-transform group-hover:scale-110 dark:bg-background dark:text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h3 className="text-base font-bold tracking-tight">
                    {title}
                  </h3>
                  {lines.map((line, idx) => (
                    <p
                      key={idx}
                      className={`text-sm leading-relaxed ${
                        idx === 0
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6, ease }}
              className="glass-card relative mt-2 overflow-hidden rounded-3xl border-border/60 p-7"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                  <Rocket className="h-5 w-5 text-primary" />
                </div>
                <h3
                  className="text-xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Need it yesterday?
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Priority customers get a dedicated growth manager and
                  same-day implementation help.
                </p>
                <Button
                  asChild
                  className="h-11 w-full rounded-xl font-bold shadow-md shadow-primary/20"
                >
                  <a href="mailto:sales@trendinsight.ai?subject=Priority%20Access">
                    Get priority access
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───────────────────────────── FAQ ───────────────────────────── */}
      <section className="relative py-28">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8"
        >
          <Badge className="rounded-full border border-border bg-muted/50 px-4 py-1.5 font-bold text-foreground">
            Frequently asked
          </Badge>
          <h2
            className="mt-6 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Quick answers to{" "}
            <span className="gradient-text">common questions.</span>
          </h2>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-5 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.q}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6, ease }}
              className="glass-card rounded-3xl border-border/60 p-6 md:p-7"
            >
              <h3 className="text-base font-bold tracking-tight">{faq.q}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───────────────────────────── CTA ───────────────────────────── */}
      <section className="relative overflow-hidden py-28">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25),transparent_60%)] blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8"
        >
          <h2
            className="text-balance text-4xl font-extrabold leading-[0.95] tracking-tighter sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Or skip the form —{" "}
            <span className="gradient-text">try it now.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Spin up an account, upload a CSV, and see your first forecast in
            under five minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button
                size="lg"
                className="group h-14 rounded-2xl px-10 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.03]"
              >
                Start free trial
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/dashboard/trends">
              <Button
                variant="outline"
                size="lg"
                className="h-14 rounded-2xl border-2 px-10 font-bold"
              >
                See the live demo
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </MarketingShell>
  );
}
