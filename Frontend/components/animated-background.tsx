"use client";

import { motion } from "framer-motion";

/** Subtle blue/indigo ambient orbs — low contrast so content stays primary */
export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute top-[12%] right-[8%] h-[min(22rem,50vw)] w-[min(22rem,50vw)] rounded-full bg-foreground/6 blur-[110px] dark:bg-foreground/12"
        animate={{
          y: [0, -24, 0],
          opacity: [0.35, 0.5, 0.35],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-[8%] left-[5%] h-[min(26rem,55vw)] w-[min(26rem,55vw)] rounded-full bg-muted-foreground/8 blur-[120px] dark:bg-muted-foreground/12"
        animate={{
          y: [0, 20, 0],
          opacity: [0.3, 0.45, 0.3],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[min(20rem,45vw)] w-[min(20rem,45vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/4 blur-[90px] dark:bg-foreground/10"
        animate={{
          scale: [1, 1.06, 1],
          opacity: [0.25, 0.38, 0.25],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />
    </div>
  );
}
