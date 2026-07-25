"use client";

import { Navbar } from "@/components/navbar";
import { AnimatedBackground } from "@/components/animated-background";
import { SiteFooter } from "@/components/site-footer";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      <Navbar />
      <AnimatedBackground />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      <SiteFooter className="relative z-10" />
    </div>
  );
}
