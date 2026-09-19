"use client";

import { useEffect, useState } from "react";

/**
 * True when the viewport is at or below `breakpoint` px. Starts `false`
 * (desktop-first, matching the server-rendered markup) and syncs on mount
 * and on every resize/orientation change via matchMedia, so a drawer-style
 * nav can default to closed on a phone and re-collapse itself if the
 * window is resized down while it happens to be open.
 */
export function useIsMobile(breakpoint = 880): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with the viewport, not derivable during render
    setIsMobile(query.matches);
    const update = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
