import { NextResponse } from "next/server";
import { autocompleteAddress } from "@/backend/lib/placesDiscovery";

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("input")?.trim() ?? "";
  if (input.length < 2) {
    return NextResponse.json({ suggestions: [], enabled: true });
  }

  try {
    const { suggestions, enabled } = await autocompleteAddress(input);
    return NextResponse.json({ suggestions, enabled });
  } catch {
    return NextResponse.json({ suggestions: [], enabled: false });
  }
}
