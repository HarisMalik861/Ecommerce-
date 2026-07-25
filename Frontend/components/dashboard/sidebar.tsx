"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Settings,
  LayoutDashboard,
  TrendingUp,
  Database,
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useSidebar } from "@/lib/sidebar-context";
import { ThemeToggle } from "@/components/theme-toggle";

export function DashboardSidebar() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse } = useSidebar();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const isActive = (path: string) =>
    pathname === path ||
    (path !== "/dashboard" && pathname.startsWith(path + "/"));

  const baseMenuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      adminOnly: true,
      hint: "Your main page",
    },
    {
      name: "Trends",
      path: "/dashboard/trends",
      icon: TrendingUp,
      adminOnly: false,
      hint: "See product trends",
    },
    {
      name: "Users",
      path: "/dashboard/users",
      icon: Users,
      adminOnly: true,
      hint: "Add or remove people",
    },
    {
      name: "Dataset",
      path: "/dashboard/dataset",
      icon: Database,
      adminOnly: true,
      hint: "Upload training CSV",
    },
    {
      name: "Settings",
      path: "/dashboard/settings",
      icon: Settings,
      adminOnly: false,
      hint: "Your account",
    },
  ];

  const menuItems = baseMenuItems.filter(
    (item) => !item.adminOnly || user?.role === "admin",
  );

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={toggleCollapse}
          className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 80 : 280,
          x: 0,
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`glass-card fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border/80 shadow-lg lg:translate-x-0 
          ${isCollapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0"}`}
      >
        {/* Branding Section */}
        <div className="relative border-b border-border/70 p-6">
          <Link
            href={user?.role === "admin" ? "/dashboard" : "/dashboard/trends"}
            className="flex items-center gap-3"
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="relative h-10 w-10 overflow-hidden rounded-xl border border-border shadow-sm"
            >
              <Image
                src="/logo.png"
                alt="TrendInsight"
                fill
                sizes="40px"
                priority
                className="object-cover"
              />
            </motion.div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col leading-none"
                >
                  <span
                    className="font-extrabold text-lg tracking-tight text-foreground"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    TrendInsight
                  </span>
                  <span className="mt-0.5 text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground/60">
                    Intelligence
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          {/* Collapse Toggle */}
          <motion.button
            onClick={toggleCollapse}
            whileHover={{ scale: 1.1, x: 3 }}
            whileTap={{ scale: 0.9 }}
            className="absolute -right-3 top-8 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-foreground text-background shadow-xl transition-colors hover:bg-background hover:text-foreground lg:flex"
          >
            <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }}>
              <ChevronLeft className="w-3 h-3" />
            </motion.div>
          </motion.button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <motion.div key={item.path}>
                <Link href={item.path}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group relative flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 ${
                      active
                        ? "bg-primary/15 text-foreground border border-primary/40 shadow-[0_0_24px_color-mix(in_oklch,var(--primary)_35%,transparent)] dark:bg-primary/20"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute bottom-2 left-0 top-2 w-1 rounded-full bg-primary"
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                      />
                    )}

                    <Icon
                      className={`h-5 w-5 shrink-0 transition-all duration-300 ${
                        active
                          ? "scale-110 text-primary"
                          : "group-hover:text-foreground"
                      }`}
                    />

                    <AnimatePresence mode="wait">
                      {!isCollapsed && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex flex-col min-w-0"
                        >
                          <span
                            className={`whitespace-nowrap text-sm font-bold tracking-tight ${
                              active ? "text-foreground" : ""
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.hint && (
                            <span className="text-[10px] text-muted-foreground/70 font-medium truncate">
                              {item.hint}
                            </span>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!isCollapsed && active && (
                      <Sparkles className="ml-auto h-3 w-3 text-primary" />
                    )}
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Bottom User Section */}
        <div className="border-t border-border/70 bg-muted/25 p-4 backdrop-blur-md">
          <div
            className={`mb-3 flex ${isCollapsed ? "justify-center" : "justify-center px-1"}`}
          >
            <ThemeToggle />
          </div>
          <motion.div
            className={`flex items-center gap-3 rounded-2xl border border-border/70 bg-card/85 p-2 shadow-sm ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-foreground text-xs font-bold text-background shadow-sm ring-2 ring-background dark:bg-background dark:text-foreground">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex flex-1 flex-col">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-black tracking-tight text-foreground">
                    {user?.name}
                  </p>
                  {user?.role === "admin" && (
                    <span className="rounded-md border border-primary/40 bg-primary/10 px-1.5 py-px text-[8px] font-black uppercase tracking-widest text-primary">
                      Admin
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                    Active Now
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Logout Button */}
          <motion.div className="mt-4">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className={`h-11 w-full gap-3 rounded-xl border border-transparent transition-all hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive ${
                isCollapsed ? "justify-center px-0" : "justify-start px-4"
              }`}
            >
              <LogOut className="w-4 h-4" />
              {!isCollapsed && (
                <span className="text-xs font-black uppercase tracking-widest">
                  Logout
                </span>
              )}
            </Button>
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
}
