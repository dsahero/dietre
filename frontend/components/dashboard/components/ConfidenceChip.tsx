import React from 'react';
import type { RestaurantConfidenceData } from '../types';

const TIER_STYLE: Record<RestaurantConfidenceData['tier'], string> = {
  high: 'bg-[#22c55e]/20 text-[#4ade80] border-[#22c55e]/50',
  medium: 'bg-[#eab308]/20 text-[#facc15] border-[#eab308]/50',
  low: 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/50',
  unknown: 'bg-black/40 text-white/70 border-white/20',
};

const TIER_LABEL: Record<RestaurantConfidenceData['tier'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  unknown: 'No menu data',
};

export function confidenceTitle(c: RestaurantConfidenceData): string {
  const parts = [`Group score ${c.utilitarianPct}% (${c.source === 'database' ? 'stored' : 'live'})`];
  parts.push(c.allGuestsCovered ? 'every guest has a safe item' : 'not every guest is covered');
  if (c.dataLimited) parts.push('menu ingredient data is limited');
  return parts.join(' · ');
}

export const ConfidenceChip: React.FC<{ confidence: RestaurantConfidenceData }> = ({ confidence }) => (
  <span
    title={confidenceTitle(confidence)}
    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide backdrop-blur-sm ${
      TIER_STYLE[confidence.tier]
    } ${confidence.dataLimited ? 'border-dashed' : ''}`}
  >
    Confidence · {TIER_LABEL[confidence.tier]}
    {confidence.score !== null ? ` ${confidence.score}%` : ''}
  </span>
);
