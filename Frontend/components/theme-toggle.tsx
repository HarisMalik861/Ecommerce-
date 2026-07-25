"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-10 w-10 rounded-xl ${className ?? ""}`}
        aria-label="Theme"
        disabled
      >
        <Sun className="h-[1.15rem] w-[1.15rem] opacity-0" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`relative h-10 w-10 rounded-xl text-foreground ${className ?? ""}`}
          aria-label="Toggle theme"
        >
          <Sun className="h-[1.15rem] w-[1.15rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.15rem] w-[1.15rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
          <Sun className="h-4 w-4" />
          Light
          {theme === "light" ? <span className="ml-auto text-xs text-muted-foreground">✓</span> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
          <Moon className="h-4 w-4" />
          Dark
          {theme === "dark" ? <span className="ml-auto text-xs text-muted-foreground">✓</span> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
          <Monitor className="h-4 w-4" />
          System
          {theme === "system" ? <span className="ml-auto text-xs text-muted-foreground">✓</span> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
