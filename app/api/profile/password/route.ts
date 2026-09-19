import { NextResponse } from "next/server";
import { getSession, hashPassword, verifyPassword } from "@/backend/lib/auth";
import { getHost, updateHost } from "@/backend/lib/db";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (session.provider !== "mock") {
    return NextResponse.json(
      { error: "Password is managed by your Google/Firebase sign-in, not here." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
  const host = await getHost(session.host_id);
  if (!host || !verifyPassword(body.currentPassword ?? "", host.password_hash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }
  if (!body.newPassword || body.newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
  }

  await updateHost(session.host_id, { password_hash: hashPassword(body.newPassword) });
  return NextResponse.json({ ok: true });
}
