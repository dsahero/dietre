"use client";

import { useActionState, useState } from "react";
import { parseDietAction, submitDietAction, type ParseState, type SubmitState } from "@/app/r/actions";
import { ChipEditor } from "@/components/chip-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ParsedRules } from "@/lib/types";

export function DietForm({ eventId }: { eventId: string }) {
  const [parsed, parseAction, parsing] = useActionState(parseDietAction, {} as ParseState);
  const [submitted, submitAction, submitting] = useActionState(submitDietAction, {} as SubmitState);

  if (submitted.ok) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="font-heading text-2xl">You’re in, anonymously.</p>
        <p className="mt-2 text-muted-foreground">
          The host sees your rules and whether restaurants can cover you. Not your name — there isn’t one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form action={parseAction} method="post" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="diet">What do you eat?</Label>
          <Textarea
            id="diet"
            name="diet"
            rows={6}
            defaultValue={parsed.raw}
            placeholder="Example: Celiac, so no gluten. Dairy is fine. I prefer not-too-spicy food."
          />
          <p className="text-xs text-muted-foreground">
            Allergies, religion, vegan/vegetarian, and dislikes all belong here. We’ll turn this into chips you can edit.
          </p>
        </div>
        <Button type="submit" disabled={parsing}>
          {parsing ? "Reading that…" : "Parse into chips"}
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
    <form action={action} method="post" className="space-y-6 rounded-xl border bg-card p-4">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="raw_text" value={raw} />
      <input type="hidden" name="hard_excludes" value={JSON.stringify(rules.hard_excludes)} />
      <input type="hidden" name="soft_preferences" value={JSON.stringify(rules.soft_preferences)} />
      <input type="hidden" name="severity" value={rules.severity} />
      <ChipEditor rules={rules} onChange={setRules} />
      <div className="space-y-2">
        <Label htmlFor="contact-email">Optional contact email</Label>
        <Input
          id="contact-email"
          name="contact_email"
          type="email"
          placeholder="Only if the host should be able to follow up"
        />
        <p className="text-xs text-muted-foreground">
          Skip this unless you want a note when nothing on the menu works. Still no name field.
        </p>
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit anonymously"}
      </Button>
    </form>
  );
}
