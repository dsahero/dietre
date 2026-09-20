import React, { useRef } from 'react';
import { RestaurantCardData } from '../types';
import { coveragePercent } from '../adapters';
import { MapPin, DollarSign, Hash, ChevronLeft, ChevronRight, AlertTriangle, Sparkles } from 'lucide-react';
import { ConfidenceChip } from './ConfidenceChip';

interface RestaurantCardProps {
  restaurant: RestaurantCardData;
  isShortlisted?: boolean;
  onToggleShortlist?: (id: string) => void;
  onClickDetails?: (restaurant: RestaurantCardData) => void;
}

const PRICE_LABEL: Record<1 | 2 | 3, string> = { 1: '$', 2: '$$', 3: '$$$' };

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  isShortlisted = false,
  onToggleShortlist,
  onClickDetails,
}) => {
  const detailsScrollRef = useRef<HTMLDivElement>(null);

  const scrollDetails = (direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    if (detailsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      detailsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getMatchBadgeStyle = (pct: number) => {
    if (pct >= 85) return 'bg-[#22c55e]/20 text-[#4ade80] border-[#22c55e]/50';
    if (pct >= 60) return 'bg-[#eab308]/20 text-[#facc15] border-[#eab308]/50';
    return 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/50';
  };

  return (
    <div
      className="content-card relative group border border-transparent transition-all duration-200 hover:-translate-y-0.5 hover:rotate-[-0.3deg] hover:border-[var(--dash-border-strong)] cursor-pointer"
      onClick={() => onClickDetails?.(restaurant)}
    >
      {/* Left thumbnail with Google Places venue photo */}
      <div className="card-thumbnail relative flex flex-col justify-between overflow-hidden bg-[var(--dash-surface)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/places/image?query=${encodeURIComponent(restaurant.name + ' ' + restaurant.location)}&address=${encodeURIComponent(restaurant.location)}&place_id=${encodeURIComponent(restaurant.id || '')}`}
          alt={restaurant.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

        <div className="relative z-10 flex items-center justify-between gap-1">
          {!restaurant.withinRadius || !restaurant.withinBudget ? (
            <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[10.5px] font-semibold text-[var(--dash-accent-soft)] backdrop-blur-sm">
              <AlertTriangle className="h-3 w-3" />
              {!restaurant.withinRadius ? 'Outside radius' : 'Over budget'}
            </span>
          ) : (
            <span />
          )}
          <div className="flex flex-col items-end gap-1">
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-wide backdrop-blur-sm ${getMatchBadgeStyle(
                restaurant.overallScore
              )}`}
            >
              {restaurant.overallScore}% · {restaurant.coveredCount}/{restaurant.totalResponses}
            </span>
            <ConfidenceChip confidence={restaurant.confidence} />
          </div>
        </div>

        <div className="relative z-10 mt-auto">
          <h3 className="card-title text-[16px] leading-snug transition-colors group-hover:text-[var(--dash-accent-soft)]">
            {restaurant.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-[var(--dash-text)]/90">
            <span className="truncate font-medium">{restaurant.cuisine}</span>
            <span>•</span>
            <span className="flex shrink-0 items-center gap-0.5 text-[var(--dash-accent-soft)]">
              <DollarSign className="h-3 w-3 text-[var(--dash-accent-soft)]" />
              {PRICE_LABEL[restaurant.priceLevel]}
            </span>
          </div>
          {/* Coverage + Guest fit labels */}
          <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--dash-text-soft)]/70">
            <span title="Severity-weighted % of guests with at least one safe menu item">
              Coverage: {restaurant.matchPercentage}%
            </span>
            {restaurant.bayesianScore !== undefined && (
              <>
                <span className="opacity-40">·</span>
                <span
                  title="How well this restaurant aligns with guests' stated preferences"
                  className={
                    restaurant.bayesianScore >= 0.55
                      ? 'text-emerald-400/80'
                      : restaurant.bayesianScore <= 0.44
                      ? 'text-rose-400/80'
                      : 'text-[var(--dash-text-soft)]/70'
                  }
                >
                  <Sparkles className="inline h-2.5 w-2.5 mr-0.5 opacity-70" />
                  Guest fit:{' '}
                  {restaurant.bayesianScore >= 0.55
                    ? 'High'
                    : restaurant.bayesianScore <= 0.44
                    ? 'Low'
                    : 'Medium'}
                </span>
              </>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-[10.5px] text-[var(--dash-text-soft)]/80">
            <span className="truncate">{restaurant.location}</span>
            <span className="flex shrink-0 items-center gap-1 text-[var(--dash-text-soft)]">
              <MapPin className="h-2.5 w-2.5 text-[var(--dash-accent)]" />
              {restaurant.distanceMiles} mi
            </span>
          </div>
        </div>
      </div>

      {/* Right side details, scrollable */}
      <div className="card-details relative min-w-0 flex-1 overflow-hidden py-3 px-4 sm:px-5">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--dash-border)]/70 pb-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--dash-accent-soft)]">
              <Hash className="h-3.5 w-3.5 text-[var(--dash-accent)]" />
              Match Details
            </span>
            {restaurant.hasUnconfirmedItems && (
              <span className="rounded-md border border-dashed border-[#eab308]/50 bg-[#eab308]/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-[#facc15]">
                Includes unconfirmed items
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1 rounded-sm border border-[var(--dash-border)] bg-[var(--dash-bg)] p-0.5">
              <button
                type="button"
                onClick={(e) => scrollDetails('left', e)}
                className="rounded-xs p-1 text-[var(--dash-accent)] transition-colors hover:bg-[var(--dash-accent)]/15 hover:text-[var(--dash-accent-deep)] cursor-pointer"
                aria-label="Scroll details left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => scrollDetails('right', e)}
                className="rounded-xs p-1 text-[var(--dash-accent)] transition-colors hover:bg-[var(--dash-accent)]/15 hover:text-[var(--dash-accent-deep)] cursor-pointer"
                aria-label="Scroll details right"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {onToggleShortlist && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleShortlist(restaurant.id);
                }}
                className={`rounded-sm border px-2.5 py-1 font-heading text-xs font-semibold transition-all cursor-pointer ${
                  isShortlisted
                    ? 'border-[#22c55e]/40 bg-[#22c55e]/20 text-[#22c55e]'
                    : 'border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-soft)] hover:border-[var(--dash-border-strong)] hover:text-[var(--dash-text)]'
                }`}
              >
                {isShortlisted ? '✓ Shortlisted' : '+ Shortlist'}
              </button>
            )}
          </div>
        </div>

        <div ref={detailsScrollRef} className="scrollbar-thin min-w-0 flex-1 overflow-x-auto py-2">
          <div className="min-w-[560px] space-y-2.5 pr-2">
            {restaurant.menuDataThin ? (
              <p className="text-[12px] italic text-[var(--dash-text-muted)]">
                Limited ingredient detail available for this venue — match confidence is lower than usual.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2 whitespace-nowrap text-[13px] text-[var(--dash-text-soft)]">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#22c55e]" />
                  {restaurant.matchedResponses.length === 0
                    ? 'No responses safely covered yet'
                    : `Safe for ${coveragePercent(restaurant.matchedResponses.length, restaurant.totalResponses)}% of participants`}
                </div>
                {restaurant.dietaryConflicts.length > 0 && (
                  <div className="flex items-center gap-2 whitespace-nowrap text-[13px] text-[#f4a9a9]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#ef4444]" />
                    {restaurant.dietaryConflicts.length} response
                    {restaurant.dietaryConflicts.length === 1 ? '' : 's'} not covered here
                  </div>
                )}
                {restaurant.complexNotes && restaurant.complexNotes.length > 0 && (
                  <div className="flex items-center gap-2 whitespace-nowrap text-[12.5px] text-[#b45309]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#f59e0b]" />
                    {restaurant.complexNotes.length} complex rule audit{restaurant.complexNotes.length === 1 ? '' : 's'} recorded
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between gap-4 whitespace-nowrap border-t border-[var(--dash-border)] pt-2 text-xs">
              <span className="text-[11px] text-[var(--dash-text-muted)]">
                {restaurant.suggestedMenuItems.length} safe menu item
                {restaurant.suggestedMenuItems.length === 1 ? '' : 's'} identified
              </span>
              <span className="flex shrink-0 items-center gap-1 font-medium text-[var(--dash-accent)] transition-colors group-hover:text-[var(--dash-accent-soft)]">
                View details & suggested menu →
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
