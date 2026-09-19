"use client";

/**
 * LowerFork — scroll-triggered sliding lower fork graphic.
 * Ported from remix-dietre landing page.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ForkGraphic } from './ForkGraphic';

export function LowerFork() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      // Trigger slide-in when user scrolls to this section
      if (rect.top < viewportHeight * 0.8) {
        setHasEntered(true);
      } else if (rect.top > viewportHeight) {
        // Reset if user scrolls all the way back up above the fork/section
        setHasEntered(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Immediate check on mount
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <div ref={containerRef} className="remix-fork-lower" aria-hidden="true">
      <motion.div
        initial={false}
        animate={{
          x: hasEntered ? 0 : 340,
          opacity: hasEntered ? 1 : 0,
        }}
        transition={{
          duration: 0.85,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <ForkGraphic
          rotation={-124}
          color="#D7531F"
          style={{ width: '100%', height: '100%' }}
        />
      </motion.div>
    </div>
  );
}

