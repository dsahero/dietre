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
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/5 py-14 px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e]/15">
          <CheckCircle2 className="h-7 w-7 text-[#4ade80]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--dash-text)]">You&apos;re in!</h2>
        <p className="max-w-xs text-sm text-[var(--dash-text-muted)]">
          Your dietary preferences have been submitted anonymously. The host will use this to find a
          restaurant that works for everyone.
        </p>
        {pendingRules && pendingRules.hard_excludes.length > 0 && (
          <div className="mt-2 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-5 py-3 text-left text-xs text-[var(--dash-text-soft)] space-y-1 w-full max-w-xs">
            <p className="font-semibold text-[var(--dash-accent-soft)] mb-2">What we recorded:</p>
            <p>🚫 <span className="text-[var(--dash-text)]">{pendingRules.hard_excludes.join(", ")}</span></p>
            {pendingRules.soft_preferences.length > 0 && (
              <p>💭 <span className="text-[var(--dash-text)]">{pendingRules.soft_preferences.join(", ")}</span></p>
            )}
            <p>⚠️ Severity: <span className="text-[var(--dash-text)] capitalize">{pendingRules.severity}</span></p>
            {pendingEmail && <p>📧 <span className="text-[var(--dash-text)]">{pendingEmail}</span></p>}
          </div>
        )}
        {pendingRules && pendingRules.hard_excludes.length === 0 && (
          <div className="mt-2 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-5 py-3 text-xs text-[var(--dash-text-muted)]">
            ✅ No restrictions — easy one!
          </div>
        )}
        {submitError && (
          <p className="text-xs text-[#f87171]">{submitError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg)] overflow-hidden" style={{ minHeight: 420 }}>
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 480 }}>
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-32 text-[var(--dash-text-muted)] text-sm">
            Starting conversation…
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            <div
              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
                msg.role === "assistant"
                  ? "bg-gradient-to-br from-[var(--dash-accent-soft)] via-[var(--dash-accent)] to-[var(--dash-accent-deep)]"
                  : "bg-[var(--dash-surface-hover)] border border-[var(--dash-border-strong)]"
              }`}
            >
              {msg.role === "assistant" ? (
                <Bot className="w-3.5 h-3.5 text-white" />
              ) : (
                <User className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[80%] whitespace-pre-wrap ${
                msg.role === "assistant"
                  ? "bg-[var(--dash-surface-raised)] text-[var(--dash-text-soft)] rounded-tl-sm"
                  : "bg-[var(--dash-accent)] text-white rounded-tr-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 items-start">
            <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--dash-accent-soft)] via-[var(--dash-accent)] to-[var(--dash-accent-deep)] flex items-center justify-center mt-0.5">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-[var(--dash-surface-raised)] px-3.5 py-2.5">
              <Loader2 className="w-4 h-4 text-[var(--dash-accent)] animate-spin" />
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
          placeholder={loading ? "Thinking…" : "Type your message…"}
          disabled={loading}
          className="flex-1 rounded-xl bg-[var(--dash-surface-raised)] border border-[var(--dash-border)] px-4 py-2.5 text-sm text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:border-[var(--dash-accent)] transition-colors disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="shrink-0 w-10 h-10 rounded-xl bg-[var(--dash-accent)] text-white flex items-center justify-center transition-all hover:bg-[var(--dash-accent-soft)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

