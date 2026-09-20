import React, { useState } from 'react';
import { X, Calendar, MapPin, DollarSign, Navigation, Check, Users, AlertCircle, ListChecks, Stamp, Trash2 } from 'lucide-react';
import { EventDetails } from '../types';
import { LocationAutocomplete } from '@/frontend/components/location-autocomplete';

export interface EventEditPatch {
  name: string;
  address: string;
  place_id: string | null;
  radiusMiles: number;
  maxBudget: '$' | '$$' | '$$$';
  expectedHeadcount: number;
  limitations: string;
}

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventDetails: EventDetails;
  onSave: (patch: EventEditPatch) => Promise<void>;
  /** Provided only for the event owner; shows a Delete event button. */
  onDelete?: () => Promise<void>;
}

const BUDGET_OPTIONS: Array<'$' | '$$' | '$$$'> = ['$', '$$', '$$$'];

export const EditEventModal: React.FC<EditEventModalProps> = ({ isOpen, onClose, eventDetails, onSave, onDelete }) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Remounted via a `key` on the parent's open state, so these initializers
  // only need to run once per open.
  const [name, setName] = useState(eventDetails.name);
  const [address, setAddress] = useState(eventDetails.address);
  const [placeId, setPlaceId] = useState<string | null>(eventDetails.placeId ?? null);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [radiusMiles, setRadiusMiles] = useState(eventDetails.radiusMiles);
  const [maxBudget, setMaxBudget] = useState(eventDetails.maxBudget);
  const [expectedHeadcount, setExpectedHeadcount] = useState(eventDetails.expectedHeadcount);
  const [limitations, setLimitations] = useState(eventDetails.limitations);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the event.');
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ name, address, place_id: placeId, radiusMiles, maxBudget, expectedHeadcount, limitations });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save event details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 transition-all duration-300 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
    >
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={onClose} />

      <div className="animate-in fade-in zoom-in-95 relative z-10 my-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] shadow-2xl duration-200">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--dash-border)] bg-[var(--dash-bg)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-accent)]">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h2 id="modal-headline" className="font-heading text-base font-bold tracking-tight text-[var(--dash-text)]">
                Edit Event Ledger
              </h2>
              <p className="font-serif italic text-xs text-[var(--dash-text-muted)]">Update parameters for guest invitation &amp; restaurant matching</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-border)] hover:text-[var(--dash-text)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-6 font-serif">
          {error && (
            <div className="flex items-center gap-2 rounded-xs border border-[#ef4444]/40 bg-[#ef4444]/15 p-3 text-xs text-[#c24134]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="event-name-input" className="mb-1 block font-heading text-[11px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
              Event Name
            </label>
            <input
              type="text"
              id="event-name-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3.5 py-2 font-serif text-sm text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] transition-colors focus:border-[var(--dash-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="event-address-input" className="mb-1 block font-heading text-[11px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
              Location / Gathering Area
            </label>
            <LocationAutocomplete
              id="event-address-input"
              required
              value={address}
              placeId={placeId}
              onChange={(value, nextPlaceId) => {
                setAddress(value);
                setPlaceId(nextPlaceId);
              }}
              onSearchEnabledChange={setSearchEnabled}
              icon={<MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--dash-accent)]" />}
              inputClassName="w-full rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] py-2 pl-9 pr-3.5 font-serif text-sm text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] transition-colors focus:border-[var(--dash-accent)] focus:outline-none"
            />
            {address.trim() && !placeId && searchEnabled && (
              <p className="mt-1 font-serif text-[11px] italic text-[var(--dash-text-muted)]">
                Pick a suggestion from the dropdown to confirm this location.
              </p>
            )}
            {address.trim() && !placeId && !searchEnabled && (
              <p className="mt-1 font-serif text-[11px] italic text-[var(--dash-text-muted)]">
                Type the full address. We&apos;ll geocode it when you save.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-radius-input" className="mb-1 block font-heading text-[11px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                Radius (miles)
              </label>
              <div className="relative">
                <Navigation className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--dash-accent)]" />
                <input
                  type="number"
                  id="event-radius-input"
                  required
                  min={1}
                  max={30}
                  value={radiusMiles}
                  onChange={(e) => setRadiusMiles(Number(e.target.value))}
                  className="w-full rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] py-2 pl-9 pr-3.5 font-mono text-sm text-[var(--dash-text)] transition-colors focus:border-[var(--dash-accent)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="event-headcount-input" className="mb-1 block font-heading text-[11px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                Expected Headcount
              </label>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--dash-accent)]" />
                <input
                  type="number"
                  id="event-headcount-input"
                  required
                  min={1}
                  value={expectedHeadcount}
                  onChange={(e) => setExpectedHeadcount(Number(e.target.value))}
                  className="w-full rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] py-2 pl-9 pr-3.5 font-mono text-sm text-[var(--dash-text)] transition-colors focus:border-[var(--dash-accent)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 font-heading text-[11px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
              <DollarSign className="h-3.5 w-3.5 text-[#16a34a]" />
              Budget Range
            </label>
            <div className="inline-flex w-full rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] p-1 text-xs">
              {BUDGET_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMaxBudget(option)}
                  className={`flex-1 rounded-xs py-1.5 font-mono font-bold tracking-wider transition-all cursor-pointer ${
                    maxBudget === option ? 'border border-[var(--dash-border)] bg-[var(--dash-accent)] text-white shadow-2xs' : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-[var(--dash-border)] pt-4">
            <label
              htmlFor="event-limitations-input"
              className="flex items-center gap-1.5 font-heading text-[11px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]"
            >
              <ListChecks className="h-3.5 w-3.5 text-[var(--dash-accent)]" />
              Limitations &amp; Venue Requirements
            </label>
            <p className="font-serif italic text-[11px] leading-relaxed text-[var(--dash-text-muted)]">
              Accessibility, noise, timing, venue-level dietary requirements — anything that isn&apos;t a per-guest
              response. Saving this asks Gemini to check candidate restaurants against this criteria.
            </p>
            <textarea
              id="event-limitations-input"
              rows={3}
              value={limitations}
              onChange={(e) => setLimitations(e.target.value)}
              placeholder="e.g. Wheelchair-accessible entrance required. Vegan entrée must be available. Keep it under 5 miles."
              className="w-full resize-y rounded-xs border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3.5 py-2 font-serif text-sm text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] transition-colors focus:border-[var(--dash-accent)] focus:outline-none"
            />
            {eventDetails.limitationsChecklist.length > 0 && (
              <div className="space-y-1.5 rounded-xs border border-dashed border-[var(--dash-border)] bg-[var(--dash-bg)] p-3">
                <span className="flex items-center gap-1.5 font-heading text-[10px] font-bold uppercase tracking-wider text-[var(--dash-accent)]">
                  <Stamp className="h-3 w-3" />
                  Checklist on file
                </span>
                <ul className="space-y-1 font-serif text-xs text-[var(--dash-text)]">
                  {eventDetails.limitationsChecklist.map((item) => (
                    <li key={item.id}>• {item.label}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {onDelete && (
            <div className="rounded-xs border border-[#ef4444]/30 bg-[#ef4444]/5 p-3">
              {confirmingDelete ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-[#c24134]">
                    Delete this event, its guest responses and scores for everyone? This can&apos;t be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                      className="cursor-pointer rounded-xs border border-[var(--dash-border)] px-3 py-1.5 text-xs text-[var(--dash-text-soft)] hover:text-[var(--dash-text)]"
                    >
                      Keep event
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="cursor-pointer rounded-xs bg-[#dc2626] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete event'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#c24134] hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete event
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-[var(--dash-border)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-2 font-heading text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-border)] hover:text-[var(--dash-text)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !address.trim()}
              className="flex items-center gap-2 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-accent)] px-5 py-2 font-heading text-xs font-bold uppercase tracking-wider text-white shadow-2xs transition-all hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save Ledger Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
