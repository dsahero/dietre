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

// A menu item this restaurant can safely serve, and who it's safe for.
export interface SuggestedMenuItem {
  id: string;
  name: string;
  price: number;
  coveredGuestTokens: string[]; // e.g. ["Guest 01", "Guest 04"]
  uncertain: boolean; // AI-inferred ingredients not yet human-confirmed
}

// A response this restaurant fails to cover, and why.
export interface DietaryConflict {
  responseId: string;
  guestToken: string;
  hardExcludes: string[];
  severity: 'high' | 'medium' | 'low';
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
  lat: number;
  lng: number;
  textureType: 'sand' | 'rust' | 'marble';
  matchPercentage: number; // weighted coverage %, 0-100
  coveredCount: number; // responses covered
  totalResponses: number; // denominator — never show matchPercentage without this
  hasUnconfirmedItems: boolean; // true if any safe item relies on a low-confidence AI ingredient guess
  matchedGuestTokens: string[];
  dietaryConflicts: DietaryConflict[];
  suggestedMenuItems: SuggestedMenuItem[];
  menuDataThin: boolean; // true when we have no menu items at all for this restaurant
}

export interface EventDetails {
  name: string;
  address: string;
  date: string;
  maxDistanceRadius: string; // display string, e.g. "5 miles"
  radiusMiles: number;
  maxBudget: '$' | '$$' | '$$$';
  expectedHeadcount: number;
}

// A single anonymous guest response — never a name. See DietRe's anonymity-by-design rule.
export interface GuestResponse {
  id: string;
  token: string; // "Guest 07" — the only identifier ever shown
  rawText: string; // the guest's own words; source of truth, always shown alongside the parsed rules
  hardExcludes: string[];
  softPreferences: string[];
  severity: 'high' | 'medium' | 'low';
  contactEmail?: string;
  submittedAt: string;
  hasZeroMatch: boolean; // no restaurant anywhere covers this response's hard excludes
}

export type FeatureCardData = RestaurantCardData;
