import React, { useEffect, useState, useRef } from 'react';
import { RestaurantCardData } from '../types';
import { coveragePercent } from '../adapters';
import { createMarbleTexture, createRustTexture, createSandTexture } from '../utils/textures';
import { MapPin, DollarSign, Hash, ChevronLeft, ChevronRight, AlertTriangle, Sparkles } from 'lucide-react';
import { ConfidenceChip } from './ConfidenceChip';

interface RestaurantCardProps {
  restaurant: RestaurantCardData;
  isShortlisted?: boolean;
  onToggleShortlist?: (id: string) => void;
  onClickDetails?: (restaurant: RestaurantCardData) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  isShortlisted = false,
  onToggleShortlist,
  onClickDetails,
}) => {
  const [textureUrl, setTextureUrl] = useState<string>('');
  const detailsScrollRef = useRef<HTMLDivElement>(null);

  const scrollDetails = (direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    if (detailsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      detailsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Canvas texture generation needs `document` and must run client-side only
    // (computing it during render would crash SSR / desync from the server-rendered HTML).
    let url = '';
    if (restaurant.textureType === 'sand') {
      url = createSandTexture(260, 180);
    } else if (restaurant.textureType === 'rust') {
      url = createRustTexture(260, 180);
    } else if (restaurant.textureType === 'marble') {
      url = createMarbleTexture(260, 180);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with the Canvas API, not derivable during render
    setTextureUrl(url);
  }, [restaurant.textureType]);

  const getMatchBadgeStyle = (pct: number) => {
    if (pct >= 85) return 'bg-[#6E8B6B]/20 text-[#6E8B6B] border-[#6E8B6B]/40';
    if (pct >= 60) return 'bg-[#C88A3B]/20 text-[#C88A3B] border-[#C88A3B]/40';
    return 'bg-[#C2594E]/20 text-[#C2594E] border-[#C2594E]/40';
  };

  return (
    <div
      className="content-card relative group rounded-2xl bg-[var(--dash-surface-raised)] transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md cursor-pointer overflow-hidden"
      onClick={() => onClickDetails?.(restaurant)}
    >
      {/* Left thumbnail with Google Places venue photo and gradient image fade */}
      <div className="card-thumbnail relative flex flex-col justify-between overflow-hidden bg-[var(--dash-surface)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/places/image?query=${encodeURIComponent(restaurant.name + ' ' + restaurant.location)}&address=${encodeURIComponent(restaurant.location)}&place_id=${encodeURIComponent(restaurant.id || '')}`}
          alt={restaurant.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        <div className="relative z-10 flex items-center justify-between gap-1">
          {!restaurant.withinRadius || !restaurant.withinBudget ? (
            <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[10.5px] font-semibold text-[var(--dash-accent-soft)] backdrop-blur-sm">
              <AlertTriangle className="h-3 w-3 text-[#C88A3B]" />
              {!restaurant.withinRadius ? 'Outside radius' : 'Over budget'}
            </span>
          ) : (
            <span />
          )}
          <div className="flex flex-col items-end gap-1">
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-wide backdrop-blur-sm ${getMatchBadgeStyle(
                restaurant.overallScore ?? restaurant.matchPercentage
              )}`}
            >
              {restaurant.overallScore ?? restaurant.matchPercentage}% · {restaurant.coveredCount}/{restaurant.totalResponses}
            </span>
            {restaurant.confidence && <ConfidenceChip confidence={restaurant.confidence} />}
          </div>
        </div>

        <div className="relative z-10 mt-auto">
          <h3 className="card-title text-[16px] leading-snug transition-colors group-hover:text-[var(--dash-accent-soft)]">
            {restaurant.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-[var(--dash-text)]/90">
            <span className="truncate font-medium">{restaurant.cuisine}</span>
            <span>•</span>
            <span className="flex shrink-0 items-center gap-0.5 text-[var(--dash-accent-soft)]" title={restaurant.predictedCostLabel}>
              <DollarSign className="h-3 w-3 text-[var(--dash-accent-soft)]" />
              ~${restaurant.predictedCostPerPerson}/pp
            </span>
          </div>
          {/* Coverage + Guest Fit labels */}
          <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--dash-text-soft)]/70">
            <span title="Severity-weighted % of guests with at least one safe menu item">
              Coverage: {restaurant.matchPercentage}%
            </span>
            {restaurant.guestFitScore !== undefined && (
              <>
                <span className="opacity-40">·</span>
                <span
                  title="Guest Fit combines stated cuisine preferences and dietary context to estimate how well this restaurant aligns with the group's preferences after dietary requirements are satisfied. 50 = neutral (no preferences stated)."
                  className={
                    restaurant.guestFitScore >= 70
                      ? 'text-[#6E8B6B]'
                      : restaurant.guestFitScore >= 55
                      ? 'text-[var(--dash-accent-soft)]/90'
                      : restaurant.guestFitScore < 40
                      ? 'text-[#C2594E]'
                      : 'text-[var(--dash-text-soft)]/70'
                  }
                >
                  <Sparkles className="inline h-2.5 w-2.5 mr-0.5 opacity-70" />
                  {'Guest Fit: '}
                  {restaurant.guestFitScore >= 85
                    ? 'Very High'
                    : restaurant.guestFitScore >= 70
                    ? 'High'
                    : restaurant.guestFitScore >= 55
                    ? 'Medium'
                    : restaurant.guestFitScore >= 40
                    ? 'Neutral'
                    : restaurant.guestFitScore >= 25
                    ? 'Low'
                    : 'Very Low'}
                  {' '}({restaurant.guestFitScore}/100)
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
              <span className="rounded-full border border-dashed border-[#C88A3B]/40 bg-[#C88A3B]/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-[#C88A3B]">
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
                className={`rounded-full px-3 py-1 font-heading text-xs font-semibold transition-all cursor-pointer ${
                  isShortlisted
                    ? 'bg-[#6E8B6B]/20 text-[#6E8B6B]'
                    : 'bg-[var(--dash-surface)] text-[var(--dash-text-soft)] hover:bg-[var(--dash-surface-hover)] hover:text-[var(--dash-text)]'
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
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#6E8B6B]" />
                  {restaurant.matchedResponses.length === 0
                    ? 'No responses safely covered yet'
                    : `Safe for ${coveragePercent(restaurant.matchedResponses.length, restaurant.totalResponses)}% of participants`}
                </div>
                {restaurant.dietaryConflicts.length > 0 && (
                  <div className="flex items-center gap-2 whitespace-nowrap text-[13px] text-[#C2594E]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#C2594E]" />
                    {restaurant.dietaryConflicts.length} response
                    {restaurant.dietaryConflicts.length === 1 ? '' : 's'} not covered here
                  </div>
                )}
                {restaurant.complexNotes && restaurant.complexNotes.length > 0 && (
                  <div className="flex items-center gap-2 whitespace-nowrap text-[12.5px] text-[#C88A3B]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#C88A3B]" />
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
