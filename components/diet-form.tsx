"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChipEditor } from "@/components/chip-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ParsedRules } from "@/lib/types";

export function DietForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [email, setEmail] = useState("");
  const [rules, setRules] = useState<ParsedRules | null>(null);
  const [source, setSource] = useState<"gemini" | "mock" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function parse() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw }),
      });
      const data = (await res.json()) as { rules?: ParsedRules; source?: "gemini" | "mock"; error?: string };
      if (!res.ok || !data.rules) {
        throw new Error(data.error || "Could not parse that yet.");
      }
      setRules(data.rules);
      setSource(data.source ?? "mock");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!rules) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: raw,
          parsed_rules: rules,
          contact_email: email.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Submit failed.");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
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
      <div className="space-y-2">
        <Label htmlFor="diet">What do you eat?</Label>
        <Textarea
          id="diet"
          rows={6}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder="Example: Celiac, so no gluten. Dairy is fine. I prefer not-too-spicy food."
        />
        <p className="text-xs text-muted-foreground">
          Allergies, religion, vegan/vegetarian, and dislikes all belong here. We’ll turn this into chips you can edit.
        </p>
      </div>
      <Button type="button" onClick={parse} disabled={busy || !raw.trim()}>
        {busy && !rules ? "Reading that…" : "Parse into chips"}
      </Button>
      {source && (
        <p className="text-xs text-muted-foreground">
          Parsed with {source === "gemini" ? "Gemini" : "the local mock parser"}. Edit anything that’s wrong.
        </p>
      )}
      {rules && (
        <div className="space-y-6 rounded-xl border bg-card p-4">
          <ChipEditor rules={rules} onChange={setRules} />
          <div className="space-y-2">
            <Label htmlFor="email">Optional contact email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Only if the host should be able to follow up"
            />
            <p className="text-xs text-muted-foreground">
              Skip this unless you want a note when nothing on the menu works. Still no name field.
            </p>
          </div>
          <Button type="button" onClick={submit} disabled={busy}>
            {busy ? "Submitting…" : "Submit anonymously"}
          </Button>
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something didn’t go through</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
