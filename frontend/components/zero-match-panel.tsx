"use client";

import { useState } from "react";
import { Badge } from "@/frontend/components/ui/badge";
import type { ZeroMatchAlert } from "@/shared/lib/types";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

export function ZeroMatchPanel({ alerts }: { alerts: ZeroMatchAlert[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-[#22c55e]/25 bg-[#22c55e]/5 px-4 py-3 text-sm shadow-xs">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#22c55e]" />
        <div>
          <span className="font-heading font-semibold text-[#22c55e]">Every guest has a safe table.</span>
          <span className="ml-1.5 text-[var(--dash-text-soft)]">
            Across in-range, in-budget restaurants, every guest can eat safely.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pt-3 overflow-visible">
      {/* Real 3D Brass Paperclip sitting realistically over the top edge */}
      <div
        className="pointer-events-none absolute -top-2 left-7 z-30 transition-transform duration-300 hover:rotate-[-4deg]"
        style={{
          filter: "drop-shadow(2px 5px 6px rgba(25, 12, 6, 0.45))",
          transform: "rotate(-7deg)",
        }}
        aria-hidden="true"
      >
        <svg
          width="30"
          height="64"
          viewBox="0 0 30 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="paperclip-brass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5dfa8" />
              <stop offset="22%" stopColor="#cda153" />
              <stop offset="48%" stopColor="#fff2d1" />
              <stop offset="72%" stopColor="#875722" />
              <stop offset="90%" stopColor="#dcb36a" />
              <stop offset="100%" stopColor="#f7e8c0" />
            </linearGradient>
            <linearGradient id="wire-inner-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4a2e12" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1a0f05" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Under-paper wire shadow */}
          <path
            d="M 19 22 V 48 C 19 55 14 59 9 59 C 4 59 1.5 54.5 1.5 48 V 14 C 1.5 7 6.5 2 13 2 C 19.5 2 24.5 7 24.5 14 V 44 C 24.5 49 21 52.5 16.5 52.5 C 12 52.5 8.5 49 8.5 44 V 18"
            stroke="url(#wire-inner-shadow)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(1, 1.5)"
          />

          {/* Main 3D Brass Wire Loop */}
          <path
            d="M 19 22 V 48 C 19 55 14 59 9 59 C 4 59 1.5 54.5 1.5 48 V 14 C 1.5 7 6.5 2 13 2 C 19.5 2 24.5 7 24.5 14 V 44 C 24.5 49 21 52.5 16.5 52.5 C 12 52.5 8.5 49 8.5 44 V 18"
            stroke="url(#paperclip-brass)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Realistic Metallic Specular Highlight */}
          <path
            d="M 19 23 V 47 M 1.5 46 V 15 C 1.5 8 6 3 12.5 3 C 19 3 23.5 8 23.5 15 V 43"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />
        </svg>
      </div>

      {/* The Expeditor Slip Card */}
      <div className="relative rounded-md border border-[#c24134]/35 bg-[var(--dash-surface-raised)] shadow-[0_2px_8px_rgba(25,12,6,0.12)] overflow-hidden">
        {/* Top edge colored expeditor strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#c24134] via-[#b9502a] to-[#8f3918]" />

        {/* Collapsible header */}
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-3.5 pl-16 text-left transition-colors hover:bg-[var(--dash-surface-hover)] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="ink-stamp px-2 py-0.5 text-[9px] font-bold text-[#c24134] border-[#c24134]">
              Expeditor Ticket
            </span>
            <span className="font-heading text-sm font-bold text-[var(--dash-text)]">
              {alerts.length} guest{alerts.length === 1 ? "" : "s"} with no safe table
            </span>
          </div>
          <div className="shrink-0 text-[var(--dash-accent-soft)]">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {/* Expandable body with smooth accordion motion */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-5 pb-5 pt-2 space-y-3 border-t border-[var(--dash-border)] bg-[var(--dash-surface)]/60">
              <p className="text-xs text-[var(--dash-text-muted)] font-serif italic">
                Email contact appears only if provided for direct host clarification.
              </p>
              <ul className="space-y-2.5">
                {alerts.map((alert) => (
                  <li
                    key={alert.response_id}
                    className="rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-3 text-[var(--dash-text)] shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dash-border)] pb-2 mb-2">
                      <p className="font-heading font-bold text-sm text-[var(--dash-text)]">{alert.anonymous_label}</p>
                      <Badge variant="destructive" className="font-mono text-[10px] uppercase tracking-wider">
                        {alert.severity} severity
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-[var(--dash-text-muted)]">
                      <span className="text-[var(--dash-accent-soft)] uppercase font-semibold">Hard excludes:</span>{" "}
                      <span className="font-sans text-[var(--dash-text)] font-medium">
                        {alert.hard_excludes.length ? alert.hard_excludes.join(", ") : "none recorded"}
                      </span>
                    </p>
                    {alert.contact_email ? (
                      <p className="mt-1.5 font-mono text-xs text-[var(--dash-text-muted)]">
                        <span className="text-[var(--dash-accent-soft)] uppercase font-semibold">Direct contact:</span>{" "}
                        <a className="font-sans underline text-[var(--dash-accent)] hover:text-[var(--dash-accent-deep)]" href={`mailto:${alert.contact_email}`}>
                          {alert.contact_email}
                        </a>
                      </p>
                    ) : (
                      <p className="mt-1 font-mono text-[11px] text-[var(--dash-text-muted)] italic">
                        No email provided on file.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

