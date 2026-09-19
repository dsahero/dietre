import { NextRequest, NextResponse } from "next/server";
import { createResponse, getEvent } from "@/backend/lib/db";
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

    await createResponse({
      id: crypto.randomUUID(),
      event_id: eventId,
      guest_name: guestName?.trim() || undefined,
      raw_text: rawSummary ?? "Submitted via chatbot",
      parsed_rules: parsedRules,
      contact_email: contact || undefined,
      submitted_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("joinevent submit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

