import { haversineMiles, priceLevelFromBudget } from "@/lib/places";
import { isItemSafeForResponse, severityWeight } from "@/lib/parser";
import type {
  DietResponse,
  DietreEvent,
  MatchResult,
  MenuItem,
  Restaurant,
  RestaurantMatch,
  ZeroMatchAlert,
} from "@/lib/types";

function anonymousLabel(index: number, severity: DietResponse["parsed_rules"]["severity"]): string {
  const band = severity === "high" ? "High-constraint" : severity === "medium" ? "Constrained" : "Flexible";
  return `${band} guest ${index + 1}`;
}

export function matchEvent(input: {
  event: DietreEvent;
  responses: DietResponse[];
  restaurants: Restaurant[];
  menuItems: MenuItem[];
}): MatchResult {
  const { event, responses, restaurants, menuItems } = input;
  const itemsByRestaurant = new Map<string, MenuItem[]>();
  for (const item of menuItems) {
    const list = itemsByRestaurant.get(item.restaurant_id) ?? [];
    list.push(item);
    itemsByRestaurant.set(item.restaurant_id, list);
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
          const result = isItemSafeForResponse(item, response);
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
      const hasSafe = items.some((item) => isItemSafeForResponse(item, response).safe);
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
