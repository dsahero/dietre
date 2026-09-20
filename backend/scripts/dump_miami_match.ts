/**
 * Dump Miami run event matching state from Firestore for accuracy audit.
 * Run: npx tsx backend/scripts/dump_miami_match.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), "backend/.env") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

import {
  getEvent,
  listMenuItems,
  listResponses,
  listRestaurantScores,
  listRestaurantsForEvent,
  backendLabel,
} from "@/backend/lib/db";

const EVENT_ID = process.argv[2]?.trim() || "e91a7405-0e90-4b69-8401-da3280544192";

async function main() {
  console.log(JSON.stringify({ backend: backendLabel(), eventId: EVENT_ID }, null, 2));

  const event = await getEvent(EVENT_ID);
  if (!event) {
    console.error("Event not found");
    process.exit(1);
  }

  const [responses, restaurants, scores, menuItems] = await Promise.all([
    listResponses(EVENT_ID),
    listRestaurantsForEvent(event),
    listRestaurantScores(EVENT_ID),
    listMenuItems(),
  ]);

  const menuByRest = new Map<string, number>();
  for (const item of menuItems) {
    menuByRest.set(item.restaurant_id, (menuByRest.get(item.restaurant_id) ?? 0) + 1);
  }

  const restaurantById = new Map(restaurants.map((r) => [r.id, r]));

  const rankedScores = [...scores].sort((a, b) => {
    const aRank = a.ranks?.utilitarian ?? 999;
    const bRank = b.ranks?.utilitarian ?? 999;
    if (aRank !== bRank) return aRank - bRank;
    return (b.overall_score ?? 0) - (a.overall_score ?? 0);
  });

  const guestSummary = responses.map((r, i) => ({
    index: i + 1,
    id: r.id,
    guest_name: r.guest_name ?? null,
    hard_excludes: r.parsed_rules.hard_excludes,
    soft_preferences: r.parsed_rules.soft_preferences ?? [],
    complex_restrictions: r.parsed_rules.complex_restrictions ?? [],
    severity: r.parsed_rules.severity,
    raw_text: r.raw_text,
  }));

  const scoreSummary = rankedScores.map((s) => {
    const rest = restaurantById.get(s.restaurant_id);
    const coveredGuests = Object.entries(s.per_guest_scores ?? {})
      .filter(([, v]) => v > 0)
      .map(([gid]) => gid);
    const uncovered = Object.entries(s.per_guest_scores ?? {})
      .filter(([, v]) => v === 0)
      .map(([gid]) => gid);
    return {
      rank_utilitarian: s.ranks?.utilitarian,
      rank_rawlsian: s.ranks?.rawlsian,
      restaurant_id: s.restaurant_id,
      name: rest?.name ?? "(missing restaurant doc)",
      cuisine: rest?.cuisine ?? null,
      price_level: rest?.price_level ?? null,
      lat: rest?.lat ?? null,
      lng: rest?.lng ?? null,
      menu_item_count: menuByRest.get(s.restaurant_id) ?? 0,
      coverage_pct: s.coverage_pct,
      weighted_coverage_pct: s.weighted_coverage_pct,
      overall_score: s.overall_score,
      group_scores: s.group_scores,
      covered_guest_ids: coveredGuests,
      uncovered_guest_ids: uncovered,
      conflicts: s.conflicts,
      computed_at: s.computed_at,
    };
  });

  const top = scoreSummary[0];
  const topMenu =
    top &&
    menuItems
      .filter((m) => m.restaurant_id === top.restaurant_id)
      .slice(0, 40)
      .map((m) => ({
        id: m.id,
        name: m.name,
        flags: m.flags,
        ingredients: (m.estimated_ingredients ?? []).slice(0, 12),
        price: m.price,
      }));

  const out = {
    event: {
      id: event.id,
      name: event.name,
      location: event.location,
      lat: event.lat,
      lng: event.lng,
      radius: event.radius,
      budget_range: event.budget_range,
      expected_headcount: event.expected_headcount,
      candidate_restaurant_ids: event.candidate_restaurant_ids,
      has_preference_signals: Boolean(event.preference_signals && Object.keys(event.preference_signals).length),
      preference_signals_signature: event.preference_signals_signature ?? null,
      has_complex_notes: Boolean(
        event.complex_notes_by_restaurant && Object.keys(event.complex_notes_by_restaurant).length
      ),
      complex_notes_signature: event.complex_notes_signature ?? null,
      complex_notes_by_restaurant: event.complex_notes_by_restaurant ?? null,
      preference_signals: event.preference_signals ?? null,
    },
    guest_count: responses.length,
    restaurant_count: restaurants.length,
    score_count: scores.length,
    guests: guestSummary,
    rankings: scoreSummary,
    top_restaurant_menu_sample: topMenu,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
