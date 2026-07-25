"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  TrendingUp,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const linkIsActive = (href: string) => {
    if (href.startsWith("/#")) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const navLinks: { name: string; href: string; icon?: React.ReactNode }[] =
    isAuthenticated
      ? user?.role === "admin"
        ? [
            {
              name: "Dashboard",
              href: "/dashboard",
              icon: <LayoutDashboard className="w-4 h-4" />,
            },
            {
              name: "Trends",
              href: "/dashboard/trends",
              icon: <TrendingUp className="w-4 h-4" />,
            },
          ]
        : [
            {
              name: "Trends",
              href: "/dashboard/trends",
              icon: <TrendingUp className="w-4 h-4" />,
            },
            {
              name: "Settings",
              href: "/dashboard/settings",
              icon: <Settings className="w-4 h-4" />,
            },
          ]
      : [
          { name: "Home", href: "/" },
          { name: "About", href: "/about" },
          { name: "Features", href: "/#features" },
          { name: "Contact", href: "/contact" },
        ];

  return (
    <motion.header className="fixed left-0 right-0 top-4 z-50 px-4 transition-all duration-300 sm:px-6 lg:px-8">
      <nav
        className={`w-full rounded-2xl transition-all duration-500 ${
          isScrolled
            ? "glass-card border-border/80 px-4 py-3 shadow-sm sm:px-6"
            : "border border-transparent bg-transparent px-2 py-5 sm:px-0"
        }`}
      >
        <div className="flex items-center w-full">
          {/* Logo Section (Left) */}
          <div className="flex-1 flex justify-start">
            <Link
              href={
                isAuthenticated
                  ? user?.role === "admin"
                    ? "/dashboard"
                    : "/dashboard/trends"
                  : "/"
              }
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-border shadow-sm transition-shadow group-hover:shadow-md">
                  <Image
                    src="/logo.png"
                    alt="TrendInsight"
                    fill
                    sizes="40px"
                    priority
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col leading-none">
                  <span
                    className="font-extrabold text-xl tracking-tight text-foreground"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    TrendInsight
                  </span>
                  <span className="mt-0.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.26em] text-muted-foreground">
                    Predictive Platform
                  </span>
                </div>
              </motion.div>
            </Link>
          </div>

          {/* Desktop Navigation (Center) */}
          <div className="hidden md:flex items-center justify-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-bold transition-all duration-300 group
                  ${
                    linkIsActive(link.href)
                      ? "bg-foreground text-background dark:bg-background dark:text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
              >
                {link.icon && (
                  <span className="group-hover:scale-110 transition-transform">
                    {link.icon}
                  </span>
                )}
                {link.name}
                {linkIsActive(link.href) && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-background dark:bg-foreground"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Action Buttons (Right) */}
          <div className="flex-1 flex justify-end">
            <div className="hidden md:flex items-center gap-2">
              <ThemeToggle />
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <div className="mr-2 flex flex-col items-end">
                    <span className="text-xs font-bold text-foreground/80">
                      {user?.name}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Premium Member
                    </span>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="h-10 rounded-xl px-5 font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login">
                    <Button
                      variant="outline"
                      className="rounded-xl border-primary/40 px-6 font-bold text-primary transition-all hover:bg-primary/10 dark:text-primary dark:hover:bg-primary/15"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button className="rounded-xl bg-primary px-8 font-bold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button - Also pushed to right */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(!isOpen)}
              className="ml-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm transition-all hover:bg-accent md:hidden"
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key="close"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                  >
                    <X className="w-5 h-5 text-foreground" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                  >
                    <Menu className="w-5 h-5 text-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="md:hidden overflow-hidden"
            >
              <div className="mt-4 space-y-2 border-t border-border/70 bg-background/95 pt-6 pb-4 backdrop-blur-xl">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-xl p-4 font-bold text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                  >
                    {link.icon}
                    {link.name}
                  </Link>
                ))}

                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex justify-center pb-2">
                    <ThemeToggle />
                  </div>
                  {isAuthenticated ? (
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="h-12 w-full rounded-xl border-destructive/20 font-bold text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  ) : (
                    <>
                      <Link href="/login" className="w-full">
                        <Button
                          variant="ghost"
                          className="h-12 w-full rounded-xl font-bold"
                        >
                          Login
                        </Button>
                      </Link>
                      <Link href="/signup" className="w-full">
                        <Button className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/20">
                          Get Started
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
