import { NextRequest, NextResponse } from "next/server";
import { createResponse, getEvent } from "@/backend/lib/db";
import {
  promoteHardConstraints,
  stripConflictingPreferences,
} from "@/backend/lib/conciergeIntake";
import type { ParsedRules } from "@/shared/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventId: string;
      guestName?: string;
      parsedRules: ParsedRules;
      contactEmail?: string;
      rawSummary?: string;
    };

    const { eventId, guestName, parsedRules, contactEmail, rawSummary } = body;

    if (!eventId || !parsedRules) {
      return NextResponse.json({ error: "Missing eventId or parsedRules" }, { status: 400 });
    }

    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const contact = contactEmail?.trim().toLowerCase();
    if (contact && !contact.includes("@")) {
      return NextResponse.json({ error: "Invalid contact email" }, { status: 400 });
    }

    const userTexts = (rawSummary ?? "")
      .split(/\s*\|\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    const rules = stripConflictingPreferences(
      promoteHardConstraints(parsedRules, userTexts)
    );

    await createResponse({
      id: crypto.randomUUID(),
      event_id: eventId,
      guest_name: guestName?.trim() || undefined,
      raw_text: rawSummary ?? "Submitted via Concierge",
      parsed_rules: rules,
      contact_email: contact || undefined,
      submitted_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("joinevent submit error:", err);
    return NextResponse.json(
      { error: "Couldn't save your response right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}

