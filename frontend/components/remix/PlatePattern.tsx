"use client";

/**
 * PlatePattern — plate foliage cluster wrapper with scroll-driven CCW rotation.
 * Ported from remix-dietre landing page.
 */
import React from 'react';
import { motion, MotionValue, useTransform } from 'motion/react';
import { Path21Design } from './Path21Design';

interface PlatePatternProps {
  progress: MotionValue<number>;
}

export function PlatePattern({ progress }: PlatePatternProps) {
  // Spins counter-clockwise (negative angle) around the exact center of the plate (134px, 399px)
  // as each text switch in the grey section occurs:
  // - Reading Text 1 [0 -> 0.22]: stays at 0°
  // - Switch 1 (Text 1 -> Text 2, [0.22 -> 0.36]): smoothly spins CCW by 120°
  // - Reading Text 2 [0.36 -> 0.58]: holds at -120°
  // - Switch 2 (Text 2 -> Text 3, [0.58 -> 0.72]): smoothly spins CCW by another 120°
  // - Reading Text 3 [0.72 -> 1.0]: holds at -240°
  const rotate = useTransform(
    progress,
    [0, 0.22, 0.36, 0.58, 0.72, 1.0],
    [0, 0, -120, -120, -240, -240]
  );

  return (
    <motion.div
      className="remix-plate-pattern-wrapper"
      style={{
        rotate,
        transformOrigin: '134px 399px',
      }}
      aria-hidden="true"
    >
      <div className="remix-path21-node remix-p21-1">
        <Path21Design />
      </div>
      <div className="remix-path21-node remix-p21-2">
        <Path21Design />
      </div>
      <div className="remix-path21-node remix-p21-3">
        <Path21Design />
      </div>
      <div className="remix-path21-node remix-p21-4">
        <Path21Design />
      </div>
      <div className="remix-path21-node remix-p21-5">
        <Path21Design />
      </div>
      <div className="remix-path21-node remix-p21-6">
        <Path21Design />
      </div>
    </motion.div>
  );
}

