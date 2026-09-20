import { haversineMiles, priceLevelFromBudget } from "@/shared/lib/places";
import { isItemSafeForResponse, judgeResponseAgainstMenuWithGemini, severityWeight } from "@/backend/lib/parser";
import { getResponseJudgments, saveResponseJudgments, saveRestaurantScores, updateEvent } from "@/backend/lib/db";
import { withTimeout } from "@/backend/lib/with-timeout";
import type {
  AiItemJudgment,
  ComplexRequirementNote,
  DietResponse,
  DietreEvent,
  MatchResult,
  MenuItem,
  Restaurant,
  RestaurantMatch,
  ZeroMatchAlert,
} from "@/shared/lib/types";
import { saveEventComplexContext } from "@/backend/lib/eventContext";

function guestLabel(
  index: number,
  severity: DietResponse["parsed_rules"]["severity"],
  guestName?: string
): string {
  if (guestName?.trim()) return guestName.trim();
  const band = severity === "high" ? "High-constraint" : severity === "medium" ? "Constrained" : "Flexible";
  return `${band} guest ${index + 1}`;
}

// Gemini judgments are cached per response (see backend/lib/db.ts) — a
// dashboard reload never re-pays for the same call. Only computed when
// GEMINI_API_KEY is configured; otherwise every response falls back to the
// existing rule-based flag/ingredient matching untouched.
//
// Uncached responses are NOT awaited here: isSafe() below already treats a
// missing judgment as "fall back to the deterministic rule-based check,"
// exactly as it does with no API key configured at all, so a first-time
// response can be resolved on this same render without ever blocking on a
// network call. The Gemini read is fetched a few at a time in the
// background and simply appears, cached, on a later reload — a rate-limited
// or slow call should never be able to hang the page when a correct
// fallback already exists.
const JUDGE_BATCH_SIZE = 3;

async function resolveJudgments(
  responses: DietResponse[],
  menuItems: MenuItem[]
): Promise<Map<string, Record<string, AiItemJudgment> | null>> {
  const result = new Map<string, Record<string, AiItemJudgment> | null>();
  const uncached: DietResponse[] = [];

  await Promise.all(
    responses.map(async (response) => {
      const cached = await getResponseJudgments(response.id);
      if (cached) result.set(response.id, cached);
      else uncached.push(response);
    })
  );

  if (uncached.length > 0 && process.env.GEMINI_API_KEY) {
    void resolveJudgmentsInBackground(uncached, menuItems);
  }

  return result;
}

async function resolveJudgmentsInBackground(responses: DietResponse[], menuItems: MenuItem[]): Promise<void> {
  for (let i = 0; i < responses.length; i += JUDGE_BATCH_SIZE) {
    const batch = responses.slice(i, i + JUDGE_BATCH_SIZE);
    await Promise.all(
      batch.map(async (response) => {
        try {
          const computed = await judgeResponseAgainstMenuWithGemini(response, menuItems);
          if (computed) await saveResponseJudgments(response.id, computed);
        } catch (error) {
          console.error("Background Gemini judgment failed", error);
        }
      })
    );
  }
}

// Evaluate every candidate restaurant's full menu against the complex special requirements
// gathered from participants (e.g. meat & dairy separation, cross-contamination), using the
// unified event context file. Split into a synchronous deterministic pass (below) and this
// Gemini-only pass so a render never has to choose between blocking on the network and
// showing nothing — see the call site in matchEvent for how the two are combined.
async function fetchComplexNotesFromGemini(
  contextMarkdown: string,
  complexRules: { rule: string; responseIds: string[] }[],
  restaurants: Restaurant[],
  menuItemsByRestaurant: Map<string, MenuItem[]>,
  guestTokenIndex: (id: string) => string
): Promise<Record<string, ComplexRequirementNote[]> | null> {
  if (complexRules.length === 0 || restaurants.length === 0) return null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const rulesText = complexRules
      .map((cr, idx) => `- Rule ${idx + 1}: "${cr.rule}" (Requested by ${cr.responseIds.map(guestTokenIndex).join(", ")})`)
      .join("\n");

    const restaurantsText = restaurants
      .map((r) => {
        const items = menuItemsByRestaurant.get(r.id) ?? [];
        const itemSummary = items
          .map((i) => `${i.name} [flags: ${Object.entries(i.flags).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}; ingredients: ${i.estimated_ingredients.slice(0, 6).join(", ")}]`)
          .join("; ");
        return `Restaurant [${r.id}] "${r.name}" (${r.cuisine}): Menu items: ${itemSummary || "No menu data"}`;
      })
      .join("\n\n");

    const prompt = `You are an expert culinary auditor evaluating restaurant catering menus against the event's complex restrictions and limitations.

OFFICIAL EVENT COMPLEX RESTRICTIONS & EVENT LIMITATIONS CONTEXT FILE:
===================================================================
${contextMarkdown}
===================================================================

Complex Requirements to Specifically Audit:
${rulesText}

Candidate Restaurants and Full Menu Items:
${restaurantsText}

For each restaurant, audit its full menu against the specific guest complex restrictions and event limitations from the official context file above.
A complex restriction is NOT a simple keyword ban. For example, "yes dairy, yes meat, not together": standalone meat dishes are completely SAFE, standalone dairy/cheese dishes are completely SAFE, but combining meat and dairy in the same dish is UNSAFE.

For each restaurant, evaluate whether its menu options allow guests with these complex requirements to eat safely:
- "good": Restaurant reliably accommodates this rule with multiple clear options (e.g. independent meat dishes without dairy, and dedicated dairy/vegetarian dishes without meat).
- "neutral": Caution or limited selection (e.g. many items combine the ingredients, but a few can be safely selected or modified).
- "bad": High conflict (e.g. nearly every signature dish combines meat and dairy, or high cross-contamination risk).

Return ONLY JSON:
{"<restaurant_id>": [{"rule": "<exact rule text>", "verdict": "good"|"neutral"|"bad", "note": "<concise 1-sentence plain English explanation mentioning menu items>"}, ...]}`;

    const result = await withTimeout(model.generateContent(prompt), 9000, "Complex requirements evaluation");
    const text = result.response.text().trim();
    const jsonText = text.replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(jsonText) as Record<
      string,
      { rule?: string; verdict?: string; note?: string }[]
    >;

    const out: Record<string, ComplexRequirementNote[]> = {};
    for (const restaurant of restaurants) {
      const notes = parsed[restaurant.id];
      if (Array.isArray(notes)) {
        out[restaurant.id] = notes.map((n, idx) => {
          const ruleObj = complexRules[idx] ?? complexRules[0];
          const verdict = n.verdict === "good" || n.verdict === "bad" || n.verdict === "neutral" ? n.verdict : "neutral";
          return {
            rule: n.rule || ruleObj.rule,
            guest_tokens: ruleObj.responseIds.map(guestTokenIndex),
            verdict,
            note: n.note || "Menu evaluated against compound dietary parameters.",
          };
        });
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("429") || msg.includes("Quota exceeded") || msg.includes("quota")) {
      console.warn("Gemini quota reached or rate-limited; using rule-based evaluation fallback.");
    } else {
      console.warn("Gemini complex requirements evaluation fallback:", msg);
    }
    return null;
  }
}

// Deterministic, synchronous fallback — used both when GEMINI_API_KEY is
// unset and as the immediate result for a render while
// fetchComplexNotesFromGemini resolves in the background (see matchEvent).
function computeMockComplexNotes(
  complexRules: { rule: string; responseIds: string[] }[],
  restaurants: Restaurant[],
  menuItemsByRestaurant: Map<string, MenuItem[]>,
  guestTokenIndex: (id: string) => string
): Record<string, ComplexRequirementNote[]> {
  const out: Record<string, ComplexRequirementNote[]> = {};
  for (const restaurant of restaurants) {
    const items = menuItemsByRestaurant.get(restaurant.id) ?? [];
    out[restaurant.id] = complexRules.map((cr) => {
      const isMeatDairy = /meat.*dairy|dairy.*meat|not together|kosher/i.test(cr.rule);
      if (isMeatDairy) {
        const meatOnlyItems = items.filter(
          (i) =>
            (i.flags.contains_beef || i.flags.contains_chicken || i.flags.contains_pork || i.flags.contains_fish) &&
            !i.flags.contains_dairy &&
            !i.flags.meat_dairy_combo
        );
        const dairyOnlyItems = items.filter(
          (i) =>
            i.flags.contains_dairy &&
            !i.flags.contains_beef &&
            !i.flags.contains_chicken &&
            !i.flags.contains_pork &&
            !i.flags.contains_fish &&
            !i.flags.meat_dairy_combo
        );
        const comboItems = items.filter(
          (i) => i.flags.meat_dairy_combo || ((i.flags.contains_beef || i.flags.contains_chicken || i.flags.contains_pork) && i.flags.contains_dairy)
        );

        if (meatOnlyItems.length >= 2 && dairyOnlyItems.length >= 2) {
          return {
            rule: cr.rule,
            guest_tokens: cr.responseIds.map(guestTokenIndex),
            verdict: "good" as const,
            note: `Safe: Kitchen offers ${meatOnlyItems.length} meat dishes with zero dairy and ${dairyOnlyItems.length} vegetarian/dairy dishes with zero meat (satisfies: ${cr.rule}).`,
          };
        }
        if (meatOnlyItems.length >= 1 || dairyOnlyItems.length >= 1) {
          return {
            rule: cr.rule,
            guest_tokens: cr.responseIds.map(guestTokenIndex),
            verdict: "neutral" as const,
            note: `Caution: ${comboItems.length} signature dishes combine meat and dairy, but standalone separate entrées are available.`,
          };
        }
        return {
          rule: cr.rule,
          guest_tokens: cr.responseIds.map(guestTokenIndex),
          verdict: "bad" as const,
          note: `Conflict: Almost all menu items pair meat and dairy directly.`,
        };
      }

      // Default for cross-contamination or other complex rules
      return {
        rule: cr.rule,
        guest_tokens: cr.responseIds.map(guestTokenIndex),
        verdict: "neutral" as const,
        note: `Advisory: Kitchen uses standard restaurant prep; advise consulting venue on dedicated allergy prep surfaces.`,
      };
    });
  }
  return out;
}

// Everything the complex-restrictions evaluation actually reads: which
// rules exist and who asked for them, plus which restaurants are in play
// (a menu edit changes the restaurant's id-stable identity in this seed
// data model, so restaurant ids are a sufficient proxy for "menu changed").
function complexNotesCacheKey(
  complexRulesList: { rule: string; responseIds: string[] }[],
  restaurants: Restaurant[]
): string {
  const rulesPart = complexRulesList
    .map((r) => `${r.rule}::${[...r.responseIds].sort().join(",")}`)
    .sort()
    .join("|");
  const restaurantsPart = restaurants
    .map((r) => r.id)
    .sort()
    .join(",");
  return `${rulesPart}##${restaurantsPart}`;
}

export async function matchEvent(input: {
  event: DietreEvent;
  responses: DietResponse[];
  restaurants: Restaurant[];
  menuItems: MenuItem[];
}): Promise<MatchResult> {
  const { event, menuItems } = input;
  const inputRestaurants = input.restaurants;
  // Never mix guests across events — only score against this event's guests.
  const responses = input.responses.filter((response) => response.event_id === event.id);

  const itemsByRestaurant = new Map<string, MenuItem[]>();
  for (const item of menuItems) {
    const list = itemsByRestaurant.get(item.restaurant_id) ?? [];
    list.push(item);
    itemsByRestaurant.set(item.restaurant_id, list);
  }

  // Store-backed restaurants only (caller passes listRestaurants()). Drop
  // any accidental stubs without ids.
  const restaurants = inputRestaurants.filter((restaurant) => Boolean(restaurant?.id));

  // Wiped / empty restaurant store → hard-clear restaurant_scores (entire
  // collection via saveRestaurantScores) and return empty rankings. Never
  // write score docs when restaurants.length === 0.
  if (restaurants.length === 0) {
    void saveRestaurantScores([], event.id).catch((error) => {
      console.error("restaurant_scores clear failed", error);
    });
    return {
      restaurants: [],
      zero_matches: [],
      response_count: responses.length,
      expected_headcount: event.expected_headcount,
    };
  }

  // Empty event (no guests) → empty scores (clear cache); still surface
  // candidate restaurants with zero coverage so the host UI is not blank.
  if (responses.length === 0) {
    void saveRestaurantScores([], event.id).catch((error) => {
      console.error("restaurant_scores clear failed", error);
    });
    const maxPrice = priceLevelFromBudget(event.budget_range);
    const rankedEmpty: RestaurantMatch[] = restaurants
      .map((restaurant) => {
        const distance = haversineMiles(event, restaurant);
        return {
          restaurant,
          distance_miles: Math.round(distance * 10) / 10,
          within_radius: distance <= event.radius + 0.05,
          within_budget: restaurant.price_level <= maxPrice,
          coverage_pct: 0,
          weighted_coverage_pct: 0,
          covered_count: 0,
          total_responses: 0,
          safe_items: [],
          complex_notes: [],
        };
      })
      .sort((a, b) => a.distance_miles - b.distance_miles);
    return {
      restaurants: rankedEmpty,
      zero_matches: [],
      response_count: 0,
      expected_headcount: event.expected_headcount,
    };
  }

  const judgmentsByResponse = await resolveJudgments(responses, menuItems);

  // Collect all complex restrictions across responses
  const complexRulesMap = new Map<string, string[]>(); // rule -> responseIds
  responses.forEach((resp) => {
    const rules = resp.parsed_rules.complex_restrictions ?? [];
    // Also include meat dairy combo if in hard_excludes or raw_text
    if (
      resp.parsed_rules.hard_excludes.includes("meat dairy combo") &&
      !rules.some((r) => /meat.*dairy|dairy.*meat/i.test(r))
    ) {
      rules.push("yes dairy, yes meat, not together");
    }
    for (const r of rules) {
      const list = complexRulesMap.get(r) ?? [];
      list.push(resp.id);
      complexRulesMap.set(r, list);
    }
  });

  const complexRulesList = Array.from(complexRulesMap.entries()).map(([rule, responseIds]) => ({
    rule,
    responseIds,
  }));

  // Build and persist the official unified event context file
  const { markdown: contextMarkdown } = await saveEventComplexContext(event, responses);

  // Cached on the event the same way checklist_notes_by_restaurant is: this
  // Gemini call reasons over every restaurant's full menu at once and was
  // previously being re-run on every single dashboard load (including ones
  // where nothing had changed since the last visit), which is what was
  // making the page hang whenever the free-tier quota was exhausted. The
  // signature captures everything the evaluation actually depends on, so a
  // plain reload reuses the cached notes and a genuinely new complex rule
  // (or a changed restaurant/menu set) still triggers a fresh evaluation.
  //
  // On a cache miss, this render uses the deterministic mock read
  // immediately rather than waiting on Gemini — the real evaluation runs in
  // the background and upgrades the cache for the next load, the same
  // fire-and-forget shape as persistScores() further down.
  const complexNotesSignature = complexNotesCacheKey(complexRulesList, restaurants);
  const cachedComplexNotes =
    event.complex_notes_signature === complexNotesSignature ? event.complex_notes_by_restaurant : undefined;

  const guestTokenIndex = (id: string) => {
    const idx = responses.findIndex((r) => r.id === id);
    const resp = responses[idx];
    return guestLabel(idx, "medium", resp?.guest_name);
  };

  const complexNotesByRestaurant =
    cachedComplexNotes ?? computeMockComplexNotes(complexRulesList, restaurants, itemsByRestaurant, guestTokenIndex);

  if (!cachedComplexNotes && complexRulesList.length > 0) {
    void (async () => {
      const geminiNotes = await fetchComplexNotesFromGemini(
        contextMarkdown,
        complexRulesList,
        restaurants,
        itemsByRestaurant,
        guestTokenIndex
      );
      if (!geminiNotes) return;
      await updateEvent(event.id, {
        complex_notes_by_restaurant: geminiNotes,
        complex_notes_signature: complexNotesSignature,
      });
    })().catch((error) => console.error("complex_notes_by_restaurant cache write failed", error));
  }

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
      complex_notes: complexNotesByRestaurant[restaurant.id] ?? [],
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
    // Never write scores for missing restaurant ids (phantom seed leftovers).
    const persistable = ranked.filter((row) => Boolean(row.restaurant?.id));
    if (persistable.length === 0) {
      await saveRestaurantScores([], event.id);
      return;
    }
    await saveRestaurantScores(
      persistable.map((row) => {
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
      }),
      event.id
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
      anonymous_label: guestLabel(index, response.parsed_rules.severity, response.guest_name),
    }));

  return {
    restaurants: ranked,
    zero_matches,
    response_count: responses.length,
    expected_headcount: event.expected_headcount,
  };
}
