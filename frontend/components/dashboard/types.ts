export interface NavItem {
  id: string;
  label: string;
  badge?: string;
  iconName?: 'utensils' | 'bookmark' | 'users' | 'file-text' | 'library';
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

export interface SuggestedMenuItem {
  id: string;
  quantity: number; // e.g., 4, 3, 2, 1
  name: string;
  price: number;
  dietaryCategory: string;
  targetAudienceLabel: string;
  participantIds: string[];
  participantNames: string[];
  notes?: string;
}

export interface DietaryConflict {
  participantId: string;
  participantName: string;
  dietaryIssue: string;
  severity: 'Critical' | 'Moderate' | 'Preference';
  reason: string;
}

export interface EstimatedCostBreakdown {
  attendeeCount: number;
  dietaryCount: number;
  basePricePerGuest: number;
  baseFoodTotal: number;
  dietarySurcharge: number;
  serviceAndGratuity: number;
  totalEstimatedCost: number;
  averagePerGuest: number;
}

export interface RestaurantCardData {
  id: string;
  name: string;
  cuisine: string;
  distance: string;
  pricePerPerson: string;
  capacity: string;
  rating: number;
  textureType: 'sand' | 'rust' | 'marble';
  traits: RestaurantTrait[]; // [0] = good, [1] = neutral, [2] = bad (not every place has all 3)
  address?: string;
  phone?: string;
  matchPercentage: number; // e.g. 75, 92, 58, 83
  matchedParticipantIds: string[];
  dietaryConflicts: DietaryConflict[];
  estimatedCost: EstimatedCostBreakdown;
  suggestedMenuItems: SuggestedMenuItem[];
  about?: string;
}

export interface EventDetails {
  name: string;
  limitations: string;
  maxBudget: string;
  maxDistanceRadius: string;
  address: string;
  date?: string;
  budgetMode?: 'per_guest' | 'overall';
  budgetAmount?: number;
  overallBudgetTotal?: number;
  maxDistanceMiles?: number;
  attendeeCount?: number;
}

export interface ChatTranscriptMessage {
  id: string;
  sender: 'ai' | 'participant';
  text: string;
  timestamp: string;
}

export interface Participant {
  id: string;
  name: string;
  role: string;
  company: string;
  email?: string;
  phone?: string;
  tableGroup?: string;
  rsvpStatus: 'Confirmed' | 'Pending' | 'Waitlist';
  foodRestrictions: string[]; // e.g. ["Gluten-Free (Celiac)", "Severe Shellfish Allergy"]
  foodPreferences: string[];  // e.g. ["Mediterranean / Seafood", "Medium-Rare Beef", "Dry Red Wine"]
  dietaryCategory: 'Standard' | 'Gluten-Free' | 'Vegan' | 'Vegetarian' | 'Halal' | 'Kosher' | 'Severe Allergy';
  aiIntakeStatus: 'Completed' | 'Partial' | 'Needs Review';
  aiChatTranscript: ChatTranscriptMessage[];
  notes?: string;
}

export type FeatureCardData = RestaurantCardData;


