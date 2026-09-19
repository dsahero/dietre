import { createHash, randomBytes } from "crypto";
import { ObjectId } from "mongodb";

/** Stable 24-hex id so JSON fallback and Mongo share the same seed keys. */
export function idFromKey(key: string): string {
  return createHash("md5").update(`dietre:${key}`).digest("hex").slice(0, 24);
}

export function newId(): string {
  return new ObjectId().toHexString();
}

export function newToken(bytes = 18): string {
  return randomBytes(bytes).toString("base64url");
}

export function asObjectId(id: string): ObjectId {
  return new ObjectId(id);
}

export function isId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
}
