"use client";

import { PARTICIPANT_THEME_STORAGE_KEY, useThemeToggle } from "@/frontend/lib/use-theme-toggle";
import { ThemeToggleButton } from "@/frontend/components/theme-toggle-button";

/**
 * Dark/light toggle for the guest-facing flow (the anonymous diet form and
 * the join-event chat) — persisted separately from the host's own toggle
 * (see use-theme-toggle.ts) so a host previewing a guest link never flips
 * a guest's preference, and vice versa.
 */
export function ParticipantThemeToggle({ className }: { className?: string }) {
  const [theme, toggleTheme] = useThemeToggle(PARTICIPANT_THEME_STORAGE_KEY);
  return <ThemeToggleButton theme={theme} onToggle={toggleTheme} label="guest form" className={className} />;
}
