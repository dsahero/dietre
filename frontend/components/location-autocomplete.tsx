"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MapPin } from "lucide-react";

interface LocationAutocompleteProps {
  id?: string;
  value: string;
  placeId: string | null;
  onChange: (value: string, placeId: string | null) => void;
  placeholder?: string;
  required?: boolean;
  /** Merged onto the <input> itself — pass the same classes each call site already used. */
  inputClassName: string;
  /** Optional leading icon, absolutely positioned inside the same wrapper (e.g. an inline MapPin like each call site already had). */
  icon?: ReactNode;
}

type Suggestion = { placeId: string; mainText: string; secondaryText: string };

/**
 * Real-address autocomplete backed by /api/places/autocomplete (Google
 * Places). Worldwide — no city bias or landmark allowlist. Typing always
 * clears any prior confirmed pick — the host must click a suggestion for
 * onChange's placeId to become non-null again.
 */
export function LocationAutocomplete({
  id,
  value,
  onChange,
  placeholder,
  required,
  inputClassName,
  icon,
}: LocationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [placesEnabled, setPlacesEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!placesEnabled) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const needle = value.trim();
    if (needle.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with the debounced query, not derivable during render
      setSuggestions([]);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      fetch(`/api/places/autocomplete?input=${encodeURIComponent(needle)}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) {
            return { suggestions: [], enabled: false };
          }
          return res.json();
        })
        .then((data: { suggestions?: Suggestion[]; enabled?: boolean }) => {
          if (data.enabled === false) {
            setPlacesEnabled(false);
            setSuggestions([]);
            return;
          }
          setSuggestions(data.suggestions ?? []);
          setHighlighted(0);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setSuggestions([]);
          }
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, placesEnabled]);

  // Close on outside click.
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const matches: Array<{ label: string; sub?: string; id: string }> = suggestions.map((s) => ({
    label: s.secondaryText ? `${s.mainText}, ${s.secondaryText}` : s.mainText,
    sub: s.secondaryText,
    id: s.placeId,
  }));
  const typedEnough = value.trim().length >= 2;

  const pick = (match: { label: string; id: string }) => {
    onChange(match.label, match.id);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }
    if (!isOpen || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((prev) => (prev + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((prev) => (prev - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(matches[highlighted]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {icon}
      <input
        type="text"
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value, null);
          setHighlighted(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={inputClassName}
      />

      {isOpen && (loading || matches.length > 0 || typedEnough) && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] py-1 shadow-[0_8px_24px_rgba(20,12,6,0.3)]"
        >
          {matches.map((match, idx) => (
            <li key={match.id} role="option" aria-selected={idx === highlighted}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(match)}
                onMouseEnter={() => setHighlighted(idx)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left font-serif text-sm transition-colors cursor-pointer ${
                  idx === highlighted
                    ? "bg-[var(--dash-accent)] text-white"
                    : "text-[var(--dash-text)] hover:bg-[var(--dash-surface-hover)]"
                }`}
              >
                <MapPin className={`h-3.5 w-3.5 shrink-0 ${idx === highlighted ? "text-white" : "text-[var(--dash-accent)]"}`} />
                <span className="truncate">{match.label}</span>
              </button>
            </li>
          ))}
          {loading && matches.length === 0 && (
            <li className="px-3 py-1.5 text-sm font-serif text-[var(--dash-text-muted)]">Searching…</li>
          )}
          {!loading && typedEnough && matches.length === 0 && (
            <li className="px-3 py-1.5 text-sm font-serif text-[var(--dash-text-muted)]">
              {placesEnabled ? "No matching addresses." : "Address search is unavailable. Try again in a moment."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
