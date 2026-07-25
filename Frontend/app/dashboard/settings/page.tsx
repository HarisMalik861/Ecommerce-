"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Save,
  User,
  ShieldAlert,
  Mail,
  History,
  Trash2,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSaveName = async () => {
    if (!name.trim()) {
      setMessage({ type: "error", text: "Name cannot be empty" });
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(name);
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally {
      setIsSaving(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <div className="w-full space-y-12 pb-20">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <Badge className="rounded-full border border-border bg-foreground/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground dark:bg-background/10 dark:text-foreground">
          Your Account
        </Badge>
        <h1
          className="text-5xl font-black tracking-tighter"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Settings
        </h1>
        <p className="text-lg text-muted-foreground font-medium leading-relaxed">
          Change your name and account details.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Profile Settings */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card hover:glass-hover relative overflow-hidden border-border/60 shadow-xl group">
            <div className="absolute right-0 top-0 h-32 w-32 bg-foreground opacity-[0.02] blur-3xl transition-opacity group-hover:opacity-[0.05] dark:bg-background" />

            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-foreground text-background dark:bg-background dark:text-foreground">
                  <User className="h-4 w-4" />
                </div>
                <CardTitle
                  className="text-2xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Your Name & Info
                </CardTitle>
              </div>
              <CardDescription className="text-sm font-medium text-muted-foreground">
                Change the name others see
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8 pt-4 space-y-8">
              <AnimatePresence mode="wait">
                {message && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className={`flex items-center gap-3 rounded-xl border border-border p-4 text-sm font-bold ${
                      message.type === "success"
                        ? "bg-foreground/5 text-foreground"
                        : "bg-muted/50 text-foreground"
                    }`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span>{message.text}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1"
                  >
                    Your Email{" "}
                    {user?.email ? "(cannot change)" : "(optional, not set)"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      placeholder={
                        !user?.email
                          ? "Not provided — use contact number to log in"
                          : undefined
                      }
                      className="h-14 cursor-not-allowed rounded-xl border-border bg-muted/40 pl-11 font-bold italic text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1"
                  >
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-14 rounded-xl border-border bg-background pl-11 font-bold shadow-sm focus:ring-2 focus:ring-ring/20"
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                    Account Info
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex h-14 items-center gap-3 rounded-xl border border-border bg-muted/30 px-4">
                      <History className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          Joined
                        </span>
                        <span className="text-xs font-bold">
                          {new Date(user?.createdAt || "").toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex h-14 items-center gap-3 rounded-xl border border-border bg-muted/30 px-4">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          Role
                        </span>
                        <span className="text-xs font-bold uppercase tracking-tighter">
                          {user?.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSaveName}
                  disabled={isSaving}
                  className="h-14 rounded-xl bg-foreground px-10 text-xs font-black uppercase tracking-widest text-background shadow-xl transition-all hover:bg-muted-foreground group dark:bg-background dark:text-foreground"
                >
                  {isSaving ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-background/20 border-t-background dark:border-foreground/20 dark:border-t-foreground" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* System Termination (Danger Zone) */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card overflow-hidden border-border/60 bg-muted/20 group">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-foreground text-background dark:bg-background dark:text-foreground">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <CardTitle
                  className="text-2xl font-bold tracking-tight text-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Delete Account
                </CardTitle>
              </div>
              <CardDescription className="font-medium text-muted-foreground">
                This cannot be undone
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-6">
              <p className="max-w-sm text-xs font-medium text-muted-foreground">
                All your data will be gone forever. You will not be able to get
                it back.
              </p>
              <Button
                variant="outline"
                className="group/btn h-14 rounded-xl border-border bg-background px-8 text-xs font-black uppercase tracking-widest text-foreground transition-all hover:bg-foreground hover:text-background dark:bg-card dark:text-foreground"
              >
                <Trash2 className="w-4 h-4 mr-2 group-hover/btn:rotate-12 transition-transform" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
