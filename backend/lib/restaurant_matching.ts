/**
 * restaurant_matching.ts
 *
 * Scores every restaurant against every guest and ranks them.
 *
 * The loop:
 *   for each restaurant
 *     for each guest
 *       for each menu item at this restaurant
 *         is this item safe for this guest?  ← isItemSafeForResponse()
 *       if ≥1 safe item exists → guest is "covered" by this restaurant
 *     coverage_pct = covered_guests / total_guests
 *
 * "Safe" means: item.flags and item.estimated_ingredients don't conflict
 * with the guest's parsed_rules.hard_excludes.
 * e.g. guest has hard_excludes=["pork","gluten"] → any item with
 * flags.contains_pork=true OR "pork" in estimated_ingredients is unsafe.
 *
 * Special cases handled inside isItemSafeForResponse (parser.ts):
 *   - "vegan" / "vegetarian" / "meat" → checks the relevant flag groups
 *   - "meat dairy combo" → item unsafe only if it has BOTH meat AND dairy
 *     (kosher: meat alone is fine, dairy alone is fine, combined is not)
 *   - severity=high + confidence=low item → marked unsafe (allergy guests
 *     are blocked from items we're not sure about)
 *
 * complex_restrictions (e.g. "halal", "careful prep for gluten") are stored
 * on the guest doc for the host to see, but per-item safety is enforced only
 * via hard_excludes. Halal enforcement comes from hard_excludes=["pork","alcohol"].
 *
 * Scores:
 *   coverage_pct          = covered / total  (unweighted, for display)
 *   weighted_coverage_pct = Σweight(covered) / Σweight(all)
 *     where severity "high"=3×, "medium"=2×, "low"=1×
 *     (an allergic guest matters more than a "I prefer spicy" guest)
 */

import { haversineMiles } from "@/shared/lib/places";
import {
  estimatedPartyTotal,
  eventBudgetCap,
  predictRestaurantCost,
} from "@/shared/lib/predictedCost";
import { isItemSafeForResponse, severityWeight } from "@/backend/lib/parser";
import { saveRestaurantScores } from "@/backend/lib/db";
import type {
  DietResponse,
  DietreEvent,
  MatchResult,
  MenuItem,
  Restaurant,
  RestaurantMatch,
  SafeMenuItem,
  ZeroMatchAlert,
} from "@/shared/lib/types";

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function matchEvent(input: {
  event: DietreEvent;
  responses: DietResponse[];
  restaurants: Restaurant[];
  menuItems: MenuItem[];
}): Promise<MatchResult> {
  const { event, restaurants, menuItems } = input;

  // Only score guests that actually belong to this event.
  const responses = input.responses.filter((r) => r.event_id === event.id);

  // Pre-group menu items by restaurant so we don't scan the full list every time.
  // menuItemsByRestaurant: { "restaurant-id" → MenuItem[] }
  const menuItemsByRestaurant = new Map<string, MenuItem[]>();
  for (const item of menuItems) {
    const list = menuItemsByRestaurant.get(item.restaurant_id) ?? [];
    list.push(item);
    menuItemsByRestaurant.set(item.restaurant_id, list);
  }

  // Edge case: no restaurants in the DB yet.
  if (restaurants.length === 0) {
    void saveRestaurantScores([], event.id);
    return { restaurants: [], zero_matches: [], response_count: responses.length, expected_headcount: event.expected_headcount };
  }

  // Edge case: no guests yet — show restaurants with 0% coverage so the host
  // dashboard isn't blank while waiting for responses.
  if (responses.length === 0) {
    void saveRestaurantScores([], event.id);
    const budgetCap = eventBudgetCap(event);
    return {
      restaurants: restaurants.map((restaurant) => {
        const items = menuItemsByRestaurant.get(restaurant.id) ?? [];
        const predicted = predictRestaurantCost({
          menuPrices: items.map((item) => item.price),
          priceLevel: restaurant.price_level,
        });
        return {
          restaurant,
          distance_miles: round1(haversineMiles(event, restaurant)),
          within_radius: haversineMiles(event, restaurant) <= event.radius + 0.05,
          within_budget: predicted.perPerson <= budgetCap,
          predicted_cost_per_person: predicted.perPerson,
          predicted_cost_source: predicted.source,
          predicted_party_total: estimatedPartyTotal(predicted.perPerson, event.expected_headcount),
          coverage_pct: 0,
          weighted_coverage_pct: 0,
          covered_count: 0,
          total_responses: 0,
          safe_items: [],
          complex_notes: [],
          bayesian_score: 0.5,
          overall_score: 0,
        };
      }),
      zero_matches: [],
      response_count: 0,
      expected_headcount: event.expected_headcount,
    };
  }

  // ---------------------------------------------------------------------------
  // Core scoring loop
  // ---------------------------------------------------------------------------

  const budgetCap = eventBudgetCap(event);
  const totalWeight = responses.reduce((sum, r) => sum + severityWeight(r.parsed_rules.severity), 0);

  // Track which guests can eat somewhere (used for zero-match alerts).
  const guestsCoveredAnywhere = new Set<string>();

  const ranked: RestaurantMatch[] = restaurants.map((restaurant) => {
    const items = menuItemsByRestaurant.get(restaurant.id) ?? [];
    const distance = haversineMiles(event, restaurant);
    const within_radius = distance <= event.radius + 0.05;

    // --- Step A: for each menu item, which guests can eat it? ---
    //
    // safeItems = menu items that at least one guest can safely eat.
    // Each entry records which guest IDs it's safe for.
    const safeItems: SafeMenuItem[] = items
      .map((item) => {
        const coveredGuestIds: string[] = [];
        let uncertain = false;
        for (const guest of responses) {
          const result = isItemSafeForResponse(item, guest);
          if (result.safe) {
            coveredGuestIds.push(guest.id);
            if (result.uncertain) uncertain = true;
          }
        }
        return { item, covered_response_ids: coveredGuestIds, uncertain };
      })
      .filter((entry) => entry.covered_response_ids.length > 0)
      .sort((a, b) => b.covered_response_ids.length - a.covered_response_ids.length);

    const predicted = predictRestaurantCost({
      menuPrices: items.map((item) => item.price),
      safeMenuPrices: safeItems.map((entry) => entry.item.price),
      priceLevel: restaurant.price_level,
    });
    const within_budget = predicted.perPerson <= budgetCap;

    // --- Step B: for each guest, are they covered by this restaurant? ---
    //
    // A guest is covered if ANY item is safe for them.
    let coveredWeight = 0;
    const coveredGuestIds: string[] = [];

    for (const guest of responses) {
      const hasSafeItem = items.some((item) => isItemSafeForResponse(item, guest).safe);
      if (hasSafeItem) {
        coveredWeight += severityWeight(guest.parsed_rules.severity);
        coveredGuestIds.push(guest.id);
        // Only counts toward "covered anywhere" if restaurant is also in radius + budget.
        if (within_radius && within_budget) guestsCoveredAnywhere.add(guest.id);
      }
    }

    // --- Step C: compute coverage scores ---
    const coverage_pct = Math.round((coveredGuestIds.length / responses.length) * 100);
    const weighted_coverage_pct = totalWeight === 0 ? 0 : Math.round((coveredWeight / totalWeight) * 100);

    return {
      restaurant,
      distance_miles: round1(distance),
      within_radius,
      within_budget,
      predicted_cost_per_person: predicted.perPerson,
      predicted_cost_source: predicted.source,
      predicted_party_total: estimatedPartyTotal(predicted.perPerson, event.expected_headcount),
      coverage_pct,
      weighted_coverage_pct,
      covered_count: coveredGuestIds.length,
      total_responses: responses.length,
      safe_items: safeItems,
      complex_notes: [], // advisory notes surfaced separately by host limitations
      // No Bayesian signals in this path; overall_score falls back to coverage
      bayesian_score: 0.5,
      overall_score: weighted_coverage_pct,
    };
  });

  // ---------------------------------------------------------------------------
  // Ranking
  // ---------------------------------------------------------------------------

  // Primary sort: eligible (in radius AND budget) first, then weighted coverage,
  // then unweighted coverage, then closest.
  ranked.sort((a, b) => {
    const aEligible = Number(a.within_radius && a.within_budget);
    const bEligible = Number(b.within_radius && b.within_budget);
    if (aEligible !== bEligible) return bEligible - aEligible;
    if (b.weighted_coverage_pct !== a.weighted_coverage_pct) return b.weighted_coverage_pct - a.weighted_coverage_pct;
    if (b.coverage_pct !== a.coverage_pct) return b.coverage_pct - a.coverage_pct;
    return a.distance_miles - b.distance_miles;
  });

  // Rawlsian alternative: maximize the worst-off guest (no one gets left behind).
  const rawlsianOrder = [...ranked].sort((a, b) => {
    const aMin = a.covered_count === a.total_responses ? 1 : a.coverage_pct / 100;
    const bMin = b.covered_count === b.total_responses ? 1 : b.coverage_pct / 100;
    if (aMin !== bMin) return bMin - aMin;
    return b.weighted_coverage_pct - a.weighted_coverage_pct;
  });

  const utilitarianRank = new Map(ranked.map((r, i) => [r.restaurant.id, i + 1]));
  const rawlsianRank = new Map(rawlsianOrder.map((r, i) => [r.restaurant.id, i + 1]));

  // ---------------------------------------------------------------------------
  // Zero-match alerts: guests no eligible restaurant can feed
  // ---------------------------------------------------------------------------

  const zero_matches: ZeroMatchAlert[] = responses
    .filter((guest) => !guestsCoveredAnywhere.has(guest.id))
    .map((guest, index) => ({
      response_id: guest.id,
      severity: guest.parsed_rules.severity,
      hard_excludes: guest.parsed_rules.hard_excludes,
      contact_email: guest.contact_email,
      anonymous_label: guestLabel(guest, index),
    }));

  // ---------------------------------------------------------------------------
  // Persist scores to Firestore (cache so dashboard reloads are instant)
  // ---------------------------------------------------------------------------

  void persistScores(ranked, responses, menuItemsByRestaurant, event.id, utilitarianRank, rawlsianRank);

  return {
    restaurants: ranked,
    zero_matches,
    response_count: responses.length,
    expected_headcount: event.expected_headcount,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function guestLabel(guest: DietResponse, index: number): string {
  if (guest.guest_name?.trim()) return guest.guest_name.trim();
  const band =
    guest.parsed_rules.severity === "high" ? "High-constraint" :
    guest.parsed_rules.severity === "medium" ? "Constrained" : "Flexible";
  return `${band} guest ${index + 1}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

async function persistScores(
  ranked: RestaurantMatch[],
  responses: DietResponse[],
  menuItemsByRestaurant: Map<string, MenuItem[]>,
  eventId: string,
  utilitarianRank: Map<string, number>,
  rawlsianRank: Map<string, number>,
) {
  const computed_at = new Date().toISOString();
  await saveRestaurantScores(
    ranked.map((row) => {
      const items = menuItemsByRestaurant.get(row.restaurant.id) ?? [];
      const per_guest_scores: Record<string, number> = {};
      const conflicts: Array<{ guest_id: string; hard_excludes: string[] }> = [];

      for (const guest of responses) {
        const covered = items.some((item) => isItemSafeForResponse(item, guest).safe);
        per_guest_scores[guest.id] = covered ? 1 : 0;
        if (!covered) conflicts.push({ guest_id: guest.id, hard_excludes: guest.parsed_rules.hard_excludes });
      }

      const values = Object.values(per_guest_scores);
      return {
        event_id: eventId,
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
        overall_score: row.overall_score,
        computed_at,
      };
    }),
    eventId,
  );
}
