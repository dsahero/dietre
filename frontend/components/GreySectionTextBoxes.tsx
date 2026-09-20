"use client";

/**
 * GreySectionTextBoxes — sequential scrollytelling text that fades in/out
 * as the user scrolls through the pinned grey section.
 * Ported from remix-dietre landing page.
 */
import React from 'react';
import { motion, MotionValue, useTransform } from 'motion/react';

interface TextItem {
  title: string;
  body: string;
}

const TEXT_ITEMS: TextItem[] = [
  {
    title: 'Anonymous by design',
    body: 'Guests show up as "Guest 07" — never a name. No login, no account. Diet notes stay separate from personal identity.',
  },
  {
    title: 'Ingredient-level matching',
    body: 'Hard excludes meet estimated ingredients — pork, gluten, shellfish, meat-dairy combos — not a restaurant\'s self-tagged checkbox.',
  },
  {
    title: 'Zero-match protection',
    body: 'If a guest has no safe option in range, you see an anonymous flag — and an email only if they chose to leave one.',
  },
];

interface GreySectionTextBoxesProps {
  progress: MotionValue<number>;
}

export function GreySectionTextBoxes({ progress }: GreySectionTextBoxesProps) {
  // Text 1: starts visible, holds, fades out
  const opacity1 = useTransform(progress, [0, 0.22, 0.32], [1, 1, 0]);
  const y1 = useTransform(progress, [0, 0.22, 0.32], [0, 0, -18]);

  // Text 2: fades in, holds, fades out
  const opacity2 = useTransform(progress, [0.26, 0.36, 0.58, 0.68], [0, 1, 1, 0]);
  const y2 = useTransform(progress, [0.26, 0.36, 0.58, 0.68], [18, 0, 0, -18]);

  // Text 3: fades in, holds until the user finishes the track
  const opacity3 = useTransform(progress, [0.62, 0.72, 1.0], [0, 1, 1]);
  const y3 = useTransform(progress, [0.62, 0.72, 1.0], [18, 0, 0]);

  return (
    <div className="remix-grey-text-sequence-container" aria-live="polite">
      {/* Slide 1 */}
      <motion.div
        style={{ opacity: opacity1, y: y1 }}
        className="remix-grey-text-slide"
      >
        <h2 className="remix-card-dark-title">{TEXT_ITEMS[0].title}</h2>
        <p className="remix-card-dark-body">{TEXT_ITEMS[0].body}</p>
      </motion.div>

      {/* Slide 2 */}
      <motion.div
        style={{ opacity: opacity2, y: y2 }}
        className="remix-grey-text-slide"
      >
        <h2 className="remix-card-dark-title">{TEXT_ITEMS[1].title}</h2>
        <p className="remix-card-dark-body">{TEXT_ITEMS[1].body}</p>
      </motion.div>

      {/* Slide 3 */}
      <motion.div
        style={{ opacity: opacity3, y: y3 }}
        className="remix-grey-text-slide"
      >
        <h2 className="remix-card-dark-title">{TEXT_ITEMS[2].title}</h2>
        <p className="remix-card-dark-body">{TEXT_ITEMS[2].body}</p>
      </motion.div>
    </div>
  );
}

