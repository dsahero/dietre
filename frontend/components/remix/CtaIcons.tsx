"use client";

/**
 * CTA icons — user-plus (sign up) and log-in.
 * Ported from remix-dietre landing page.
 * @license SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

interface IconProps {
  className?: string;
  color?: string;
  size?: number;
}

export const CtaUserPlusIcon: React.FC<IconProps> = ({
  className = '',
  color = '#2B2118',
  size = 38,
}) => (
  <svg
    viewBox="0 0 40 40"
    width={size}
    height={size}
    fill="none"
    stroke={color}
    strokeWidth="3.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: 'block' }}
  >
    {/* Head */}
    <circle cx="15" cy="12" r="6" />
    {/* Torso/Shoulders */}
    <path d="M 5 32 C 5 25.5, 9.5 21, 15 21 C 18 21, 20.6 22.2, 22.4 24" />
    {/* Plus Sign */}
    <path d="M 30 11 L 30 21 M 25 16 L 35 16" />
  </svg>
);

export const CtaLogInIcon: React.FC<IconProps> = ({
  className = '',
  color = '#2B2118',
  size = 38,
}) => (
  <svg
    viewBox="0 0 40 40"
    width={size}
    height={size}
    fill="none"
    stroke={color}
    strokeWidth="3.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: 'block' }}
  >
    {/* Open door / portal frame */}
    <path d="M 17 8 H 28 C 30.2 8, 32 9.8, 32 12 V 28 C 32 30.2, 30.2 32, 28 32 H 17" />
    {/* Inward Arrow */}
    <path d="M 8 20 H 24 M 18 14 L 24 20 L 18 26" />
  </svg>
);

