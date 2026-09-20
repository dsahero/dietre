import React, { useEffect, useState } from 'react';
import { RestaurantCardData } from '../types';
import { createMarbleTexture, createRustTexture, createSandTexture } from '../utils/textures';
import { MapPin, DollarSign, AlertTriangle } from 'lucide-react';

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

  const coveredCount = restaurant.matchedResponses.length;
  const totalGuests = restaurant.totalResponses;
  const safeItemCount = restaurant.suggestedMenuItems.length;

  return (
    <div
      className="content-card relative group border border-transparent transition-all duration-200 hover:-translate-y-0.5 hover:rotate-[-0.3deg] hover:border-[var(--dash-border-strong)] cursor-pointer"
      onClick={() => onClickDetails?.(restaurant)}
    >
      {/* Photo on top */}
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
        </div>

        <div className="relative z-10 mt-auto">
          <h3 className="card-title text-[16px] leading-snug transition-colors group-hover:text-[var(--dash-accent-soft)]">
            {restaurant.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-white/90">
            <span className="truncate font-medium">{restaurant.cuisine}</span>
            <span>•</span>
            <span className="flex shrink-0 items-center gap-0.5 text-[var(--dash-accent-soft)]" title={restaurant.predictedCostLabel}>
              <DollarSign className="h-3 w-3 text-[var(--dash-accent-soft)]" />
              ~${restaurant.predictedCostPerPerson}/pp
            </span>
          </div>
        </div>
      </div>

      {/* Details below photo — fits viewport width, no horizontal scroll */}
      <div className="card-details relative min-w-0 flex-1 overflow-hidden py-3 px-4 sm:px-5">
        <div className="mb-2 flex items-start justify-between gap-3 border-b border-[var(--dash-border)]/70 pb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1.5 text-[12px] leading-snug text-[var(--dash-text)]">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--dash-accent)]" />
              <span className="break-words font-medium">{restaurant.location}</span>
            </div>
            <div className="mt-0.5 pl-5 text-[11px] text-[var(--dash-text-muted)]">
              {restaurant.distanceMiles} mi away
            </div>
          </div>

          {onToggleShortlist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleShortlist(restaurant.id);
              }}
              className={`shrink-0 rounded-sm border px-2.5 py-1 font-heading text-xs font-semibold transition-all cursor-pointer ${
                isShortlisted
                  ? 'border-[#22c55e]/40 bg-[#22c55e]/20 text-[#22c55e]'
                  : 'border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-soft)] hover:border-[var(--dash-border-strong)] hover:text-[var(--dash-text)]'
              }`}
            >
              {isShortlisted ? '✓ Shortlisted' : '+ Shortlist'}
            </button>
          )}
        </div>

        <div className="space-y-2 py-1">
          <span className="text-[12px] font-medium text-[var(--dash-text-soft)]">Details</span>

          {restaurant.menuDataThin ? (
            <p className="text-[12px] text-[var(--dash-text-muted)]">No menu on file yet.</p>
          ) : (
            <>
              <div className="flex items-start gap-2 text-[13px] text-[var(--dash-text-soft)]">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#22c55e]" />
                <span>
                  {totalGuests === 0
                    ? 'No guest responses yet'
                    : coveredCount === 0
                      ? `No safe options for ${totalGuests} guest${totalGuests === 1 ? '' : 's'} yet`
                      : `Safe options for ${coveredCount} of ${totalGuests} guest${totalGuests === 1 ? '' : 's'}`}
                </span>
              </div>
              {restaurant.dietaryConflicts.length > 0 && (
                <div className="flex items-start gap-2 text-[13px] text-[#f4a9a9]">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#ef4444]" />
                  <span>
                    {restaurant.dietaryConflicts.length} guest
                    {restaurant.dietaryConflicts.length === 1 ? '' : 's'} not covered
                  </span>
                </div>
              )}
              {restaurant.complexNotes && restaurant.complexNotes.length > 0 && (
                <div className="flex items-start gap-2 text-[12.5px] text-[#b45309]">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f59e0b]" />
                  <span>
                    {restaurant.complexNotes.length} guest
                    {restaurant.complexNotes.length === 1 ? '' : 's'} with special requests
                  </span>
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--dash-border)] pt-2 text-xs">
            <span className="text-[11px] text-[var(--dash-text-muted)]">
              {safeItemCount > 0
                ? `${safeItemCount} safe menu item${safeItemCount === 1 ? '' : 's'}`
                : 'No safe menu items yet'}
            </span>
            <span className="font-medium text-[var(--dash-accent)] transition-colors group-hover:text-[var(--dash-accent-soft)]">
              View details →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
