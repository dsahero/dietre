import { NextResponse } from "next/server";
import { createResponse, getEvent } from "@/lib/db";
import type { ParsedRules } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const event = await getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    raw_text?: string;
    parsed_rules?: ParsedRules;
    contact_email?: string;
  };

  const raw_text = body.raw_text?.trim();
  if (!raw_text) {
    return NextResponse.json({ error: "Tell us what you eat before submitting." }, { status: 400 });
  }

  const rules = body.parsed_rules;
  if (!rules || !Array.isArray(rules.hard_excludes) || !Array.isArray(rules.soft_preferences)) {
    return NextResponse.json({ error: "Approve or edit your dietary chips first." }, { status: 400 });
  }

  const contact = body.contact_email?.trim().toLowerCase();
  if (contact && !contact.includes("@")) {
    return NextResponse.json({ error: "Contact email looks invalid." }, { status: 400 });
  }

  const response = await createResponse({
    id: crypto.randomUUID(),
    event_id: event.id,
    raw_text,
    parsed_rules: {
      hard_excludes: rules.hard_excludes.map((item) => item.trim()).filter(Boolean),
      soft_preferences: rules.soft_preferences.map((item) => item.trim()).filter(Boolean),
      severity: rules.severity === "high" || rules.severity === "medium" ? rules.severity : "low",
    },
    contact_email: contact || undefined,
    submitted_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id: response.id }, { status: 201 });
}
