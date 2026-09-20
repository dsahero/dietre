import type { DietreEvent, DietResponse, MatchResult, RestaurantMatch } from '@/shared/lib/types';
import type {
  DonutSegment,
  EventDetails,
  GuestResponse,
  RestaurantCardData,
  RestaurantChecklistNote,
  StatMetric,
} from './types';

const TEXTURES: RestaurantCardData['textureType'][] = ['sand', 'rust', 'marble'];

function textureForId(id: string): RestaurantCardData['textureType'] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TEXTURES[hash % TEXTURES.length];
}

export function guestToken(index: number, guestName?: string): string {
  return guestName?.trim() ? guestName.trim() : `Guest ${String(index + 1).padStart(2, '0')}`;
}

export function toEventDetails(event: DietreEvent, responses?: DietResponse[]): EventDetails {
  const complexRequirementsSet = new Set<string>();
  if (responses) {
    for (const r of responses) {
      if (r.parsed_rules?.complex_restrictions) {
        for (const c of r.parsed_rules.complex_restrictions) {
          complexRequirementsSet.add(c);
        }
      }
    }
  }

  return {
    name: event.name,
    address: event.location,
    placeId: event.google_place_id ?? null,
    date: event.date,
    maxDistanceRadius: `${event.radius} ${event.radius === 1 ? 'mile' : 'miles'}`,
    radiusMiles: event.radius,
    maxBudget: event.budget_range,
    expectedHeadcount: event.expected_headcount,
    limitations: event.limitations ?? '',
    limitationsChecklist: event.limitations_checklist ?? [],
    complexRequirementsSummary: Array.from(complexRequirementsSet),
  };
}

export function toGuestResponses(
  responses: DietResponse[],
  zeroMatchResponseIds: ReadonlySet<string>
): GuestResponse[] {
  return responses.map((response, index) => ({
    id: response.id,
    token: guestToken(index, response.guest_name),
    guestName: response.guest_name,
    rawText: response.raw_text,
    hardExcludes: response.parsed_rules.hard_excludes,
    complexRestrictions: response.parsed_rules.complex_restrictions ?? [],
    softPreferences: response.parsed_rules.soft_preferences,
    severity: response.parsed_rules.severity,
    contactEmail: response.contact_email,
    submittedAt: response.submitted_at,
    hasZeroMatch: zeroMatchResponseIds.has(response.id),
  }));
}

export function toRestaurantCardData(
  matches: RestaurantMatch[],
  responses: DietResponse[],
  guestTokenById: ReadonlyMap<string, string>,
  checklistNotesByRestaurant?: ReadonlyMap<string, RestaurantChecklistNote[]>
): RestaurantCardData[] {
  return matches.map((match) => {
    const matchedIds = new Set<string>();
    for (const safeItem of match.safe_items) {
      for (const id of safeItem.covered_response_ids) matchedIds.add(id);
    }

    const dietaryConflicts = responses
      .filter((response) => !matchedIds.has(response.id))
      .map((response) => ({
        responseId: response.id,
        guestToken: guestTokenById.get(response.id) ?? '—',
        hardExcludes: response.parsed_rules.hard_excludes,
        severity: response.parsed_rules.severity,
      }));

    const suggestedMenuItems = match.safe_items.map((safeItem) => ({
      id: safeItem.item.id,
      name: safeItem.item.name,
      price: safeItem.item.price,
      coveredResponses: safeItem.covered_response_ids.map((id) => ({
        responseId: id,
        token: guestTokenById.get(id) ?? '—',
      })),
      uncertain: safeItem.uncertain,
    }));

    return {
      id: match.restaurant.id,
      name: match.restaurant.name,
      cuisine: match.restaurant.cuisine,
      location: match.restaurant.location,
      distanceMiles: match.distance_miles,
      withinRadius: match.within_radius,
      withinBudget: match.within_budget,
      priceLevel: match.restaurant.price_level,
      lat: match.restaurant.lat,
      lng: match.restaurant.lng,
      textureType: textureForId(match.restaurant.id),
      matchPercentage: match.weighted_coverage_pct,
      coveredCount: match.covered_count,
      totalResponses: match.total_responses,
      hasUnconfirmedItems: match.safe_items.some((item) => item.uncertain),
      matchedResponses: Array.from(matchedIds).map((id) => ({
        responseId: id,
        token: guestTokenById.get(id) ?? '—',
      })),
      dietaryConflicts,
      suggestedMenuItems,
      menuDataThin: (match.menu_stats?.item_count ?? match.safe_items.length) === 0,
      menuItemCount: match.menu_stats?.item_count ?? match.safe_items.length,
      confidence: {
        score: match.confidence?.score ?? null,
        tier: match.confidence?.tier ?? 'unknown',
        dataLimited: match.confidence?.data_limited ?? false,
        source: match.confidence?.source ?? 'live',
        utilitarianPct: match.confidence?.utilitarian_pct ?? match.weighted_coverage_pct,
        allGuestsCovered: match.confidence?.rawlsian_all_covered ?? false,
        rankUtilitarian: match.confidence?.rank_utilitarian ?? null,
        rankRawlsian: match.confidence?.rank_rawlsian ?? null,
      },
      checklistNotes: checklistNotesByRestaurant?.get(match.restaurant.id) ?? [],
      complexNotes: match.complex_notes ?? [],
    };
  });
}

export function coveragePercent(coveredCount: number, totalResponses: number): number {
  if (totalResponses === 0) return 0;
  return Math.round((coveredCount / totalResponses) * 100);
}

const SEVERITY_COLOR: Record<DietResponse['parsed_rules']['severity'], string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#38bdf8',
};

const SEVERITY_LABEL: Record<DietResponse['parsed_rules']['severity'], string> = {
  high: 'High-constraint',
  medium: 'Constrained',
  low: 'Flexible',
};

export function toSeverityBreakdown(
  responses: DietResponse[]
): { segments: DonutSegment[]; metrics: StatMetric[] } {
  const total = responses.length;
  const order: DietResponse['parsed_rules']['severity'][] = ['high', 'medium', 'low'];
  const counts = { high: 0, medium: 0, low: 0 };
  for (const response of responses) counts[response.parsed_rules.severity]++;

  let cursor = 0;
  const segments: DonutSegment[] = [];
  const metrics: StatMetric[] = [];
  for (const severity of order) {
    const count = counts[severity];
    if (count === 0) continue;
    const pct = total === 0 ? 0 : Math.round((count / total) * 100);
    const angleSpan = total === 0 ? 0 : (count / total) * 360;
    segments.push({
      id: severity,
      label: SEVERITY_LABEL[severity],
      color: SEVERITY_COLOR[severity],
      startAngle: cursor,
      endAngle: cursor + angleSpan,
      percentage: `${pct}%`,
      count,
    });
    metrics.push({
      percentage: `${pct}%`,
      label: SEVERITY_LABEL[severity],
      color: SEVERITY_COLOR[severity],
      count,
    });
    cursor += angleSpan;
  }

  return { segments, metrics };
}

export function buildGuestTokenIndex(responses: DietResponse[]): Map<string, string> {
  const map = new Map<string, string>();
  responses.forEach((response, index) => map.set(response.id, guestToken(index, response.guest_name)));
  return map;
}

export function zeroMatchResponseIds(match: MatchResult): Set<string> {
  return new Set(match.zero_matches.map((alert) => alert.response_id));
}
