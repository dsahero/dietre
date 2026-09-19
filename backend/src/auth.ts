import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { AUTH_SECRET } from "./config.js";
import type { OrganizerSession } from "./types.js";

const scryptAsync = promisify(scrypt);

export function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return scryptAsync(password, salt, 64).then((buf) => `${salt}:${(buf as Buffer).toString("hex")}`);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const actual = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function signSession(session: OrganizerSession): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const sig = createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readSessionToken(token: string | undefined | null): OrganizerSession | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OrganizerSession;
  } catch {
    return null;
  }
}

export function bearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() === "bearer" && value) return value;
  return undefined;
}

export function guestToken(req: {
  header(name: string): string | undefined;
  query: { anon_token?: unknown };
}): string | undefined {
  const header = req.header("x-guest-token");
  if (header) return header;
  const auth = req.header("authorization");
  if (auth) {
    const [scheme, value] = auth.split(" ");
    if (scheme?.toLowerCase() === "guest" && value) return value;
  }
  const q = req.query.anon_token;
  return typeof q === "string" ? q : undefined;
}
