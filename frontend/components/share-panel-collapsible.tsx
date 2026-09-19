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
    <div className="rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[var(--dash-surface-hover)] cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Tiny QR thumbnail */}
          <div className="shrink-0 w-9 h-9 rounded-lg overflow-hidden border border-[var(--dash-border-strong)] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="" className="w-full h-full object-cover" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--dash-text)] truncate">Share guest form</p>
            <p className="text-xs text-[var(--dash-text-muted)] truncate">{eventName} · click to {isExpanded ? 'collapse' : 'expand QR & link'}</p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 text-xs text-[var(--dash-accent)] font-semibold">
          <QrCode className="w-4 h-4" />
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
          <div className="px-5 pb-5 pt-1 flex flex-col gap-4 sm:flex-row sm:items-start border-t border-[var(--dash-border)]">
            {/* Full QR */}
            <div className="shrink-0 w-40 h-40 rounded-xl overflow-hidden border border-[var(--dash-border-strong)] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR code for the guest form" className="w-full h-full" />
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              <CopyLinkButton url={url} />
              <p className="text-sm text-[var(--dash-text-muted)]">
                Print the QR at check-in, or drop the link in Slack. Responses show up on this dashboard after a refresh.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

