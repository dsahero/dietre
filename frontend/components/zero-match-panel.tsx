"use client";

import { useState } from "react";
import { Badge } from "@/frontend/components/ui/badge";
import type { ZeroMatchAlert } from "@/shared/lib/types";
import { TriangleAlertIcon, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

export function ZeroMatchPanel({ alerts }: { alerts: ZeroMatchAlert[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/5 px-4 py-3 text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#22c55e]" />
        <div>
          <span className="font-semibold text-[#4ade80]">Everyone has at least one safe option.</span>
          <span className="ml-1.5 text-[#6b9e7a]">
            Across in-range, in-budget restaurants, every guest can eat something.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#ef4444]/25 bg-[#ef4444]/5 overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#ef4444]/10 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <TriangleAlertIcon className="h-4 w-4 shrink-0 text-[#f87171]" />
          <span className="text-sm font-semibold text-[#f87171]">
            {alerts.length} guest{alerts.length === 1 ? "" : "s"} with zero safe menu items
          </span>
        </div>
        <div className="shrink-0 text-[#f87171]/70">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expandable body */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-3 border-t border-[#ef4444]/15">
            <p className="pt-3 text-xs text-[var(--dash-text-muted)]">
              Labels stay anonymous. Email appears only if that guest opted in for follow-up.
            </p>
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li
                  key={alert.response_id}
                  className="rounded-lg border border-[#ef4444]/20 bg-[var(--dash-bg)]/70 p-3 text-[var(--dash-text)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm text-[var(--dash-text)]">{alert.anonymous_label}</p>
                    <Badge variant="destructive">{alert.severity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--dash-text-muted)]">
                    Hard excludes:{" "}
                    <span className="text-[var(--dash-text-soft)]">
                      {alert.hard_excludes.length ? alert.hard_excludes.join(", ") : "none recorded"}
                    </span>
                  </p>
                  {alert.contact_email ? (
                    <p className="mt-1 text-xs text-[var(--dash-text-muted)]">
                      Optional contact:{" "}
                      <a className="underline text-[var(--dash-accent-soft)]" href={`mailto:${alert.contact_email}`}>
                        {alert.contact_email}
                      </a>
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[var(--dash-text-muted)]">No email on file. Do not try to identify this person.</p>
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
