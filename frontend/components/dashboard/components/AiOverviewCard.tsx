import React from 'react';
import { Sparkles, RefreshCw, Lightbulb, AlertCircle } from 'lucide-react';

export interface EventOverviewData {
  headline: string;
  whyChosen: string;
  recommendations: string[];
  source: 'ai' | 'fallback';
}

interface AiOverviewCardProps {
  overview: EventOverviewData | null;
  loading: boolean;
  error: string | null;
  onRegenerate: () => void;
}

// Host-facing AI narration panel: a plain-English "why these venues + what to
// do next" summary sitting above the ranked restaurant list. Data comes from
// POST /api/events/[id]/overview (Gemini with a deterministic fallback), so
// this stays purely presentational.
export const AiOverviewCard: React.FC<AiOverviewCardProps> = ({
  overview,
  loading,
  error,
  onRegenerate,
}) => {
  return (
    <section className="relative overflow-hidden rounded-md border border-[var(--dash-accent)]/40 bg-[var(--dash-surface-raised)] p-4 shadow-xs">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--dash-accent)]/10 blur-2xl" />

      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-heading text-sm font-bold tracking-tight text-[var(--dash-text)]">
          <Sparkles className="h-4 w-4 text-[var(--dash-accent)]" />
          AI Event Overview
          {overview?.source === 'fallback' && (
            <span className="rounded-sm border border-[var(--dash-border)] px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-[var(--dash-text-muted)]">
              rule-based
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={loading}
          title="Regenerate overview"
          className="flex items-center gap-1.5 rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface)] px-2.5 py-1 font-heading text-[11px] font-semibold text-[var(--dash-text-soft)] transition-all hover:border-[var(--dash-border-strong)] hover:text-[var(--dash-text)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Thinking…' : 'Regenerate'}
        </button>
      </div>

      {loading && !overview && (
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--dash-border)]/60" />
          <div className="h-3 w-full animate-pulse rounded bg-[var(--dash-border)]/40" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--dash-border)]/40" />
        </div>
      )}

      {error && !overview && (
        <p className="flex items-center gap-2 font-serif text-xs italic text-[#c24134]">
          <AlertCircle className="h-3.5 w-3.5" />
          Couldn&rsquo;t generate an overview ({error}). Try regenerating.
        </p>
      )}

      {overview && (
        <div className="space-y-3">
          <p className="font-heading text-[15px] font-bold leading-snug text-[var(--dash-text)]">
            {overview.headline}
          </p>

          {overview.whyChosen
            .split(/\n{2,}/)
            .map((para) => para.trim())
            .filter(Boolean)
            .map((para, i) => (
              <p key={i} className="font-serif text-sm leading-relaxed text-[var(--dash-text-soft)]">
                {para}
              </p>
            ))}

          {overview.recommendations.length > 0 && (
            <div className="rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3">
              <span className="mb-1.5 flex items-center gap-1.5 font-heading text-xs font-bold text-[var(--dash-text)]">
                <Lightbulb className="h-3.5 w-3.5 text-[#eab308]" />
                Where to go from here
              </span>
              <p className="font-serif text-sm leading-relaxed text-[var(--dash-text-soft)]">
                {overview.recommendations.join(' ')}
              </p>
            </div>
          )}

          <p className="font-serif text-[10px] italic text-[var(--dash-text-muted)]">
            AI-generated from your match results — verify safety-critical details before booking.
          </p>
        </div>
      )}
    </section>
  );
};
