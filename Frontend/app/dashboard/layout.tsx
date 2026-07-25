"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { AnimatedBackground } from "@/components/animated-background";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed, toggleCollapse } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <AnimatedBackground />

      <DashboardSidebar />

      {/* Mobile Header Bar */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed left-0 right-0 top-0 z-20 flex h-16 items-center border-b border-border/80 bg-background/80 px-4 shadow-sm backdrop-blur-md lg:hidden"
      >
        <button
          onClick={toggleCollapse}
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-accent"
        >
          <svg
            className="h-6 w-6 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-border shadow-lg shadow-foreground/10">
            <Image
              src="/logo.png"
              alt="TrendInsight"
              fill
              sizes="32px"
              className="object-cover"
            />
          </div>
          <span
            className="font-extrabold text-sm tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            TrendInsight
          </span>
        </div>
        <div className="w-10" />
      </motion.div>

      <motion.div
        animate={{
          paddingLeft: !isMobile ? (isCollapsed ? 80 : 280) : 0,
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 flex flex-col min-w-0 h-full relative z-10"
      >
        <main
          className={`flex-1 overflow-auto p-4 md:p-10 transition-all duration-300 ${isMobile ? "pt-20" : ""}`}
        >
          <div className="w-full h-full">{children}</div>
        </main>
      </motion.div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login?redirect=/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  // Admin-only routes: /dashboard (main), /dashboard/users, and /dashboard/dataset.
  const isAdminOnlyRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/users") ||
    pathname.startsWith("/dashboard/dataset");
  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated &&
      user?.role !== "admin" &&
      isAdminOnlyRoute
    ) {
      // Redirect to Trends (allowed) instead of home
      router.push("/dashboard/trends");
    }
  }, [isLoading, isAuthenticated, user?.role, router, isAdminOnlyRoute]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-hidden bg-background">
        <AnimatedBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 relative z-10"
        >
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-1"
          >
            <p
              className="text-xl font-extrabold tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Initializing Intelligence
            </p>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.2em]">
              Preparing your dashboard
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Block non-admins from admin-only routes (handled by redirect above, but guard render)
  if (isAdminOnlyRoute && user?.role !== "admin") {
    return null;
  }

  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
