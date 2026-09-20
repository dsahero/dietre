export type BudgetRange = "$" | "$$" | "$$$";
export type Severity = "high" | "medium" | "low";
export type Confidence = "high" | "low";

// Bayesian preference signal: one LLM-extracted observation per (guest, restaurant) pair.
// Maps onto a Beta-Bernoulli update: positive → α += strength, negative → β += strength.
// Prior is Beta(1,1); silence (neutral) leaves the prior unchanged at mean = 0.5.
export type PreferenceSignal = {
  direction: "positive" | "negative" | "neutral";
  strength: 1 | 2 | 3;
};

export type MenuFlags = {
  contains_pork?: boolean;
  contains_shellfish?: boolean;
  contains_fish?: boolean;
  contains_beef?: boolean;
  contains_chicken?: boolean;
  contains_egg?: boolean;
  contains_dairy?: boolean;
  meat_dairy_combo?: boolean;
  contains_gluten?: boolean;
  contains_nuts?: boolean;
  contains_peanuts?: boolean;
  contains_soy?: boolean;
  contains_sesame?: boolean;
  contains_alcohol?: boolean;
  vegetarian?: boolean;
  vegan?: boolean;
};

export type LimitationChecklistItem = {
  id: string;
  label: string;
};

// Gemini's provisional read on one checklist item for one restaurant —
// always surfaced as AI-inferred, never as a confirmed fact.
export type RestaurantChecklistNote = {
  itemId: string;
  label: string;
  verdict: "good" | "neutral" | "bad" | "unknown";
  note: string;
};

export type DietreEvent = {
  id: string;
  host_id: string;
  name: string;
  date: string;
  location: string;
  lat: number;
  lng: number;
  radius: number;
  /** Legacy tier kept for older events / Firestore docs; prefer budget_per_person. */
  budget_range: BudgetRange;
  /** Host max spend per person in dollars (primary budget UX). */
  budget_per_person?: number;
  expected_headcount: number;
  created_at: string;
  // Host-authored free text — accessibility, noise, venue rules, anything
  // that isn't a per-guest dietary rule. Optional; most events won't set it.
  limitations?: string;
  // Gemini's structured read of `limitations`, recomputed whenever the host
  // changes the text. Empty until the host has saved limitations text with
  // GEMINI_API_KEY configured.
  limitations_checklist?: LimitationChecklistItem[];
  // Per-restaurant notes against limitations_checklist, keyed by restaurant
  // id. Computed once when the checklist changes, not on every page load.
  checklist_notes_by_restaurant?: Record<string, RestaurantChecklistNote[]>;
  // Per-restaurant notes against guests' complex/compound restrictions
  // (e.g. "no mixing meat and dairy"), keyed by restaurant id. Computed
  // once per distinct set of complex rules + candidate restaurants — see
  // complexNotesCacheKey in backend/lib/matching.ts — not on every page
  // load; complex_notes_signature records which input it was computed for.
  complex_notes_by_restaurant?: Record<string, ComplexRequirementNote[]>;
  complex_notes_signature?: string;
  // Google Places id the host's location text resolved to (real geocoding),
  // or null when resolved via the offline landmark-list fallback instead.
  google_place_id?: string | null;
  // Bayesian preference signals per (responseId → restaurantId → signal).
  // Computed once per distinct set of guest preferences + candidate restaurants,
  // cached on the event document. Absent until the first Gemini evaluation completes.
  preference_signals?: Record<string, Record<string, PreferenceSignal>>;
  preference_signals_signature?: string;
  // This event's own restaurant list (ids into the restaurants collection),
  // generated from its confirmed address + radius. Undefined on legacy events.
  candidate_restaurant_ids?: string[];
  // Which restaurant-discovery algorithm built candidate_restaurant_ids; lists
  // from an older version are rebuilt once (see RESTAURANTS_VERSION).
  restaurants_version?: number;
  // Sharing: people who were invited and accepted (same permissions as the
  // owner except removing the owner / deleting the event), and invites not yet
  // answered. Emails are lowercased. collaborator_emails is a flat copy used
  // for the "events shared with me" query.
  collaborators?: Collaborator[];
  pending_invites?: PendingInvite[];
  collaborator_emails?: string[];
};

export type Collaborator = {
  email: string;
  host_id?: string;
  name?: string;
  added_at: string;
  added_by?: string;
};

// One outstanding invitation, stored as its own doc (id `<email>__<eventId>`)
// so an invitee's notifications are a single query by email.
export type EventInvite = {
  id: string;
  email: string;
  event_id: string;
  event_name: string;
  invited_by_id: string;
  invited_by_name: string;
  invited_at: string;
};

export type PendingInvite = {
  email: string;
  invited_by_name: string;
  invited_at: string;
};

export type ParsedRules = {
  hard_excludes: string[];
  // Compound, conditional, or special rules that cannot be reduced to a single
  // banned ingredient (e.g. "cannot eat meat and dairy together in the same dish,
  // but can eat meat alone or dairy alone", cross-contamination tolerance, etc.)
  complex_restrictions?: string[];
  soft_preferences: string[];
  severity: Severity;
};

export type DietResponse = {
  id: string;
  event_id: string;
  guest_name?: string;
  raw_text: string;
  parsed_rules: ParsedRules;
  contact_email?: string;
  submitted_at: string;
};

export type Restaurant = {
  id: string;
  name: string;
  location: string;
  cuisine: string;
  price_level: 1 | 2 | 3;
  lat: number;
  lng: number;
  // Other ids this restaurant was stored under before it was re-keyed;
  // events that still list an old id keep resolving to it.
  alias_ids?: string[];
  // Google Places id for discovered restaurants.
  google_place_id?: string;
  website?: string;
  // Menu acquisition state for discovered restaurants.
  menu_status?: "pending" | "ready" | "none" | "failed";
  menu_checked_at?: string;
  // Menu source URLs found during webscraping (PDFs, HTML pages).
  menu_urls?: { kind: "pdf" | "html"; label: string; url: string }[];
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  estimated_ingredients: string[];
  flags: MenuFlags;
  confidence: Confidence;
  price: number | null;
};

export type HostSession = {
  host_id: string;
  email: string;
  name?: string;
  provider: "firebase" | "mock";
};

// Persistent host profile — separate from HostSession (the signed cookie).
// password_hash is only ever set for provider "mock"; Firebase manages its
// own credentials and is never asked to hold one here.
export type HostRecord = {
  host_id: string;
  email: string;
  name: string;
  avatar_data_url?: string;
  password_hash?: string;
  provider: "firebase" | "mock";
  created_at: string;
  updated_at: string;
};

export type SafeMenuItem = {
  item: MenuItem;
  covered_response_ids: string[];
  uncertain: boolean;
};

// Gemini's menu-wide evaluation for a candidate restaurant against one complex rule
export type ComplexRequirementNote = {
  rule: string;
  guest_tokens?: string[];
  verdict: "good" | "neutral" | "bad";
  note: string;
};

export type MenuStats = {
  item_count: number;
  // Share (0-100) of items whose ingredients are explicit, not estimated/missing.
  explicit_ingredient_pct: number;
  high_confidence_pct: number;
};

export type RestaurantConfidence = {
  // Group score as 0-100; null when there's no menu data to score against.
  score: number | null;
  tier: "high" | "medium" | "low" | "unknown";
  // True when thin/low-confidence menu data capped the tier.
  data_limited: boolean;
  // "database" = read from the stored restaurant_scores doc; "live" = computed this render.
  source: "database" | "live";
  utilitarian_pct: number;
  rawlsian_all_covered: boolean;
  rank_utilitarian: number | null;
  rank_rawlsian: number | null;
};

export type PredictedCostSource = "safe_menu_avg" | "menu_avg" | "places_estimate";

export type RestaurantMatch = {
  restaurant: Restaurant;
  distance_miles: number;
  within_radius: boolean;
  within_budget: boolean;
  /** Predicted $/person from menu prices (or Places estimate when sparse). */
  predicted_cost_per_person: number;
  predicted_cost_source: PredictedCostSource;
  /** predicted_cost_per_person × event.expected_headcount */
  predicted_party_total: number;
  coverage_pct: number;
  weighted_coverage_pct: number;
  covered_count: number;
  total_responses: number;
  safe_items: SafeMenuItem[];
  complex_notes?: ComplexRequirementNote[];
  // Severity-weighted mean of Beta posterior means across guests who stated
  // soft_preferences (0–1). Silent guests are excluded so they don't dilute
  // the score toward the 0.5 prior. Used as a tiebreaker after feasibility-
  // based coverage.
  bayesian_score?: number;
  // How many guests actually contributed to bayesian_score (i.e. guests with
  // at least one soft preference). 0 means the score is the neutral prior.
  bayesian_sample_size?: number;
  // Overall score shown to the host: coverage_pct anchored, Bayesian preference
  // signal nudges it ±up to 20 pts. Formula: clamp(coverage + (bayes−0.5)×40, 0, 100).
  // When no preferences exist (all Beta(1,1)), overall_score === weighted_coverage_pct.
  overall_score: number;
  menu_stats?: MenuStats;
  confidence?: RestaurantConfidence;
};

export type ZeroMatchAlert = {
  response_id: string;
  severity: Severity;
  hard_excludes: string[];
  contact_email?: string;
  anonymous_label: string;
};

export type MatchResult = {
  restaurants: RestaurantMatch[];
  zero_matches: ZeroMatchAlert[];
  response_count: number;
  expected_headcount: number;
};

// Gemini's per-item safety read for one response, cached so the (slow,
// paid) call only happens once per response rather than on every dashboard
// load. Menu items are static seed data, so the cache never goes stale.
export type AiItemJudgment = {
  safe: boolean;
  uncertain: boolean;
  reasoning: string;
};

export type ResponseItemJudgments = {
  response_id: string;
  computed_at: string;
  judgments: Record<string, AiItemJudgment>; // keyed by menu_item_id
};

export type DataStore = {
  events: DietreEvent[];
  responses: DietResponse[];
  restaurants: Restaurant[];
  menu_items: MenuItem[];
  hosts: HostRecord[];
  ai_judgments: ResponseItemJudgments[];
};
