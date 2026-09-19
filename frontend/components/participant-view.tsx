"use client";

import { useState } from "react";
import { DietForm } from "@/frontend/components/diet-form";
import { JoinEventChat } from "@/frontend/components/join-event-chat";
import { MessageSquareText, ClipboardList } from "lucide-react";

interface ParticipantViewProps {
  eventId: string;
  eventName: string;
  hostName: string;
}

export function ParticipantView({ eventId, eventName, hostName }: ParticipantViewProps) {
  const [mode, setMode] = useState<"chat" | "form">("chat");

  return (
    <div className="space-y-6">
      {/* Intake mode selector */}
      <div className="flex rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setMode("chat")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xs py-2 px-3 font-heading text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            mode === "chat"
              ? "bg-[var(--dash-accent)] text-white shadow-xs"
              : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]"
          }`}
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          <span>Concierge Chatbot</span>
          <span className="hidden sm:inline-flex items-center rounded-xs bg-white/20 px-1.5 py-0.2 font-mono text-[8px] font-bold tracking-normal">
            Maitre D&apos;
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode("form")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xs py-2 px-3 font-heading text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            mode === "form"
              ? "bg-[var(--dash-accent)] text-white shadow-xs"
              : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]"
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          <span>Direct Form</span>
        </button>
      </div>

      {mode === "chat" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="font-serif italic text-xs text-[var(--dash-text-muted)]">
              Interactive concierge conversation — Gemini will take down your dietary parameters and complex restrictions.
            </p>
          </div>
          <JoinEventChat eventId={eventId} eventName={eventName} hostName={hostName} />
        </div>
      ) : (
        <DietForm eventId={eventId} />
      )}
    </div>
  );
}

