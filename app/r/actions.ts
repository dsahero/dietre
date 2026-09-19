"use server";

import { parseDietaryWithGemini } from "@/lib/parser";
import { createResponse, getEvent } from "@/lib/db";
import type { ParsedRules, Severity } from "@/lib/types";

export type ParseState = {
  error?: string;
  rules?: ParsedRules;
  source?: "gemini" | "mock";
  raw?: string;
};

export type SubmitState = { error?: string; ok?: boolean };

function readRules(formData: FormData): ParsedRules | null {
  const hardRaw = String(formData.get("hard_excludes") ?? "");
  const softRaw = String(formData.get("soft_preferences") ?? "");
  let hard: string[] = [];
  let soft: string[] = [];
  try {
    hard = JSON.parse(hardRaw) as string[];
    soft = JSON.parse(softRaw) as string[];
  } catch {
    hard = hardRaw.split(",").map((item) => item.trim()).filter(Boolean);
    soft = softRaw.split(",").map((item) => item.trim()).filter(Boolean);
  }
  const severityRaw = String(formData.get("severity") ?? "low");
  const severity: Severity =
    severityRaw === "high" || severityRaw === "medium" ? severityRaw : "low";
  if (!Array.isArray(hard) || !Array.isArray(soft)) return null;
  return { hard_excludes: hard, soft_preferences: soft, severity };
}

export async function parseDietAction(_prev: ParseState, formData: FormData): Promise<ParseState> {
  const raw = String(formData.get("diet") ?? "").trim();
  if (!raw) {
    return { error: "Write a bit about what you eat." };
  }
  const result = await parseDietaryWithGemini(raw);
  return { rules: result.rules, source: result.source, raw };
}

export async function submitDietAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const eventId = String(formData.get("event_id") ?? "");
  const raw_text = String(formData.get("raw_text") ?? "").trim();
  const event = await getEvent(eventId);
  if (!event) return { error: "Event not found." };
  if (!raw_text) return { error: "Tell us what you eat before submitting." };

  const rules = readRules(formData);
  if (!rules) return { error: "Approve or edit your dietary chips first." };

  const contact = String(formData.get("contact_email") ?? "")
    .trim()
    .toLowerCase();
  if (contact && !contact.includes("@")) {
    return { error: "Contact email looks invalid." };
  }

  await createResponse({
    id: crypto.randomUUID(),
    event_id: event.id,
    raw_text,
    parsed_rules: rules,
    contact_email: contact || undefined,
    submitted_at: new Date().toISOString(),
  });
  return { ok: true };
}
