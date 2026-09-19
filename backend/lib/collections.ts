import { allergenFlagsFromMenu, dietaryCompatibleFromMenu } from "@/backend/lib/parser";
import type {
  AiItemJudgment,
  DietResponse,
  DietreEvent,
  HostRecord,
  MenuItem,
  ParsedRules,
  Restaurant,
  Severity,
} from "@/shared/lib/types";

export type GeoJsonPoint = { type: "Point"; coordinates: [number, number] };

export type OrganizerDoc = {
  email: string;
  name: string;
  password_hash?: string;
  created_at: string;
  updated_at?: string;
  events: string[];
  avatar_data_url?: string;
  provider: HostRecord["provider"];
};

export type EventDoc = {
  organizer_id: string;
  name: string;
  mode: "delivery" | "dine_in";
  budget_mode: "event_pays" | "individual_pays";
  event_budget: number | null;
  link_token: string;
  status: "collecting" | "reviewing" | "finalized";
  fairness_mode: "utilitarian" | "rawlsian";
  created_at: string;
  event_date: string;
  guest_count_invited: number;
  candidate_restaurant_ids: string[];
  location: GeoJsonPoint;
  location_label: string;
  radius_miles: number;
  budget_range: DietreEvent["budget_range"];
  lat: number;
  lng: number;
  limitations?: string;
  limitations_checklist?: DietreEvent["limitations_checklist"];
  checklist_notes_by_restaurant?: DietreEvent["checklist_notes_by_restaurant"];
};

export type GuestDoc = {
  event_id: string;
  anon_token: string;
  name?: string;
  email?: string;
  transcript: string;
  raw_text: string;
  parsed_rules: ParsedRules;
  preference_vector: string[];
  confidence: number;
  conflict_followups: string[];
  contact_email?: string;
  submitted_at: string;
  ai_judgments?: Record<string, AiItemJudgment>;
  ai_judgments_computed_at?: string;
};

export type RestaurantDoc = Restaurant & {
  location_geo: GeoJsonPoint;
  data_source: {
    tier: 1 | 2 | 3;
    google_place_id?: string | null;
    yelp_id?: string | null;
  };
  accessibility: { dine_in: boolean; is_preliminary: true };
  review_evidence: string[];
  menu_item_ids: string[];
};

export type MenuItemDoc = MenuItem & {
  status: "ready" | "pending";
  retrieval_confidence: MenuItem["confidence"];
  allergen_flags: ReturnType<typeof allergenFlagsFromMenu>;
  dietary_compatible: ReturnType<typeof dietaryCompatibleFromMenu>;
  needs_human_review: boolean;
};

export type RestaurantScoreDoc = {
  event_id: string;
  restaurant_id: string;
  per_guest_scores: Record<string, number>;
  group_scores: { utilitarian: number; rawlsian_min: number };
  conflicts: Array<{ guest_id: string; hard_excludes: string[] }>;
  ranks: { utilitarian: number; rawlsian: number };
  coverage_pct: number;
  weighted_coverage_pct: number;
  computed_at: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function geoPoint(lng: number, lat: number): GeoJsonPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

export function guestConfidence(severity: Severity): number {
  if (severity === "high") return 0.95;
  if (severity === "medium") return 0.75;
  return 0.5;
}

export function organizerToHost(id: string, doc: Partial<OrganizerDoc> & Record<string, unknown>): HostRecord {
  return {
    host_id: asString(doc.host_id, id),
    email: asString(doc.email),
    name: asString(doc.name, asString(doc.email)),
    avatar_data_url: typeof doc.avatar_data_url === "string" ? doc.avatar_data_url : undefined,
    password_hash: typeof doc.password_hash === "string" ? doc.password_hash : undefined,
    provider: doc.provider === "firebase" ? "firebase" : "mock",
    created_at: asString(doc.created_at, new Date().toISOString()),
    updated_at: asString(doc.updated_at, asString(doc.created_at, new Date().toISOString())),
  };
}

export function hostToOrganizer(host: HostRecord, eventIds: string[] = []): Record<string, unknown> {
  return {
    email: host.email,
    name: host.name,
    password_hash: host.password_hash ?? null,
    created_at: host.created_at,
    updated_at: host.updated_at,
    events: eventIds,
    avatar_data_url: host.avatar_data_url ?? null,
    provider: host.provider,
  };
}

export function eventToDoc(event: DietreEvent, restaurantIds: string[] = []): Record<string, unknown> {
  return {
    organizer_id: event.host_id,
    name: event.name,
    mode: "dine_in",
    budget_mode: "individual_pays",
    event_budget: null,
    link_token: event.id,
    status: "collecting",
    fairness_mode: "utilitarian",
    created_at: event.created_at,
    event_date: event.date,
    guest_count_invited: event.expected_headcount,
    candidate_restaurant_ids: restaurantIds,
    location: geoPoint(event.lng, event.lat),
    location_label: event.location,
    radius_miles: event.radius,
    budget_range: event.budget_range,
    lat: event.lat,
    lng: event.lng,
    limitations: event.limitations ?? null,
    limitations_checklist: event.limitations_checklist ?? [],
    checklist_notes_by_restaurant: event.checklist_notes_by_restaurant ?? {},
    complex_notes_by_restaurant: event.complex_notes_by_restaurant ?? {},
    complex_notes_signature: event.complex_notes_signature ?? "",
  };
}

export function docToEvent(id: string, doc: Record<string, unknown>): DietreEvent {
  const location = asRecord(doc.location);
  const coords = Array.isArray(location.coordinates) ? location.coordinates : [];
  const lng = asNumber(doc.lng, asNumber(coords[0]));
  const lat = asNumber(doc.lat, asNumber(coords[1]));
  const budget = doc.budget_range;
  return {
    id: asString(doc.id, id),
    host_id: asString(doc.organizer_id, asString(doc.host_id)),
    name: asString(doc.name),
    date: asString(doc.event_date, asString(doc.date)),
    location: asString(doc.location_label, typeof doc.location === "string" ? doc.location : ""),
    lat,
    lng,
    radius: asNumber(doc.radius_miles, asNumber(doc.radius, 2)),
    budget_range: budget === "$" || budget === "$$" || budget === "$$$" ? budget : "$$",
    expected_headcount: asNumber(doc.guest_count_invited, asNumber(doc.expected_headcount, 1)),
    created_at: asString(doc.created_at),
    limitations: typeof doc.limitations === "string" ? doc.limitations : undefined,
    limitations_checklist: Array.isArray(doc.limitations_checklist)
      ? (doc.limitations_checklist as DietreEvent["limitations_checklist"])
      : undefined,
    checklist_notes_by_restaurant:
      doc.checklist_notes_by_restaurant && typeof doc.checklist_notes_by_restaurant === "object"
        ? (doc.checklist_notes_by_restaurant as DietreEvent["checklist_notes_by_restaurant"])
        : undefined,
    complex_notes_by_restaurant:
      doc.complex_notes_by_restaurant && typeof doc.complex_notes_by_restaurant === "object"
        ? (doc.complex_notes_by_restaurant as DietreEvent["complex_notes_by_restaurant"])
        : undefined,
    complex_notes_signature: typeof doc.complex_notes_signature === "string" ? doc.complex_notes_signature : undefined,
  };
}

export function eventPatchToDoc(
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
      | "complex_notes_by_restaurant"
      | "complex_notes_signature"
    >
  >
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.location !== undefined) data.location_label = patch.location;
  if (patch.lat !== undefined) data.lat = patch.lat;
  if (patch.lng !== undefined) data.lng = patch.lng;
  if (patch.lat !== undefined && patch.lng !== undefined) {
    data.location = geoPoint(patch.lng, patch.lat);
  }
  if (patch.radius !== undefined) data.radius_miles = patch.radius;
  if (patch.budget_range !== undefined) data.budget_range = patch.budget_range;
  if (patch.expected_headcount !== undefined) data.guest_count_invited = patch.expected_headcount;
  if (patch.limitations !== undefined) data.limitations = patch.limitations;
  if (patch.limitations_checklist !== undefined) data.limitations_checklist = patch.limitations_checklist;
  if (patch.checklist_notes_by_restaurant !== undefined) {
    data.checklist_notes_by_restaurant = patch.checklist_notes_by_restaurant;
  }
  if (patch.complex_notes_by_restaurant !== undefined) {
    data.complex_notes_by_restaurant = patch.complex_notes_by_restaurant;
  }
  if (patch.complex_notes_signature !== undefined) data.complex_notes_signature = patch.complex_notes_signature;
  return data;
}

export function responseToGuest(response: DietResponse): Record<string, unknown> {
  const event_id = response.event_id?.trim();
  if (!event_id) {
    throw new Error("Guest documents require a non-empty event_id");
  }
  const hard_excludes = response.parsed_rules.hard_excludes ?? [];
  const parsed_rules: ParsedRules = {
    hard_excludes,
    soft_preferences: response.parsed_rules.soft_preferences ?? [],
    severity: response.parsed_rules.severity,
    ...(response.parsed_rules.complex_restrictions?.length
      ? { complex_restrictions: response.parsed_rules.complex_restrictions }
      : {}),
  };
  return {
    event_id,
    anon_token: response.id,
    name: response.guest_name ?? null,
    guest_name: response.guest_name ?? null,
    email: response.contact_email ?? null,
    transcript: response.raw_text,
    raw_text: response.raw_text,
    parsed_rules,
    // Hard excludes only — soft prefs stay on parsed_rules; never global.
    preference_vector: hard_excludes,
    confidence: guestConfidence(response.parsed_rules.severity),
    conflict_followups: [],
    contact_email: response.contact_email ?? null,
    submitted_at: response.submitted_at,
  };
}

export function docToResponse(id: string, doc: Record<string, unknown>): DietResponse {
  const parsed = asRecord(doc.parsed_rules);
  const severity = parsed.severity;
  // Prefer parsed_rules.hard_excludes; fall back to preference_vector so older
  // guest docs still yield event-scoped excludes for matching.
  const hardFromRules = asStringArray(parsed.hard_excludes);
  const hard_excludes =
    hardFromRules.length > 0 ? hardFromRules : asStringArray(doc.preference_vector);
  const complex = asStringArray(parsed.complex_restrictions);
  return {
    id: asString(doc.id, id),
    event_id: asString(doc.event_id),
    guest_name:
      typeof doc.guest_name === "string"
        ? doc.guest_name
        : typeof doc.name === "string" && doc.name !== "null"
          ? doc.name
          : undefined,
    raw_text: asString(doc.raw_text, asString(doc.transcript)),
    parsed_rules: {
      hard_excludes,
      soft_preferences: asStringArray(parsed.soft_preferences),
      complex_restrictions: complex.length > 0 ? complex : undefined,
      severity: severity === "high" || severity === "medium" ? severity : "low",
    },
    contact_email:
      typeof doc.contact_email === "string"
        ? doc.contact_email
        : typeof doc.email === "string"
          ? doc.email
          : undefined,
    submitted_at: asString(doc.submitted_at),
  };
}

export function restaurantToDoc(restaurant: Restaurant, menuItemIds: string[]): Record<string, unknown> {
  return {
    name: restaurant.name,
    location: restaurant.location,
    cuisine: restaurant.cuisine,
    price_level: restaurant.price_level,
    lat: restaurant.lat,
    lng: restaurant.lng,
    location_geo: geoPoint(restaurant.lng, restaurant.lat),
    data_source: { tier: 1, google_place_id: null, yelp_id: null },
    accessibility: { dine_in: true, is_preliminary: true },
    review_evidence: [],
    menu_item_ids: menuItemIds,
  };
}

export function docToRestaurant(id: string, doc: Record<string, unknown>): Restaurant {
  const geo = asRecord(doc.location_geo);
  const coords = Array.isArray(geo.coordinates) ? geo.coordinates : [];
  const price = asNumber(doc.price_level, 2);
  return {
    id: asString(doc.id, id),
    name: asString(doc.name),
    location: asString(doc.location),
    cuisine: asString(doc.cuisine),
    price_level: price === 1 || price === 3 ? price : 2,
    lat: asNumber(doc.lat, asNumber(coords[1])),
    lng: asNumber(doc.lng, asNumber(coords[0])),
  };
}

export function menuItemToDoc(item: MenuItem): Record<string, unknown> {
  return {
    restaurant_id: item.restaurant_id,
    name: item.name,
    description: item.description,
    estimated_ingredients: item.estimated_ingredients,
    flags: item.flags,
    confidence: item.confidence,
    price: item.price,
    status: "ready",
    retrieval_confidence: item.confidence,
    allergen_flags: allergenFlagsFromMenu(item),
    dietary_compatible: dietaryCompatibleFromMenu(item),
    needs_human_review: item.confidence === "low",
  };
}

export function docToMenuItem(id: string, doc: Record<string, unknown>): MenuItem {
  const confidence = doc.confidence === "low" ? "low" : "high";
  return {
    id: asString(doc.id, id),
    restaurant_id: asString(doc.restaurant_id),
    name: asString(doc.name),
    description: asString(doc.description),
    estimated_ingredients: asStringArray(doc.estimated_ingredients),
    flags: asRecord(doc.flags) as MenuItem["flags"],
    confidence,
    price: asNumber(doc.price, 0),
  };
}

export function scoreDocId(eventId: string, restaurantId: string): string {
  return `${eventId}__${restaurantId}`;
}
