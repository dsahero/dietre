"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Crown, Loader2, Users, X } from 'lucide-react';
import type { Collaborator, PendingInvite } from '@/shared/lib/types';

interface EventPeoplePopoverProps {
  eventId: string;
  isOwner: boolean;
  viewerEmail: string;
  collaborators: Collaborator[];
  pendingInvites: PendingInvite[];
  onChange: (next: { collaborators: Collaborator[]; pendingInvites: PendingInvite[] }) => void;
  /** Optional trigger styling (e.g. compact on event cards). */
  compact?: boolean;
}

/**
 * Person icon that opens a list of everyone with access. Anyone on the event
 * can remove anyone except the owner, who has no remove button.
 */
export const EventPeoplePopover: React.FC<EventPeoplePopoverProps> = ({
  eventId,
  isOwner,
  viewerEmail,
  collaborators,
  pendingInvites,
  onChange,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const total = collaborators.length + pendingInvites.length;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (total === 0) return null;

  const remove = async (email: string) => {
    setBusyEmail(email);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/collaborators`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        collaborators?: Collaborator[];
        pending_invites?: PendingInvite[];
      };
      if (!res.ok) throw new Error(data.error || 'Could not remove that person.');
      onChange({ collaborators: data.collaborators ?? [], pendingInvites: data.pending_invites ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that person.');
    } finally {
      setBusyEmail(null);
    }
  };

  return (
    <div
      ref={ref}
      className="relative"
      onClick={(e) => {
        // Lives inside clickable cards on the events list.
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Shared with ${total} ${total === 1 ? 'person' : 'people'}`}
        title="Shared event — see who has access"
        className={`inline-flex items-center gap-1 rounded-xs border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] text-[var(--dash-text-soft)] transition-colors hover:border-[var(--dash-accent)] hover:text-[var(--dash-text)] cursor-pointer shadow-2xs ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
        }`}
      >
        <Users className={compact ? 'h-3 w-3 text-[var(--dash-accent)]' : 'h-3.5 w-3.5 text-[var(--dash-accent)]'} />
        <span className="font-mono font-semibold">{total + 1}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[60] mt-1.5 w-72 rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-3 text-left shadow-[0_8px_24px_rgba(20,12,6,0.3)]">
          <p className="mb-2 font-heading text-[11px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
            People with access
          </p>
          <ul className="space-y-1.5 font-serif text-xs text-[var(--dash-text)]">
            <li className="flex items-center gap-2">
              <Crown className="h-3.5 w-3.5 shrink-0 text-[var(--dash-accent)]" />
              <span className="truncate">{isOwner ? 'You' : 'Event owner'}</span>
              <span className="ml-auto rounded-xs border border-[var(--dash-border)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--dash-text-muted)]">
                Owner
              </span>
            </li>
            {collaborators.map((c) => (
              <li key={c.email} className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0 text-[var(--dash-text-muted)]" />
                <span className="truncate" title={c.email}>
                  {c.name ? `${c.name} · ` : ''}
                  {c.email}
                  {c.email === viewerEmail ? ' (you)' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => remove(c.email)}
                  disabled={busyEmail === c.email}
                  aria-label={`Remove ${c.email}`}
                  className="ml-auto shrink-0 cursor-pointer rounded-xs p-0.5 text-[var(--dash-text-muted)] hover:bg-[var(--dash-surface-hover)] hover:text-[#c24134] disabled:opacity-50"
                >
                  {busyEmail === c.email ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
            {pendingInvites.map((p) => (
              <li key={p.email} className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0 text-[var(--dash-text-muted)]/60" />
                <span className="truncate italic text-[var(--dash-text-soft)]" title={p.email}>
                  {p.email}
                </span>
                <span className="shrink-0 text-[9px] uppercase tracking-wider text-[var(--dash-text-muted)]">Pending</span>
                <button
                  type="button"
                  onClick={() => remove(p.email)}
                  disabled={busyEmail === p.email}
                  aria-label={`Cancel invite for ${p.email}`}
                  className="shrink-0 cursor-pointer rounded-xs p-0.5 text-[var(--dash-text-muted)] hover:bg-[var(--dash-surface-hover)] hover:text-[#c24134] disabled:opacity-50"
                >
                  {busyEmail === p.email ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
          </ul>
          {error && <p className="mt-2 text-[11px] text-[#c24134]">{error}</p>}
        </div>
      )}
    </div>
  );
};
