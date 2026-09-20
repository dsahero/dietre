"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mail, Send, X } from 'lucide-react';
import type { PendingInvite } from '@/shared/lib/types';

interface ShareEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  inviterName: string;
  onInvited: (invite: PendingInvite) => void;
}

type Suggestion = { email: string; name: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ShareEventModal: React.FC<ShareEventModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventName,
  inviterName,
  onInvited,
}) => {
  const [email, setEmail] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, Suggestion[]>());
  const abortRef = useRef<AbortController | null>(null);

  // Debounced typeahead against existing accounts. Results are cached per
  // prefix and a longer prefix is filtered locally from a shorter cached one,
  // so typing costs as few lookups as possible.
  useEffect(() => {
    const q = email.trim().toLowerCase();
    if (!isOpen || q.length < 3 || EMAIL.test(q)) return;

    const cached = cacheRef.current.get(q);
    if (cached) {
      setSuggestions(cached);
      return;
    }
    for (let len = q.length - 1; len >= 3; len--) {
      const shorter = cacheRef.current.get(q.slice(0, len));
      if (shorter && shorter.length < 5) {
        setSuggestions(shorter.filter((s) => s.email.toLowerCase().startsWith(q)));
        return;
      }
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetch(`/api/hosts/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { suggestions?: Suggestion[] }) => {
          const list = data.suggestions ?? [];
          cacheRef.current.set(q, list);
          setSuggestions(list);
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [email, isOpen]);

  if (!isOpen) return null;

  const visibleSuggestions =
    showSuggestions && email.trim().length >= 3 && !EMAIL.test(email.trim()) ? suggestions : [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!EMAIL.test(target)) {
      setError('Enter a full, valid email address.');
      return;
    }
    setSending(true);
    setError(null);
    setNotice(null);
    setWarning(null);
    try {
      const res = await fetch(`/api/events/${eventId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        email_sent?: boolean;
        email_note?: string | null;
      };
      if (!res.ok) throw new Error(data.error || 'Could not send the invite.');
      onInvited({ email: target, invited_by_name: inviterName, invited_at: new Date().toISOString() });
      if (data.email_sent) {
        setNotice(`Invitation emailed to ${target}. They'll see it as a notification when they log in.`);
      } else {
        setWarning(
          `Invitation saved for ${target}, but the email was NOT sent. ${data.email_note ?? ''} They'll still see the invitation when they log in.`
        );
      }
      setEmail('');
      setSuggestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the invite.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-headline"
    >
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 my-auto w-full max-w-md rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--dash-border)] bg-[var(--dash-bg)] px-5 py-3.5">
          <div>
            <h2 id="share-headline" className="font-heading text-base font-bold text-[var(--dash-text)]">
              Share event
            </h2>
            <p className="font-serif text-xs italic text-[var(--dash-text-muted)]">Invite someone to collaborate on {eventName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3 p-5 font-serif">
          <label htmlFor="share-email" className="block font-heading text-[11px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--dash-accent)]" />
            <input
              id="share-email"
              type="email"
              autoComplete="off"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setShowSuggestions(true);
                setError(null);
                setNotice(null);
                setWarning(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
              placeholder="name@example.com"
              className="w-full rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] py-2 pl-9 pr-3.5 text-sm text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] transition-colors focus:border-[var(--dash-accent)] focus:outline-none"
            />
            {visibleSuggestions.length > 0 && (
              <ul
                role="listbox"
                className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] py-1 shadow-[0_8px_24px_rgba(20,12,6,0.3)]"
              >
                {visibleSuggestions.map((s) => (
                  <li key={s.email} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setEmail(s.email);
                        setShowSuggestions(false);
                      }}
                      className="flex w-full cursor-pointer flex-col px-3 py-1.5 text-left text-sm text-[var(--dash-text)] hover:bg-[var(--dash-surface-hover)]"
                    >
                      <span className="truncate">{s.email}</span>
                      {s.name && <span className="truncate text-[11px] text-[var(--dash-text-muted)]">{s.name}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-[11px] italic text-[var(--dash-text-muted)]">
            They&apos;ll get an email either way. If they don&apos;t have an account yet, they can sign up with this address.
          </p>

          {error && <p className="rounded-xs border border-[#ef4444]/40 bg-[#ef4444]/10 p-2 text-xs text-[#c24134]">{error}</p>}
          {warning && (
            <p className="rounded-xs border border-[#f59e0b]/50 bg-[#f59e0b]/10 p-2 text-xs text-[var(--dash-text)]">{warning}</p>
          )}
          {notice && (
            <p className="flex items-start gap-1.5 rounded-xs border border-[#22c55e]/40 bg-[#22c55e]/10 p-2 text-xs text-[var(--dash-text)]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22c55e]" />
              {notice}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--dash-border)] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-2 font-heading text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]"
            >
              Done
            </button>
            <button
              type="submit"
              disabled={sending || !EMAIL.test(email.trim())}
              className="flex cursor-pointer items-center gap-2 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-accent)] px-5 py-2 font-heading text-xs font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
