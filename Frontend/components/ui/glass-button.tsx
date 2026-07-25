"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "glass-card hover:glass-hover text-blue-700 border-white/50 shadow-lg",
        primary:
          "bg-linear-to-r from-foreground to-muted-foreground text-background hover:from-foreground hover:to-muted-foreground shadow-lg hover:shadow-xl hover:scale-105 dark:bg-background dark:text-foreground",
        secondary: "glass border-white/40 text-gray-700 hover:glass-hover",
        outline:
          "glass border-white/50 text-gray-700 hover:glass-hover hover:border-white/70",
        ghost: "hover:glass hover:border-white/30 text-gray-700",
        destructive:
          "glass border-red-200/50 text-red-600 hover:glass-hover hover:border-red-300/70",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface GlassButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  asChild?: boolean;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(glassButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
GlassButton.displayName = "GlassButton";

export { GlassButton, glassButtonVariants };
