"use client";

import { useState } from "react";
import { QrCode, ChevronDown, ChevronUp } from "lucide-react";
import { CopyLinkButton } from "@/frontend/components/copy-link-button";

interface SharePanelCollapsibleProps {
  url: string;
  eventName: string;
  qrDataUrl: string;
}

export function SharePanelCollapsible({ url, eventName, qrDataUrl }: SharePanelCollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] shadow-xs overflow-hidden transition-all duration-200">
      {/* Collapsed header — clean cardstock invite ticket */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[var(--dash-surface-hover)] cursor-pointer"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Subtle QR thumbnail ticket */}
          <div className="shrink-0 w-9 h-9 rounded-sm overflow-hidden border border-[var(--dash-border-strong)] bg-white p-0.5 shadow-2xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="" className="w-full h-full object-cover" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="ink-stamp inline-block px-1.5 py-0 text-[9px] font-bold text-[var(--dash-accent)] border-[var(--dash-accent)]">
              Guest Intake Portal
            </span>
            <p className="font-heading text-sm font-bold text-[var(--dash-text)] truncate mt-0.5">{eventName}</p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-xs text-[var(--dash-accent-soft)] font-medium">
          <span className="font-mono text-[11px] uppercase tracking-wider hidden sm:inline text-[var(--dash-text-muted)]">
            {isExpanded ? 'Close QR' : 'Expand QR Code'}
          </span>
          <QrCode className="w-4 h-4 text-[var(--dash-accent)]" />
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expandable body */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-3 flex flex-col gap-4 sm:flex-row sm:items-start border-t border-[var(--dash-border)] bg-[var(--dash-surface)]/50">
            {/* Full QR */}
            <div className="shrink-0 w-36 h-36 rounded-sm overflow-hidden border border-[var(--dash-border-strong)] bg-white p-1.5 shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR code for the guest form" className="w-full h-full" />
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              <CopyLinkButton url={url} />
              <p className="text-xs text-[var(--dash-text-muted)] font-serif italic leading-relaxed">
                Display the QR at the banquet reception, or distribute the confidential link to attendees. Dietary entries update this ledger live.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

