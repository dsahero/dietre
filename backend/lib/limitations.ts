import type { BudgetRange, LimitationChecklistItem, MenuItem, Restaurant, RestaurantChecklistNote } from "@/shared/lib/types";
import { withTimeout } from "@/backend/lib/with-timeout";

// Host-authored free text ("wheelchair accessible, sound curfew 10:30pm,
// vegan entrée required") isn't a per-guest dietary rule, so it never goes
// through parser.ts. Everything here is Gemini-only: with no API key, the
// host's text is still saved and shown verbatim, it's just not broken into
// a checklist or checked against venues — matching the rest of the app's
// "mock mode" fallback rather than fabricating a fake analysis.

export async function extractLimitationsChecklist(text: string): Promise<LimitationChecklistItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text.trim()) return [];

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `A host organizing a catered event wrote these limitations/requirements in their own words:
"${text}"

Break this into a short checklist of distinct, concrete, checkable venue requirements — accessibility, noise, capacity, dietary accommodations the venue itself must offer, timing, anything a venue could plausibly be evaluated against. Skip anything that's actually a per-guest dietary rule (those are handled separately from individual responses) unless it's phrased as a blanket venue requirement (e.g. "must offer a vegan entrée" is fine; "I'm allergic to peanuts" is not — that's a guest response, not a venue requirement).

Return ONLY a JSON array of short labels, each under 60 characters, e.g.:
["Wheelchair-accessible entrance", "Vegan entrée available", "Quiet enough for conversation after 10:30 PM"]
If nothing concrete and checkable is stated, return [].`;
    const result = await withTimeout(model.generateContent(prompt), 9000, "Limitations checklist extraction");
    const text2 = result.response.text().trim();
    const jsonText = text2.replace(/^```json\s*|\s*```$/g, "");
    const labels = JSON.parse(jsonText) as unknown;
    if (!Array.isArray(labels)) return [];
    return labels
      .filter((label): label is string => typeof label === "string" && label.trim().length > 0)
      .slice(0, 8)
      .map((label, index) => ({ id: `check-${index + 1}`, label: label.trim() }));
  } catch {
    return [];
  }
}

export async function suggestEventDetailsFromLimitations(
  text: string
): Promise<{ radius?: number; budget_range?: BudgetRange }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text.trim()) return {};

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `A host wrote these event limitations/requirements: "${text}"

If — and only if — the text explicitly states a search radius in miles, or a budget level, extract them. Do not guess or infer from vague language.
Return ONLY JSON: {"radius": number|null, "budget_range": "$"|"$$"|"$$$"|null}
- radius: only if a specific mile distance is explicitly stated (e.g. "within 5 miles" -> 5). Otherwise null.
- budget_range: "$" for roughly under $15/person or "budget-friendly", "$$" for roughly $15-35/person or "moderate", "$$$" for roughly $35+/person or "upscale"/"fine dining" — only if a budget is explicitly stated. Otherwise null.`;
    const result = await withTimeout(model.generateContent(prompt), 9000, "Event details suggestion");
    const raw = result.response.text().trim();
    const jsonText = raw.replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(jsonText) as { radius?: number | null; budget_range?: string | null };
    const out: { radius?: number; budget_range?: BudgetRange } = {};
    if (typeof parsed.radius === "number" && parsed.radius > 0 && parsed.radius <= 30) {
      out.radius = parsed.radius;
    }
    if (parsed.budget_range === "$" || parsed.budget_range === "$$" || parsed.budget_range === "$$$") {
      out.budget_range = parsed.budget_range;
    }
    return out;
  } catch {
    return {};
  }
}

// One batched call covering every restaurant, rather than one call per
// restaurant — keeps this to a single Gemini round-trip even for a full
// candidate list. Called once when the host saves new limitations text
// (see the PATCH handler), then cached on the event document — never
// recomputed on a plain dashboard reload.
export async function evaluateRestaurantsAgainstChecklist(
  checklist: LimitationChecklistItem[],
  restaurants: Restaurant[],
  menuItemsByRestaurant: Map<string, MenuItem[]>
): Promise<Record<string, RestaurantChecklistNote[]>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || checklist.length === 0 || restaurants.length === 0) return {};

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const checklistText = checklist.map((item) => `- ${item.id}: ${item.label}`).join("\n");
    const restaurantsText = restaurants
      .map((restaurant) => {
        const items = menuItemsByRestaurant.get(restaurant.id) ?? [];
        const menuNames = items.map((item) => item.name).slice(0, 12).join(", ") || "no menu data";
        return `- id: ${restaurant.id} | name: ${restaurant.name} | cuisine: ${restaurant.cuisine} | price_level: ${restaurant.price_level} | sample menu items: ${menuNames}`;
      })
      .join("\n");

    const prompt = `A host is checking candidate restaurants against a checklist of event requirements. All you know about each restaurant is its name, cuisine, price level, and a sample of menu item names — you do NOT have real access to their accessibility features, hours, or policies, so be honest about that limitation.

Checklist:
${checklistText}

Restaurants:
${restaurantsText}

For each restaurant, judge each checklist item using only what's plausible to infer from the name/cuisine/menu (e.g. a menu with clearly vegan items suggests a vegan entrée is available; nothing here tells you about wheelchair access or noise levels, so those should usually be "unknown" unless the venue name/type gives a real signal).

Return ONLY JSON shaped exactly like:
{"<restaurant_id>": [{"itemId": "<checklist item id>", "verdict": "good"|"neutral"|"bad"|"unknown", "note": "one short honest sentence"}, ...], ...}
Include every restaurant id and every checklist item id. Default to "unknown" rather than guessing confidently past what the data supports.`;

    const result = await withTimeout(model.generateContent(prompt), 9000, "Restaurant checklist evaluation");
    const raw = result.response.text().trim();
    const jsonText = raw.replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(jsonText) as Record<
      string,
      { itemId?: string; verdict?: string; note?: string }[]
    >;

    const out: Record<string, RestaurantChecklistNote[]> = {};
    for (const restaurant of restaurants) {
      const notes = parsed[restaurant.id];
      if (!Array.isArray(notes)) continue;
      out[restaurant.id] = checklist.map((item) => {
        const found = notes.find((note) => note.itemId === item.id);
        const verdict = found?.verdict;
        return {
          itemId: item.id,
          label: item.label,
          verdict: verdict === "good" || verdict === "bad" || verdict === "neutral" ? verdict : "unknown",
          note: found?.note || "Not enough data to judge this from the menu alone.",
        };
      });
    }
    return out;
  } catch {
    return {};
  }
}
