import React, { useState } from 'react';
import { X, Calendar, MapPin, DollarSign, Navigation, Check, Users, AlertCircle, ListChecks, Sparkles } from 'lucide-react';
import { EventDetails } from '../types';

export interface EventEditPatch {
  name: string;
  address: string;
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
}

const BUDGET_OPTIONS: Array<'$' | '$$' | '$$$'> = ['$', '$$', '$$$'];

export const EditEventModal: React.FC<EditEventModalProps> = ({ isOpen, onClose, eventDetails, onSave }) => {
  // Remounted via a `key` on the parent's open state, so these initializers
  // only need to run once per open.
  const [name, setName] = useState(eventDetails.name);
  const [address, setAddress] = useState(eventDetails.address);
  const [radiusMiles, setRadiusMiles] = useState(eventDetails.radiusMiles);
  const [maxBudget, setMaxBudget] = useState(eventDetails.maxBudget);
  const [expectedHeadcount, setExpectedHeadcount] = useState(eventDetails.expectedHeadcount);
  const [limitations, setLimitations] = useState(eventDetails.limitations);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ name, address, radiusMiles, maxBudget, expectedHeadcount, limitations });
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
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="animate-in fade-in zoom-in-95 relative z-10 my-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] shadow-2xl duration-200">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--dash-accent)]/40 bg-[var(--dash-accent)]/20 text-[var(--dash-accent-soft)]">
              <Calendar className="h-4 w-4" />
            </div>
            <h2 id="modal-headline" className="text-lg font-bold tracking-tight text-white">
              Edit Event Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-surface-hover)] hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/15 p-3 text-xs text-[#f87171]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="event-name-input" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
              Event Name
            </label>
            <input
              type="text"
              id="event-name-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] px-4 py-2.5 text-sm text-white placeholder-[var(--dash-text-muted)] transition-colors focus:border-[var(--dash-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent)]"
            />
          </div>

          <div>
            <label htmlFor="event-address-input" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
              Location
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[var(--dash-accent-soft)]" />
              <input
                type="text"
                id="event-address-input"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] py-2.5 pl-10 pr-4 text-sm text-white placeholder-[var(--dash-text-muted)] transition-colors focus:border-[var(--dash-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-radius-input" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                Radius (miles)
              </label>
              <div className="relative">
                <Navigation className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#38bdf8]" />
                <input
                  type="number"
                  id="event-radius-input"
                  required
                  min={1}
                  max={30}
                  value={radiusMiles}
                  onChange={(e) => setRadiusMiles(Number(e.target.value))}
                  className="w-full rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] py-2.5 pl-10 pr-4 text-sm text-white transition-colors focus:border-[var(--dash-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent)]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="event-headcount-input" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                Expected Headcount
              </label>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#38bdf8]" />
                <input
                  type="number"
                  id="event-headcount-input"
                  required
                  min={1}
                  value={expectedHeadcount}
                  onChange={(e) => setExpectedHeadcount(Number(e.target.value))}
                  className="w-full rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] py-2.5 pl-10 pr-4 text-sm text-white transition-colors focus:border-[var(--dash-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent)]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
              <DollarSign className="h-3.5 w-3.5 text-[#22c55e]" />
              Budget Range
            </label>
            <div className="inline-flex w-full rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-1 text-sm">
              {BUDGET_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMaxBudget(option)}
                  className={`flex-1 rounded-lg py-1.5 font-semibold transition-all cursor-pointer ${
                    maxBudget === option ? 'bg-[var(--dash-accent)] text-white shadow-sm' : 'text-[var(--dash-text-muted)] hover:text-white'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-[var(--dash-border)] pt-5">
            <label
              htmlFor="event-limitations-input"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]"
            >
              <ListChecks className="h-3.5 w-3.5 text-[var(--dash-accent-soft)]" />
              Limitations &amp; Venue Requirements
            </label>
            <p className="text-[11px] leading-relaxed text-[var(--dash-text-muted)]">
              Accessibility, noise, timing, venue-level dietary requirements — anything that isn&apos;t a per-guest
              response. Saving this asks Gemini to break it into a checklist and check candidate restaurants against
              it; a specific radius or budget mentioned here will fill in those fields above if you haven&apos;t
              already changed them.
            </p>
            <textarea
              id="event-limitations-input"
              rows={3}
              value={limitations}
              onChange={(e) => setLimitations(e.target.value)}
              placeholder="e.g. Wheelchair-accessible entrance required. Vegan entrée must be available. Keep it under 5 miles."
              className="w-full resize-y rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] px-4 py-2.5 text-sm text-white placeholder-[var(--dash-text-muted)] transition-colors focus:border-[var(--dash-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent)]"
            />
            {eventDetails.limitationsChecklist.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-dashed border-[#eab308]/40 bg-[#eab308]/5 p-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#facc15]">
                  <Sparkles className="h-3 w-3" />
                  Current AI-extracted checklist
                </span>
                <ul className="space-y-1 text-xs text-[var(--dash-text-soft)]">
                  {eventDetails.limitationsChecklist.map((item) => (
                    <li key={item.id}>• {item.label}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[var(--dash-border)] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-border)] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[var(--dash-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--dash-accent)]/20 transition-all hover:bg-[var(--dash-accent-soft)] active:bg-[var(--dash-accent-deep)] disabled:opacity-60 cursor-pointer"
            >
              <Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
