import React, { useState } from 'react';
import { GuestResponse } from '../types';
import { X, ShieldAlert, Heart, Mail, Copy, Check, ExternalLink, Calendar, MessageSquare } from 'lucide-react';

interface ResponseDetailModalProps {
  response: GuestResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

const severityBadge = (severity: GuestResponse['severity']) => {
  switch (severity) {
    case 'high':
      return 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/40';
    case 'medium':
      return 'bg-[#f59e0b]/20 text-[#fbbf24] border-[#f59e0b]/40';
    default:
      return 'bg-[#38bdf8]/20 text-[#7dd3fc] border-[#38bdf8]/40';
  }
};

export const ResponseDetailModal: React.FC<ResponseDetailModalProps> = ({ response, isOpen, onClose }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!isOpen || !response) return null;

  const handleCopyEmail = () => {
    if (!response.contactEmail) return;
    navigator.clipboard.writeText(response.contactEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 transition-all duration-300 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="response-token-title"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="animate-in fade-in zoom-in-95 relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border-2 border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] shadow-2xl duration-200">
        {/* Header — no avatar, no name: the token is the only identifier */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h2 id="response-token-title" className="font-mono text-base font-bold tracking-tight text-[var(--dash-text)]">
              {response.token}
            </h2>
            <span
              className={`rounded-xs border px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider ${severityBadge(
                response.severity
              )}`}
            >
              {response.severity} constraint
            </span>
            {response.hasZeroMatch && (
              <span className="flex items-center gap-1 rounded-xs border border-[#ef4444]/40 bg-[#ef4444]/15 px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase text-[#c24134]">
                <ShieldAlert className="h-3 w-3" /> No safe restaurant found
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-surface-hover)] hover:text-[var(--dash-text)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Guest's own words — always shown as the source of truth, never replaced by the AI's read */}
          <div className="rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 shadow-2xs">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-xs border border-[var(--dash-accent)]/30 bg-[var(--dash-accent)]/15 text-[var(--dash-accent)]">
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--dash-text)]">In their own words</h3>
            </div>
            <p className="whitespace-pre-wrap rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-3.5 font-serif text-sm leading-relaxed text-[var(--dash-text)]">
              {response.rawText}
            </p>
          </div>

          {/* Hard restrictions */}
          <div className="rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 shadow-2xs">
            <div className="mb-3 flex items-center justify-between border-b border-[var(--dash-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-xs border border-[#ef4444]/30 bg-[#ef4444]/15 text-[#c24134]">
                  <ShieldAlert className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#c24134]">Hard Restrictions</h3>
                  <p className="font-serif italic text-[11px] text-[var(--dash-text-muted)]">Non-negotiable parameters — allergies, religious observance, medical needs</p>
                </div>
              </div>
              <span className="rounded-xs border border-[#ef4444]/30 bg-[#ef4444]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#c24134]">
                {response.hardExcludes.length}
              </span>
            </div>
            {response.hardExcludes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {response.hardExcludes.map((rule, idx) => (
                  <span
                    key={idx}
                    className="rounded-xs border border-[#ef4444]/30 bg-[#ef4444]/10 px-2.5 py-1 font-mono text-xs font-bold text-[#c24134]"
                  >
                    {rule}
                  </span>
                ))}
              </div>
            ) : (
              <div className="rounded-xs border border-dashed border-[var(--dash-border)] bg-[var(--dash-bg)] p-3 font-serif italic text-xs text-[var(--dash-text-muted)]">
                No hard restrictions reported.
              </div>
            )}
          </div>

          {/* Soft preferences */}
          <div className="rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 shadow-2xs">
            <div className="mb-3 flex items-center justify-between border-b border-[var(--dash-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-xs border border-[var(--dash-accent)]/30 bg-[var(--dash-accent)]/15 text-[var(--dash-accent)]">
                  <Heart className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--dash-text)]">Soft Preferences</h3>
                  <p className="font-serif italic text-[11px] text-[var(--dash-text-muted)]">Can flex if needed</p>
                </div>
              </div>
              <span className="rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--dash-accent)]">
                {response.softPreferences.length}
              </span>
            </div>
            {response.softPreferences.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {response.softPreferences.map((rule, idx) => (
                  <span
                    key={idx}
                    className="rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--dash-accent)]"
                  >
                    {rule}
                  </span>
                ))}
              </div>
            ) : (
              <div className="rounded-xs border border-dashed border-[var(--dash-border)] bg-[var(--dash-bg)] p-3 font-serif italic text-xs text-[var(--dash-text-muted)]">
                No preferences reported.
              </div>
            )}
          </div>

          {/* Optional contact */}
          <div className="rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 shadow-2xs">
            <div className="mb-3 flex items-center gap-2 border-b border-[var(--dash-border)] pb-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] text-[var(--dash-accent)]">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--dash-text)]">Optional Contact Email</h3>
                <p className="font-serif italic text-[11px] text-[var(--dash-text-muted)]">Only used to follow up on a zero-match — never shown to other guests</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {response.contactEmail ? (
                  <span className="select-all font-mono text-xs font-semibold text-[var(--dash-text)]">{response.contactEmail}</span>
                ) : (
                  <span className="font-serif text-xs italic text-[var(--dash-text-muted)]">No email provided</span>
                )}
              </div>

              {response.contactEmail && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="flex items-center gap-1.5 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] px-3 py-1.5 font-heading text-xs font-medium text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-border)] cursor-pointer"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#16a34a]" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </>
                    )}
                  </button>
                  <a
                    href={`mailto:${response.contactEmail}?subject=About your dietary response`}
                    className="flex items-center gap-1.5 rounded-xs bg-[var(--dash-accent)] px-3 py-1.5 font-heading text-xs font-bold uppercase tracking-wider text-white shadow-2xs transition-colors hover:opacity-90"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Send Email
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-[var(--dash-border)] bg-[var(--dash-bg)] px-6 py-4">
          <div className="flex items-center gap-1.5 font-mono text-xs text-[var(--dash-text-muted)]">
            <Calendar className="h-3.5 w-3.5 text-[var(--dash-accent)]" />
            <span>Submitted {new Date(response.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-2 font-heading text-xs font-semibold uppercase tracking-wider text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-border)] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
