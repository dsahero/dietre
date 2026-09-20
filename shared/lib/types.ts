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
  budget_range: BudgetRange;
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
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  estimated_ingredients: string[];
  flags: MenuFlags;
  confidence: Confidence;
  price: number;
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

export type RestaurantMatch = {
  restaurant: Restaurant;
  distance_miles: number;
  within_radius: boolean;
  within_budget: boolean;
  coverage_pct: number;
  weighted_coverage_pct: number;
  covered_count: number;
  total_responses: number;
  safe_items: SafeMenuItem[];
  complex_notes?: ComplexRequirementNote[];
  // Severity-weighted mean of Beta posterior means across all guests (0–1).
  // Used as a tiebreaker after feasibility-based coverage.
  bayesian_score?: number;
  // Overall score shown to the host: coverage_pct anchored, Bayesian preference
  // signal nudges it ±up to 20 pts. Formula: clamp(coverage + (bayes−0.5)×40, 0, 100).
  // When no preferences exist (all Beta(1,1)), overall_score === weighted_coverage_pct.
  overall_score: number;
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
