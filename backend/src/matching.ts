import { idFromKey } from "./ids.js";
import { isItemSafeForGuest, itemConflicts, severityWeight } from "./parser.js";
import { haversineMiles, pointToLatLng } from "./places.js";
import type { DietreEvent, Guest, MenuItem, Restaurant, RestaurantScore, ZeroMatchAlert } from "./types.js";

function anonymousLabel(index: number, severity: Guest["preference_vector"]["severity"]): string {
  const band = severity === "high" ? "High-constraint" : severity === "medium" ? "Constrained" : "Flexible";
  return `${band} guest ${index + 1}`;
}

function guestScoreFromItems(guest: Guest, items: MenuItem[]): {
  score: number;
  safe_item_ids: string[];
  conflicts: string[];
  conflicting_items: { item_id: string; hits: string[] }[];
} {
  const safe_item_ids: string[] = [];
  const conflicting_items: { item_id: string; hits: string[] }[] = [];
  let certainSafe = 0;
  let uncertainSafe = 0;
  const conflictSet = new Set<string>();

  for (const item of items) {
    const result = isItemSafeForGuest(item, guest);
    if (result.safe) {
      safe_item_ids.push(item._id);
      if (result.uncertain) uncertainSafe += 1;
      else certainSafe += 1;
    } else if (result.conflicts.length > 0) {
      conflicting_items.push({ item_id: item._id, hits: result.conflicts });
      for (const hit of result.conflicts) conflictSet.add(hit);
    } else {
      const hits = itemConflicts(item, guest.preference_vector);
      if (hits.length > 0) {
        conflicting_items.push({ item_id: item._id, hits });
        for (const hit of hits) conflictSet.add(hit);
      }
    }
  }

  let score = 0;
  if (certainSafe > 0) score = 1;
  else if (uncertainSafe > 0) score = 0.4;

  return { score, safe_item_ids, conflicts: [...conflictSet], conflicting_items };
}

export function computeRestaurantScores(input: {
  event: DietreEvent;
  guests: Guest[];
  restaurants: Restaurant[];
  menuItems: MenuItem[];
}): { scores: RestaurantScore[]; zero_matches: ZeroMatchAlert[] } {
  const { event, guests, restaurants, menuItems } = input;
  const itemsByRestaurant = new Map<string, MenuItem[]>();
  for (const item of menuItems) {
    const list = itemsByRestaurant.get(item.restaurant_id) ?? [];
    list.push(item);
    itemsByRestaurant.set(item.restaurant_id, list);
  }

  const eventPoint = pointToLatLng(event.location);
  const allowed = new Set(event.candidate_restaurant_ids);
  const now = new Date().toISOString();

  const rankedCandidates = restaurants.filter((restaurant) => {
    if (allowed.size > 0 && !allowed.has(restaurant._id)) return false;
    const distance = haversineMiles(eventPoint, pointToLatLng(restaurant.location));
    return distance <= event.radius_miles + 0.05;
  });

  const weights = guests.map((guest) => severityWeight(guest.preference_vector.severity));
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const bestByGuest = new Map<string, number>();

  const scores: RestaurantScore[] = rankedCandidates.map((restaurant) => {
    const items = itemsByRestaurant.get(restaurant._id) ?? [];
    const per_guest_scores = guests.map((guest) => {
      const result = guestScoreFromItems(guest, items);
      const prev = bestByGuest.get(guest._id) ?? 0;
      if (result.score > prev) bestByGuest.set(guest._id, result.score);
      return {
        guest_id: guest._id,
        score: result.score,
        safe_item_ids: result.safe_item_ids,
        conflicts: result.conflicts,
      };
    });

    let utilitarian = 0;
    if (guests.length === 0) utilitarian = 0;
    else if (weightSum === 0) utilitarian = per_guest_scores.reduce((s, g) => s + g.score, 0) / guests.length;
    else {
      utilitarian =
        per_guest_scores.reduce((sum, row, i) => sum + row.score * weights[i], 0) / weightSum;
    }
    const rawlsian_min = guests.length === 0 ? 0 : Math.min(...per_guest_scores.map((row) => row.score));

    const conflicts = guests
      .map((guest, index) => {
        const row = per_guest_scores[index];
        if (row.score > 0) return null;
        const result = guestScoreFromItems(guest, items);
        return {
          guest_id: guest._id,
          hard_excludes: guest.preference_vector.hard_excludes,
          conflicting_items: result.conflicting_items,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    return {
      _id: idFromKey(`score:${event._id}:${restaurant._id}`),
      event_id: event._id,
      restaurant_id: restaurant._id,
      per_guest_scores,
      group_scores: {
        utilitarian: Math.round(utilitarian * 1000) / 1000,
        rawlsian_min: Math.round(rawlsian_min * 1000) / 1000,
      },
      conflicts,
      ranks: { utilitarian: 0, rawlsian: 0 },
      computed_at: now,
    };
  });

  const byUtil = [...scores].sort((a, b) => b.group_scores.utilitarian - a.group_scores.utilitarian);
  const byRawls = [...scores].sort((a, b) => b.group_scores.rawlsian_min - a.group_scores.rawlsian_min);
  byUtil.forEach((row, index) => {
    const target = scores.find((s) => s._id === row._id);
    if (target) target.ranks.utilitarian = index + 1;
  });
  byRawls.forEach((row, index) => {
    const target = scores.find((s) => s._id === row._id);
    if (target) target.ranks.rawlsian = index + 1;
  });

  const zero_matches: ZeroMatchAlert[] = guests
    .map((guest, index) => ({ guest, index }))
    .filter(({ guest }) => (bestByGuest.get(guest._id) ?? 0) === 0)
    .map(({ guest, index }) => ({
      guest_id: guest._id,
      anonymous_label: anonymousLabel(index, guest.preference_vector.severity),
      severity: guest.preference_vector.severity,
      hard_excludes: guest.preference_vector.hard_excludes,
      contact_email: guest.email,
      confidence: guest.confidence,
    }));

  return { scores, zero_matches };
}
