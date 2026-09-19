"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { XIcon } from "lucide-react";
import type { ParsedRules, Severity } from "@/shared/lib/types";

export function ChipEditor({
  rules,
  onChange,
}: {
  rules: ParsedRules;
  onChange: (next: ParsedRules) => void;
}) {
  const [hardDraft, setHardDraft] = useState("");
  const [softDraft, setSoftDraft] = useState("");

  function addChip(kind: "hard_excludes" | "soft_preferences", value: string) {
    const token = value.trim().toLowerCase();
    if (!token) return;
    const next = Array.from(new Set([...rules[kind], token]));
    onChange({ ...rules, [kind]: next });
  }

  function removeChip(kind: "hard_excludes" | "soft_preferences", token: string) {
    onChange({ ...rules, [kind]: rules[kind].filter((item) => item !== token) });
  }

  return (
    <div className="space-y-5">
      <ChipGroup
        label="Hard excludes"
        hint="Allergens, religious bans, and foods that must not appear."
        tokens={rules.hard_excludes}
        draft={hardDraft}
        setDraft={setHardDraft}
        variant="hard"
        onAdd={(value) => {
          addChip("hard_excludes", value);
          setHardDraft("");
        }}
        onRemove={(token) => removeChip("hard_excludes", token)}
      />
      <ChipGroup
        label="Soft preferences"
        hint="Nice-to-haves. These never block a restaurant on their own."
        tokens={rules.soft_preferences}
        draft={softDraft}
        setDraft={setSoftDraft}
        variant="soft"
        onAdd={(value) => {
          addChip("soft_preferences", value);
          setSoftDraft("");
        }}
        onRemove={(token) => removeChip("soft_preferences", token)}
      />
      <div className="space-y-2">
        <p className="text-sm font-medium">How strict is this?</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["high", "Medical / allergy"],
              ["medium", "Religious / ethical"],
              ["low", "Taste only"],
            ] as [Severity, string][]
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={rules.severity === value ? "default" : "outline"}
              onClick={() => onChange({ ...rules, severity: value })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChipGroup({
  label,
  hint,
  tokens,
  draft,
  setDraft,
  variant,
  onAdd,
  onRemove,
}: {
  label: string;
  hint: string;
  tokens: string[];
  draft: string;
  setDraft: (value: string) => void;
  variant: "hard" | "soft";
  onAdd: (value: string) => void;
  onRemove: (token: string) => void;
}) {
  const empty = useMemo(() => tokens.length === 0, [tokens]);
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex min-h-11 flex-wrap gap-1.5 rounded-lg border bg-card p-2">
        {empty && <span className="px-1 text-sm text-muted-foreground">None yet</span>}
        {tokens.map((token) => (
          <Badge
            key={token}
            variant={variant === "hard" ? "destructive" : "secondary"}
            className="gap-1 pr-1"
          >
            {token}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-black/10"
              onClick={() => onRemove(token)}
              aria-label={`Remove ${token}`}
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd(draft);
            }
          }}
          placeholder={variant === "hard" ? "Add an exclude, e.g. sesame" : "Add a preference, e.g. spicy"}
        />
        <Button type="button" variant="outline" onClick={() => onAdd(draft)}>
          Add
        </Button>
      </div>
    </div>
  );
}
