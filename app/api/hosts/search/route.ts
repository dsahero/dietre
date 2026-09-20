import { NextResponse } from "next/server";
import { getSession } from "@/backend/lib/auth";
import { searchHostsByEmailPrefix } from "@/backend/lib/db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    const results = await searchHostsByEmailPrefix(q, 5);
    const own = session.email.trim().toLowerCase();
    return NextResponse.json({ suggestions: results.filter((r) => r.email.toLowerCase() !== own) });
  } catch (err) {
    console.error("host search failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ suggestions: [] });
  }
}
