"use client";

import { useActionState, useState } from "react";
import { parseDietAction, submitDietAction, type ParseState, type SubmitState } from "@/app/r/actions";
import { ChipEditor } from "@/frontend/components/chip-editor";
import { Alert, AlertDescription, AlertTitle } from "@/frontend/components/ui/alert";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Bot, User, Send, Loader2, CheckCircle2 } from "lucide-react";
import type { ParsedRules } from "@/shared/lib/types";

export function DietForm({ eventId }: { eventId: string }) {
  const [parsed, parseAction, parsing] = useActionState(parseDietAction, {} as ParseState);
  const [submitted, submitAction, submitting] = useActionState(submitDietAction, {} as SubmitState);

  if (submitted.ok) {
    return (
      <div className="paper-grain tilt-slight rounded-xs border-2 border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] p-8 text-center shadow-[0_4px_16px_rgba(25,12,6,0.12)]">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#22c55e]/40 bg-[#22c55e]/10">
          <CheckCircle2 className="h-6 w-6 text-[#22c55e]" />
        </div>
        <span className="ink-stamp inline-block px-2.5 py-0.5 text-[9px] font-bold text-[var(--dash-accent)] border-[var(--dash-accent)] mb-3">
          Registered
        </span>
        <p className="font-heading text-2xl text-[var(--dash-text)] font-bold">
          You&apos;re registered, {submitted.name || "thank you"}!
        </p>
        <p className="mt-2 text-xs text-[var(--dash-text-muted)] font-serif italic max-w-sm mx-auto leading-relaxed">
          Your dietary parameters have been saved for this event. The host will use them to select a restaurant that accommodates everyone safely.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form action={parseAction} className="paper-grain tilt-left space-y-4 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-6 shadow-[0_2px_10px_rgba(25,12,6,0.08)]">
        {/* Ask name first */}
        <div className="space-y-2">
          <Label htmlFor="name" className="font-heading text-sm font-bold text-[var(--dash-text)]">
            Your Name
          </Label>
          <Input
            id="name"
            name="name"
            defaultValue={parsed.name}
            placeholder="e.g. Josh, Sarah, Jordan..."
            required
            className="font-serif text-sm rounded-xs border-[var(--dash-border)] bg-[var(--dash-surface)] focus:border-[var(--dash-accent)] text-[var(--dash-text)] shadow-2xs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="diet" className="font-heading text-sm font-bold text-[var(--dash-text)]">
            What can or can&apos;t you eat?
          </Label>
          <Textarea
            id="diet"
            name="diet"
            rows={5}
            defaultValue={parsed.raw}
            placeholder="Example: I can only eat dairy and meat separately. No shellfish. Dairy and eggs are fine separately."
            className="font-serif text-sm rounded-xs border-[var(--dash-border)] bg-[var(--dash-surface)] focus:border-[var(--dash-accent)] text-[var(--dash-text)] shadow-2xs"
          />
          <p className="text-xs text-[var(--dash-text-muted)] font-serif italic">
            Food allergies, religious observances (halal/kosher), medical needs, and dislikes. We&apos;ll parse them into reviewable items for your approval.
          </p>
        </div>

        <Button type="submit" disabled={parsing} className="rounded-xs bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-deep)] text-white font-heading font-semibold text-xs tracking-wider uppercase px-5 py-2.5 cursor-pointer shadow-xs">
          {parsing ? "Analyzing parameters…" : "Review & Approve Restrictions"}
        </Button>
      </form>

      {parsed.source && parsed.rules ? (
        <p className="text-xs text-muted-foreground">
          Parsed with {parsed.source === "gemini" ? "Gemini" : "the local mock parser"}. Review and edit any items below before final submission.
        </p>
      ) : null}

      {parsed.rules ? (
        <SubmitChips
          key={`${parsed.name}-${parsed.raw}-${parsed.rules.hard_excludes.join(",")}`}
          eventId={eventId}
          initialName={parsed.name ?? ""}
          raw={parsed.raw ?? ""}
          initialRules={parsed.rules}
          action={submitAction}
          submitting={submitting}
        />
      ) : null}

      {(parsed.error || submitted.error) && (
        <Alert variant="destructive">
          <AlertTitle>Something didn’t go through</AlertTitle>
          <AlertDescription>{parsed.error || submitted.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function SubmitChips({
  eventId,
  initialName,
  raw,
  initialRules,
  action,
  submitting,
}: {
  eventId: string;
  initialName: string;
  raw: string;
  initialRules: ParsedRules;
  action: (formData: FormData) => void;
  submitting: boolean;
}) {
  const [guestName, setGuestName] = useState(initialName);
  const [rules, setRules] = useState(initialRules);

  return (
    <form action={action} className="paper-grain tilt-right space-y-5 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-6 shadow-[0_2px_10px_rgba(25,12,6,0.08)]">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="raw_text" value={raw} />
      <input type="hidden" name="hard_excludes" value={JSON.stringify(rules.hard_excludes)} />
      <input type="hidden" name="complex_restrictions" value={JSON.stringify(rules.complex_restrictions ?? [])} />
      <input type="hidden" name="soft_preferences" value={JSON.stringify(rules.soft_preferences)} />
      <input type="hidden" name="severity" value={rules.severity} />

      <div className="border-b border-[var(--dash-border)] pb-3 flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base font-bold text-[var(--dash-text)]">
            Is this right? (Participant Review & Approval)
          </h3>
          <p className="font-serif text-xs text-[var(--dash-text-muted)] mt-0.5">
            Verify your details below. You can also chat directly with the concierge chatbot below to clarify compound rules.
          </p>
        </div>
        <span className="ink-stamp px-2 py-0.5 text-[8.5px] font-bold text-[var(--dash-accent)]">
          Approval Step
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest_name" className="font-heading text-sm font-semibold text-[var(--dash-text)]">
          Your Name
        </Label>
        <Input
          id="guest_name"
          name="guest_name"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          required
          placeholder="Your full name"
          className="font-serif text-sm rounded-xs border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text)] shadow-2xs"
        />
      </div>

      <hr className="deckle-divider" />

      {/* Follow-up Chatbot Section in the Approval stage */}
      <ApprovalChatbotSection
        eventId={eventId}
        guestName={guestName}
        rules={rules}
        onUpdateRules={setRules}
      />

      <hr className="deckle-divider" />

      <ChipEditor rules={rules} onChange={setRules} />

      <div className="space-y-2">
        <Label htmlFor="contact-email" className="font-heading text-sm font-semibold text-[var(--dash-text)]">
          Optional follow-up email
        </Label>
        <Input
          id="contact-email"
          name="contact_email"
          type="email"
          placeholder="For host or venue follow-up"
          className="font-serif text-sm rounded-xs border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text)] shadow-2xs"
        />
        <p className="text-xs text-[var(--dash-text-muted)] font-serif italic">
          Optional. Provided solely in case candidate caterers have questions about your restrictions.
        </p>
      </div>

      <Button type="submit" disabled={submitting} className="rounded-xs bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-deep)] text-white font-heading font-semibold text-xs tracking-wider uppercase px-5 py-2.5 cursor-pointer shadow-xs">
        {submitting ? "Saving restrictions…" : "Approve & Submit Restrictions"}
      </Button>
    </form>
  );
}

function ApprovalChatbotSection({
  eventId,
  guestName,
  rules,
  onUpdateRules,
}: {
  eventId: string;
  guestName: string;
  rules: ParsedRules;
  onUpdateRules: (newRules: ParsedRules) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>([
    {
      role: "assistant",
      text: `Hello ${guestName || "there"}! I've converted your response into the parameters below. If you want to clarify any compound rules (e.g. keeping meat and dairy separate), ask about kitchen prep, or adjust constraints, tell me here and I'll update your chips in real time.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const newHistory = [...messages, { role: "user" as const, text }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/joinevent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          history: newHistory,
          userMessage: text,
          mode: "clarify",
          currentRules: rules,
          guestName,
        }),
      });
      const data = (await res.json()) as { reply: string; parsedRules?: ParsedRules };
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      if (data.parsedRules) {
        onUpdateRules(data.parsedRules);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "I had trouble updating that. You can edit the chips directly below!" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-[var(--dash-border)] pb-2.5">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-[var(--dash-accent)]" />
          <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--dash-text)]">
            Concierge Chatbot Assistant
          </h4>
          <span className="ink-stamp px-1.5 py-0.2 text-[8.5px] font-bold text-[var(--dash-accent)]">
            AI Helper
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="font-mono text-[10.5px] text-[var(--dash-accent)] hover:underline cursor-pointer"
        >
          {isOpen ? "Hide Chat" : "Open Chat"}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-3">
          <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1 font-serif text-xs leading-relaxed">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-xs ${
                    m.role === "assistant"
                      ? "bg-[var(--dash-accent)] text-white"
                      : "border border-[var(--dash-border-strong)] bg-[var(--dash-surface-hover)] text-[var(--dash-accent)]"
                  }`}
                >
                  {m.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </span>
                <div
                  className={`max-w-[85%] rounded-xs p-2.5 ${
                    m.role === "assistant"
                      ? "border border-[var(--dash-border)] border-l-2 border-l-[var(--dash-accent)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]"
                      : "bg-[var(--dash-accent)] text-white"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 p-2 text-xs italic text-[var(--dash-text-muted)] font-serif">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--dash-accent)]" />
                <span>Maitre d&apos; is updating your parameters…</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="e.g. I can eat meat and dairy separately, don't mix them"
              disabled={loading}
              className="flex-1 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-3 py-1.5 text-xs text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] font-serif focus:border-[var(--dash-accent)] focus:outline-none shadow-2xs"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={loading || !input.trim()}
              className="flex items-center gap-1 rounded-xs bg-[var(--dash-accent)] px-3 py-1.5 font-heading text-xs font-bold uppercase tracking-wider text-white hover:bg-[var(--dash-accent-deep)] disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <span>Ask</span>
              <Send className="h-3 w-3" />
            </button>
          </div>
          <p className="font-mono text-[9.5px] text-[var(--dash-text-muted)] italic">
            Tips: Type complex rules like &ldquo;separate meat and dairy&rdquo; or &ldquo;dedicated fryer&rdquo; to update your chips below.
          </p>
        </div>
      )}
    </div>
  );
}
