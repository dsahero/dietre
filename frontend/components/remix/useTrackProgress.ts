"use client";

/**
 * useTrackProgress — custom hook tracking scroll runway for the sticky plate section.
 * Ported from remix-dietre landing page.
 */
import { useEffect } from 'react';
import { useMotionValue, MotionValue } from 'motion/react';

export function useTrackProgress(
  trackRef: React.RefObject<HTMLDivElement | null>
): MotionValue<number> {
  const progress = useMotionValue(0);

  useEffect(() => {
    const updateProgress = () => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const startSticky = 30; // matches top: 30px sticky stage
      const stickyHeight = 940;
      const totalScrollDist = track.offsetHeight - stickyHeight;

      if (totalScrollDist <= 0) return;

      const scrolled = startSticky - rect.top;
      const ratio = Math.max(0, Math.min(1, scrolled / totalScrollDist));
      progress.set(ratio);
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    updateProgress();

    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [trackRef, progress]);

  return progress;
}

