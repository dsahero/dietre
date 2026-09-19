import { haversineMiles, priceLevelFromBudget } from "@/shared/lib/places";
import { isItemSafeForResponse, judgeResponseAgainstMenuWithGemini, severityWeight } from "@/backend/lib/parser";
import { getResponseJudgments, saveResponseJudgments, saveRestaurantScores } from "@/backend/lib/db";
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

// Evaluate every candidate restaurant's full menu against the complex special requirements
// gathered from participants (e.g. meat & dairy separation, cross-contamination).
// Evaluate every candidate restaurant's full menu against the complex special requirements
// gathered from participants (e.g. meat & dairy separation, cross-contamination) using
// the unified event context file.
// Gemini reasons over the complete menu items; if GEMINI_API_KEY is unset, an intelligent
// mock inspection provides accurate dietary feedback.
async function evaluateRestaurantsAgainstComplexRestrictions(
  contextMarkdown: string,
  complexRules: { rule: string; responseIds: string[] }[],
  restaurants: Restaurant[],
  menuItemsByRestaurant: Map<string, MenuItem[]>,
  guestTokenIndex: (id: string) => string
): Promise<Record<string, ComplexRequirementNote[]>> {
  if (complexRules.length === 0 || restaurants.length === 0) return {};

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
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

      const result = await model.generateContent(prompt);
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
      if (Object.keys(out).length > 0) return out;
    } catch (e) {
      console.warn("Gemini complex requirements evaluation fallback:", e);
    }
  }

  // Deterministic mock evaluation when GEMINI_API_KEY is not configured
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

export async function matchEvent(input: {
  event: DietreEvent;
  responses: DietResponse[];
  restaurants: Restaurant[];
  menuItems: MenuItem[];
}): Promise<MatchResult> {
  const { event, restaurants, menuItems } = input;
  // Never mix guests across events — only score against this event's guests.
  const responses = input.responses.filter((response) => response.event_id === event.id);

  const itemsByRestaurant = new Map<string, MenuItem[]>();
  for (const item of menuItems) {
    const list = itemsByRestaurant.get(item.restaurant_id) ?? [];
    list.push(item);
    itemsByRestaurant.set(item.restaurant_id, list);
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

  const complexNotesByRestaurant = await evaluateRestaurantsAgainstComplexRestrictions(
    contextMarkdown,
    complexRulesList,
    restaurants,
    itemsByRestaurant,
    (id) => {
      const idx = responses.findIndex((r) => r.id === id);
      const resp = responses[idx];
      return guestLabel(idx, "medium", resp?.guest_name);
    }
  );

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
