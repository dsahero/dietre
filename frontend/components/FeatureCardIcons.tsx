"use client";

/**
 * Feature card icons — envelope, chat bubble, and pie chart.
 * Ported from remix-dietre landing page.
 * @license SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

interface IconProps {
  className?: string;
  color?: string;
  size?: number;
}

export const EnvelopeIcon: React.FC<IconProps> = ({
  className = '',
  color = '#6B6055',
  size = 56,
}) => (
  <svg
    viewBox="0 0 64 48"
    width={size}
    height={(size * 48) / 64}
    fill="none"
    stroke={color}
    strokeWidth="4.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: 'block' }}
  >
    <rect x="3" y="3" width="58" height="42" rx="7" />
    <path d="M5 8 L32 29 L59 8" />
  </svg>
);

export const ChatBubbleIcon: React.FC<IconProps> = ({
  className = '',
  color = '#6B6055',
  size = 52,
}) => (
  <svg
    viewBox="0 0 54 54"
    width={size}
    height={size}
    fill="none"
    stroke={color}
    strokeWidth="4.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: 'block' }}
  >
    <path
      d={`
        M 27 5
        C 15.5 5, 6 14.5, 6 26.5
        C 6 31.8, 8.2 36.8, 12 40.5
        L 9 49
        L 18.5 46.5
        C 21.1 47.5, 24 48, 27 48
        C 38.5 48, 48 38.5, 48 26.5
        C 48 14.5, 38.5 5, 27 5
        Z
      `}
    />
  </svg>
);

export const PieChartIcon: React.FC<IconProps> = ({
  className = '',
  color = '#6B6055',
  size = 52,
}) => (
  <svg
    viewBox="0 0 54 54"
    width={size}
    height={size}
    fill="none"
    stroke={color}
    strokeWidth="4.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: 'block' }}
  >
    {/* Full outer circle */}
    <circle cx="27" cy="27" r="22" />
    {/* Sector demarcation */}
    <path d="M 27 5 L 27 27 L 49 27" />
  </svg>
);

