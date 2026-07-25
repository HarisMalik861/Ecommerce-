import Link from "next/link";
import Image from "next/image";

const footerLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "mailto:support@trendinsight.ai?subject=Privacy" },
  { label: "Terms", href: "mailto:support@trendinsight.ai?subject=Terms" },
];

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={`border-t border-border/80 bg-card/70 py-12 backdrop-blur-sm ${className ?? ""}`}
    >
      <div className="page-container-wide flex flex-col items-center justify-between gap-8 md:flex-row">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-border shadow-sm">
            <Image
              src="/logo.png"
              alt="TrendInsight"
              fill
              sizes="36px"
              className="object-cover"
            />
          </div>
          <span
            className="font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            TrendInsight
          </span>
        </div>
        <p className="text-center text-sm font-medium text-muted-foreground md:text-left">
          © {new Date().getFullYear()} Predictive Intelligence Corp.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-6 md:justify-end">
          {footerLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
