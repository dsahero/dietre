import React, { useState } from 'react';
import { GuestResponse } from '../types';
import { useBodyScrollLock } from '@/frontend/lib/use-body-scroll-lock';
import { X, ShieldAlert, Heart, Mail, Copy, Check, ExternalLink, Calendar, MessageSquare, Layers, ChevronDown, ChevronUp } from 'lucide-react';

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

type DialogueTurn = {
  speaker: 'gemini' | 'guest';
  text: string;
};

function parseDialogue(rawText: string): DialogueTurn[] {
  if (!rawText || !rawText.trim()) return [];

  const blocks = rawText.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const turns: DialogueTurn[] = [];
  let hasPrefix = false;

  for (const block of blocks) {
    const match = block.match(/^(Gemini|Concierge|AI|Guest|User|Q|A):\s*([\s\S]+)$/i);
    if (match) {
      hasPrefix = true;
      const speakerRaw = match[1].toLowerCase();
      const speaker: 'gemini' | 'guest' =
        speakerRaw === 'gemini' || speakerRaw === 'concierge' || speakerRaw === 'ai' || speakerRaw === 'q'
          ? 'gemini'
          : 'guest';
      turns.push({ speaker, text: match[2].trim() });
    } else if (turns.length > 0) {
      turns[turns.length - 1].text += `\n\n${block}`;
    } else {
      turns.push({ speaker: 'guest', text: block });
    }
  }

  if (hasPrefix && turns.length > 0) {
    return turns;
  }

  if (rawText.includes('|')) {
    return rawText
      .split(/\s*\|\s*/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({ speaker: 'guest' as const, text }));
  }

  return [{ speaker: 'guest', text: rawText.trim() }];
}

function hasAgentLog(rawText: string): boolean {
  if (!rawText || !rawText.trim()) return false;
  return /^(Gemini|Concierge|AI|Q):\s*/im.test(rawText);
}

export const ResponseDetailModal: React.FC<ResponseDetailModalProps> = ({ response, isOpen, onClose }) => {
  useBodyScrollLock(isOpen && Boolean(response));
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isDialogueExpanded, setIsDialogueExpanded] = useState(false);

  if (!isOpen || !response) return null;

  const handleCopyEmail = () => {
    if (!response.contactEmail) return;
    navigator.clipboard.writeText(response.contactEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[4000] flex items-center justify-center overscroll-contain p-3 transition-all duration-300 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="response-token-title"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="animate-in fade-in zoom-in-95 relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border-2 border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] shadow-2xl duration-200">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h2 id="response-token-title" className="font-heading text-lg font-bold tracking-tight text-[var(--dash-text)]">
              {response.guestName || response.token}
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

          {/* Complex & Compound restrictions */}
          {response.complexRestrictions && response.complexRestrictions.length > 0 && (
            <div className="rounded-xs border border-[#f59e0b]/40 bg-[#f59e0b]/5 p-4 shadow-2xs">
              <div className="mb-3 flex items-center justify-between border-b border-[#f59e0b]/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-xs border border-[#f59e0b]/30 bg-[#f59e0b]/15 text-[#b45309]">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#b45309]">Complex & Compound Restrictions</h3>
                    <p className="font-serif italic text-[11px] text-[var(--dash-text-muted)]">Relational rules, kitchen surfaces, and cross-contact limits</p>
                  </div>
                </div>
                <span className="rounded-xs border border-[#f59e0b]/30 bg-[#f59e0b]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#b45309]">
                  {response.complexRestrictions.length}
                </span>
              </div>
              <div className="space-y-2">
                {response.complexRestrictions.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xs border border-[#f59e0b]/30 bg-[var(--dash-surface-raised)] p-3 font-serif text-xs leading-relaxed text-[var(--dash-text)] shadow-2xs"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-xs bg-[#f59e0b]" />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Guest's own words */}
          <div className="rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 shadow-2xs">
            {hasAgentLog(response.rawText) ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsDialogueExpanded((prev) => !prev)}
                  className={`flex w-full items-center justify-between text-left cursor-pointer ${
                    isDialogueExpanded ? 'mb-3 border-b border-[var(--dash-border)] pb-2.5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-xs border border-[var(--dash-accent)]/30 bg-[var(--dash-accent)]/15 text-[var(--dash-accent)]">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--dash-text)]">
                        In their own words
                      </h3>
                      <p className="font-serif italic text-[11px] text-[var(--dash-text-muted)]">
                        Intake dialogue transcript between Gemini Concierge and guest ({parseDialogue(response.rawText).length} turns)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-2.5 py-1 font-heading text-xs font-medium text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-border)]">
                    <span>{isDialogueExpanded ? 'Hide transcript' : 'Show transcript'}</span>
                    {isDialogueExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-[var(--dash-accent)]" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-[var(--dash-accent)]" />
                    )}
                  </div>
                </button>

                {isDialogueExpanded && (
                  <div className="space-y-3 pt-1">
                    {parseDialogue(response.rawText).map((turn, i) => (
                      <div key={i} className="space-y-1">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
                          {turn.speaker === 'gemini' ? (
                            <span className="text-[var(--dash-accent)]">Gemini Concierge</span>
                          ) : (
                            <span className="text-[var(--dash-text-muted)]">{response.guestName || response.token || 'Guest'}</span>
                          )}
                        </p>
                        <div
                          className={`rounded-xs border p-3 font-serif text-xs leading-relaxed ${
                            turn.speaker === 'gemini'
                              ? 'border-[var(--dash-border)] bg-[var(--dash-bg)] text-[var(--dash-text-soft)]'
                              : 'border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)] shadow-2xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{turn.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-2.5 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-xs border border-[var(--dash-accent)]/30 bg-[var(--dash-accent)]/15 text-[var(--dash-accent)]">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--dash-text)]">In their own words</h3>
                </div>
                <p className="whitespace-pre-wrap rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-3.5 font-serif text-sm leading-relaxed text-[var(--dash-text)]">
                  {response.rawText}
                </p>
              </>
            )}
          </div>

          {/* Optional contact */}
          <div className="rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 shadow-2xs">
            <div className="mb-3 flex items-center gap-2 border-b border-[var(--dash-border)] pb-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] text-[var(--dash-accent)]">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--dash-text)]">Contact Email</h3>
                <p className="font-serif italic text-[11px] text-[var(--dash-text-muted)]">Used to follow up on a zero-match or clarify requirements</p>
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
