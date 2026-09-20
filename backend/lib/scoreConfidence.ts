import { listRestaurantScores } from "@/backend/lib/db";
import type { DietResponse, DietreEvent, MatchResult, RestaurantConfidence, RestaurantMatch } from "@/shared/lib/types";

function tierFor(score: number): "high" | "medium" | "low" {
  if (score >= 85) return "high";
  if (score >= 60) return "medium";
  return "low";
}

/**
 * Adds a per-restaurant confidence score to a match result. The group score
 * comes from the stored restaurant_scores docs (written by matchEvent's
 * persistScores) when they still describe this event's current guests, and
 * falls back to the live numbers — the same formula — otherwise. Thin or
 * low-confidence menu data caps the tier at "medium".
 */
export async function attachStoredScores(
  event: DietreEvent,
  responses: DietResponse[],
  match: MatchResult
): Promise<MatchResult> {
  const stored = await listRestaurantScores(event.id).catch(() => []);
  const responseIds = new Set(responses.filter((r) => r.event_id === event.id).map((r) => r.id));
  const fresh = new Map(
    stored
      .filter((doc) => {
        const ids = Object.keys(doc.per_guest_scores ?? {});
        return ids.length === responseIds.size && ids.every((id) => responseIds.has(id));
      })
      .map((doc) => [doc.restaurant_id, doc])
  );

  const restaurants = match.restaurants.map((row, index): RestaurantMatch => {
    const doc = fresh.get(row.restaurant.id);
    const stats = row.menu_stats;
    const utilitarianPct = doc ? Math.round(doc.group_scores.utilitarian * 100) : row.weighted_coverage_pct;
    const allCovered = doc
      ? doc.group_scores.rawlsian_min >= 1
      : row.total_responses > 0 && row.covered_count === row.total_responses;
    const noMenu = !stats || stats.item_count === 0;
    const noGuests = row.total_responses === 0;

    let confidence: RestaurantConfidence;
    if (noMenu || noGuests) {
      confidence = {
        score: null,
        tier: "unknown",
        data_limited: noMenu,
        source: doc ? "database" : "live",
        utilitarian_pct: utilitarianPct,
        rawlsian_all_covered: allCovered,
        rank_utilitarian: doc?.ranks.utilitarian || null,
        rank_rawlsian: doc?.ranks.rawlsian || null,
      };
    } else {
      const limited = stats.explicit_ingredient_pct < 50;
      let tier = tierFor(utilitarianPct);
      if (limited && tier === "high") tier = "medium";
      confidence = {
        score: utilitarianPct,
        tier,
        data_limited: limited,
        source: doc ? "database" : "live",
        utilitarian_pct: utilitarianPct,
        rawlsian_all_covered: allCovered,
        rank_utilitarian: doc?.ranks.utilitarian || index + 1,
        rank_rawlsian: doc?.ranks.rawlsian || null,
      };
    }
    return { ...row, confidence };
  });

  return { ...match, restaurants };
}
