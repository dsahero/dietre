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
    <div className="relative rounded-md border border-[#c24134]/35 bg-[var(--dash-surface-raised)] shadow-[0_2px_8px_rgba(25,12,6,0.12)] overflow-hidden">
      {/* Top edge colored expeditor strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#c24134] via-[#b9502a] to-[#8f3918]" />

      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[var(--dash-surface-hover)] cursor-pointer"
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
  );
}
