import React from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TrendInsight",
    template: "%s — TrendInsight",
  },
  description:
    "AI-powered sales prediction and trend intelligence for e-commerce. Forecast demand, optimise inventory, and make data-driven decisions.",
  applicationName: "TrendInsight",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "TrendInsight",
    statusBarStyle: "black-translucent",
    startupImage: "/apple-icon.png",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/icon-192.png"],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Analytics />
            <Toaster richColors position="top-right" />
            <PwaInstallBanner />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
