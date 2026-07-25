import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  kicker,
  title,
  description,
  children,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 border-b border-border/80 pb-10 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl space-y-3">
        {kicker ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {kicker}
          </p>
        ) : null}
        <h1
          className="font-display text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
      ) : null}
    </div>
  );
}

export function Section({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <section className={cn("section-y", className)}>{children}</section>;
}
