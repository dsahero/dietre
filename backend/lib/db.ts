import { promises as fs } from "fs";
import path from "path";
import { MongoClient, type Db } from "mongodb";
import {
  SEED_EVENT_RESPONSES,
  SEED_EVENTS,
  SEED_HOSTS,
  SEED_MENU_ITEMS,
  SEED_RESTAURANTS,
} from "@/backend/data/seed";
import { hostIdFromEmail } from "@/backend/lib/auth";
import { hasMongo } from "@/shared/lib/config";
import type {
  AiItemJudgment,
  DataStore,
  DietResponse,
  DietreEvent,
  HostRecord,
  MenuItem,
  Restaurant,
  ResponseItemJudgments,
} from "@/shared/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

let mongoPromise: Promise<Db> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function emptyStore(): DataStore {
  return { events: [], responses: [], restaurants: [], menu_items: [], hosts: [], ai_judgments: [] };
}

function withSeed(store: DataStore): DataStore {
  const restaurants = SEED_RESTAURANTS;
  const menu_items = SEED_MENU_ITEMS;

  const existingEventIds = new Set(store.events.map((event) => event.id));
  const missingEvents = SEED_EVENTS.filter((event) => !existingEventIds.has(event.id));
  const events = [...missingEvents, ...store.events];

  const knownResponseIds = new Set(store.responses.map((response) => response.id));
  const missingResponses = SEED_EVENT_RESPONSES.filter((response) => !knownResponseIds.has(response.id));
  const responses = [...store.responses, ...missingResponses];

  const existingHostIds = new Set((store.hosts ?? []).map((host) => host.host_id));
  const missingHosts = SEED_HOSTS.filter((host) => !existingHostIds.has(host.host_id));
  const hosts = [...(store.hosts ?? []), ...missingHosts];

  const ai_judgments = store.ai_judgments ?? [];

  return { events, responses, restaurants, menu_items, hosts, ai_judgments };
}

async function readJsonStore(): Promise<DataStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return withSeed({ ...emptyStore(), ...(JSON.parse(raw) as Partial<DataStore>) });
  } catch {
    const seeded = withSeed(emptyStore());
    await persistJson(seeded);
    return seeded;
  }
}

async function persistJson(store: DataStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
}

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

async function getMongo(): Promise<Db> {
  if (!mongoPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI missing");
    mongoPromise = MongoClient.connect(uri).then((client) => client.db(process.env.MONGODB_DB || "dietre"));
  }
  return mongoPromise;
}

async function ensureMongoSeed(db: Db): Promise<void> {
  const restaurants = db.collection("restaurants");
  if ((await restaurants.countDocuments()) === 0) {
    await restaurants.insertMany(SEED_RESTAURANTS);
  }
  const menu = db.collection("menu_items");
  if ((await menu.countDocuments()) === 0) {
    await menu.insertMany(SEED_MENU_ITEMS);
  }
  const events = db.collection("events");
  for (const event of SEED_EVENTS) {
    if (!(await events.findOne({ id: event.id }))) {
      await events.insertOne(event);
    }
  }
  const responses = db.collection("responses");
  for (const event of SEED_EVENTS) {
    if ((await responses.countDocuments({ event_id: event.id })) === 0) {
      const seeded = SEED_EVENT_RESPONSES.filter((response) => response.event_id === event.id);
      if (seeded.length > 0) await responses.insertMany(seeded);
    }
  }
  const hosts = db.collection("hosts");
  for (const host of SEED_HOSTS) {
    if (!(await hosts.findOne({ host_id: host.host_id }))) {
      await hosts.insertOne(host);
    }
  }
}

function stripId<T>(doc: T & { _id?: unknown }): T {
  const copy = { ...doc };
  delete copy._id;
  return copy;
}

export async function listRestaurants(): Promise<Restaurant[]> {
  if (hasMongo()) {
    const db = await getMongo();
    await ensureMongoSeed(db);
    const docs = await db.collection<Restaurant>("restaurants").find({}).toArray();
    return docs.map(stripId);
  }
  return (await readJsonStore()).restaurants;
}

export async function listMenuItems(): Promise<MenuItem[]> {
  if (hasMongo()) {
    const db = await getMongo();
    await ensureMongoSeed(db);
    const docs = await db.collection<MenuItem>("menu_items").find({}).toArray();
    return docs.map(stripId);
  }
  return (await readJsonStore()).menu_items;
}

export async function listEventsByHost(hostId: string): Promise<DietreEvent[]> {
  if (hasMongo()) {
    const db = await getMongo();
    await ensureMongoSeed(db);
    const docs = await db.collection<DietreEvent>("events").find({ host_id: hostId }).toArray();
    return docs.map(stripId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const store = await readJsonStore();
  return store.events
    .filter((event) => event.host_id === hostId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getEvent(id: string): Promise<DietreEvent | null> {
  if (hasMongo()) {
    const db = await getMongo();
    await ensureMongoSeed(db);
    const doc = await db.collection<DietreEvent>("events").findOne({ id });
    return doc ? stripId(doc) : null;
  }
  return (await readJsonStore()).events.find((event) => event.id === id) ?? null;
}

export async function createEvent(event: DietreEvent): Promise<DietreEvent> {
  if (hasMongo()) {
    const db = await getMongo();
    await ensureMongoSeed(db);
    await db.collection("events").insertOne(event);
    return event;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.events.unshift(event);
    await persistJson(store);
  });
  return event;
}

export async function updateEvent(
  id: string,
  patch: Partial<
    Pick<
      DietreEvent,
      | "name"
      | "location"
      | "lat"
      | "lng"
      | "radius"
      | "budget_range"
      | "expected_headcount"
      | "limitations"
      | "limitations_checklist"
      | "checklist_notes_by_restaurant"
    >
  >
): Promise<DietreEvent | null> {
  if (hasMongo()) {
    const db = await getMongo();
    await ensureMongoSeed(db);
    const result = await db
      .collection<DietreEvent>("events")
      .findOneAndUpdate({ id }, { $set: patch }, { returnDocument: "after" });
    return result ? stripId(result) : null;
  }
  let updated: DietreEvent | null = null;
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    const event = store.events.find((item) => item.id === id);
    if (event) {
      Object.assign(event, patch);
      updated = event;
      await persistJson(store);
    }
  });
  return updated;
}

export async function listResponses(eventId: string): Promise<DietResponse[]> {
  if (hasMongo()) {
    const db = await getMongo();
    await ensureMongoSeed(db);
    const docs = await db.collection<DietResponse>("responses").find({ event_id: eventId }).toArray();
    return docs.map(stripId).sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
  }
  return (await readJsonStore()).responses
    .filter((response) => response.event_id === eventId)
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
}

export async function createResponse(response: DietResponse): Promise<DietResponse> {
  if (hasMongo()) {
    const db = await getMongo();
    await ensureMongoSeed(db);
    await db.collection("responses").insertOne(response);
    return response;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.responses.push(response);
    await persistJson(store);
  });
  return response;
}

export function backendLabel(): "mongodb" | "local-json" {
  return hasMongo() ? "mongodb" : "local-json";
}

export async function getHost(hostId: string): Promise<HostRecord | null> {
  if (hasMongo()) {
    const db = await getMongo();
    await ensureMongoSeed(db);
    const doc = await db.collection<HostRecord>("hosts").findOne({ host_id: hostId });
    return doc ? stripId(doc) : null;
  }
  return (await readJsonStore()).hosts.find((host) => host.host_id === hostId) ?? null;
}

export async function getHostByEmail(email: string): Promise<HostRecord | null> {
  return getHost(hostIdFromEmail(email));
}

export async function createHost(host: HostRecord): Promise<HostRecord> {
  if (hasMongo()) {
    const db = await getMongo();
    await ensureMongoSeed(db);
    await db.collection("hosts").insertOne(host);
    return host;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.hosts.push(host);
    await persistJson(store);
  });
  return host;
}

export async function updateHost(
  hostId: string,
  patch: Partial<Pick<HostRecord, "name" | "avatar_data_url" | "password_hash">>
): Promise<HostRecord | null> {
  const updated_at = new Date().toISOString();
  if (hasMongo()) {
    const db = await getMongo();
    await ensureMongoSeed(db);
    const result = await db
      .collection<HostRecord>("hosts")
      .findOneAndUpdate({ host_id: hostId }, { $set: { ...patch, updated_at } }, { returnDocument: "after" });
    return result ? stripId(result) : null;
  }
  let updated: HostRecord | null = null;
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    const host = store.hosts.find((item) => item.host_id === hostId);
    if (host) {
      Object.assign(host, patch, { updated_at });
      updated = host;
      await persistJson(store);
    }
  });
  return updated;
}

export async function deleteHost(hostId: string): Promise<void> {
  if (hasMongo()) {
    const db = await getMongo();
    await ensureMongoSeed(db);
    await db.collection("hosts").deleteOne({ host_id: hostId });
    return;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.hosts = store.hosts.filter((host) => host.host_id !== hostId);
    await persistJson(store);
  });
}

// Gemini per-item safety judgments are cached per response (responses are
// immutable once submitted, and menu items are static seed data), so a
// dashboard reload never re-pays for the same Gemini call.
export async function getResponseJudgments(responseId: string): Promise<Record<string, AiItemJudgment> | null> {
  if (hasMongo()) {
    const db = await getMongo();
    const doc = await db.collection<ResponseItemJudgments>("ai_judgments").findOne({ response_id: responseId });
    return doc ? doc.judgments : null;
  }
  const store = await readJsonStore();
  const doc = store.ai_judgments.find((entry) => entry.response_id === responseId);
  return doc ? doc.judgments : null;
}

export async function saveResponseJudgments(
  responseId: string,
  judgments: Record<string, AiItemJudgment>
): Promise<void> {
  const entry: ResponseItemJudgments = { response_id: responseId, computed_at: new Date().toISOString(), judgments };
  if (hasMongo()) {
    const db = await getMongo();
    await db
      .collection<ResponseItemJudgments>("ai_judgments")
      .updateOne({ response_id: responseId }, { $set: entry }, { upsert: true });
    return;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.ai_judgments = store.ai_judgments.filter((item) => item.response_id !== responseId);
    store.ai_judgments.push(entry);
    await persistJson(store);
  });
}
