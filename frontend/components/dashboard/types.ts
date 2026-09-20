export interface NavItem {
  id: string;
  label: string;
  badge?: string;
  iconName?: 'utensils' | 'bookmark' | 'users' | 'map';
}

export interface StatMetric {
  percentage: string;
  label: string;
  color?: string;
  count?: number;
}

export interface DonutSegment {
  id: string;
  label: string;
  color: string;
  startAngle: number; // in degrees (0 = 12 o'clock)
  endAngle: number;   // in degrees clockwise
  percentage: string;
  count?: number;
}

export type TraitType = 'good' | 'neutral' | 'bad';

export interface RestaurantTrait {
  id: string;
  type: TraitType; // 'good' = green, 'neutral' = yellow, 'bad' = red
  label: string;
  category?: string;
}

// A pointer to one guest response — enough to look it up and open its
// detail modal.
export interface GuestRef {
  responseId: string;
  token: string; // Participant name or "Guest 07"
}

// A menu item this restaurant can safely serve, and who it's safe for.
export interface SuggestedMenuItem {
  id: string;
  name: string;
  /** Null/undefined when the source menu had no parseable price (do not show as $0). */
  price: number | null;
  ingredients: string[];
  coveredResponses: GuestRef[];
  uncertain: boolean; // AI-inferred ingredients not yet human-confirmed
}

// A response this restaurant fails to cover, and why.
export interface DietaryConflict {
  responseId: string;
  guestToken: string;
  hardExcludes: string[];
  severity: 'high' | 'medium' | 'low';
}

// Group score (from stored restaurant_scores) adjusted by menu-data quality.
export interface RestaurantConfidenceData {
  score: number | null;
  tier: 'high' | 'medium' | 'low' | 'unknown';
  dataLimited: boolean;
  source: 'database' | 'live';
  utilitarianPct: number;
  allGuestsCovered: boolean;
  rankUtilitarian: number | null;
  rankRawlsian: number | null;
}

export interface RestaurantCardData {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  distanceMiles: number;
  withinRadius: boolean;
  withinBudget: boolean;
  priceLevel: 1 | 2 | 3;
  /** Predicted $/person from menu avg (or Places estimate). */
  predictedCostPerPerson: number;
  predictedCostSource: 'safe_menu_avg' | 'menu_avg' | 'places_estimate';
  predictedPartyTotal: number;
  predictedCostLabel: string;
  lat: number;
  lng: number;
  textureType: 'sand' | 'rust' | 'marble';
  matchPercentage: number; // weighted coverage %, 0-100 (raw hard-constraint score)
  // Bayesian satisfaction score (Beta posterior mean, severity-weighted, 0–1).
  // Used internally for ranking; not displayed directly.
  bayesianScore?: number;
  // Guest Fit score: 50 + (bayesian_score − 0.5) × 100, range 0–100.
  // 50 = neutral prior (no preferences stated). Above 50 = positive lean.
  guestFitScore?: number;
  // Number of guests whose stated soft preferences fed into guestFitScore.
  // 0 means the fit label is the neutral prior — nobody spoke up.
  guestFitSampleSize?: number;
  // Combined host-facing score: coverage anchored, Bayesian nudges ±20 pts.
  // This is the number shown as the headline score on the card.
  overallScore: number;
  coveredCount: number; // responses covered
  totalResponses: number; // denominator — never show matchPercentage without this
  hasUnconfirmedItems: boolean; // true if any safe item relies on a low-confidence AI ingredient guess
  matchedResponses: GuestRef[];
  dietaryConflicts: DietaryConflict[];
  suggestedMenuItems: SuggestedMenuItem[];
  menuDataThin: boolean; // true when we have no menu items at all for this restaurant
  menuItemCount: number;
  confidence: RestaurantConfidenceData;
  checklistNotes: RestaurantChecklistNote[]; // Gemini's read on the host's free-text limitations, per venue
  complexNotes: ComplexRequirementNote[]; // Gemini's read on participant complex/compound dietary requirements
  website?: string; // Google Places websiteUri, when provided
  phone?: string; // Google Places national phone number, when provided
  menuUrls: MenuUrlEntry[]; // Links/PDFs found during webscraping
}

// A menu source URL found during the webscraping process.
export interface MenuUrlEntry {
  kind: 'pdf' | 'html';
  label: string;
  url: string;
}

// One constraint Gemini pulled out of the host's free-text limitations,
// e.g. "Vegan entrée available" or "Wheelchair-accessible entrance".
export interface LimitationChecklistItem {
  id: string;
  label: string;
}

// Gemini's provisional read on one checklist item for one restaurant —
// always shown as AI-inferred, never as a confirmed fact.
export interface RestaurantChecklistNote {
  itemId: string;
  label: string;
  verdict: 'good' | 'neutral' | 'bad' | 'unknown';
  note: string;
}

// Gemini's evaluation of candidate restaurant menus against complex/compound restrictions
export interface ComplexRequirementNote {
  rule: string;
  guestTokens?: string[];
  verdict: 'good' | 'neutral' | 'bad';
  note: string;
}

export interface EventDetails {
  name: string;
  address: string;
  placeId?: string | null;
  date: string;
  maxDistanceRadius: string; // display string, e.g. "5 miles"
  radiusMiles: number;
  /** Host max $/person (primary). */
  budgetPerPerson: number;
  /** Legacy tier kept for display fallbacks. */
  maxBudget: '$' | '$$' | '$$$';
  expectedHeadcount: number;
  limitations: string;
  limitationsChecklist: LimitationChecklistItem[];
  complexRequirementsSummary?: string[];
}

// A single guest response with their submitted words and parsed rules.
export interface GuestResponse {
  id: string;
  token: string; // Participant name or "Guest 07"
  guestName?: string;
  rawText: string; // the guest's own words; source of truth, always shown alongside the parsed rules
  hardExcludes: string[];
  complexRestrictions?: string[];
  softPreferences: string[];
  severity: 'high' | 'medium' | 'low';
  contactEmail?: string;
  submittedAt: string;
  hasZeroMatch: boolean; // no restaurant anywhere covers this response's hard excludes
}

export type FeatureCardData = RestaurantCardData;
