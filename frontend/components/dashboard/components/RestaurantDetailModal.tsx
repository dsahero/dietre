import React, { useState } from 'react';
import { RestaurantCardData } from '../types';
import {
  X,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Utensils,
  Sparkles,
  Bookmark,
  UserX,
} from 'lucide-react';

interface RestaurantDetailModalProps {
  isOpen: boolean;
  restaurant: RestaurantCardData | null;
  isShortlisted: boolean;
  onToggleShortlist: (id: string) => void;
  onClose: () => void;
}

const PRICE_LABEL: Record<1 | 2 | 3, string> = { 1: '$', 2: '$$', 3: '$$$' };

export const RestaurantDetailModal: React.FC<RestaurantDetailModalProps> = ({
  isOpen,
  restaurant,
  isShortlisted,
  onToggleShortlist,
  onClose,
}) => {
  const [showMatched, setShowMatched] = useState(true);
  const [showConflicts, setShowConflicts] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  if (!isOpen || !restaurant) return null;

  const getMatchBadgeColor = (pct: number) => {
    if (pct >= 85) return 'text-[#4ade80] bg-[#22c55e]/20 border-[#22c55e]/50';
    if (pct >= 60) return 'text-[#facc15] bg-[#eab308]/20 border-[#eab308]/50';
    return 'text-[#f87171] bg-[#ef4444]/20 border-[#ef4444]/50';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-5"
      onClick={onClose}
    >
      <div
        className="relative my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#453028] bg-[#1c1311] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#35241f] bg-[#231815] p-5 sm:p-6">
          <div className="flex-1 pr-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b8744b]">
                {restaurant.cuisine}
              </span>
              <span className="text-[#5e473f]">•</span>
              <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2.5 py-0.5 text-xs text-[#cfc1ba]">
                <MapPin className="h-3 w-3 text-[#b8744b]" />
                {restaurant.distanceMiles} mi · {PRICE_LABEL[restaurant.priceLevel]}
              </span>
              {(!restaurant.withinRadius || !restaurant.withinBudget) && (
                <span className="flex items-center gap-1 rounded-full border border-[#ef4444]/40 bg-[#ef4444]/15 px-2.5 py-0.5 text-xs font-medium text-[#f87171]">
                  <AlertTriangle className="h-3 w-3" />
                  {!restaurant.withinRadius ? 'Outside event radius' : 'Over event budget'}
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{restaurant.name}</h2>
            <p className="mt-1 text-xs text-[#9e8f87]">{restaurant.location}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleShortlist(restaurant.id)}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                isShortlisted
                  ? 'border-[#22c55e]/50 bg-[#22c55e]/20 text-[#4ade80] hover:bg-[#22c55e]/30'
                  : 'border-[#443029] bg-[#2b1c18] text-[#cfc1ba] hover:border-[#634940] hover:text-white'
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isShortlisted ? 'fill-[#4ade80] text-[#4ade80]' : 'text-[#b8744b]'}`} />
              <span className="hidden sm:inline">{isShortlisted ? 'Shortlisted' : 'Shortlist Venue'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-xl border border-transparent p-2 text-[#9b8b84] transition-colors hover:border-[#48332b] hover:bg-[#2e1d18] hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5 text-[#cfc1ba] sm:p-6">
          {/* Match summary — score is never shown without its denominator */}
          <div className="space-y-4 rounded-2xl border border-[#483229] bg-[#251915] p-4 shadow-inner sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-xl border px-3 py-1 text-sm font-bold sm:text-base ${getMatchBadgeColor(
                      restaurant.matchPercentage
                    )} ${restaurant.hasUnconfirmedItems ? 'border-dashed' : ''}`}
                  >
                    {restaurant.matchPercentage}% · {restaurant.coveredCount} of {restaurant.totalResponses}{' '}
                    responses matched
                  </span>
                </div>
                {restaurant.hasUnconfirmedItems && (
                  <p className="mt-1.5 text-xs text-[#facc15]">
                    Includes items whose ingredients were AI-inferred, not yet confirmed.
                  </p>
                )}
                {restaurant.menuDataThin && (
                  <p className="mt-1.5 text-xs italic text-[#9b8b84]">Limited ingredient detail available.</p>
                )}
              </div>

              <div className="h-3 w-full shrink-0 overflow-hidden rounded-full border border-[#3b2923] bg-[#18100e] sm:w-48">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#b8744b] to-[#22c55e] transition-all duration-500"
                  style={{ width: `${restaurant.matchPercentage}%` }}
                />
              </div>
            </div>

            {/* Matched responses */}
            <div className="border-t border-[#3b2923] pt-3">
              <button
                type="button"
                onClick={() => setShowMatched(!showMatched)}
                className="flex w-full items-center justify-between py-1.5 text-xs font-bold text-white transition-colors hover:text-[#d88c5e] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                  <span>Safe for {restaurant.matchedGuestTokens.length} response(s)</span>
                </div>
                {showMatched ? <ChevronUp className="h-4 w-4 text-[#a89892]" /> : <ChevronDown className="h-4 w-4 text-[#a89892]" />}
              </button>
              {showMatched && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {restaurant.matchedGuestTokens.length === 0 ? (
                    <span className="text-xs text-[#9b8b84]">No responses are safely covered here yet.</span>
                  ) : (
                    restaurant.matchedGuestTokens.map((token) => (
                      <span
                        key={token}
                        className="rounded-lg border border-[#37251f] bg-[#1d1310] px-2.5 py-1 font-mono text-xs text-white"
                      >
                        {token}
                      </span>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Conflicts */}
            {restaurant.dietaryConflicts.length > 0 && (
              <div className="border-t border-[#3b2923] pt-3">
                <button
                  type="button"
                  onClick={() => setShowConflicts(!showConflicts)}
                  className="flex w-full items-center justify-between py-1.5 text-xs font-bold text-white transition-colors hover:text-[#ef4444] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
                    <span>
                      Not covered for {restaurant.dietaryConflicts.length} response
                      {restaurant.dietaryConflicts.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {showConflicts ? <ChevronUp className="h-4 w-4 text-[#a89892]" /> : <ChevronDown className="h-4 w-4 text-[#a89892]" />}
                </button>
                {showConflicts && (
                  <div className="mt-3 space-y-2">
                    {restaurant.dietaryConflicts.map((conflict) => (
                      <div
                        key={conflict.responseId}
                        className="flex flex-col gap-2 rounded-xl border border-[#52251e] bg-[#221411] p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#ef4444]/40 bg-[#ef4444]/20">
                            <UserX className="h-3.5 w-3.5 text-[#f87171]" />
                          </div>
                          <div>
                            <span className="font-mono text-xs font-semibold text-white">{conflict.guestToken}</span>
                            <p className="mt-1 text-[11px] leading-relaxed text-[#cf9f96]">
                              {conflict.hardExcludes.length > 0
                                ? `Hard restrictions: ${conflict.hardExcludes.join(', ')}`
                                : 'No safe menu item found here for this response.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Suggested menu items — real prices, honest about uncertainty */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="group flex w-full items-center justify-between rounded-2xl border border-[#58392d] bg-gradient-to-r from-[#2c1d18] via-[#3a251e] to-[#2c1d18] p-4 text-sm font-bold text-white shadow-md transition-all hover:border-[#b8744b] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#b8744b]/40 bg-[#b8744b]/20 text-[#d88c5e] transition-transform group-hover:scale-110">
                  <Utensils className="h-4 w-4" />
                </div>
                <span className="text-left">
                  {showMenu ? 'Hide safe menu items' : `View ${restaurant.suggestedMenuItems.length} safe menu item(s)`}
                </span>
              </div>
              {showMenu ? <ChevronUp className="h-5 w-5 text-[#d88c5e]" /> : <ChevronDown className="h-5 w-5 text-[#d88c5e]" />}
            </button>

            {showMenu && (
              <div className="animate-in fade-in mt-4 space-y-3 rounded-2xl border border-[#483027] bg-[#1f1411] p-5 duration-300">
                {restaurant.suggestedMenuItems.length === 0 ? (
                  <p className="text-xs text-[#9b8b84]">No safe menu items identified yet.</p>
                ) : (
                  restaurant.suggestedMenuItems.map((item) => (
                    <div
                      key={item.id}
                      className="space-y-2 rounded-xl border border-[#38241e] bg-[#170f0d] p-4 transition-all hover:border-[#4d3229]"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-bold text-white">{item.name}</span>
                        <span className="shrink-0 text-xs font-medium text-[#a09088]">${item.price}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.coveredGuestTokens.map((token) => (
                          <span
                            key={token}
                            className="rounded-md border border-[#52332a] bg-[#33201b] px-2 py-0.5 font-mono text-[10px] text-[#e5dad5]"
                          >
                            {token}
                          </span>
                        ))}
                      </div>
                      {item.uncertain && (
                        <p className="flex items-center gap-1.5 border-l-2 border-[#eab308]/60 pl-2 text-[11.5px] italic text-[#facc15]">
                          <Sparkles className="h-3 w-3 shrink-0" />
                          Ingredients AI-inferred — confirm with the kitchen before serving.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#35241f] bg-[#231815] p-4 sm:p-5">
          <div className="text-xs text-[#8e7e78]">
            {restaurant.distanceMiles} mi from event · {PRICE_LABEL[restaurant.priceLevel]}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#452c23] bg-[#2c1b17] px-5 py-2 text-xs font-semibold text-[#ded3cd] transition-all hover:bg-[#3d2620] hover:text-white cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
