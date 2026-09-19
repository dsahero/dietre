import { NextResponse } from "next/server";
import { getSession } from "@/backend/lib/auth";
import { autocompletePlaces, hasPlacesApiKey } from "@/backend/lib/placesDiscovery";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to search for a location." }, { status: 401 });
  }

  const input = new URL(request.url).searchParams.get("input")?.trim() ?? "";
  if (input.length < 2) {
    return NextResponse.json({ suggestions: [], enabled: true });
  }
  if (!hasPlacesApiKey()) {
    return NextResponse.json({ suggestions: [], enabled: false });
  }

  const suggestions = await autocompletePlaces(input);
  return NextResponse.json({ suggestions, enabled: true });
  try {
    const suggestions = await autocompletePlaces(input);
    return NextResponse.json({ suggestions, enabled: true });
  } catch {
    return NextResponse.json({ suggestions: [], enabled: false });
  }
}
