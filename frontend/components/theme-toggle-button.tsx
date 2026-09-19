"use client";

import { Moon, Sun } from "lucide-react";
import type { ThemeName } from "@/frontend/lib/use-theme-toggle";

interface ThemeToggleButtonProps {
  theme: ThemeName;
  onToggle: () => void;
  /** What this toggle controls, for the accessible label — e.g. "dashboard" or "guest form". */
  label?: string;
  className?: string;
}

export function ThemeToggleButton({ theme, onToggle, label = "theme", className = "" }: ThemeToggleButtonProps) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`Switch to ${nextTheme} ${label}`}
      aria-label={`Switch to ${nextTheme} ${label}`}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-soft)] transition-colors hover:bg-[var(--dash-surface-hover)] hover:text-[var(--dash-text)] cursor-pointer ${className}`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
