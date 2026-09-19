export type BudgetRange = "$" | "$$" | "$$$";
export type Severity = "high" | "medium" | "low";
export type Confidence = "high" | "low";

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
};

export type ParsedRules = {
  hard_excludes: string[];
  soft_preferences: string[];
  severity: Severity;
};

export type DietResponse = {
  id: string;
  event_id: string;
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

export type DataStore = {
  events: DietreEvent[];
  responses: DietResponse[];
  restaurants: Restaurant[];
  menu_items: MenuItem[];
  hosts: HostRecord[];
};
