"use client";

/**
 * GreySectionTextBoxes — sequential scrollytelling text that fades in/out
 * as the user scrolls through the pinned grey section.
 * Ported from remix-dietre landing page.
 */
import React from 'react';
import { motion, MotionValue, useTransform } from 'motion/react';

interface StatItem {
  value: string;
  label: string;
}

type Slide = { title: string; stats: StatItem[]; caption?: string };

const SLIDES: Slide[] = [
  {
    title: 'Not an edge case',
    stats: [
      { value: '10.8%', label: 'of US adults have a food allergy' },
      { value: '26M+', label: 'Americans affected' },
      { value: '~43', label: 'guests at a 400-person event' },
    ],
  },
  {
    title: 'We read menus, not tags',
    stats: [
      { value: '915', label: 'restaurant locations indexed' },
      { value: '2,581', label: 'menu items read dish by dish' },
      { value: '2,100', label: 'ingredients tracked' },
    ],
  },
  {
    title: 'Used by real people',
    stats: [
      { value: '1', label: 'question asked at a time' },
      { value: '116', label: 'real guest needs and wants' },
      { value: '0', label: 'logins or accounts required' },
    ],
    caption: 'Adaptive reasoning, one question at a time.',
  },
  {
    title: "We say what we don't know",
    stats: [
      { value: '85%', label: 'of dishes verified ingredient by ingredient' },
      { value: '15%', label: 'flagged low-confidence instead of guessed' },
    ],
    caption: 'Ingredients modeled with uncertainty to provide full transparency in recommendations.',
  },
];

interface GreySectionTextBoxesProps {
  progress: MotionValue<number>;
}

export function GreySectionTextBoxes({ progress }: GreySectionTextBoxesProps) {
  // Slide 0 (stats): starts visible, holds, fades out
  const opacity0 = useTransform(progress, [0, 0.16, 0.24], [1, 1, 0]);
  const y0 = useTransform(progress, [0, 0.16, 0.24], [0, 0, -18]);

  // Slide 1: fades in, holds, fades out
  const opacity1 = useTransform(progress, [0.2, 0.28, 0.44, 0.52], [0, 1, 1, 0]);
  const y1 = useTransform(progress, [0.2, 0.28, 0.44, 0.52], [18, 0, 0, -18]);

  // Slide 2: fades in, holds, fades out
  const opacity2 = useTransform(progress, [0.48, 0.56, 0.72, 0.8], [0, 1, 1, 0]);
  const y2 = useTransform(progress, [0.48, 0.56, 0.72, 0.8], [18, 0, 0, -18]);

  // Slide 3: fades in, holds until the user finishes the track
  const opacity3 = useTransform(progress, [0.76, 0.84, 1.0], [0, 1, 1]);
  const y3 = useTransform(progress, [0.76, 0.84, 1.0], [18, 0, 0]);

  const slideMotions = [
    { opacity: opacity0, y: y0 },
    { opacity: opacity1, y: y1 },
    { opacity: opacity2, y: y2 },
    { opacity: opacity3, y: y3 },
  ];

  return (
    <div className="remix-grey-text-sequence-container" aria-live="polite">
      {SLIDES.map((slide, i) => (
        <motion.div
          key={slide.title}
          style={slideMotions[i]}
          className="remix-grey-text-slide"
        >
          <h2 className="remix-card-dark-title">{slide.title}</h2>
          <div className="remix-stat-row">
            {slide.stats.map((stat) => (
              <div className="remix-stat-tile" key={stat.value + stat.label}>
                <span className="remix-stat-value">{stat.value}</span>
                <span className="remix-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
          {slide.caption && (
            <p className="remix-card-dark-body">{slide.caption}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

