"use server";

import { parseDietaryWithGemini } from "@/backend/lib/parser";
import { createResponse, getEvent } from "@/backend/lib/db";
import type { ParsedRules, Severity } from "@/shared/lib/types";

export type ParseState = {
  error?: string;
  rules?: ParsedRules;
  source?: "gemini" | "mock";
  raw?: string;
  name?: string;
};

export type SubmitState = { error?: string; ok?: boolean; name?: string };

function readRules(formData: FormData): ParsedRules | null {
  const hardRaw = String(formData.get("hard_excludes") ?? "");
  const softRaw = String(formData.get("soft_preferences") ?? "");
  const complexRaw = String(formData.get("complex_restrictions") ?? "");
  let hard: string[] = [];
  let soft: string[] = [];
  let complex: string[] = [];
  try {
    hard = JSON.parse(hardRaw) as string[];
  } catch {
    hard = hardRaw.split(",").map((item) => item.trim()).filter(Boolean);
  }
  try {
    soft = JSON.parse(softRaw) as string[];
  } catch {
    soft = softRaw.split(",").map((item) => item.trim()).filter(Boolean);
  }
  try {
    complex = complexRaw ? (JSON.parse(complexRaw) as string[]) : [];
  } catch {
    complex = complexRaw.split(";").map((item) => item.trim()).filter(Boolean);
  }
  const severityRaw = String(formData.get("severity") ?? "low");
  const severity: Severity =
    severityRaw === "high" || severityRaw === "medium" ? severityRaw : "low";
  if (!Array.isArray(hard) || !Array.isArray(soft)) return null;
  return {
    hard_excludes: hard,
    complex_restrictions: Array.isArray(complex) ? complex : [],
    soft_preferences: soft,
    severity,
  };
}

export async function parseDietAction(_prev: ParseState, formData: FormData): Promise<ParseState> {
  const name = String(formData.get("name") ?? "").trim();
  const raw = String(formData.get("diet") ?? "").trim();
  if (!name) {
    return { error: "Please enter your name first.", raw };
  }
  if (!raw) {
    return { error: "Tell us about your dietary restrictions or preferences.", name };
  }
  const result = await parseDietaryWithGemini(raw);
  return { rules: result.rules, source: result.source, raw, name };
}

export async function submitDietAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const eventId = String(formData.get("event_id") ?? "");
  const guest_name = String(formData.get("guest_name") ?? "").trim();
  const raw_text = String(formData.get("raw_text") ?? "").trim();
  const event = await getEvent(eventId);
  if (!event) return { error: "Event not found." };
  if (!guest_name) return { error: "Please provide your name." };
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
    guest_name: guest_name || undefined,
    raw_text,
    parsed_rules: rules,
    contact_email: contact || undefined,
    submitted_at: new Date().toISOString(),
  });
  return { ok: true, name: guest_name };
}
