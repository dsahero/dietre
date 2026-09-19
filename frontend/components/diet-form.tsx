"use client";

import { useActionState, useState } from "react";
import { parseDietAction, submitDietAction, type ParseState, type SubmitState } from "@/app/r/actions";
import { ChipEditor } from "@/frontend/components/chip-editor";
import { Alert, AlertDescription, AlertTitle } from "@/frontend/components/ui/alert";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import type { ParsedRules } from "@/shared/lib/types";

export function DietForm({ eventId }: { eventId: string }) {
  const [parsed, parseAction, parsing] = useActionState(parseDietAction, {} as ParseState);
  const [submitted, submitAction, submitting] = useActionState(submitDietAction, {} as SubmitState);

  if (submitted.ok) {
    return (
      <div className="rounded-xs border-2 border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] p-8 text-center shadow-xs">
        <span className="ink-stamp inline-block px-2.5 py-0.5 text-[9px] font-bold text-[var(--dash-accent)] border-[var(--dash-accent)] mb-3">
          Manifest Registered
        </span>
        <p className="font-heading text-2xl text-[var(--dash-text)] font-bold">You&apos;re in, anonymously.</p>
        <p className="mt-2 text-xs text-[var(--dash-text-muted)] font-serif italic max-w-sm mx-auto leading-relaxed">
          The host sees your dietary parameters and whether restaurants can safely accommodate you. Zero names attached.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form action={parseAction} method="post" className="space-y-4 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-6 shadow-2xs">
        <div className="space-y-2">
          <Label htmlFor="diet" className="font-heading text-sm font-bold text-[var(--dash-text)]">What can or can&apos;t you eat?</Label>
          <Textarea
            id="diet"
            name="diet"
            rows={5}
            defaultValue={parsed.raw}
            placeholder="Example: Celiac disease, so strictly zero gluten. Dairy and eggs are fine. Prefer lighter, fresh plates."
            className="font-serif text-sm rounded-xs border-[var(--dash-border)] bg-[var(--dash-surface)] focus:border-[var(--dash-accent)] text-[var(--dash-text)] shadow-2xs"
          />
          <p className="text-xs text-[var(--dash-text-muted)] font-serif italic">
            Food allergies, religious laws (halal/kosher), medical needs, and dislikes. We&apos;ll parse them into reviewable items.
          </p>
        </div>
        <Button type="submit" disabled={parsing} className="rounded-xs bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-deep)] text-white font-heading font-semibold text-xs tracking-wider uppercase px-5 py-2.5 cursor-pointer shadow-xs">
          {parsing ? "Analyzing ingredients…" : "Parse into dietary manifest"}
        </Button>
      </form>

      {parsed.source && parsed.rules ? (
        <p className="text-xs text-muted-foreground">
          Parsed with {parsed.source === "gemini" ? "Gemini" : "the local mock parser"}. Edit anything that’s wrong.
        </p>
      ) : null}

      {parsed.rules ? (
        <SubmitChips
          key={`${parsed.raw}-${parsed.rules.hard_excludes.join(",")}`}
          eventId={eventId}
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
  raw,
  initialRules,
  action,
  submitting,
}: {
  eventId: string;
  raw: string;
  initialRules: ParsedRules;
  action: (formData: FormData) => void;
  submitting: boolean;
}) {
  const [rules, setRules] = useState(initialRules);

  return (
    <form action={action} method="post" className="space-y-6 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-6 shadow-2xs">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="raw_text" value={raw} />
      <input type="hidden" name="hard_excludes" value={JSON.stringify(rules.hard_excludes)} />
      <input type="hidden" name="soft_preferences" value={JSON.stringify(rules.soft_preferences)} />
      <input type="hidden" name="severity" value={rules.severity} />
      <ChipEditor rules={rules} onChange={setRules} />
      <div className="space-y-2">
        <Label htmlFor="contact-email" className="font-heading text-sm font-semibold text-[var(--dash-text)]">Optional follow-up email</Label>
        <Input
          id="contact-email"
          name="contact_email"
          type="email"
          placeholder="Only if you wish to allow follow-up"
          className="font-serif text-sm rounded-xs border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text)] shadow-2xs"
        />
        <p className="text-xs text-[var(--dash-text-muted)] font-serif italic">
          Optional. Provided solely in case candidate caterers cannot guarantee your allergy safety.
        </p>
      </div>
      <Button type="submit" disabled={submitting} className="rounded-xs bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-deep)] text-white font-heading font-semibold text-xs tracking-wider uppercase px-5 py-2.5 cursor-pointer shadow-xs">
        {submitting ? "Registering manifest…" : "Submit anonymously to table"}
      </Button>
    </form>
  );
}
