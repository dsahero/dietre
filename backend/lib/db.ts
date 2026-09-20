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
  deleteDocuments,
  getDocument,
  hasFirestore,
  listDocuments,
  patchDocument,
  queryByPrefix,
  queryDocuments,
  setDocument,
} from "@/backend/lib/firestore";
import { haversineMiles } from "@/shared/lib/places";
import type {
  AiItemJudgment,
  DataStore,
  DietResponse,
  DietreEvent,
  EventInvite,
  HostRecord,
  MenuItem,
  Restaurant,
  ResponseItemJudgments,
} from "@/shared/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

type JsonStore = DataStore & { restaurant_scores: RestaurantScoreDoc[]; event_invites: EventInvite[] };

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
    event_invites: [],
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
 * Optional demo seed, gated behind DIETRE_SEED=1 — set it and this loads
 * backend/data/seed.ts into Firestore or the JSON store; unset (the
 * default), every call below is a single cheap env check and a no-op, so
 * production/other deployments are unaffected. Checked once per process
 * (see ensureDemoSeedChecked) rather than on every single db call — that
 * blanket "check every hit" pattern is exactly what an earlier pass here
 * deliberately removed, and re-adding it wholesale would undo that.
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
  if (SEED_RESTAURANTS.length === 0) return false;

  const { menuItemToDoc, restaurantToDoc } = await import("@/backend/lib/collections");

  if (useFirestore()) {
    // Version 2: the original marker was written even on the "restaurants
    // already exist, skip" branch below — meaning a transient non-empty
    // read (someone else's data momentarily present, then gone) would
    // permanently block every future seed attempt, since the marker check
    // above short-circuits before ever re-checking "existing" again. That
    // is exactly what happened once already. Writes here are upserts keyed
    // by this file's own fixed ids (rest-gillies, etc.), so there's no real
    // risk in just seeding directly rather than first checking whether
    // *some* restaurant happens to already exist.
    const marker = await getDocument<{ version?: number }>("_meta", "seed");
    if ((marker?.version ?? 0) >= 2) return false;

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
      data: { version: 2, seeded_at: new Date().toISOString() },
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

// Runs seedDemoDataIfEnabled() at most once per server process, from the
// handful of read paths a fresh demo actually needs (restaurants, menu
// items, event lookup) rather than from every exported function the way
// ensureFirestoreSeed() used to. With DIETRE_SEED unset this is one boolean
// check; with it set, later calls in the same process skip straight past
// without even that, since the underlying function is itself idempotent
// but still async.
let demoSeedChecked = false;
async function ensureDemoSeedChecked(): Promise<void> {
  if (demoSeedChecked) return;
  demoSeedChecked = true;
  await seedDemoDataIfEnabled();
}

export async function listRestaurants(): Promise<Restaurant[]> {
  await ensureDemoSeedChecked();
  if (useFirestore()) {
    const docs = await listDocuments(COLLECTIONS.restaurants);
    return docs.map((doc) => docToRestaurant(doc.id, doc));
  }
  return (await readJsonStore()).restaurants;
}

/**
 * The restaurants belonging to one event. Uses the event's own candidate list;
 * events that don't have one yet (legacy) fall back to the shared pool
 * filtered by distance so they never render blank.
 */
export async function listRestaurantsForEvent(event: DietreEvent): Promise<Restaurant[]> {
  const all = await listRestaurants();
  const ids = event.candidate_restaurant_ids;
  if (ids && ids.length > 0) {
    const wanted = new Set(ids);
    return all.filter(
      (restaurant) => wanted.has(restaurant.id) || (restaurant.alias_ids ?? []).some((alias) => wanted.has(alias))
    );
  }
  return all.filter((restaurant) => haversineMiles(event, restaurant) <= event.radius + 0.05);
}

export async function listMenuItems(): Promise<MenuItem[]> {
  await ensureDemoSeedChecked();
  if (useFirestore()) {
    const docs = await listDocuments(COLLECTIONS.menu_items);
    return docs.map((doc) => docToMenuItem(doc.id, doc));
  }
  return (await readJsonStore()).menu_items;
}

/**
 * Upsert freshly-discovered restaurants (Google Places) into whichever store
 * is active. Existing menu_item_ids are preserved so a repeat discovery run
 * for the same spot never wipes menu data a future pipeline attaches later.
 */
export async function upsertRestaurants(restaurants: Restaurant[]): Promise<Restaurant[]> {
  if (!restaurants.length) return [];
  const { restaurantToDoc } = await import("@/backend/lib/collections");

  if (useFirestore()) {
    // One read of the collection, indexed by Google place id (also derived
    // from the older opaque `google-<placeId>` doc ids).
    const existing = await listDocuments<Record<string, unknown>>(COLLECTIONS.restaurants);
    const byPlaceId = new Map<string, (typeof existing)[number]>();
    for (const doc of existing) {
      const placeId =
        typeof doc.google_place_id === "string"
          ? doc.google_place_id
          : doc.id.startsWith("google-")
            ? doc.id.slice("google-".length)
            : null;
      if (placeId) byPlaceId.set(placeId, doc);
    }

    const toDelete: string[] = [];
    const writes: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];
    const result: Restaurant[] = [];
    for (const restaurant of restaurants) {
      const placeId = restaurant.google_place_id;
      const old = placeId ? byPlaceId.get(placeId) : undefined;
      // Replacing a doc must not forget its menu state.
      const merged: Restaurant = old
        ? {
            ...restaurant,
            menu_status: restaurant.menu_status ?? menuStatusOf(old.menu_status),
            menu_checked_at:
              restaurant.menu_checked_at ?? (typeof old.menu_checked_at === "string" ? old.menu_checked_at : undefined),
          }
        : restaurant;
      result.push(merged);
      if (old && old.id === restaurant.id && sameRestaurantFields(old, restaurant)) continue;
      if (old && old.id !== restaurant.id) toDelete.push(old.id);
      writes.push({
        collection: COLLECTIONS.restaurants,
        id: restaurant.id,
        data: restaurantToDoc(merged, asStringArray(old?.menu_item_ids)),
      });
    }
    for (const id of toDelete) await deleteDocument(COLLECTIONS.restaurants, id);
    if (writes.length) await commitWrites(writes);
    return result;
  }

  let jsonResult: Restaurant[] = restaurants;
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    const incomingPlaceIds = new Set(restaurants.map((r) => r.google_place_id).filter(Boolean));
    const incomingIds = new Set(restaurants.map((r) => r.id));
    const previous = new Map<string, Restaurant>();
    const kept = store.restaurants.filter((existing) => {
      const placeId = existing.google_place_id ?? (existing.id.startsWith("google-") ? existing.id.slice(7) : null);
      if (incomingIds.has(existing.id) || (placeId && incomingPlaceIds.has(placeId))) {
        previous.set(placeId ?? existing.id, existing);
        return false;
      }
      return true;
    });
    jsonResult = restaurants.map((restaurant) => {
      const old = previous.get(restaurant.google_place_id ?? restaurant.id);
      return old
        ? {
            ...restaurant,
            menu_status: restaurant.menu_status ?? old.menu_status,
            menu_checked_at: restaurant.menu_checked_at ?? old.menu_checked_at,
          }
        : restaurant;
    });
    store.restaurants = [...kept, ...jsonResult];
    await persistJson(store);
  });
  return jsonResult;
}

/**
 * Replace one restaurant's menu items (delete the old ones, write the new)
 * and record the menu state on the restaurant doc. With no items — a failed
 * or empty scrape — existing items are left alone and only the status is
 * recorded, so a bad run never erases a good menu.
 */
export async function upsertMenuItems(
  restaurantId: string,
  items: MenuItem[],
  status: "ready" | "none" | "failed",
  menuUrls?: { kind: "pdf" | "html"; label: string; url: string }[]
): Promise<void> {
  const checkedAt = new Date().toISOString();
  const finalStatus = items.length === 0 && status === "ready" ? "none" : status;

  if (useFirestore()) {
    const { menuItemToDoc } = await import("@/backend/lib/collections");
    const restaurantPatch: Record<string, unknown> = { menu_status: finalStatus, menu_checked_at: checkedAt };
    if (menuUrls && menuUrls.length > 0) restaurantPatch.menu_urls = menuUrls;
    if (items.length > 0) {
      const keep = new Set(items.map((item) => item.id));
      const existing = await queryDocuments(COLLECTIONS.menu_items, "restaurant_id", "EQUAL", restaurantId);
      for (const doc of existing) {
        if (!keep.has(doc.id)) await deleteDocument(COLLECTIONS.menu_items, doc.id);
      }
      await commitWrites(
        items.map((item) => ({ collection: COLLECTIONS.menu_items, id: item.id, data: menuItemToDoc(item) }))
      );
      restaurantPatch.menu_item_ids = items.map((item) => item.id);
    }
    await patchDocument(COLLECTIONS.restaurants, restaurantId, restaurantPatch);
    return;
  }

  await enqueueWrite(async () => {
    const store = await readJsonStore();
    if (items.length > 0) {
      store.menu_items = [...store.menu_items.filter((item) => item.restaurant_id !== restaurantId), ...items];
    }
    const restaurant = store.restaurants.find((r) => r.id === restaurantId);
    if (restaurant) {
      restaurant.menu_status = finalStatus;
      restaurant.menu_checked_at = checkedAt;
      if (menuUrls && menuUrls.length > 0) restaurant.menu_urls = menuUrls;
    }
    await persistJson(store);
  });
}

function menuStatusOf(value: unknown): Restaurant["menu_status"] {
  return value === "pending" || value === "ready" || value === "none" || value === "failed" ? value : undefined;
}

function sameRestaurantFields(doc: Record<string, unknown>, restaurant: Restaurant): boolean {
  return (
    doc.name === restaurant.name &&
    doc.location === restaurant.location &&
    doc.cuisine === restaurant.cuisine &&
    doc.price_level === restaurant.price_level &&
    doc.lat === restaurant.lat &&
    doc.lng === restaurant.lng &&
    (doc.website || undefined) === (restaurant.website || undefined)
  );
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Keep candidate ids that still resolve to a restaurant doc (or menu_items).
 * When the restaurants collection is empty, returns [] so seed leftovers like
 * rest-bennys are stripped from events.
 */
export async function filterValidCandidateRestaurantIds(ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const restaurants = await listRestaurants();
  if (restaurants.length === 0) return [];
  const known = new Set(restaurants.flatMap((restaurant) => [restaurant.id, ...(restaurant.alias_ids ?? [])]));
  const menuItems = await listMenuItems();
  for (const item of menuItems) {
    if (item.restaurant_id) known.add(item.restaurant_id);
  }
  return ids.filter((id) => known.has(id));
}

function candidateIdsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * Strip missing / seed candidate_restaurant_ids on one event document.
 * No-op when already clean. Safe to call on every event read/list.
 */
export async function scrubEventCandidateRestaurantIds(
  eventId: string,
  currentIds?: string[]
): Promise<string[]> {
  if (!eventId) return [];

  let ids = currentIds;
  if (ids === undefined) {
    if (useFirestore()) {
      const doc = await getDocument<Record<string, unknown>>(COLLECTIONS.events, eventId);
      ids = asStringArray(doc?.candidate_restaurant_ids);
    } else {
      // JSON DietreEvent rows do not store candidates.
      return [];
    }
  }

  const next = await filterValidCandidateRestaurantIds(ids);
  if (candidateIdsEqual(ids, next)) return next;

  if (useFirestore()) {
    await patchDocument(COLLECTIONS.events, eventId, { candidate_restaurant_ids: next });
  }
  return next;
}

async function resolveScoreableRestaurantIds(): Promise<Set<string> | null> {
  const restaurants = await listRestaurants();
  // Empty restaurants store → nothing is scoreable (clear all scores).
  if (restaurants.length === 0) return null;
  const known = new Set(restaurants.map((restaurant) => restaurant.id));
  const menuItems = await listMenuItems();
  for (const item of menuItems) {
    if (item.restaurant_id) known.add(item.restaurant_id);
  }
  return known;
}


export async function listEventsByHost(hostId: string, email?: string): Promise<DietreEvent[]> {
  const hostIds = new Set<string>([hostId]);
  if (email?.trim()) {
    hostIds.add(hostIdFromEmail(email.trim().toLowerCase()));
  }

  if (useFirestore()) {
    const allDocs: Array<Record<string, unknown> & { id: string }> = [];
    const seenEventIds = new Set<string>();

    for (const hId of hostIds) {
      const docs = await queryDocuments(COLLECTIONS.events, "organizer_id", "EQUAL", hId);
      for (const d of docs) {
        if (!seenEventIds.has(d.id)) {
          seenEventIds.add(d.id);
          allDocs.push(d as Record<string, unknown> & { id: string });
        }
      }
    }

    // One-shot hygiene: strip seed/missing candidate_restaurant_ids while listing.
    await Promise.all(
      allDocs.map((doc) =>
        scrubEventCandidateRestaurantIds(doc.id, asStringArray(doc.candidate_restaurant_ids))
      )
    );

    // Events other people shared with this account: one array-contains query.
    const sharedEmail = email?.trim().toLowerCase();
    if (sharedEmail) {
      const shared = await queryDocuments(COLLECTIONS.events, "collaborator_emails", "ARRAY_CONTAINS", sharedEmail);
      for (const d of shared) {
        if (!seenEventIds.has(d.id)) {
          seenEventIds.add(d.id);
          allDocs.push(d as Record<string, unknown> & { id: string });
        }
      }
    }
    return allDocs
      .map((doc) => docToEvent(doc.id, doc))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const store = await readJsonStore();
  const sharedEmail = email?.trim().toLowerCase();
  return store.events
    .filter(
      (event) =>
        hostIds.has(event.host_id) || Boolean(sharedEmail && (event.collaborator_emails ?? []).includes(sharedEmail))
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** One document read, no restaurant/menu scrubbing — for endpoints that only need the event itself. */
export async function getEventLean(id: string): Promise<DietreEvent | null> {
  if (useFirestore()) {
    const doc = await getDocument(COLLECTIONS.events, id);
    return doc ? docToEvent(doc.id, doc) : null;
  }
  return (await readJsonStore()).events.find((event) => event.id === id) ?? null;
}

/** Registered accounts whose email starts with `prefix` (typeahead). */
export async function searchHostsByEmailPrefix(prefix: string, limit = 5): Promise<Array<{ email: string; name: string }>> {
  const needle = prefix.trim().toLowerCase();
  if (needle.length < 3) return [];
  if (useFirestore()) {
    const docs = await queryByPrefix<{ email?: string; name?: string }>(COLLECTIONS.organizers, "email", needle, limit);
    return docs
      .filter((doc) => typeof doc.email === "string" && doc.email)
      .map((doc) => ({ email: String(doc.email), name: String(doc.name ?? "") }));
  }
  return (await readJsonStore()).hosts
    .filter((host) => host.email.toLowerCase().startsWith(needle))
    .slice(0, limit)
    .map((host) => ({ email: host.email, name: host.name }));
}

export function inviteDocId(email: string, eventId: string): string {
  return `${email.trim().toLowerCase()}__${eventId}`;
}

export async function createInvite(invite: Omit<EventInvite, "id">): Promise<EventInvite> {
  const full: EventInvite = { ...invite, email: invite.email.trim().toLowerCase(), id: inviteDocId(invite.email, invite.event_id) };
  if (useFirestore()) {
    const { id, ...data } = full;
    await setDocument(COLLECTIONS.event_invites, id, data);
    return full;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.event_invites = [...store.event_invites.filter((item) => item.id !== full.id), full];
    await persistJson(store);
  });
  return full;
}

export async function listInvitesForEmail(email: string): Promise<EventInvite[]> {
  const needle = email.trim().toLowerCase();
  if (!needle) return [];
  if (useFirestore()) {
    const docs = await queryDocuments<Record<string, unknown>>(COLLECTIONS.event_invites, "email", "EQUAL", needle);
    return docs.map((doc) => ({
      id: doc.id,
      email: String(doc.email ?? needle),
      event_id: String(doc.event_id ?? ""),
      event_name: String(doc.event_name ?? ""),
      invited_by_id: String(doc.invited_by_id ?? ""),
      invited_by_name: String(doc.invited_by_name ?? ""),
      invited_at: String(doc.invited_at ?? ""),
    }));
  }
  return (await readJsonStore()).event_invites.filter((invite) => invite.email === needle);
}

export async function getInvite(id: string): Promise<EventInvite | null> {
  if (useFirestore()) {
    const doc = await getDocument<Record<string, unknown>>(COLLECTIONS.event_invites, id);
    if (!doc) return null;
    return {
      id: doc.id,
      email: String(doc.email ?? ""),
      event_id: String(doc.event_id ?? ""),
      event_name: String(doc.event_name ?? ""),
      invited_by_id: String(doc.invited_by_id ?? ""),
      invited_by_name: String(doc.invited_by_name ?? ""),
      invited_at: String(doc.invited_at ?? ""),
    };
  }
  return (await readJsonStore()).event_invites.find((invite) => invite.id === id) ?? null;
}

export async function deleteInvite(id: string): Promise<void> {
  if (useFirestore()) {
    await deleteDocument(COLLECTIONS.event_invites, id);
    return;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.event_invites = store.event_invites.filter((invite) => invite.id !== id);
    await persistJson(store);
  });
}

/**
 * Delete an event and everything hanging off it. Queries guests and scores once
 * each and removes them with batched commits instead of one call per doc.
 */
export async function deleteEventCascade(event: DietreEvent): Promise<void> {
  const invitedEmails = (event.pending_invites ?? []).map((invite) => invite.email);
  if (useFirestore()) {
    const [guests, scores] = await Promise.all([
      queryDocuments(COLLECTIONS.guests, "event_id", "EQUAL", event.id),
      queryDocuments(COLLECTIONS.restaurant_scores, "event_id", "EQUAL", event.id),
    ]);
    await Promise.all([
      deleteDocuments(COLLECTIONS.guests, guests.map((doc) => doc.id)),
      deleteDocuments(COLLECTIONS.restaurant_scores, scores.map((doc) => doc.id)),
      deleteDocuments(
        COLLECTIONS.event_invites,
        invitedEmails.map((email) => inviteDocId(email, event.id))
      ),
    ]);
    await deleteDocument(COLLECTIONS.events, event.id);
    const organizer = await getDocument<{ events?: string[] }>(COLLECTIONS.organizers, event.host_id);
    if (organizer && Array.isArray(organizer.events) && organizer.events.includes(event.id)) {
      await patchDocument(COLLECTIONS.organizers, event.host_id, {
        events: organizer.events.filter((id) => id !== event.id),
      });
    }
    return;
  }
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    store.events = store.events.filter((item) => item.id !== event.id);
    store.responses = store.responses.filter((item) => item.event_id !== event.id);
    store.restaurant_scores = store.restaurant_scores.filter((item) => item.event_id !== event.id);
    store.event_invites = store.event_invites.filter((item) => item.event_id !== event.id);
    await persistJson(store);
  });
}

export async function getEvent(id: string): Promise<DietreEvent | null> {
  await ensureDemoSeedChecked();
  if (useFirestore()) {
    const byId = await getDocument(COLLECTIONS.events, id);
    if (byId) {
      await scrubEventCandidateRestaurantIds(
        byId.id,
        asStringArray((byId as Record<string, unknown>).candidate_restaurant_ids)
      );
      return docToEvent(byId.id, byId);
    }
    const byToken = await queryDocuments(COLLECTIONS.events, "link_token", "EQUAL", id);
    if (!byToken[0]) return null;
    await scrubEventCandidateRestaurantIds(
      byToken[0].id,
      asStringArray((byToken[0] as Record<string, unknown>).candidate_restaurant_ids)
    );
    return docToEvent(byToken[0].id, byToken[0]);
  }
  return (await readJsonStore()).events.find((event) => event.id === id) ?? null;
}

export async function createEvent(event: DietreEvent): Promise<DietreEvent> {
  if (useFirestore()) {
    // Never invent seed restaurant ids — candidates start empty until acquisition.
    await setDocument(COLLECTIONS.events, event.id, eventToDoc(event, event.candidate_restaurant_ids ?? []));
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
      | "budget_per_person"
      | "expected_headcount"
      | "limitations"
      | "limitations_checklist"
      | "checklist_notes_by_restaurant"
      | "complex_notes_by_restaurant"
      | "complex_notes_signature"
      | "google_place_id"
      | "preference_signals"
      | "preference_signals_signature"
      | "ai_overview"
      | "ai_overview_signature"
      | "candidate_restaurant_ids"
      | "collaborators"
      | "pending_invites"
      | "collaborator_emails"
      | "restaurants_version"
    >
  >
): Promise<DietreEvent | null> {
  if (useFirestore()) {
    const updated = await patchDocument(COLLECTIONS.events, id, eventPatchToDoc(patch));
    if (!updated) return null;
    await scrubEventCandidateRestaurantIds(
      id,
      asStringArray((updated as Record<string, unknown>).candidate_restaurant_ids)
    );
    return docToEvent(id, updated);
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

/** Patch an event without the restaurant/menu scrub updateEvent runs (one write, no extra reads). */
export async function patchEventLean(
  id: string,
  patch: Partial<
    Pick<
      DietreEvent,
      "collaborators" | "pending_invites" | "collaborator_emails" | "candidate_restaurant_ids" | "restaurants_version"
    >
  >
): Promise<DietreEvent | null> {
  if (useFirestore()) {
    const updated = await patchDocument(COLLECTIONS.events, id, eventPatchToDoc(patch));
    return updated ? docToEvent(id, updated) : null;
  }
  let result: DietreEvent | null = null;
  await enqueueWrite(async () => {
    const store = await readJsonStore();
    const event = store.events.find((item) => item.id === id);
    if (event) {
      Object.assign(event, patch);
      result = event;
      await persistJson(store);
    }
  });
  return result;
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
        overall_score: Number(doc.overall_score ?? doc.weighted_coverage_pct ?? 0),
        computed_at: String(doc.computed_at ?? ""),
      }));
  }
  return (await readJsonStore()).restaurant_scores.filter((score) => score.event_id === eventId);
}

/**
 * Replace all restaurant_scores for one event. Pass an empty array to clear
 * (empty event / no guests → empty scores). Never mixes scores across events.
 *
 * When the restaurants collection is empty, wipe **every** restaurant_scores
 * document (list-all + delete). Query-by-event_id alone can miss leftover
 * docs (wrong/missing event_id, or console junk like `{event}__rest-bennys`).
 */
export async function saveRestaurantScores(
  scores: RestaurantScoreDoc[],
  eventId?: string
): Promise<void> {
  const eid = (eventId ?? scores[0]?.event_id)?.trim();
  if (!eid) return;
  // Reject accidental cross-event writes and phantom restaurant ids
  // (e.g. seed rest-bennys after restaurants were wiped).
  const scoreable = await resolveScoreableRestaurantIds();

  // Empty restaurants → hard-clear the entire scores collection.
  if (scoreable === null) {
    if (useFirestore()) {
      const all = await listDocuments(COLLECTIONS.restaurant_scores);
      for (const doc of all) {
        await deleteDocument(COLLECTIONS.restaurant_scores, doc.id);
      }
    } else {
      await enqueueWrite(async () => {
        const store = await readJsonStore();
        store.restaurant_scores = [];
        await persistJson(store);
      });
    }
    return;
  }

  const scoped = scores.filter(
    (score) => score.event_id === eid && scoreable.has(score.restaurant_id)
  );

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
