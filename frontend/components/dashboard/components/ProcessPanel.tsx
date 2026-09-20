"use client";

import React, { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  Terminal,
  Sparkles,
} from "lucide-react";

export type ProcessStatus = "idle" | "running" | "done" | "error";

export interface LogEntry {
  message: string;
  timestamp: number;
}

interface ProcessPanelProps {
  /** Button label when idle, e.g. "Start Webscraping" */
  label: string;
  /** Description shown below the button */
  description: string;
  /** Icon to show on the button */
  icon: "globe" | "sparkles";
  /** Current process status */
  status: ProcessStatus;
  /** Log entries to display */
  logs: LogEntry[];
  /** Whether the button is disabled (e.g. dependency not met) */
  disabled?: boolean;
  /** Tooltip for disabled state */
  disabledReason?: string;
  /** Called when the user clicks the start button */
  onStart: () => void;
}

const ICON_MAP = {
  globe: Globe,
  sparkles: Sparkles,
};

const STATUS_STYLES: Record<
  ProcessStatus,
  { border: string; bg: string; text: string; icon: React.ReactNode }
> = {
  idle: {
    border: "border-[var(--dash-border)]",
    bg: "bg-[var(--dash-surface-raised)]",
    text: "text-[var(--dash-text)]",
    icon: null,
  },
  running: {
    border: "border-[var(--dash-accent)]/50",
    bg: "bg-[var(--dash-accent)]/5",
    text: "text-[var(--dash-accent)]",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  done: {
    border: "border-[#22c55e]/40",
    bg: "bg-[#22c55e]/5",
    text: "text-[#22c55e]",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  error: {
    border: "border-[#ef4444]/40",
    bg: "bg-[#ef4444]/5",
    text: "text-[#ef4444]",
    icon: <XCircle className="h-4 w-4" />,
  },
};

function formatLogLine(msg: string): React.ReactNode {
  // Color-code certain markers in log output
  if (msg.startsWith("━━━")) {
    return <span className="font-bold text-[var(--dash-accent)]">{msg}</span>;
  }
  if (msg.startsWith("✅") || msg.startsWith("🌟")) {
    return <span className="text-[#4ade80]">{msg}</span>;
  }
  if (msg.startsWith("❌")) {
    return <span className="text-[#f87171]">{msg}</span>;
  }
  if (msg.startsWith("⚠")) {
    return <span className="text-[#facc15]">{msg}</span>;
  }
  if (msg.startsWith("🔍") || msg.startsWith("🤖") || msg.startsWith("📄") || msg.startsWith("💾")) {
    return <span className="text-[var(--dash-accent-soft)]">{msg}</span>;
  }
  if (msg.startsWith("  ✓") || msg.startsWith("  📋") || msg.startsWith("  📎")) {
    return <span className="text-[#4ade80]/80">{msg}</span>;
  }
  if (msg.startsWith("  →")) {
    return <span className="text-[var(--dash-text-muted)]">{msg}</span>;
  }
  return msg;
}

export const ProcessPanel: React.FC<ProcessPanelProps> = ({
  label,
  description,
  icon,
  status,
  logs,
  disabled = false,
  disabledReason,
  onStart,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const IconComponent = ICON_MAP[icon];
  const styles = STATUS_STYLES[status];

  // Auto-expand when process starts
  const wasRunning = useRef(false);
  if (status === "running" && !wasRunning.current) {
    wasRunning.current = true;
    if (!isExpanded) setIsExpanded(true);
  }
  if (status === "idle") wasRunning.current = false;

  // Auto-scroll logs to bottom
  const prevLogCount = useRef(0);
  if (logContainerRef.current && logs.length > prevLogCount.current) {
    requestAnimationFrame(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    });
  }
  prevLogCount.current = logs.length;

  const statusLabel =
    status === "running"
      ? "Running…"
      : status === "done"
        ? "Complete"
        : status === "error"
          ? "Failed"
          : "";

  return (
    <div
      className={`rounded-sm border ${styles.border} ${styles.bg} shadow-2xs transition-all duration-200`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-[var(--dash-accent)]/30 bg-[var(--dash-accent)]/15 shadow-2xs`}
          >
            <IconComponent className="h-4 w-4 text-[var(--dash-accent)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-bold text-[var(--dash-text)]">
                {label}
              </span>
              {statusLabel && (
                <span
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${styles.border} ${styles.text}`}
                >
                  {styles.icon}
                  {statusLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--dash-text-muted)] font-serif italic truncate">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(status === "idle" || status === "done" || status === "error") && (
            <button
              type="button"
              onClick={onStart}
              disabled={disabled}
              title={disabled ? disabledReason : undefined}
              className={`group inline-flex items-center gap-2 rounded-xs border px-3 py-1.5 font-heading text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                disabled
                  ? "border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-muted)] cursor-not-allowed opacity-60"
                  : status === "idle"
                    ? "border-[var(--dash-accent)] bg-[var(--dash-accent)] text-white hover:opacity-90"
                    : "border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-soft)] hover:border-[var(--dash-accent)] hover:text-[var(--dash-text)]"
              }`}
            >
              <IconComponent className="h-3.5 w-3.5" />
              {status === "idle" ? "Start" : "Run again"}
            </button>
          )}
          {logs.length > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 rounded-xs border border-[var(--dash-border)] px-2.5 py-1.5 font-mono text-[10px] font-semibold text-[var(--dash-text-soft)] transition-colors hover:border-[var(--dash-accent)] hover:text-[var(--dash-text)] cursor-pointer"
            >
              <Terminal className="h-3 w-3 text-[var(--dash-accent)]" />
              Logs ({logs.length})
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar while running */}
      {status === "running" && (
        <div className="mx-4 mb-2 h-1 overflow-hidden rounded-full bg-[var(--dash-surface)]">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--dash-accent)] transition-all" />
        </div>
      )}

      {/* Log viewer */}
      {isExpanded && logs.length > 0 && (
        <div className="border-t border-[var(--dash-border)]/50">
          <div
            ref={logContainerRef}
            className="max-h-72 overflow-y-auto overflow-x-hidden bg-[var(--dash-bg)] px-4 py-3 font-mono text-[11px] leading-relaxed text-[var(--dash-text-soft)] scrollbar-thin"
          >
            {logs.map((entry, idx) => {
              // Split by newlines so blank lines in the source show as spacing
              const lines = entry.message.split("\n");
              return lines.map((line, lineIdx) => (
                <div
                  key={`${idx}-${lineIdx}`}
                  className={line.trim() === "" ? "h-2" : ""}
                >
                  {line.trim() !== "" && (
                    <span className="select-text whitespace-pre-wrap break-all">
                      {formatLogLine(line)}
                    </span>
                  )}
                </div>
              ));
            })}
            {status === "running" && (
              <div className="mt-1 flex items-center gap-1.5 text-[var(--dash-accent)]">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="animate-pulse">Processing…</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
