"use client";

import { useEffect, useRef, useState } from "react";
import type { ParsedRules } from "@/shared/lib/types";
import { Send, Bot, User, Loader2, CheckCircle2, UtensilsCrossed } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  text: string;
};

interface JoinEventChatProps {
  eventId: string;
  eventName: string;
  hostName: string;
}

export function JoinEventChat({ eventId, eventName, hostName }: JoinEventChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingRules, setPendingRules] = useState<ParsedRules | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  // Kick off the conversation on mount
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void sendMessage("__START__", []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(userText: string, currentHistory: Message[]) {
    setLoading(true);

    const newHistory: Message[] =
      userText === "__START__"
        ? currentHistory
        : [...currentHistory, { role: "user", text: userText }];

    if (userText !== "__START__") {
      setMessages(newHistory);
    }

    try {
      const res = await fetch("/api/joinevent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          history: currentHistory,
          userMessage: userText === "__START__" ? "hello" : userText,
        }),
      });

      const data = (await res.json()) as {
        reply: string;
        parsedRules?: ParsedRules;
        contactEmail?: string;
        done?: boolean;
      };

      const assistantMsg: Message = { role: "assistant", text: data.reply };
      const updatedHistory = [...newHistory, assistantMsg];
      setMessages(updatedHistory);

      if (data.done && data.parsedRules) {
        setPendingRules(data.parsedRules);
        setPendingEmail(data.contactEmail);
        // Auto-submit
        await submitResponse(data.parsedRules, data.contactEmail, updatedHistory);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, something went wrong. Please try again!" },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function submitResponse(
    rules: ParsedRules,
    contactEmail: string | undefined,
    history: Message[]
  ) {
    try {
      const rawSummary = history
        .filter((m) => m.role === "user")
        .map((m) => m.text)
        .join(" | ");

      const res = await fetch("/api/joinevent/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          parsedRules: rules,
          contactEmail,
          rawSummary,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) {
        setSubmitError(data.error ?? "Failed to save your response.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setSubmitError("Network error — please refresh and try again.");
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    void sendMessage(text, messages);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-sm border border-[#22c55e]/20 bg-[#22c55e]/5 py-14 px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e]/15">
          <CheckCircle2 className="h-7 w-7 text-[#4ade80]" />
        </div>
        <h2 className="font-heading text-xl text-[var(--dash-text)]">On the manifest</h2>
        <p className="max-w-xs text-sm text-[var(--dash-text-muted)]">
          Your response was submitted anonymously. The host will use it to select a restaurant that
          works for the table.
        </p>
        {pendingRules && pendingRules.hard_excludes.length > 0 && (
          <div className="tilt-slight mt-2 w-full max-w-xs rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-5 py-4 text-left font-mono text-[11px] text-[var(--dash-text-soft)]">
            <p className="mb-2 border-b border-dashed border-[var(--dash-border)] pb-1.5 uppercase tracking-wider text-[var(--dash-accent-soft)]">
              Anonymous guest manifest
            </p>
            <p className="uppercase">
              Hard excludes: <span className="text-[var(--dash-text)]">{pendingRules.hard_excludes.join(", ")}</span>
            </p>
            {pendingRules.soft_preferences.length > 0 && (
              <p className="mt-1 uppercase">
                Soft likes: <span className="text-[var(--dash-text)]">{pendingRules.soft_preferences.join(", ")}</span>
              </p>
            )}
            <p className="mt-1 uppercase">
              Severity: <span className="text-[var(--dash-text)]">{pendingRules.severity}</span>
            </p>
            {pendingEmail && (
              <p className="mt-1 uppercase">
                Contact: <span className="text-[var(--dash-text)] lowercase">{pendingEmail}</span>
              </p>
            )}
          </div>
        )}
        {pendingRules && pendingRules.hard_excludes.length === 0 && (
          <div className="tilt-slight mt-2 w-full max-w-xs rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--dash-text-muted)]">
            No restrictions on file
          </div>
        )}
        {submitError && (
          <p className="text-xs text-[#f87171]">{submitError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] shadow-xs overflow-hidden" style={{ minHeight: 440 }}>
      {/* Ledger header */}
      <div className="px-4 py-2.5 bg-[var(--dash-surface)] border-b border-[var(--dash-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-xs bg-[var(--dash-accent)] animate-pulse" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--dash-text-muted)]">
            Banquet Intake Ledger
          </span>
        </div>
        <span className="ink-stamp px-1.5 py-0.2 text-[8.5px] font-bold text-[var(--dash-accent-soft)]">
          Live Session
        </span>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4" style={{ maxHeight: 480 }}>
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-32 font-serif italic text-[var(--dash-text-muted)] text-sm">
            Opening banquet intake conversation…
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar Stamp */}
            <div
              className={`shrink-0 flex items-center justify-center font-mono text-[9px] font-bold uppercase rounded-sm px-1.5 py-1 mt-0.5 border ${
                msg.role === "assistant"
                  ? "bg-[var(--dash-surface)] border-[var(--dash-border-strong)] text-[var(--dash-accent)] shadow-2xs"
                  : "bg-[var(--dash-accent)] border-[var(--dash-accent-deep)] text-white shadow-2xs"
              }`}
            >
              {msg.role === "assistant" ? "CONCIERGE" : "YOU"}
            </div>

            {/* Note Slip */}
            <div
              className={`rounded-sm px-4 py-3 text-[14px] leading-relaxed max-w-[82%] whitespace-pre-wrap font-serif shadow-2xs ${
                msg.role === "assistant"
                  ? "bg-[var(--dash-surface)] text-[var(--dash-text)] border border-[var(--dash-border)] border-l-3 border-l-[var(--dash-accent)]"
                  : "bg-[var(--dash-accent)] text-white border border-[var(--dash-accent-deep)]"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 items-start">
            <div className="shrink-0 flex items-center justify-center font-mono text-[9px] font-bold uppercase rounded-sm px-1.5 py-1 bg-[var(--dash-surface)] border border-[var(--dash-border-strong)] text-[var(--dash-accent)] shadow-2xs mt-0.5">
              CONCIERGE
            </div>
            <div className="rounded-sm bg-[var(--dash-surface)] border border-[var(--dash-border)] border-l-3 border-l-[var(--dash-accent)] px-4 py-3 shadow-2xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-[var(--dash-accent)] animate-spin" />
              <span className="font-serif italic text-xs text-[var(--dash-text-muted)]">Taking dietary notes…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-[var(--dash-border)] p-3 flex gap-2 bg-[var(--dash-surface)]">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "Recording dietary notes…" : "Type your dietary reply here…"}
          disabled={loading}
          className="flex-1 rounded-sm bg-[var(--dash-surface-raised)] border border-[var(--dash-border)] px-4 py-2.5 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] font-serif focus:outline-none focus:border-[var(--dash-accent)] transition-colors disabled:opacity-50 shadow-2xs"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="shrink-0 px-4 h-10 rounded-sm bg-[var(--dash-accent)] text-white font-heading font-semibold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-all hover:bg-[var(--dash-accent-deep)] active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          aria-label="Send message"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

