"use client";

import { useEffect, useRef, useState } from "react";
import type { ParsedRules } from "@/shared/lib/types";
import { Send, Loader2, CheckCircle2 } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  text: string;
};

interface JoinEventChatProps {
  eventId: string;
  eventName: string;
  hostName: string;
}

export function JoinEventChat({ eventId }: JoinEventChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingRules, setPendingRules] = useState<ParsedRules | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | undefined>(undefined);
  const [pendingName, setPendingName] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

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
        reply?: string;
        error?: string;
        guestName?: string;
        parsedRules?: ParsedRules;
        contactEmail?: string;
        done?: boolean;
      };

      if (!res.ok || !data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.error ?? "Intake chat is unavailable right now. Please try again later.",
          },
        ]);
        return;
      }

      const assistantMsg: Message = { role: "assistant", text: data.reply };
      const updatedHistory = [...newHistory, assistantMsg];
      setMessages(updatedHistory);

      if (data.done && data.parsedRules) {
        setFinished(true);
        setPendingRules(data.parsedRules);
        setPendingEmail(data.contactEmail);
        if (data.guestName) setPendingName(data.guestName);
        await submitResponse(data.parsedRules, data.contactEmail, updatedHistory, data.guestName);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function submitResponse(
    rules: ParsedRules,
    contactEmail: string | undefined,
    history: Message[],
    guestName?: string
  ) {
    if (saving) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const rawSummary = history
        .filter((m) => m.text && m.text !== "__START__")
        .map((m) => `${m.role === "assistant" ? "Gemini" : "Guest"}: ${m.text}`)
        .join("\n\n");

      const res = await fetch("/api/joinevent/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          guestName: guestName || pendingName,
          parsedRules: rules,
          contactEmail,
          rawSummary,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setSubmitError(data.error ?? "Couldn't save your response. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setSubmitError("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function retrySubmit() {
    if (!pendingRules) return;
    void submitResponse(pendingRules, pendingEmail, messages, pendingName);
  }

  function handleSend() {
    const text = input.trim();
    if (!text || loading || finished) return;
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
      <div className="paper-grain rounded-xs border-2 border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-7 py-10 text-center shadow-[0_4px_12px_rgba(25,12,6,0.08)]">
        <CheckCircle2 className="mx-auto mb-4 h-8 w-8 text-[var(--dash-accent)]" />
        <h2 className="font-heading text-2xl text-[var(--dash-text)]">
          {pendingName ? `Thank you, ${pendingName}` : "You're all set"}
        </h2>
        <p className="mx-auto mt-2 max-w-sm font-serif text-sm leading-relaxed text-[var(--dash-text-muted)]">
          Your dietary notes are with the host. They&apos;ll use them to choose a restaurant that
          works for the table.
        </p>
        {pendingRules &&
          (pendingRules.hard_excludes.length > 0 ||
            (pendingRules.complex_restrictions && pendingRules.complex_restrictions.length > 0) ||
            pendingRules.soft_preferences.length > 0) && (
            <div className="mx-auto mt-6 max-w-sm border-t border-[var(--dash-border)] pt-5 text-left">
              {pendingRules.hard_excludes.length > 0 && (
                <p className="font-serif text-sm text-[var(--dash-text-soft)]">
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[var(--dash-accent)]">
                    Must avoid
                  </span>
                  <br />
                  {pendingRules.hard_excludes.join(", ")}
                </p>
              )}
              {pendingRules.complex_restrictions && pendingRules.complex_restrictions.length > 0 && (
                <p className="mt-3 font-serif text-sm text-[var(--dash-text-soft)]">
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[var(--dash-accent)]">
                    Prep notes
                  </span>
                  <br />
                  {pendingRules.complex_restrictions.join("; ")}
                </p>
              )}
              {pendingRules.soft_preferences.length > 0 && (
                <p className="mt-3 font-serif text-sm text-[var(--dash-text-soft)]">
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[var(--dash-accent)]">
                    Prefer
                  </span>
                  <br />
                  {pendingRules.soft_preferences.join(", ")}
                </p>
              )}
              {pendingEmail && (
                <p className="mt-3 font-serif text-sm text-[var(--dash-text-muted)]">{pendingEmail}</p>
              )}
            </div>
          )}
        {submitError && <p className="mt-4 text-xs text-[#b45309]">{submitError}</p>}
      </div>
    );
  }

  const firstAssistantIndex = messages.findIndex((m) => m.role === "assistant");

  return (
    <div className="flex flex-col">
      <div className="space-y-6 px-1 py-2">
        {messages.length === 0 && !loading && (
          <p className="font-serif italic text-sm text-[var(--dash-text-muted)]">Starting…</p>
        )}

        {messages.map((msg, i) =>
          msg.role === "assistant" ? (
            <div key={i} className="max-w-[36rem]">
              {i === firstAssistantIndex && (
                <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--dash-accent)]">
                  Concierge
                </p>
              )}
              <p className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-[var(--dash-text)]">
                {msg.text}
              </p>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%]">
                <p className="mb-1.5 text-right font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--dash-text-muted)]">
                  You
                </p>
                <p className="whitespace-pre-wrap rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-4 py-2.5 text-right font-serif text-[15px] leading-relaxed text-[var(--dash-text)]">
                  {msg.text}
                </p>
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex items-center gap-2 text-[var(--dash-text-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--dash-accent)]" />
            <span className="font-serif italic text-sm">Writing…</span>
          </div>
        )}

        {finished && saving && (
          <div className="flex items-center gap-2 text-[var(--dash-text-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--dash-accent)]" />
            <span className="font-serif italic text-sm">Saving your answers…</span>
          </div>
        )}

        {finished && submitError && (
          <div className="rounded-xs border border-[#ef4444]/40 bg-[#ef4444]/10 p-3 text-sm text-[#b91c1c]">
            <p>{submitError}</p>
            <button
              type="button"
              onClick={retrySubmit}
              disabled={saving}
              className="mt-2 cursor-pointer rounded-xs bg-[var(--dash-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Try saving again
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="mt-6 flex items-end gap-2 border-t border-[var(--dash-border)] pt-4">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "One moment…" : "Your reply…"}
          disabled={loading || finished}
          className="min-w-0 flex-1 border-0 border-b border-[var(--dash-border-strong)] bg-transparent px-0 py-2.5 font-serif text-[15px] text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--dash-accent)] focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || finished || !input.trim()}
          className="mb-0.5 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xs bg-[var(--dash-accent)] text-white transition-colors hover:bg-[var(--dash-accent-deep)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
