"use client";

import { HOST_THEME_STORAGE_KEY, useThemeToggle } from "@/frontend/lib/use-theme-toggle";
import { ThemeToggleButton } from "@/frontend/components/theme-toggle-button";

/**
 * Dark/light toggle for the host side of the app — the event dashboard,
 * marketing/auth/profile pages, and any other page a logged-in host sees
 * (e.g. SiteHeader). Persisted separately from the guest-facing flow's own
 * toggle (see participant-theme-toggle.tsx).
 */
export function HostThemeToggle({ className }: { className?: string }) {
  const [theme, toggleTheme] = useThemeToggle(HOST_THEME_STORAGE_KEY);
  return <ThemeToggleButton theme={theme} onToggle={toggleTheme} label="host pages" className={className} />;
}
