import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
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

// Password storage for provider "mock" hosts — scrypt with a random salt,
// stored as "salt:hash" hex. Firebase hosts never have a password_hash;
// Firebase is their credential store.
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function decodeFirebaseJwt(token: string): { uid: string; email?: string; name?: string } | null {
  // Kept synchronous because /api/auth/login calls this inline. Signature
  // verification needs a network round-trip (Google certs / accounts:lookup),
  // so this checks payload shape, expiry, and audience when the Firebase
  // project id is configured. Firebase UID is the organizers/{uid} doc id.
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      user_id?: string;
      sub?: string;
      email?: string;
      name?: string;
      exp?: number;
      aud?: string;
      iss?: string;
    };
    const uid = payload.user_id || payload.sub;
    if (!uid) return null;
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now() - 30_000) {
      return null;
    }
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId && payload.aud && payload.aud !== projectId) {
      return null;
    }
    if (projectId && payload.iss && payload.iss !== `https://securetoken.google.com/${projectId}`) {
      return null;
    }
    return { uid, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}
