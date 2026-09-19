import { promises as fs } from "fs";
import path from "path";
import {
  SEED_EVENT_RESPONSES,
  SEED_EVENTS,
  SEED_HOSTS,
  SEED_MENU_ITEMS,
  SEED_RESTAURANTS,
} from "@/backend/data/seed";
import { hostIdFromEmail } from "@/backend/lib/auth";
import {
  docToEvent,
  docToMenuItem,
  docToResponse,
  docToRestaurant,
  eventPatchToDoc,
  eventToDoc,
  hostToOrganizer,
  menuItemToDoc,
  organizerToHost,
  responseToGuest,
  restaurantToDoc,
  scoreDocId,
  type RestaurantScoreDoc,
} from "@/backend/lib/collections";
import {
  COLLECTIONS,
  commitWrites,
  deleteDocument,
  getDocument,
  hasFirestore,
  listDocuments,
  patchDocument,
  queryDocuments,
  setDocument,
} from "@/backend/lib/firestore";
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

type JsonStore = DataStore & { restaurant_scores: RestaurantScoreDoc[] };

let writeQueue: Promise<void> = Promise.resolve();
let firestoreSeedPromise: Promise<void> | null = null;

function emptyStore(): JsonStore {
  return {
    events: [],
    responses: [],
    restaurants: [],
    menu_items: [],
    hosts: [],
    ai_judgments: [],
    restaurant_scores: [],
  };
}

function withSeed(store: JsonStore): JsonStore {
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
  const restaurant_scores = store.restaurant_scores ?? [];

  return { events, responses, restaurants, menu_items, hosts, ai_judgments, restaurant_scores };
}

async function readJsonStore(): Promise<JsonStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return withSeed({ ...emptyStore(), ...(JSON.parse(raw) as Partial<JsonStore>) });
  } catch {
    const seeded = withSeed(emptyStore());
    await persistJson(seeded);
    return seeded;
  }
}

async function persistJson(store: JsonStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
}

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

function menuIdsByRestaurant(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const item of SEED_MENU_ITEMS) {
    const list = map.get(item.restaurant_id) ?? [];
    list.push(item.id);
    map.set(item.restaurant_id, list);
  }
  return map;
}

async function ensureFirestoreSeed(): Promise<void> {
  if (!firestoreSeedPromise) {
    firestoreSeedPromise = (async () => {
      const marker = await getDocument<{ version?: number }>("_meta", "seed");
      if (marker?.version) return;

      const restaurants = await listDocuments(COLLECTIONS.restaurants);
      if (restaurants.length > 0) {
        await setDocument("_meta", "seed", { version: 1, seeded_at: new Date().toISOString() });
        return;
      }

      const menuIds = menuIdsByRestaurant();
      const restaurantIds = SEED_RESTAURANTS.map((restaurant) => restaurant.id);
      const writes: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];

      for (const restaurant of SEED_RESTAURANTS) {
        writes.push({
          collection: COLLECTIONS.restaurants,
          id: restaurant.id,
          data: restaurantToDoc(restaurant, menuIds.get(restaurant.id) ?? []),
        });
      }
      for (const item of SEED_MENU_ITEMS) {
        writes.push({
          collection: COLLECTIONS.menu_items,
          id: item.id,
          data: menuItemToDoc(item),
        });
      }
      for (const host of SEED_HOSTS) {
        const eventIds = SEED_EVENTS.filter((event) => event.host_id === host.host_id).map((event) => event.id);
        writes.push({
          collection: COLLECTIONS.organizers,
          id: host.host_id,
          data: hostToOrganizer(host, eventIds),
        });
      }
      for (const event of SEED_EVENTS) {
        writes.push({
          collection: COLLECTIONS.events,
          id: event.id,
          data: eventToDoc(event, restaurantIds),
        });
      }
      for (const response of SEED_EVENT_RESPONSES) {
        writes.push({
          collection: COLLECTIONS.guests,
          id: response.id,
          data: responseToGuest(response),
        });
      }
      writes.push({
        collection: "_meta",
        id: "seed",
        data: { version: 1, seeded_at: new Date().toISOString() },
      });
      await commitWrites(writes);
    })().catch((error) => {
      firestoreSeedPromise = null;
      throw error;
    });
  }
  return firestoreSeedPromise;
}

function useFirestore(): boolean {
  return hasFirestore();
}

export function backendLabel(): "firestore" | "local-json" {
  return useFirestore() ? "firestore" : "local-json";
}

export async function listRestaurants(): Promise<Restaurant[]> {
  if (useFirestore()) {
    await ensureFirestoreSeed();
    const docs = await listDocuments(COLLECTIONS.restaurants);
    return docs.map((doc) => docToRestaurant(doc.id, doc));
  }
  return (await readJsonStore()).restaurants;
}

export async function listMenuItems(): Promise<MenuItem[]> {
  if (useFirestore()) {
    await ensureFirestoreSeed();
    const docs = await listDocuments(COLLECTIONS.menu_items);
    return docs.map((doc) => docToMenuItem(doc.id, doc));
  }
  return (await readJsonStore()).menu_items;
}

export async function listEventsByHost(hostId: string): Promise<DietreEvent[]> {
  if (useFirestore()) {
    await ensureFirestoreSeed();
    const docs = await queryDocuments(COLLECTIONS.events, "organizer_id", "EQUAL", hostId);
    return docs
      .map((doc) => docToEvent(doc.id, doc))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const store = await readJsonStore();
  return store.events
    .filter((event) => event.host_id === hostId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getEvent(id: string): Promise<DietreEvent | null> {
  if (useFirestore()) {
    await ensureFirestoreSeed();
    const byId = await getDocument(COLLECTIONS.events, id);
    if (byId) return docToEvent(byId.id, byId);
    const byToken = await queryDocuments(COLLECTIONS.events, "link_token", "EQUAL", id);
    return byToken[0] ? docToEvent(byToken[0].id, byToken[0]) : null;
  }
  return (await readJsonStore()).events.find((event) => event.id === id) ?? null;
}

export async function createEvent(event: DietreEvent): Promise<DietreEvent> {
  if (useFirestore()) {
    await ensureFirestoreSeed();
    const restaurantIds = SEED_RESTAURANTS.map((restaurant) => restaurant.id);
    await setDocument(COLLECTIONS.events, event.id, eventToDoc(event, restaurantIds));
    const organizer = await getDocument<{ events?: string[] }>(COLLECTIONS.organizers, event.host_id);
    if (organizer) {
      const events = Array.isArray(organizer.events) ? organizer.events : [];
      if (!events.includes(event.id)) {
        await patchDocument(COLLECTIONS.organizers, event.host_id, { events: [...events, event.id] });
      }
    }
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
  if (useFirestore()) {
    await ensureFirestoreSeed();
    const updated = await patchDocument(COLLECTIONS.events, id, eventPatchToDoc(patch));
    return updated ? docToEvent(id, updated) : null;
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
  if (useFirestore()) {
    await ensureFirestoreSeed();
    const docs = await queryDocuments(COLLECTIONS.guests, "event_id", "EQUAL", eventId);
    return docs
      .map((doc) => docToResponse(doc.id, doc))
      .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
  }
  return (await readJsonStore()).responses
    .filter((response) => response.event_id === eventId)
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
}

export async function createResponse(response: DietResponse): Promise<DietResponse> {
  if (useFirestore()) {
    await ensureFirestoreSeed();
    await setDocument(COLLECTIONS.guests, response.id, responseToGuest(response));
    return response;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.responses.push(response);
    await persistJson(store);
  });
  return response;
}

export async function getHost(hostId: string): Promise<HostRecord | null> {
  if (useFirestore()) {
    await ensureFirestoreSeed();
    const doc = await getDocument(COLLECTIONS.organizers, hostId);
    return doc ? organizerToHost(doc.id, doc) : null;
  }
  return (await readJsonStore()).hosts.find((host) => host.host_id === hostId) ?? null;
}

export async function getHostByEmail(email: string): Promise<HostRecord | null> {
  const normalized = email.trim().toLowerCase();
  if (useFirestore()) {
    await ensureFirestoreSeed();
    const matches = await queryDocuments(COLLECTIONS.organizers, "email", "EQUAL", normalized);
    if (matches[0]) return organizerToHost(matches[0].id, matches[0]);
    return getHost(hostIdFromEmail(normalized));
  }
  return getHost(hostIdFromEmail(normalized));
}

export async function createHost(host: HostRecord): Promise<HostRecord> {
  if (useFirestore()) {
    await ensureFirestoreSeed();
    await setDocument(COLLECTIONS.organizers, host.host_id, hostToOrganizer(host));
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
  if (useFirestore()) {
    await ensureFirestoreSeed();
    const data: Record<string, unknown> = { updated_at };
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.avatar_data_url !== undefined) data.avatar_data_url = patch.avatar_data_url;
    if (patch.password_hash !== undefined) data.password_hash = patch.password_hash;
    const updated = await patchDocument(COLLECTIONS.organizers, hostId, data);
    return updated ? organizerToHost(hostId, updated) : null;
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
  if (useFirestore()) {
    await ensureFirestoreSeed();
    await deleteDocument(COLLECTIONS.organizers, hostId);
    return;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.hosts = store.hosts.filter((host) => host.host_id !== hostId);
    await persistJson(store);
  });
}

// Gemini per-item safety judgments are cached per guest (responses are
// immutable once submitted, and menu items are static seed data), so a
// dashboard reload never re-pays for the same Gemini call.
export async function getResponseJudgments(responseId: string): Promise<Record<string, AiItemJudgment> | null> {
  if (useFirestore()) {
    await ensureFirestoreSeed();
    const doc = await getDocument<{ ai_judgments?: Record<string, AiItemJudgment> }>(
      COLLECTIONS.guests,
      responseId
    );
    return doc?.ai_judgments ?? null;
  }
  const store = await readJsonStore();
  const entry = store.ai_judgments.find((item) => item.response_id === responseId);
  return entry ? entry.judgments : null;
}

export async function saveResponseJudgments(
  responseId: string,
  judgments: Record<string, AiItemJudgment>
): Promise<void> {
  const computed_at = new Date().toISOString();
  if (useFirestore()) {
    await ensureFirestoreSeed();
    await patchDocument(COLLECTIONS.guests, responseId, {
      ai_judgments: judgments,
      ai_judgments_computed_at: computed_at,
    });
    return;
  }
  const entry: ResponseItemJudgments = { response_id: responseId, computed_at, judgments };
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.ai_judgments = store.ai_judgments.filter((item) => item.response_id !== responseId);
    store.ai_judgments.push(entry);
    await persistJson(store);
  });
}

export async function saveRestaurantScores(scores: RestaurantScoreDoc[]): Promise<void> {
  if (scores.length === 0) return;
  if (useFirestore()) {
    await ensureFirestoreSeed();
    await commitWrites(
      scores.map((score) => ({
        collection: COLLECTIONS.restaurant_scores,
        id: scoreDocId(score.event_id, score.restaurant_id),
        data: { ...score },
      }))
    );
    return;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    const eventId = scores[0]?.event_id;
    store.restaurant_scores = store.restaurant_scores.filter((score) => score.event_id !== eventId);
    store.restaurant_scores.push(...scores);
    await persistJson(store);
  });
}
