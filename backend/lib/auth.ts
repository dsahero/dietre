import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { HostSession } from "@/shared/lib/types";

export const SESSION_COOKIE = "dietre_session";

function secret(): string {
  return process.env.AUTH_SECRET || "dietre-dev-secret-do-not-use-in-prod";
}

export function hostIdFromEmail(email: string): string {
  return `host_${createHmac("sha256", secret()).update(email.trim().toLowerCase()).digest("hex").slice(0, 16)}`;
}

export function signSession(session: HostSession): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readSessionToken(token: string | undefined | null): HostSession | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as HostSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<HostSession | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  };
}

export function decodeFirebaseJwt(token: string): { uid: string; email?: string; name?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      user_id?: string;
      sub?: string;
      email?: string;
      name?: string;
    };
    const uid = payload.user_id || payload.sub;
    if (!uid) return null;
    return { uid, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}
