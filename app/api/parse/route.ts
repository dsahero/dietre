import { NextResponse } from "next/server";
import { parseDietaryWithGemini } from "@/backend/lib/parser";

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string };
  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Write a bit about what you eat." }, { status: 400 });
  }
  const result = await parseDietaryWithGemini(text);
  return NextResponse.json(result);
}
