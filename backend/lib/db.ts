import { promises as fs } from "fs";
import path from "path";
import { MongoClient, type Db } from "mongodb";
import {
  SEED_DEMO_EVENT,
  SEED_DEMO_RESPONSES,
  SEED_MENU_ITEMS,
  SEED_RESTAURANTS,
} from "@/backend/data/seed";
import { hasMongo } from "@/shared/lib/config";
import type { DataStore, DietResponse, DietreEvent, MenuItem, Restaurant } from "@/shared/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

let mongoPromise: Promise<Db> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function emptyStore(): DataStore {
  return { events: [], responses: [], restaurants: [], menu_items: [] };
}

function withSeed(store: DataStore): DataStore {
  const restaurants = SEED_RESTAURANTS;
  const menu_items = SEED_MENU_ITEMS;
  const events = store.events.some((event) => event.id === SEED_DEMO_EVENT.id)
    ? store.events
    : [SEED_DEMO_EVENT, ...store.events];
  const known = new Set(store.responses.map((response) => response.id));
  const missingDemo = SEED_DEMO_RESPONSES.filter((response) => !known.has(response.id));
  return { events, responses: [...store.responses, ...missingDemo], restaurants, menu_items };
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
  if (!(await events.findOne({ id: SEED_DEMO_EVENT.id }))) {
    await events.insertOne(SEED_DEMO_EVENT);
  }
  const responses = db.collection("responses");
  if ((await responses.countDocuments({ event_id: SEED_DEMO_EVENT.id })) === 0) {
    await responses.insertMany(SEED_DEMO_RESPONSES);
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
