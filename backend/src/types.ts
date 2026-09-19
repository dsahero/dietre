export type Id = string;

export type Organizer = {
  _id: Id;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  events: Id[];
};

export type EventMode = "delivery" | "dine_in";
export type BudgetMode = "event_pays" | "individual_pays";
export type EventStatus = "collecting" | "reviewing" | "finalized";
export type FairnessMode = "utilitarian" | "rawlsian";

export type GeoPoint = {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
};

export type DietreEvent = {
  _id: Id;
  organizer_id: Id;
  name: string;
  mode: EventMode;
  budget_mode: BudgetMode;
  event_budget: number | null;
  link_token: string;
  status: EventStatus;
  fairness_mode: FairnessMode;
  created_at: string;
  event_date: string;
  guest_count_invited: number;
  candidate_restaurant_ids: Id[];
  location: GeoPoint;
  radius_miles: number;
  location_label?: string;
};

export type PreferenceVector = {
  hard_excludes: string[];
  soft_preferences: string[];
  severity: "high" | "medium" | "low";
};

export type ConflictFollowup = {
  question: string;
  answer?: string;
  resolved: boolean;
};

export type Guest = {
  _id: Id;
  event_id: Id;
  anon_token: string;
  name?: string;
  email?: string;
  transcript: string;
  preference_vector: PreferenceVector;
  confidence: number;
  conflict_followups: ConflictFollowup[];
  created_at: string;
  updated_at: string;
};

export type AllergenLevel = "confirmed" | "inferred" | "none";

export const ALLERGEN_KEYS = [
  "pork",
  "shellfish",
  "fish",
  "beef",
  "chicken",
  "egg",
  "dairy",
  "meat_dairy_combo",
  "gluten",
  "nuts",
  "peanuts",
  "soy",
  "sesame",
  "alcohol",
] as const;

export type AllergenKey = (typeof ALLERGEN_KEYS)[number];
export type AllergenFlags = Record<AllergenKey, AllergenLevel>;

export type IngredientRow = {
  name: string;
  status: "extracted" | "inferred" | "unknown";
  retrieval_confidence: number;
};

export type MenuItem = {
  _id: Id;
  restaurant_id: Id;
  name: string;
  description: string;
  estimated_ingredients: IngredientRow[];
  allergen_flags: AllergenFlags;
  dietary_compatible: {
    vegetarian: boolean;
    vegan: boolean;
    gluten_free: boolean | null;
  };
  embedding: number[] | null;
  needs_human_review: boolean;
  status: "ready" | "needs_review";
  retrieval_confidence: number;
  price: number;
};

export type Restaurant = {
  _id: Id;
  name: string;
  address: string;
  cuisine: string;
  price_level: 1 | 2 | 3;
  location: GeoPoint;
  data_source: {
    tier: 1 | 2 | 3;
    google_place_id?: string;
    yelp_id?: string;
  };
  accessibility: {
    dine_in: {
      is_preliminary: true;
      notes?: string;
    };
  };
  review_evidence: { source: string; quote: string; url?: string }[];
  menu_item_ids: Id[];
};

export type PerGuestScore = {
  guest_id: Id;
  score: number;
  safe_item_ids: Id[];
  conflicts: string[];
};

export type RestaurantScore = {
  _id: Id;
  event_id: Id;
  restaurant_id: Id;
  per_guest_scores: PerGuestScore[];
  group_scores: {
    utilitarian: number;
    rawlsian_min: number;
  };
  conflicts: {
    guest_id: Id;
    hard_excludes: string[];
    conflicting_items: { item_id: Id; hits: string[] }[];
  }[];
  ranks: {
    utilitarian: number;
    rawlsian: number;
  };
  computed_at: string;
};

export type DataStore = {
  organizers: Organizer[];
  events: DietreEvent[];
  guests: Guest[];
  restaurants: Restaurant[];
  menu_items: MenuItem[];
  restaurant_scores: RestaurantScore[];
};

export type OrganizerSession = {
  organizer_id: Id;
  email: string;
  name: string;
};

export type PublicEvent = {
  _id: Id;
  name: string;
  mode: EventMode;
  status: EventStatus;
  event_date: string;
  location_label?: string;
  radius_miles: number;
  fairness_mode: FairnessMode;
  guest_count_invited: number;
};

export type ZeroMatchAlert = {
  guest_id: Id;
  anonymous_label: string;
  severity: PreferenceVector["severity"];
  hard_excludes: string[];
  contact_email?: string;
  confidence: number;
};
