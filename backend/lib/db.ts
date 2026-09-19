import { promises as fs } from "fs";
import path from "path";
import { hostIdFromEmail } from "@/backend/lib/auth";
import {
  docToEvent,
  docToMenuItem,
  docToResponse,
  docToRestaurant,
  eventPatchToDoc,
  eventToDoc,
  hostToOrganizer,
  organizerToHost,
  responseToGuest,
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

async function readJsonStore(): Promise<JsonStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return { ...emptyStore(), ...(JSON.parse(raw) as Partial<JsonStore>) };
  } catch {
    const store = emptyStore();
    await persistJson(store);
    return store;
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

function useFirestore(): boolean {
  return hasFirestore();
}

export function backendLabel(): "firestore" | "local-json" {
  return useFirestore() ? "firestore" : "local-json";
}

/**
 * Optional demo seed for local demos only. Never called automatically.
 * Set DIETRE_SEED=1 and invoke explicitly (e.g. a one-off script) to load
 * backend/data/seed.ts into Firestore or the JSON store.
 */
export async function seedDemoDataIfEnabled(): Promise<boolean> {
  if (process.env.DIETRE_SEED !== "1") return false;

  const {
    SEED_EVENT_RESPONSES,
    SEED_EVENTS,
    SEED_HOSTS,
    SEED_MENU_ITEMS,
    SEED_RESTAURANTS,
  } = await import("@/backend/data/seed");
  const { menuItemToDoc, restaurantToDoc } = await import("@/backend/lib/collections");

  if (useFirestore()) {
    const marker = await getDocument<{ version?: number }>("_meta", "seed");
    if (marker?.version) return false;

    const existing = await listDocuments(COLLECTIONS.restaurants);
    if (existing.length > 0) {
      await setDocument("_meta", "seed", { version: 1, seeded_at: new Date().toISOString() });
      return false;
    }

    const menuIds = new Map<string, string[]>();
    for (const item of SEED_MENU_ITEMS) {
      const list = menuIds.get(item.restaurant_id) ?? [];
      list.push(item.id);
      menuIds.set(item.restaurant_id, list);
    }
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
    return true;
  }

  await enqueueWrite(async () => {
    const store = await readJsonStore();
    const existingEventIds = new Set(store.events.map((event) => event.id));
    const existingResponseIds = new Set(store.responses.map((response) => response.id));
    const existingHostIds = new Set(store.hosts.map((host) => host.host_id));
    store.restaurants = SEED_RESTAURANTS;
    store.menu_items = SEED_MENU_ITEMS;
    store.events = [
      ...SEED_EVENTS.filter((event) => !existingEventIds.has(event.id)),
      ...store.events,
    ];
    store.responses = [
      ...store.responses,
      ...SEED_EVENT_RESPONSES.filter((response) => !existingResponseIds.has(response.id)),
    ];
    store.hosts = [
      ...store.hosts,
      ...SEED_HOSTS.filter((host) => !existingHostIds.has(host.host_id)),
    ];
    await persistJson(store);
  });
  return true;
}

export async function listRestaurants(): Promise<Restaurant[]> {
  if (useFirestore()) {
    const docs = await listDocuments(COLLECTIONS.restaurants);
    return docs.map((doc) => docToRestaurant(doc.id, doc));
  }
  return (await readJsonStore()).restaurants;
}

export async function listMenuItems(): Promise<MenuItem[]> {
  if (useFirestore()) {
    const docs = await listDocuments(COLLECTIONS.menu_items);
    return docs.map((doc) => docToMenuItem(doc.id, doc));
  }
  return (await readJsonStore()).menu_items;
}

export async function listEventsByHost(hostId: string): Promise<DietreEvent[]> {
  if (useFirestore()) {
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
    const byId = await getDocument(COLLECTIONS.events, id);
    if (byId) return docToEvent(byId.id, byId);
    const byToken = await queryDocuments(COLLECTIONS.events, "link_token", "EQUAL", id);
    return byToken[0] ? docToEvent(byToken[0].id, byToken[0]) : null;
  }
  return (await readJsonStore()).events.find((event) => event.id === id) ?? null;
}

export async function createEvent(event: DietreEvent): Promise<DietreEvent> {
  if (useFirestore()) {
    // Candidate restaurants come from live acquisition later — start empty.
    await setDocument(COLLECTIONS.events, event.id, eventToDoc(event, []));
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
  if (!eventId) return [];
  if (useFirestore()) {
    const docs = await queryDocuments(COLLECTIONS.guests, "event_id", "EQUAL", eventId);
    return docs
      .map((doc) => docToResponse(doc.id, doc))
      .filter((response) => response.event_id === eventId)
      .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
  }
  return (await readJsonStore()).responses
    .filter((response) => response.event_id === eventId)
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
}

export async function createResponse(response: DietResponse): Promise<DietResponse> {
  if (!response.event_id?.trim()) {
    throw new Error("Guest response requires event_id");
  }
  // Normalize so stored guests always carry the event association.
  const normalized: DietResponse = {
    ...response,
    event_id: response.event_id.trim(),
  };

  if (useFirestore()) {
    await setDocument(COLLECTIONS.guests, normalized.id, responseToGuest(normalized));
  } else {
    await enqueueWrite(async () => {
      const store = await readJsonStore();
      store.responses.push(normalized);
      await persistJson(store);
    });
  }

  // Asynchronously update the single event complex context file
  void (async () => {
    try {
      const event = await getEvent(normalized.event_id);
      if (event) {
        const allResponses = await listResponses(normalized.event_id);
        const { saveEventComplexContext } = await import("@/backend/lib/eventContext");
        await saveEventComplexContext(event, allResponses);
      }
    } catch (e) {
      console.warn("Event complex context background write failed:", e);
    }
  })();

  return normalized;
}

export async function getHost(hostId: string): Promise<HostRecord | null> {
  if (useFirestore()) {
    const doc = await getDocument(COLLECTIONS.organizers, hostId);
    return doc ? organizerToHost(doc.id, doc) : null;
  }
  return (await readJsonStore()).hosts.find((host) => host.host_id === hostId) ?? null;
}

export async function getHostByEmail(email: string): Promise<HostRecord | null> {
  const normalized = email.trim().toLowerCase();
  if (useFirestore()) {
    const matches = await queryDocuments(COLLECTIONS.organizers, "email", "EQUAL", normalized);
    if (matches[0]) return organizerToHost(matches[0].id, matches[0]);
    return getHost(hostIdFromEmail(normalized));
  }
  return getHost(hostIdFromEmail(normalized));
}

export async function createHost(host: HostRecord): Promise<HostRecord> {
  if (useFirestore()) {
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
// immutable once submitted), so a dashboard reload never re-pays for the
// same Gemini call.
export async function getResponseJudgments(responseId: string): Promise<Record<string, AiItemJudgment> | null> {
  if (useFirestore()) {
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

export async function listRestaurantScores(eventId: string): Promise<RestaurantScoreDoc[]> {
  if (!eventId) return [];
  if (useFirestore()) {
    const docs = await queryDocuments(COLLECTIONS.restaurant_scores, "event_id", "EQUAL", eventId);
    return docs
      .map((doc) => doc as RestaurantScoreDoc & { id: string })
      .filter((doc) => doc.event_id === eventId && typeof doc.restaurant_id === "string")
      .map((doc) => ({
        event_id: eventId,
        restaurant_id: doc.restaurant_id,
        per_guest_scores: doc.per_guest_scores ?? {},
        group_scores: {
          utilitarian: Number(doc.group_scores?.utilitarian ?? 0),
          rawlsian_min: Number(doc.group_scores?.rawlsian_min ?? 0),
        },
        conflicts: Array.isArray(doc.conflicts) ? doc.conflicts : [],
        ranks: {
          utilitarian: Number(doc.ranks?.utilitarian ?? 0),
          rawlsian: Number(doc.ranks?.rawlsian ?? 0),
        },
        coverage_pct: Number(doc.coverage_pct ?? 0),
        weighted_coverage_pct: Number(doc.weighted_coverage_pct ?? 0),
        computed_at: String(doc.computed_at ?? ""),
      }));
  }
  return (await readJsonStore()).restaurant_scores.filter((score) => score.event_id === eventId);
}

/**
 * Replace all restaurant_scores for one event. Pass an empty array to clear
 * (empty event / no guests → empty scores). Never mixes scores across events.
 */
export async function saveRestaurantScores(
  scores: RestaurantScoreDoc[],
  eventId?: string
): Promise<void> {
  const eid = (eventId ?? scores[0]?.event_id)?.trim();
  if (!eid) return;
  // Reject accidental cross-event writes.
  const scoped = scores.filter((score) => score.event_id === eid);

  if (useFirestore()) {
    const existing = await queryDocuments(COLLECTIONS.restaurant_scores, "event_id", "EQUAL", eid);
    const nextIds = new Set(scoped.map((score) => scoreDocId(score.event_id, score.restaurant_id)));
    for (const old of existing) {
      if (!nextIds.has(old.id)) {
        await deleteDocument(COLLECTIONS.restaurant_scores, old.id);
      }
    }
    if (scoped.length > 0) {
      await commitWrites(
        scoped.map((score) => ({
          collection: COLLECTIONS.restaurant_scores,
          id: scoreDocId(score.event_id, score.restaurant_id),
          data: { ...score },
        }))
      );
    }
    return;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.restaurant_scores = store.restaurant_scores.filter((score) => score.event_id !== eid);
    store.restaurant_scores.push(...scoped);
    await persistJson(store);
  });
}
