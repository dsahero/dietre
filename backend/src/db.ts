import { promises as fs } from "fs";
import path from "path";
import { MongoClient, type Collection, type Db, type Document } from "mongodb";
import { MONGODB_DB, MONGODB_URI, hasMongo } from "./config.js";
import { asObjectId, newId } from "./ids.js";
import { SEED_MENU_ITEMS, SEED_RESTAURANTS } from "./seed.js";
import type {
  DataStore,
  DietreEvent,
  Guest,
  MenuItem,
  Organizer,
  Restaurant,
  RestaurantScore,
} from "./types.js";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

let mongoPromise: Promise<Db> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let indexesReady = false;

function emptyStore(): DataStore {
  return {
    organizers: [],
    events: [],
    guests: [],
    restaurants: [],
    menu_items: [],
    restaurant_scores: [],
  };
}

function withSeed(store: DataStore): DataStore {
  return {
    ...store,
    restaurants: SEED_RESTAURANTS,
    menu_items: SEED_MENU_ITEMS,
  };
}

async function readJsonStore(): Promise<DataStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DataStore>;
    return withSeed({ ...emptyStore(), ...parsed });
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

function serialize<T extends Document>(doc: T): T {
  const copy = { ...doc } as Record<string, unknown>;
  if (copy._id && typeof copy._id === "object" && "toHexString" in copy._id) {
    copy._id = (copy._id as { toHexString(): string }).toHexString();
  }
  for (const key of Object.keys(copy)) {
    const value = copy[key];
    if (value instanceof Date) copy[key] = value.toISOString();
    else if (Array.isArray(value)) {
      copy[key] = value.map((item) => {
        if (item && typeof item === "object" && "toHexString" in item) {
          return (item as { toHexString(): string }).toHexString();
        }
        return item;
      });
    } else if (value && typeof value === "object" && "toHexString" in value) {
      copy[key] = (value as { toHexString(): string }).toHexString();
    }
  }
  return copy as T;
}

function eventToMongo(event: DietreEvent): Document {
  return {
    ...event,
    _id: asObjectId(event._id),
    organizer_id: asObjectId(event.organizer_id),
    created_at: new Date(event.created_at),
    event_date: new Date(event.event_date),
    candidate_restaurant_ids: event.candidate_restaurant_ids.map(asObjectId),
  };
}

function eventFromMongo(doc: Document): DietreEvent {
  const serialized = serialize(doc);
  return {
    ...(serialized as unknown as DietreEvent),
    created_at:
      serialized.created_at instanceof Date
        ? serialized.created_at.toISOString()
        : String(serialized.created_at),
    event_date:
      serialized.event_date instanceof Date
        ? serialized.event_date.toISOString()
        : String(serialized.event_date),
    candidate_restaurant_ids: (serialized.candidate_restaurant_ids as string[]) ?? [],
  };
}

function guestToMongo(guest: Guest): Document {
  const doc: Document = {
    ...guest,
    _id: asObjectId(guest._id),
    event_id: asObjectId(guest.event_id),
    created_at: new Date(guest.created_at),
    updated_at: new Date(guest.updated_at),
  };
  if (!guest.email) delete doc.email;
  if (!guest.name) delete doc.name;
  return doc;
}

function guestFromMongo(doc: Document): Guest {
  const serialized = serialize(doc) as unknown as Guest;
  return {
    ...serialized,
    created_at: String(serialized.created_at),
    updated_at: String(serialized.updated_at),
  };
}

function organizerToMongo(organizer: Organizer): Document {
  return {
    ...organizer,
    _id: asObjectId(organizer._id),
    created_at: new Date(organizer.created_at),
    events: organizer.events.map(asObjectId),
  };
}

function organizerFromMongo(doc: Document): Organizer {
  const serialized = serialize(doc) as unknown as Organizer;
  return { ...serialized, created_at: String(serialized.created_at), events: serialized.events ?? [] };
}

function restaurantToMongo(restaurant: Restaurant): Document {
  return {
    ...restaurant,
    _id: asObjectId(restaurant._id),
    menu_item_ids: restaurant.menu_item_ids.map(asObjectId),
  };
}

function restaurantFromMongo(doc: Document): Restaurant {
  return serialize(doc) as unknown as Restaurant;
}

function menuToMongo(item: MenuItem): Document {
  return { ...item, _id: asObjectId(item._id), restaurant_id: asObjectId(item.restaurant_id) };
}

function menuFromMongo(doc: Document): MenuItem {
  return serialize(doc) as unknown as MenuItem;
}

function scoreToMongo(score: RestaurantScore): Document {
  return {
    ...score,
    _id: asObjectId(score._id),
    event_id: asObjectId(score.event_id),
    restaurant_id: asObjectId(score.restaurant_id),
    computed_at: new Date(score.computed_at),
  };
}

function scoreFromMongo(doc: Document): RestaurantScore {
  const serialized = serialize(doc) as unknown as RestaurantScore;
  return { ...serialized, computed_at: String(serialized.computed_at) };
}

async function getMongo(): Promise<Db> {
  if (!mongoPromise) {
    if (!MONGODB_URI) throw new Error("MONGODB_URI missing");
    mongoPromise = MongoClient.connect(MONGODB_URI).then((client) => client.db(MONGODB_DB));
  }
  return mongoPromise;
}

async function ensureIndexes(db: Db): Promise<void> {
  if (indexesReady) return;
  await db.collection("organizers").createIndex({ email: 1 }, { unique: true });
  await db.collection("events").createIndex({ link_token: 1 }, { unique: true });
  await db.collection("events").createIndex({ organizer_id: 1 });
  await db.collection("events").createIndex({ location: "2dsphere" });
  await db.collection("guests").createIndex({ event_id: 1 });
  await db.collection("guests").createIndex({ anon_token: 1 }, { unique: true });
  await db.collection("guests").createIndex({ event_id: 1, email: 1 }, { unique: true, sparse: true });
  await db.collection("restaurants").createIndex({ location: "2dsphere" });
  await db.collection("restaurants").createIndex({ "data_source.google_place_id": 1 }, { sparse: true });
  await db.collection("restaurants").createIndex({ "data_source.yelp_id": 1 }, { sparse: true });
  await db.collection("menu_items").createIndex({ restaurant_id: 1 });
  await db.collection("menu_items").createIndex({ needs_human_review: 1 });
  await db.collection("restaurant_scores").createIndex({ event_id: 1, restaurant_id: 1 }, { unique: true });
  indexesReady = true;
}

async function col<T extends Document>(name: string): Promise<Collection<T>> {
  const db = await getMongo();
  await ensureIndexes(db);
  await ensureMongoSeed(db);
  return db.collection<T>(name);
}

async function ensureMongoSeed(db: Db): Promise<void> {
  const restaurants = db.collection("restaurants");
  if ((await restaurants.countDocuments()) === 0) {
    await restaurants.insertMany(SEED_RESTAURANTS.map(restaurantToMongo));
  }
  const menu = db.collection("menu_items");
  if ((await menu.countDocuments()) === 0) {
    await menu.insertMany(SEED_MENU_ITEMS.map(menuToMongo));
  }
}

export async function listRestaurants(): Promise<Restaurant[]> {
  if (hasMongo()) {
    const docs = await (await col("restaurants")).find({}).toArray();
    return docs.map((doc) => restaurantFromMongo(doc));
  }
  return (await readJsonStore()).restaurants;
}

export async function listMenuItems(restaurantId?: string): Promise<MenuItem[]> {
  if (hasMongo()) {
    const filter = restaurantId ? { restaurant_id: asObjectId(restaurantId) } : {};
    const docs = await (await col("menu_items")).find(filter).toArray();
    return docs.map((doc) => menuFromMongo(doc));
  }
  const items = (await readJsonStore()).menu_items;
  return restaurantId ? items.filter((item) => item.restaurant_id === restaurantId) : items;
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  if (hasMongo()) {
    const doc = await (await col("restaurants")).findOne({ _id: asObjectId(id) });
    return doc ? restaurantFromMongo(doc) : null;
  }
  return (await readJsonStore()).restaurants.find((row) => row._id === id) ?? null;
}

export async function createOrganizer(input: {
  email: string;
  name: string;
  password_hash: string;
}): Promise<Organizer> {
  const organizer: Organizer = {
    _id: newId(),
    email: input.email,
    name: input.name,
    password_hash: input.password_hash,
    created_at: new Date().toISOString(),
    events: [],
  };
  if (hasMongo()) {
    try {
      await (await col("organizers")).insertOne(organizerToMongo(organizer) as never);
    } catch (err) {
      if (isDup(err)) throw Object.assign(new Error("Email already registered."), { status: 409 });
      throw err;
    }
    return organizer;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    if (store.organizers.some((row) => row.email === organizer.email)) {
      throw Object.assign(new Error("Email already registered."), { status: 409 });
    }
    store.organizers.push(organizer);
    await persistJson(store);
  });
  return organizer;
}

export async function getOrganizerByEmail(email: string): Promise<Organizer | null> {
  const needle = email.trim().toLowerCase();
  if (hasMongo()) {
    const doc = await (await col("organizers")).findOne({ email: needle });
    return doc ? organizerFromMongo(doc) : null;
  }
  return (await readJsonStore()).organizers.find((row) => row.email === needle) ?? null;
}

export async function getOrganizer(id: string): Promise<Organizer | null> {
  if (hasMongo()) {
    const doc = await (await col("organizers")).findOne({ _id: asObjectId(id) });
    return doc ? organizerFromMongo(doc) : null;
  }
  return (await readJsonStore()).organizers.find((row) => row._id === id) ?? null;
}

export async function listEventsByOrganizer(organizerId: string): Promise<DietreEvent[]> {
  if (hasMongo()) {
    const docs = await (await col("events")).find({ organizer_id: asObjectId(organizerId) }).toArray();
    return docs.map(eventFromMongo).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return (await readJsonStore()).events
    .filter((event) => event.organizer_id === organizerId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getEvent(id: string): Promise<DietreEvent | null> {
  if (hasMongo()) {
    const doc = await (await col("events")).findOne({ _id: asObjectId(id) });
    return doc ? eventFromMongo(doc) : null;
  }
  return (await readJsonStore()).events.find((event) => event._id === id) ?? null;
}

export async function getEventByLinkToken(linkToken: string): Promise<DietreEvent | null> {
  if (hasMongo()) {
    const doc = await (await col("events")).findOne({ link_token: linkToken });
    return doc ? eventFromMongo(doc) : null;
  }
  return (await readJsonStore()).events.find((event) => event.link_token === linkToken) ?? null;
}

export async function createEvent(event: DietreEvent): Promise<DietreEvent> {
  if (hasMongo()) {
    const events = await col("events");
    const organizers = await col("organizers");
    await events.insertOne(eventToMongo(event) as never);
    await organizers.updateOne({ _id: asObjectId(event.organizer_id) }, {
      $push: { events: asObjectId(event._id) },
    } as never);
    return event;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.events.unshift(event);
    const organizer = store.organizers.find((row) => row._id === event.organizer_id);
    if (organizer) organizer.events.push(event._id);
    await persistJson(store);
  });
  return event;
}

export async function listGuests(eventId: string): Promise<Guest[]> {
  if (hasMongo()) {
    const docs = await (await col("guests")).find({ event_id: asObjectId(eventId) }).toArray();
    return docs.map(guestFromMongo).sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  return (await readJsonStore()).guests
    .filter((guest) => guest.event_id === eventId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function getGuestByAnonToken(anonToken: string): Promise<Guest | null> {
  if (hasMongo()) {
    const doc = await (await col("guests")).findOne({ anon_token: anonToken });
    return doc ? guestFromMongo(doc) : null;
  }
  return (await readJsonStore()).guests.find((guest) => guest.anon_token === anonToken) ?? null;
}

export async function createGuest(guest: Guest): Promise<Guest> {
  if (hasMongo()) {
    try {
      await (await col("guests")).insertOne(guestToMongo(guest) as never);
    } catch (err) {
      if (isDup(err)) throw Object.assign(new Error("Guest email already used for this event."), { status: 409 });
      throw err;
    }
    return guest;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    if (store.guests.some((row) => row.anon_token === guest.anon_token)) {
      throw Object.assign(new Error("Guest session already exists."), { status: 409 });
    }
    if (guest.email && store.guests.some((row) => row.event_id === guest.event_id && row.email === guest.email)) {
      throw Object.assign(new Error("Guest email already used for this event."), { status: 409 });
    }
    store.guests.push(guest);
    store.restaurant_scores = store.restaurant_scores.filter((row) => row.event_id !== guest.event_id);
    await persistJson(store);
  });
  return guest;
}

export async function updateGuest(guest: Guest): Promise<Guest> {
  const next = { ...guest, updated_at: new Date().toISOString() };
  if (hasMongo()) {
    const { _id, ...rest } = guestToMongo(next);
    await (await col("guests")).updateOne({ _id: asObjectId(guest._id) }, { $set: rest });
    await (await col("restaurant_scores")).deleteMany({ event_id: asObjectId(guest.event_id) });
    return next;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    const index = store.guests.findIndex((row) => row._id === guest._id);
    if (index >= 0) store.guests[index] = next;
    store.restaurant_scores = store.restaurant_scores.filter((row) => row.event_id !== guest.event_id);
    await persistJson(store);
  });
  return next;
}

export async function listScores(eventId: string): Promise<RestaurantScore[]> {
  if (hasMongo()) {
    const docs = await (await col("restaurant_scores")).find({ event_id: asObjectId(eventId) }).toArray();
    return docs.map(scoreFromMongo);
  }
  return (await readJsonStore()).restaurant_scores.filter((row) => row.event_id === eventId);
}

export async function replaceScores(eventId: string, scores: RestaurantScore[]): Promise<void> {
  if (hasMongo()) {
    const collection = await col("restaurant_scores");
    await collection.deleteMany({ event_id: asObjectId(eventId) });
    if (scores.length > 0) await collection.insertMany(scores.map(scoreToMongo) as never[]);
    return;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.restaurant_scores = store.restaurant_scores.filter((row) => row.event_id !== eventId).concat(scores);
    await persistJson(store);
  });
}

export function backendLabel(): "mongodb" | "local-json" {
  return hasMongo() ? "mongodb" : "local-json";
}

function isDup(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000);
}
