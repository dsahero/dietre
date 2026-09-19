import React, { useState } from 'react';
import { RestaurantCardData } from '../types';
import { coveragePercent } from '../adapters';
import {
  X,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Utensils,
  Stamp,
  Bookmark,
  UserX,
  MinusCircle,
  Info,
} from 'lucide-react';

export interface RestaurantDetailContentProps {
  restaurant: RestaurantCardData;
  isShortlisted: boolean;
  onToggleShortlist: (id: string) => void;
  onClose: () => void;
  onSelectResponse: (responseId: string) => void;
  /** Compact mode drops the large header padding for the narrower side-panel presentation. */
  compact?: boolean;
}

const PRICE_LABEL: Record<1 | 2 | 3, string> = { 1: '$', 2: '$$', 3: '$$$' };

export const RestaurantDetailContent: React.FC<RestaurantDetailContentProps> = ({
  restaurant,
  isShortlisted,
  onToggleShortlist,
  onClose,
  onSelectResponse,
  compact = false,
}) => {
  const [showMatched, setShowMatched] = useState(true);
  const [showConflicts, setShowConflicts] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showChecklist, setShowChecklist] = useState(true);

  const getMatchBadgeColor = (pct: number) => {
    if (pct >= 85) return 'text-[#4ade80] bg-[#22c55e]/20 border-[#22c55e]/50';
    if (pct >= 60) return 'text-[#facc15] bg-[#eab308]/20 border-[#eab308]/50';
    return 'text-[#f87171] bg-[#ef4444]/20 border-[#ef4444]/50';
  };

  const pct = coveragePercent(restaurant.matchedResponses.length, restaurant.totalResponses);
  const headPad = compact ? 'p-4' : 'p-5 sm:p-6';

  return (
    <>
      {/* Header */}
      <div className={`flex items-start justify-between border-b border-[var(--dash-border)] bg-[var(--dash-surface-raised)] ${headPad}`}>
        <div className="flex-1 pr-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="ink-stamp px-1.5 py-0.2 text-[9px] font-bold text-[var(--dash-accent)] border-[var(--dash-accent)]">
              {restaurant.cuisine}
            </span>
            <span className="text-[var(--dash-text-muted)]">•</span>
            <span className="flex items-center gap-1 rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--dash-text-soft)] shadow-2xs">
              <MapPin className="h-3 w-3 text-[var(--dash-accent)]" />
              {restaurant.distanceMiles} mi · {PRICE_LABEL[restaurant.priceLevel]}
            </span>
            {(!restaurant.withinRadius || !restaurant.withinBudget) && (
              <span className="flex items-center gap-1 rounded-sm border border-[#ef4444]/40 bg-[#ef4444]/15 px-2 py-0.5 font-mono text-[10px] font-medium text-[#c24134]">
                <AlertTriangle className="h-3 w-3" />
                {!restaurant.withinRadius ? 'Outside radius' : 'Over budget'}
              </span>
            )}
          </div>

          <h2 className={`font-heading font-bold tracking-tight text-[var(--dash-text)] ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>
            {restaurant.name}
          </h2>
          <p className="mt-1 text-xs text-[var(--dash-text-muted)] font-serif italic">{restaurant.location}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleShortlist(restaurant.id)}
            title={isShortlisted ? 'Shortlisted' : 'Shortlist Venue'}
            className={`flex items-center gap-1.5 rounded-sm border px-3 py-2 font-heading text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              isShortlisted
                ? 'border-[#22c55e]/50 bg-[#22c55e]/20 text-[#22c55e]'
                : 'border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-soft)] hover:border-[var(--dash-border-strong)] hover:text-[var(--dash-text)]'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isShortlisted ? 'fill-[#22c55e] text-[#22c55e]' : 'text-[var(--dash-accent)]'}`} />
            {!compact && <span className="hidden sm:inline">{isShortlisted ? 'Shortlisted' : 'Shortlist Venue'}</span>}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-sm border border-[var(--dash-border)] p-2 text-[var(--dash-text-muted)] transition-colors hover:border-[var(--dash-border-strong)] hover:bg-[var(--dash-surface-hover)] hover:text-[var(--dash-text)] cursor-pointer shadow-2xs"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={`flex-1 space-y-6 overflow-y-auto text-[var(--dash-text-soft)] ${headPad}`}>
        {/* Match summary — score is never shown without its denominator */}
        <div className="space-y-4 rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-4 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-sm border px-3 py-1 font-mono text-xs font-bold ${getMatchBadgeColor(
                    restaurant.matchPercentage
                  )} ${restaurant.hasUnconfirmedItems ? 'border-dashed' : ''}`}
                >
                  {restaurant.matchPercentage}% · {restaurant.coveredCount} of {restaurant.totalResponses} responses
                  matched
                </span>
              </div>
              {restaurant.hasUnconfirmedItems && (
                <p className="mt-1.5 font-serif text-xs italic text-[#eab308]">
                  Includes items whose ingredients are estimated, not yet confirmed.
                </p>
              )}
              {restaurant.menuDataThin && (
                <p className="mt-1.5 text-xs italic text-[var(--dash-text-muted)] font-serif">Limited ingredient detail available.</p>
              )}
            </div>

            <div className="h-3 w-full shrink-0 overflow-hidden rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] sm:w-40">
              <div
                className="h-full bg-[var(--dash-accent)] transition-all duration-500"
                style={{ width: `${restaurant.matchPercentage}%` }}
              />
            </div>
          </div>

          {/* Matched responses */}
          <div className="border-t border-[var(--dash-border)] pt-3">
            <button
              type="button"
              onClick={() => setShowMatched(!showMatched)}
              className="flex w-full items-center justify-between py-1.5 text-xs font-heading font-bold text-[var(--dash-text)] transition-colors hover:text-[var(--dash-accent)] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                <span>Safe for {pct}% of participants</span>
              </div>
              {showMatched ? <ChevronUp className="h-4 w-4 text-[var(--dash-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--dash-text-muted)]" />}
            </button>
            {showMatched && (
              <div className="mt-3 flex flex-wrap gap-2">
                {restaurant.matchedResponses.length === 0 ? (
                  <span className="text-xs text-[var(--dash-text-muted)] font-serif italic">No responses are safely covered here yet.</span>
                ) : (
                  restaurant.matchedResponses.map((ref) => (
                    <button
                      key={ref.responseId}
                      type="button"
                      onClick={() => onSelectResponse(ref.responseId)}
                      title="View this guest's response"
                      className="cursor-pointer rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] px-2.5 py-1 font-mono text-xs text-[var(--dash-text)] transition-colors hover:border-[var(--dash-accent)] hover:bg-[var(--dash-surface-hover)] shadow-2xs"
                    >
                      {ref.token}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Conflicts */}
          {restaurant.dietaryConflicts.length > 0 && (
            <div className="border-t border-[var(--dash-border)] pt-3">
              <button
                type="button"
                onClick={() => setShowConflicts(!showConflicts)}
                className="flex w-full items-center justify-between py-1.5 text-xs font-heading font-bold text-[#c24134] transition-colors hover:text-[var(--dash-accent-deep)] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
                  <span>
                    Not covered for {restaurant.dietaryConflicts.length} response
                    {restaurant.dietaryConflicts.length === 1 ? '' : 's'}
                  </span>
                </div>
                {showConflicts ? <ChevronUp className="h-4 w-4 text-[var(--dash-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--dash-text-muted)]" />}
              </button>
              {showConflicts && (
                <div className="mt-3 space-y-2">
                  {restaurant.dietaryConflicts.map((conflict) => (
                    <button
                      key={conflict.responseId}
                      type="button"
                      onClick={() => onSelectResponse(conflict.responseId)}
                      title="View this guest's response"
                      className="flex w-full flex-col gap-2 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3 text-left transition-colors hover:border-[#ef4444]/60 sm:flex-row sm:items-center sm:justify-between cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-xs border border-[#ef4444]/40 bg-[#ef4444]/20 shadow-2xs">
                          <UserX className="h-3.5 w-3.5 text-[#ef4444]" />
                        </div>
                        <div>
                          <span className="font-mono text-xs font-semibold text-[var(--dash-text)]">{conflict.guestToken}</span>
                          <p className="mt-1 font-serif text-[11.5px] leading-relaxed text-[#c24134]">
                            {conflict.hardExcludes.length > 0
                              ? `Hard restrictions: ${conflict.hardExcludes.join(', ')}`
                              : 'No safe menu item found here for this response.'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Host limitations checklist — Gemini's provisional read, never shown as fact */}
        {restaurant.checklistNotes.length > 0 && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowChecklist(!showChecklist)}
              className="flex w-full items-center justify-between text-xs font-heading font-bold uppercase tracking-wider text-[var(--dash-text)] cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Info className="h-4 w-4 text-[var(--dash-accent)]" />
                Event Limitations Check
                <span className="ink-stamp px-1.5 py-0.5 text-[9px] font-semibold text-[#eab308] border-[#eab308]">
                  Estimated
                </span>
              </span>
              {showChecklist ? <ChevronUp className="h-4 w-4 text-[var(--dash-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--dash-text-muted)]" />}
            </button>
            {showChecklist && (
              <div className="space-y-2">
                {restaurant.checklistNotes.map((note) => (
                  <div
                    key={note.itemId}
                    className={`flex items-start gap-3 rounded-sm border p-3 shadow-2xs ${
                      note.verdict === 'good'
                        ? 'border-[#22c55e]/30 bg-[#22c55e]/5'
                        : note.verdict === 'bad'
                          ? 'border-[#ef4444]/30 bg-[#ef4444]/5'
                          : note.verdict === 'neutral'
                            ? 'border-[#eab308]/30 bg-[#eab308]/5'
                            : 'border-[var(--dash-border)] bg-[var(--dash-surface)]'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {note.verdict === 'good' && <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />}
                      {note.verdict === 'bad' && <AlertTriangle className="h-4 w-4 text-[#ef4444]" />}
                      {note.verdict === 'neutral' && <MinusCircle className="h-4 w-4 text-[#eab308]" />}
                      {note.verdict === 'unknown' && <Info className="h-4 w-4 text-[var(--dash-text-muted)]" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-heading text-xs font-bold text-[var(--dash-text)]">{note.label}</p>
                      <p className="mt-0.5 font-serif text-[11.5px] leading-relaxed text-[var(--dash-text-soft)]">{note.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggested menu items — real prices, honest about uncertainty */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="group flex w-full items-center justify-between rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-4 text-sm font-heading font-bold text-[var(--dash-text)] shadow-xs transition-all hover:border-[var(--dash-accent)] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--dash-accent)]/30 bg-[var(--dash-accent)]/15 text-[var(--dash-accent)] transition-transform group-hover:scale-105 shadow-2xs">
                <Utensils className="h-4 w-4" />
              </div>
              <span className="text-left font-heading">
                {showMenu ? 'Hide safe menu items' : `View ${restaurant.suggestedMenuItems.length} safe menu item(s)`}
              </span>
            </div>
            {showMenu ? <ChevronUp className="h-5 w-5 text-[var(--dash-accent)]" /> : <ChevronDown className="h-5 w-5 text-[var(--dash-accent)]" />}
          </button>

          {showMenu && (
            <div className="animate-in fade-in mt-3 space-y-2.5 rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 duration-300 shadow-2xs">
              {restaurant.suggestedMenuItems.length === 0 ? (
                <p className="text-xs text-[var(--dash-text-muted)] font-serif italic">No safe menu items identified yet.</p>
              ) : (
                restaurant.suggestedMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className="space-y-2 rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-3.5 transition-all hover:border-[var(--dash-border-strong)] shadow-2xs"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-heading text-sm font-bold text-[var(--dash-text)]">{item.name}</span>
                      <span className="shrink-0 font-mono text-xs font-semibold text-[var(--dash-accent-soft)]">${item.price}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.coveredResponses.map((ref) => (
                        <button
                          key={ref.responseId}
                          type="button"
                          onClick={() => onSelectResponse(ref.responseId)}
                          title="View this guest's response"
                          className="cursor-pointer rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--dash-text-soft)] transition-colors hover:border-[var(--dash-accent)] hover:text-[var(--dash-text)] shadow-2xs"
                        >
                          {ref.token}
                        </button>
                      ))}
                    </div>
                    {item.uncertain && (
                      <p className="flex items-center gap-1.5 border-l-2 border-[#eab308]/60 pl-2 font-serif text-[11px] italic text-[#eab308]">
                        <Stamp className="h-3 w-3 shrink-0" />
                        Ingredients estimated, not confirmed — verify with the caterer before ordering.
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`flex items-center justify-between gap-3 border-t border-[var(--dash-border)] bg-[var(--dash-surface-raised)] ${headPad}`}>
        <div className="font-mono text-xs text-[var(--dash-text-muted)]">
          {restaurant.distanceMiles} mi from event · {PRICE_LABEL[restaurant.priceLevel]}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface)] px-5 py-2 font-heading text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-soft)] transition-all hover:bg-[var(--dash-surface-hover)] hover:text-[var(--dash-text)] cursor-pointer shadow-2xs"
        >
          Close Details
        </button>
      </div>
    </>
  );
};
