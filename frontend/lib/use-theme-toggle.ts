"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemeName = "dark" | "light";

/**
 * Shared dark/light toggle, parameterized by localStorage key so the host
 * side (dashboard, marketing/auth/profile pages) and the guest-facing
 * responder flow can each remember their own preference independently,
 * while both draw from the same --dash-* palette (see globals.css)
 * applied via `data-theme` on <html>. Also flips the shadcn/Tailwind
 * `dark` class so the guest form's shadcn-ui primitives (Input, Button,
 * Alert, …) — which read the separate shadcn token set, not --dash-* —
 * switch in lockstep with the same toggle instead of needing their own.
 */
export function useThemeToggle(storageKey: string, defaultTheme: ThemeName = "light"): [ThemeName, () => void] {
  const [theme, setTheme] = useState<ThemeName>(defaultTheme);

  const applyTheme = useCallback((next: ThemeName) => {
    document.documentElement.dataset.theme = next;
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  useEffect(() => {
    let initial: ThemeName = defaultTheme;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "light" || stored === "dark") initial = stored;
    } catch {
      // localStorage can throw in private-browsing contexts — default stands.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with localStorage, not derivable during render
    setTheme(initial);
    applyTheme(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- storageKey/defaultTheme are fixed per call site
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeName = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // best-effort persistence only
      }
      applyTheme(next);
      return next;
    });
  }, [applyTheme, storageKey]);

  return [theme, toggleTheme];
}

export const HOST_THEME_STORAGE_KEY = "dietre-host-theme";
export const PARTICIPANT_THEME_STORAGE_KEY = "dietre-participant-theme";
