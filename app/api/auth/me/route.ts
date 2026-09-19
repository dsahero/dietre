import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runtimeMode } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  return NextResponse.json(
    { host: session, mode: runtimeMode() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
