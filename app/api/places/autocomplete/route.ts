import { NextResponse } from "next/server";
import { autocompletePlaces, hasPlacesApiKey } from "@/backend/lib/placesDiscovery";

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("input")?.trim() ?? "";
  if (input.length < 2) {
    return NextResponse.json({ suggestions: [], enabled: true });
  }
  if (!hasPlacesApiKey()) {
    return NextResponse.json({ suggestions: [], enabled: false });
  }

  try {
    const suggestions = await autocompletePlaces(input);
    return NextResponse.json({ suggestions, enabled: true });
  } catch {
    return NextResponse.json({ suggestions: [], enabled: false });
  }
}
