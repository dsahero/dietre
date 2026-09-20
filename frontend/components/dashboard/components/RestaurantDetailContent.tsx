import React, { useRef, useState } from 'react';
import { RestaurantCardData } from '../types';
import { coveragePercent } from '../adapters';
import { ConfidenceChip, confidenceTitle } from './ConfidenceChip';
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
  FileText,
  Globe,
  ExternalLink,
  FileUp,
  Loader2,
  Sparkles,
  Phone,
} from 'lucide-react';

export interface RestaurantDetailContentProps {
  restaurant: RestaurantCardData;
  /** AI-generated "why this venue ranked here" summary, when available. */
  aiSummary?: string;
  isShortlisted: boolean;
  onToggleShortlist: (id: string) => void;
  onClose: () => void;
  onSelectResponse: (responseId: string) => void;
  /** Compact mode drops the large header padding for the narrower side-panel presentation. */
  compact?: boolean;
  /** Event id for host-only menu PDF upload. */
  eventId?: string;
  /** Called after a PDF upload successfully adds menu items. */
  onMenuUploaded?: () => void;
}

const PRICE_SOURCE_HINT: Record<RestaurantCardData['predictedCostSource'], string> = {
  safe_menu_avg: 'avg of safe menu prices',
  menu_avg: 'avg of menu prices',
  places_estimate: 'Places estimate (no menu prices)',
};

export const RestaurantDetailContent: React.FC<RestaurantDetailContentProps> = ({
  restaurant,
  aiSummary,
  isShortlisted,
  onToggleShortlist,
  onClose,
  onSelectResponse,
  compact = false,
  eventId,
  onMenuUploaded,
}) => {
  const [showMatched, setShowMatched] = useState(true);
  const [showConflicts, setShowConflicts] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showChecklist, setShowChecklist] = useState(true);
  const [showComplexNotes, setShowComplexNotes] = useState(true);
  const [showMenuSources, setShowMenuSources] = useState(
    () => Boolean(eventId) || (restaurant.menuUrls?.length ?? 0) > 0
  );
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getMatchBadgeColor = (pct: number) => {
    if (pct >= 85) return 'text-[#4ade80] bg-[#22c55e]/20 border-[#22c55e]/50';
    if (pct >= 60) return 'text-[#facc15] bg-[#eab308]/20 border-[#eab308]/50';
    return 'text-[#f87171] bg-[#ef4444]/20 border-[#ef4444]/50';
  };

  const pct = coveragePercent(restaurant.matchedResponses.length, restaurant.totalResponses);
  const headPad = compact ? 'p-4' : 'p-5 sm:p-6';

  const handlePdfUpload = async (file: File | null) => {
    if (!file || !eventId) return;
    setUploadStatus('uploading');
    setUploadMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`/api/events/${eventId}/restaurants/${restaurant.id}/menu-upload`, {
        method: 'POST',
        body,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        added?: number;
        total?: number;
        textPreview?: string;
      };
      if (!res.ok) {
        setUploadStatus('error');
        setUploadMessage(
          data.textPreview
            ? `${data.error || 'Upload failed.'} Extracted: “${data.textPreview}${data.textPreview.length >= 180 ? '…' : ''}”`
            : data.error || 'Upload failed.'
        );
        return;
      }
      setUploadStatus('done');
      setUploadMessage(`Added ${data.added ?? 0} item(s) · ${data.total ?? 0} total on menu`);
      onMenuUploaded?.();
    } catch (err) {
      setUploadStatus('error');
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Google Places Venue Photo Banner */}
      <div className="relative w-full h-36 sm:h-44 overflow-hidden border-b border-[var(--dash-border)] bg-[var(--dash-surface)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/places/image?query=${encodeURIComponent(restaurant.name + ' ' + restaurant.location)}&address=${encodeURIComponent(restaurant.location)}&place_id=${encodeURIComponent(restaurant.id || '')}`}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
      </div>

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
              {restaurant.distanceMiles} mi · ~${restaurant.predictedCostPerPerson}/pp
              <span className="text-[var(--dash-text-muted)]"> ({PRICE_SOURCE_HINT[restaurant.predictedCostSource]})</span>
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
          {restaurant.website && (
            <a
              href={restaurant.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs font-heading font-semibold text-[var(--dash-accent)] transition-colors hover:text-[var(--dash-accent-soft)]"
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{restaurant.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
            </a>
          )}
          {restaurant.phone && (
            <a
              href={`tel:${restaurant.phone.replace(/[^\d+]/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 ml-3 inline-flex items-center gap-1.5 text-xs font-heading font-semibold text-[var(--dash-accent)] transition-colors hover:text-[var(--dash-accent-soft)]"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{restaurant.phone}</span>
            </a>
          )}
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
        {/* AI "why this venue" summary — grounded in the match numbers */}
        {aiSummary && (
          <div className="rounded-md border border-[var(--dash-accent)]/40 bg-[var(--dash-accent)]/5 p-4 shadow-2xs">
            <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--dash-accent)]" />
              AI take on this venue
            </span>
            <p className="font-serif text-sm leading-relaxed text-[var(--dash-text-soft)]">{aiSummary}</p>
          </div>
        )}

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
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-serif text-xs text-[var(--dash-text-soft)]">
                <ConfidenceChip confidence={restaurant.confidence} />
                <span>{confidenceTitle(restaurant.confidence)}</span>
                {restaurant.confidence.rankUtilitarian !== null && (
                  <span className="text-[var(--dash-text-muted)]">
                    Group rank #{restaurant.confidence.rankUtilitarian}
                    {restaurant.confidence.rankRawlsian ? ` · fairness rank #${restaurant.confidence.rankRawlsian}` : ''}
                  </span>
                )}
              </div>
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

        {/* 1) Host limitations checklist — Gemini's provisional read, never shown as fact */}
        {restaurant.checklistNotes.length > 0 && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowChecklist(!showChecklist)}
              className="flex w-full items-center justify-between text-xs font-heading font-bold uppercase tracking-wider text-[var(--dash-text)] cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Info className="h-4 w-4 text-[var(--dash-accent)]" />
                1. Event Detail Limits Check
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

        {/* 2) Complex Dietary Restrictions Check — Gemini's menu audit for compound rules */}
        {restaurant.complexNotes && restaurant.complexNotes.length > 0 && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowComplexNotes(!showComplexNotes)}
              className="flex w-full items-center justify-between text-xs font-heading font-bold uppercase tracking-wider text-[#b45309] cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Stamp className="h-4 w-4 text-[#f59e0b]" />
                2. Complex Dietary Restrictions Audit
                <span className="ink-stamp px-1.5 py-0.5 text-[9px] font-semibold text-[#b45309] border-[#b45309]">
                  Gemini Audited
                </span>
              </span>
              {showComplexNotes ? <ChevronUp className="h-4 w-4 text-[var(--dash-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--dash-text-muted)]" />}
            </button>
            {showComplexNotes && (
              <div className="space-y-2">
                {restaurant.complexNotes.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 rounded-sm border p-3 shadow-2xs ${
                      item.verdict === 'good'
                        ? 'border-[#22c55e]/40 bg-[#22c55e]/5'
                        : item.verdict === 'bad'
                          ? 'border-[#ef4444]/40 bg-[#ef4444]/5'
                          : 'border-[#f59e0b]/40 bg-[#f59e0b]/5'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.verdict === 'good' && <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />}
                      {item.verdict === 'bad' && <AlertTriangle className="h-4 w-4 text-[#ef4444]" />}
                      {item.verdict === 'neutral' && <MinusCircle className="h-4 w-4 text-[#f59e0b]" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading text-xs font-bold text-[var(--dash-text)]">{item.rule}</p>
                        {item.guestTokens && item.guestTokens.map((tok) => (
                          <span key={tok} className="rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] px-1.5 py-0.2 font-mono text-[9px] text-[var(--dash-text-soft)]">
                            {tok}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 font-serif text-[11.5px] leading-relaxed text-[var(--dash-text-soft)]">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Menu Sources — links and PDFs found during webscraping */}
        {(restaurant.menuUrls?.length > 0 || eventId) && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowMenuSources(!showMenuSources)}
              className="flex w-full items-center justify-between text-xs font-heading font-bold uppercase tracking-wider text-[var(--dash-text)] cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-[var(--dash-accent)]" />
                Menu Sources{restaurant.menuUrls?.length ? ` (${restaurant.menuUrls.length})` : ''}
                {restaurant.menuUrls?.length > 0 && (
                  <span className="ink-stamp px-1.5 py-0.5 text-[9px] font-semibold text-[var(--dash-accent)] border-[var(--dash-accent)]">
                    Scraped
                  </span>
                )}
              </span>
              {showMenuSources ? <ChevronUp className="h-4 w-4 text-[var(--dash-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--dash-text-muted)]" />}
            </button>
            {showMenuSources && (
              <div className="space-y-2">
                {restaurant.menuUrls?.map((source, idx) => (
                  source.url.startsWith('upload://') ? (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-3 shadow-2xs"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-[var(--dash-accent)]/30 bg-[var(--dash-accent)]/10 shadow-2xs">
                        <FileText className="h-4 w-4 text-[#ef4444]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-heading text-xs font-bold text-[var(--dash-text)] truncate">
                            {source.label || 'Uploaded PDF'}
                          </span>
                          <span className="shrink-0 rounded-full border border-[var(--dash-border)] bg-[var(--dash-surface)] px-1.5 py-0.2 font-mono text-[9px] font-semibold uppercase text-[var(--dash-text-muted)]">
                            uploaded
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-3 shadow-2xs transition-all hover:border-[var(--dash-accent)] hover:bg-[var(--dash-surface-hover)] group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-[var(--dash-accent)]/30 bg-[var(--dash-accent)]/10 shadow-2xs">
                        {source.kind === 'pdf' ? (
                          <FileText className="h-4 w-4 text-[#ef4444]" />
                        ) : (
                          <Globe className="h-4 w-4 text-[var(--dash-accent)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-heading text-xs font-bold text-[var(--dash-text)] truncate">
                            {source.label || (source.kind === 'pdf' ? 'PDF Menu' : 'Menu Page')}
                          </span>
                          <span className="shrink-0 rounded-full border border-[var(--dash-border)] bg-[var(--dash-surface)] px-1.5 py-0.2 font-mono text-[9px] font-semibold uppercase text-[var(--dash-text-muted)]">
                            {source.kind}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-[var(--dash-text-muted)] truncate">
                          {source.url}
                        </p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--dash-text-muted)] transition-colors group-hover:text-[var(--dash-accent)]" />
                    </a>
                  )
                ))}

                {eventId && (
                  <div className="rounded-sm border border-dashed border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] p-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => void handlePdfUpload(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      disabled={uploadStatus === 'uploading'}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface)] px-3 py-2.5 font-heading text-xs font-semibold text-[var(--dash-text)] transition-all hover:border-[var(--dash-accent)] hover:text-[var(--dash-accent)] cursor-pointer disabled:cursor-wait disabled:opacity-70"
                    >
                      {uploadStatus === 'uploading' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--dash-accent)]" />
                      ) : (
                        <FileUp className="h-4 w-4 text-[var(--dash-accent)]" />
                      )}
                      {uploadStatus === 'uploading' ? 'Parsing PDF…' : 'Upload menu PDF'}
                    </button>
                    <p className="mt-2 text-center font-serif text-[10.5px] italic text-[var(--dash-text-muted)]">
                      Text-based PDFs work best. Items merge into this restaurant&apos;s menu.
                    </p>
                    {uploadMessage && (
                      <p
                        className={`mt-2 text-center font-mono text-[10.5px] ${
                          uploadStatus === 'error' ? 'text-[#ef4444]' : 'text-[#22c55e]'
                        }`}
                      >
                        {uploadMessage}
                      </p>
                    )}
                  </div>
                )}
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
                      <span className="shrink-0 font-mono text-xs font-semibold text-[var(--dash-accent-soft)]">
                        {item.price != null ? `$${item.price % 1 === 0 ? item.price : item.price.toFixed(2)}` : '—'}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                        Ingredients
                      </p>
                      {item.ingredients.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.ingredients.map((ing) => (
                            <span
                              key={ing}
                              className="rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--dash-text-soft)]"
                            >
                              {ing}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="font-serif text-[11px] italic text-[var(--dash-text-muted)]">
                          No ingredients listed for this item yet.
                        </p>
                      )}
                    </div>
                    {item.coveredResponses.length > 0 && (
                      <div className="space-y-1.5 border-t border-[var(--dash-border)]/60 pt-2">
                        <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                          Safe for
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.coveredResponses.map((ref) => (
                            <button
                              key={ref.responseId}
                              type="button"
                              onClick={() => onSelectResponse(ref.responseId)}
                              title="View this guest's response"
                              className="cursor-pointer rounded-xs border border-[var(--dash-accent)]/35 bg-[var(--dash-accent)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--dash-accent-deep)] transition-colors hover:border-[var(--dash-accent)] hover:bg-[var(--dash-accent)]/20 shadow-2xs"
                            >
                              {ref.token}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
          {restaurant.distanceMiles} mi from event · ~${restaurant.predictedCostPerPerson}/pp (
          {PRICE_SOURCE_HINT[restaurant.predictedCostSource]}) · party est. ~$
          {restaurant.predictedPartyTotal.toLocaleString()}
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
