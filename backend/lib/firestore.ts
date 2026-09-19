import { createSign } from "crypto";
import { readFileSync } from "fs";

/**
 * Minimal Firestore REST client. Uses the same Firebase project the frontend
 * already configures (NEXT_PUBLIC_FIREBASE_*). No firebase-admin dependency.
 *
 * Auth, in order:
 * 1. FIRESTORE_EMULATOR_HOST — unauthenticated emulator
 * 2. FIREBASE_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS — admin JWT
 * 3. NEXT_PUBLIC_FIREBASE_API_KEY — API key (open/test rules)
 */

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

type FirestoreDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

let cachedAccessToken: { token: string; expMs: number } | null = null;

export const COLLECTIONS = {
  organizers: "organizers",
  events: "events",
  guests: "guests",
  restaurants: "restaurants",
  menu_items: "menu_items",
  restaurant_scores: "restaurant_scores",
} as const;

export function firestoreProjectId(): string {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "dietre-local"
  );
}

export function hasFirestore(): boolean {
  if (process.env.FIRESTORE_EMULATOR_HOST) return true;
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && !process.env.GCLOUD_PROJECT) {
    return false;
  }
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

function emulatorOrigin(): string | null {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) return null;
  return host.includes("://") ? host : `http://${host}`;
}

function databaseRoot(): string {
  const project = firestoreProjectId();
  const emulator = emulatorOrigin();
  if (emulator) {
    return `${emulator}/v1/projects/${project}/databases/(default)`;
  }
  return `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)`;
}

function documentName(collection: string, id: string): string {
  return `projects/${firestoreProjectId()}/databases/(default)/documents/${collection}/${id}`;
}

export function documentIdFromName(name: string | undefined, fallback: string): string {
  if (!name) return fallback;
  const parts = name.split("/");
  return decodeURIComponent(parts[parts.length - 1] || fallback);
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      return JSON.parse(raw) as ServiceAccount;
    } catch {
      return null;
    }
  }
  const file = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!file) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as ServiceAccount;
  } catch {
    return null;
  }
}

async function googleAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expMs - 60_000 > now) {
    return cachedAccessToken.token;
  }
  const sa = loadServiceAccount();
  if (!sa?.client_email || !sa.private_key) return null;

  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp,
      scope: "https://www.googleapis.com/auth/datastore",
    })
  ).toString("base64url");
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(sa.private_key, "base64url")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Firestore service-account token exchange failed (${res.status})`);
  }
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) return null;
  cachedAccessToken = {
    token: body.access_token,
    expMs: now + (body.expires_in ?? 3600) * 1000,
  };
  return body.access_token;
}

async function firestoreHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (emulatorOrigin()) {
    headers.Authorization = "Bearer owner";
    return headers;
  }
  const token = await googleAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function withApiKey(url: string): string {
  if (emulatorOrigin()) return url;
  if (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return url;
  }
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key) return url;
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}key=${encodeURIComponent(key)}`;
}

async function firestoreFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = withApiKey(`${databaseRoot()}${path}`);
  const headers = { ...(await firestoreHeaders()), ...(init?.headers as Record<string, string> | undefined) };
  return fetch(url, { ...init, headers });
}

function encodeValue(value: unknown): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isFinite(value) && Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
      return { integerValue: String(value) };
    }
    return { doubleValue: Number(value) };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.filter((item) => item !== undefined).map(encodeValue) } };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
  }
  return { stringValue: String(value) };
}

export function encodeFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields[key] = encodeValue(value);
  }
  return fields;
}

function decodeValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields ?? {});
  return null;
}

export function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = decodeValue(value);
  }
  return out;
}

export function decodeDocument<T>(doc: FirestoreDocument | undefined | null): (T & { id: string }) | null {
  if (!doc?.fields) return null;
  const data = decodeFields(doc.fields) as T & { id?: string };
  const id = documentIdFromName(doc.name, String(data.id ?? ""));
  return { ...data, id };
}

export async function getDocument<T>(collection: string, id: string): Promise<(T & { id: string }) | null> {
  const res = await firestoreFetch(`/documents/${collection}/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Firestore GET ${collection}/${id} failed (${res.status}): ${await res.text()}`);
  }
  return decodeDocument<T>(await res.json());
}

export async function listDocuments<T>(collection: string): Promise<Array<T & { id: string }>> {
  const out: Array<T & { id: string }>= [];
  let pageToken: string | undefined;
  do {
    const qs = new URLSearchParams({ pageSize: "300" });
    if (pageToken) qs.set("pageToken", pageToken);
    const res = await firestoreFetch(`/documents/${collection}?${qs.toString()}`);
    if (!res.ok) {
      throw new Error(`Firestore LIST ${collection} failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as { documents?: FirestoreDocument[]; nextPageToken?: string };
    for (const doc of body.documents ?? []) {
      const decoded = decodeDocument<T>(doc);
      if (decoded) out.push(decoded);
    }
    pageToken = body.nextPageToken;
  } while (pageToken);
  return out;
}

export async function queryDocuments<T>(
  collection: string,
  field: string,
  op: "EQUAL" | "ARRAY_CONTAINS",
  value: unknown
): Promise<Array<T & { id: string }>> {
  const res = await firestoreFetch("/documents:runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op,
            value: encodeValue(value),
          },
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Firestore QUERY ${collection}.${field} failed (${res.status}): ${await res.text()}`);
  }
  const rows = (await res.json()) as Array<{ document?: FirestoreDocument }>;
  const out: Array<T & { id: string }> = [];
  for (const row of rows) {
    const decoded = decodeDocument<T>(row.document);
    if (decoded) out.push(decoded);
  }
  return out;
}

export async function setDocument(
  collection: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const res = await firestoreFetch(`/documents/${collection}?documentId=${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
  if (res.status === 409) {
    await patchDocument(collection, id, data);
    return;
  }
  if (!res.ok) {
    throw new Error(`Firestore SET ${collection}/${id} failed (${res.status}): ${await res.text()}`);
  }
}

export async function patchDocument(
  collection: string,
  id: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const fieldPaths = Object.keys(data).filter((key) => data[key] !== undefined);
  const qs = fieldPaths.map((path) => `updateMask.fieldPaths=${encodeURIComponent(path)}`).join("&");
  const res = await firestoreFetch(`/documents/${collection}/${encodeURIComponent(id)}?${qs}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Firestore PATCH ${collection}/${id} failed (${res.status}): ${await res.text()}`);
  }
  const decoded = decodeDocument(await res.json());
  return decoded;
}

export async function deleteDocument(collection: string, id: string): Promise<void> {
  const res = await firestoreFetch(`/documents/${collection}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (res.status === 404) return;
  if (!res.ok) {
    throw new Error(`Firestore DELETE ${collection}/${id} failed (${res.status}): ${await res.text()}`);
  }
}

export async function commitWrites(
  writes: Array<{ collection: string; id: string; data: Record<string, unknown> }>
): Promise<void> {
  const chunkSize = 400;
  for (let i = 0; i < writes.length; i += chunkSize) {
    const slice = writes.slice(i, i + chunkSize);
    const res = await firestoreFetch("/documents:commit", {
      method: "POST",
      body: JSON.stringify({
        writes: slice.map((write) => ({
          update: {
            name: documentName(write.collection, write.id),
            fields: encodeFields(write.data),
          },
        })),
      }),
    });
    if (!res.ok) {
      throw new Error(`Firestore COMMIT failed (${res.status}): ${await res.text()}`);
    }
  }
}
