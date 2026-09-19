import { haversineMiles, priceLevelFromBudget } from "@/shared/lib/places";
import { isItemSafeForResponse, judgeResponseAgainstMenuWithGemini, severityWeight } from "@/backend/lib/parser";
import { getResponseJudgments, saveResponseJudgments, saveRestaurantScores } from "@/backend/lib/db";
import type {
  AiItemJudgment,
  DietResponse,
  DietreEvent,
  MatchResult,
  MenuItem,
  Restaurant,
  RestaurantMatch,
  ZeroMatchAlert,
} from "@/shared/lib/types";

function anonymousLabel(index: number, severity: DietResponse["parsed_rules"]["severity"]): string {
  const band = severity === "high" ? "High-constraint" : severity === "medium" ? "Constrained" : "Flexible";
  return `${band} guest ${index + 1}`;
}

// Gemini judgments are cached per response (see backend/lib/db.ts) — a
// dashboard reload never re-pays for the same call. Only computed when
// GEMINI_API_KEY is configured; otherwise every response falls back to the
// existing rule-based flag/ingredient matching untouched.
async function resolveJudgments(
  responses: DietResponse[],
  menuItems: MenuItem[]
): Promise<Map<string, Record<string, AiItemJudgment> | null>> {
  const entries = await Promise.all(
    responses.map(async (response) => {
      const cached = await getResponseJudgments(response.id);
      if (cached) return [response.id, cached] as const;

      const computed = await judgeResponseAgainstMenuWithGemini(response, menuItems);
      if (computed) await saveResponseJudgments(response.id, computed);
      return [response.id, computed] as const;
    })
  );
  return new Map(entries);
}

export async function matchEvent(input: {
  event: DietreEvent;
  responses: DietResponse[];
  restaurants: Restaurant[];
  menuItems: MenuItem[];
}): Promise<MatchResult> {
  const { event, responses, restaurants, menuItems } = input;
  const itemsByRestaurant = new Map<string, MenuItem[]>();
  for (const item of menuItems) {
    const list = itemsByRestaurant.get(item.restaurant_id) ?? [];
    list.push(item);
    itemsByRestaurant.set(item.restaurant_id, list);
  }

  const judgmentsByResponse = await resolveJudgments(responses, menuItems);

  // Gemini's read wins when available (it can catch compound rules like
  // "no mixing meat and dairy" that a flag/keyword match can't express);
  // otherwise fall back to the existing rule-based check untouched.
  function isSafe(item: MenuItem, response: DietResponse): { safe: boolean; uncertain: boolean } {
    const judgments = judgmentsByResponse.get(response.id);
    const judgment = judgments?.[item.id];
    if (judgment) return { safe: judgment.safe, uncertain: judgment.uncertain };
    return isItemSafeForResponse(item, response);
  }

  const maxPrice = priceLevelFromBudget(event.budget_range);
  const totalWeight = responses.reduce((sum, response) => sum + severityWeight(response.parsed_rules.severity), 0);
  const coveredAnywhere = new Set<string>();

  const ranked: RestaurantMatch[] = restaurants.map((restaurant) => {
    const distance = haversineMiles(event, restaurant);
    const within_radius = distance <= event.radius + 0.05;
    const within_budget = restaurant.price_level <= maxPrice;
    const items = itemsByRestaurant.get(restaurant.id) ?? [];
    let coveredWeight = 0;
    const coveredIds: string[] = [];
    const safeItems = items
      .map((item) => {
        const covered: string[] = [];
        let uncertain = false;
        for (const response of responses) {
          const result = isSafe(item, response);
          if (result.safe) {
            covered.push(response.id);
            if (result.uncertain) uncertain = true;
          }
        }
        return { item, covered_response_ids: covered, uncertain };
      })
      .filter((entry) => entry.covered_response_ids.length > 0)
      .sort((a, b) => b.covered_response_ids.length - a.covered_response_ids.length);

    for (const response of responses) {
      const hasSafe = items.some((item) => isSafe(item, response).safe);
      if (hasSafe) {
        coveredWeight += severityWeight(response.parsed_rules.severity);
        coveredIds.push(response.id);
        if (within_radius && within_budget) coveredAnywhere.add(response.id);
      }
    }

    const coverage_pct = responses.length === 0 ? 0 : Math.round((coveredIds.length / responses.length) * 100);
    const weighted_coverage_pct =
      totalWeight === 0 ? 0 : Math.round((coveredWeight / totalWeight) * 100);

    return {
      restaurant,
      distance_miles: Math.round(distance * 10) / 10,
      within_radius,
      within_budget,
      coverage_pct,
      weighted_coverage_pct,
      covered_count: coveredIds.length,
      total_responses: responses.length,
      safe_items: safeItems,
    };
  });

  ranked.sort((a, b) => {
    const aEligible = Number(a.within_radius && a.within_budget);
    const bEligible = Number(b.within_radius && b.within_budget);
    if (aEligible !== bEligible) return bEligible - aEligible;
    if (b.weighted_coverage_pct !== a.weighted_coverage_pct) {
      return b.weighted_coverage_pct - a.weighted_coverage_pct;
    }
    if (b.coverage_pct !== a.coverage_pct) return b.coverage_pct - a.coverage_pct;
    return a.distance_miles - b.distance_miles;
  });

  const rawlsianOrder = [...ranked].sort((a, b) => {
    const aMin = a.total_responses === 0 ? 1 : a.covered_count === a.total_responses ? 1 : a.coverage_pct;
    const bMin = b.total_responses === 0 ? 1 : b.covered_count === b.total_responses ? 1 : b.coverage_pct;
    if (aMin !== bMin) return bMin - aMin;
    return b.weighted_coverage_pct - a.weighted_coverage_pct;
  });
  const utilitarianRank = new Map(ranked.map((row, index) => [row.restaurant.id, index + 1]));
  const rawlsianRank = new Map(rawlsianOrder.map((row, index) => [row.restaurant.id, index + 1]));

  void persistScores().catch((error) => {
    console.error("restaurant_scores cache write failed", error);
  });

  async function persistScores() {
    const computed_at = new Date().toISOString();
    await saveRestaurantScores(
      ranked.map((row) => {
        const items = itemsByRestaurant.get(row.restaurant.id) ?? [];
        const per_guest_scores: Record<string, number> = {};
        const conflicts: Array<{ guest_id: string; hard_excludes: string[] }> = [];
        for (const response of responses) {
          const covered = items.some((item) => isSafe(item, response).safe);
          per_guest_scores[response.id] = covered ? 1 : 0;
          if (!covered) {
            conflicts.push({ guest_id: response.id, hard_excludes: response.parsed_rules.hard_excludes });
          }
        }
        const values = Object.values(per_guest_scores);
        return {
          event_id: event.id,
          restaurant_id: row.restaurant.id,
          per_guest_scores,
          group_scores: {
            utilitarian: row.weighted_coverage_pct / 100,
            rawlsian_min: values.length === 0 ? 1 : Math.min(...values),
          },
          conflicts,
          ranks: {
            utilitarian: utilitarianRank.get(row.restaurant.id) ?? 0,
            rawlsian: rawlsianRank.get(row.restaurant.id) ?? 0,
          },
          coverage_pct: row.coverage_pct,
          weighted_coverage_pct: row.weighted_coverage_pct,
          computed_at,
        };
      })
    );
  }

  const zero_matches: ZeroMatchAlert[] = responses
    .map((response, index) => ({ response, index }))
    .filter(({ response }) => !coveredAnywhere.has(response.id))
    .map(({ response, index }) => ({
      response_id: response.id,
      severity: response.parsed_rules.severity,
      hard_excludes: response.parsed_rules.hard_excludes,
      contact_email: response.contact_email,
      anonymous_label: anonymousLabel(index, response.parsed_rules.severity),
    }));

  return {
    restaurants: ranked,
    zero_matches,
    response_count: responses.length,
    expected_headcount: event.expected_headcount,
  };
}
