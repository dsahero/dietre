import { haversineMiles } from "@/shared/lib/places";
import {
  estimatedPartyTotal,
  eventBudgetCap,
  predictRestaurantCost,
} from "@/shared/lib/predictedCost";
import { isItemSafeForResponse, judgeResponseAgainstMenuWithGemini, scoreAllPreferencesWithGemini, severityWeight } from "@/backend/lib/parser";
import { getResponseJudgments, saveResponseJudgments, saveRestaurantScores, updateEvent } from "@/backend/lib/db";
import { withTimeout } from "@/backend/lib/with-timeout";
import type {
  AiItemJudgment,
  ComplexRequirementNote,
  DietResponse,
  DietreEvent,
  MatchResult,
  MenuItem,
  MenuStats,
  PreferenceSignal,
  Restaurant,
  RestaurantMatch,
  ZeroMatchAlert,
} from "@/shared/lib/types";
import { saveEventComplexContext } from "@/backend/lib/eventContext";

function menuStatsFor(items: MenuItem[]): MenuStats {
  const total = items.length;
  const pct = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100));
  return {
    item_count: total,
    explicit_ingredient_pct: pct(items.filter((item) => item.estimated_ingredients.length > 0).length),
    high_confidence_pct: pct(items.filter((item) => item.confidence === "high").length),
  };
}

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

// Synchronous fallback — used when GEMINI_API_KEY is unset and as the
// immediate result while fetchComplexNotesFromGemini resolves in the
// background. Rather than attempting to simulate Gemini with regex (which
// is brittle and gives false precision), this returns an honest "pending"
// note for every rule × restaurant pair.
function computeMockComplexNotes(
  complexRules: { rule: string; responseIds: string[] }[],
  restaurants: Restaurant[],
  guestTokenIndex: (id: string) => string
): Record<string, ComplexRequirementNote[]> {
  const out: Record<string, ComplexRequirementNote[]> = {};
  for (const restaurant of restaurants) {
    out[restaurant.id] = complexRules.map((cr) => ({
      rule: cr.rule,
      guest_tokens: cr.responseIds.map(guestTokenIndex),
      verdict: "neutral" as const,
      note: "Complex rule — AI evaluation pending. Host should verify directly with the venue.",
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bayesian preference scoring — Beta-Bernoulli conjugate model
// ---------------------------------------------------------------------------
// Prior: Beta(1,1) — uniform, "we know this guest can eat here but nothing
// about satisfaction." Each LLM-extracted preference signal is a pseudo-
// Bernoulli observation: positive → α += strength, negative → β += strength.
// Posterior mean α/(α+β) = expected probability of guest satisfaction.
// If the guest is infeasible (can't eat anything), utility is 0 regardless.

function bayesianUtility(
  feasible: boolean,
  preferenceSignal: PreferenceSignal | null | undefined,
  complexVerdict: "good" | "neutral" | "bad" | null,
): number {
  if (!feasible) return 0;

  let alpha = 1;
  let beta = 1;

  if (preferenceSignal) {
    if (preferenceSignal.direction === "positive") alpha += preferenceSignal.strength;
    else if (preferenceSignal.direction === "negative") beta += preferenceSignal.strength;
  }

  if (complexVerdict === "good") alpha += 2;
  else if (complexVerdict === "bad") beta += 3;
  // "neutral" is treated as no signal: the mock stub returns neutral for every
  // complex-rule guest before Gemini runs, so penalizing it would drag every
  // restaurant's utility down to ~0.33 whenever any guest has a complex rule.
  // A real Gemini "neutral" also means "can't tell" — same treatment.

  return alpha / (alpha + beta);
}

// Extract the worst complex-note verdict for a specific guest at a restaurant.
function getComplexVerdictForGuest(
  notes: ComplexRequirementNote[] | undefined,
  guestToken: string,
): "good" | "neutral" | "bad" | null {
  if (!notes?.length) return null;
  const relevant = notes.filter((n) => n.guest_tokens?.includes(guestToken));
  if (relevant.length === 0) return null;
  if (relevant.some((n) => n.verdict === "bad")) return "bad";
  if (relevant.some((n) => n.verdict === "neutral")) return "neutral";
  return "good";
}

// Cache key for preference signals — changes when guest preferences or
// the candidate restaurant set change.
function preferenceSignalsCacheKey(
  responses: DietResponse[],
  restaurants: Restaurant[],
): string {
  const respPart = responses
    .filter((r) => r.parsed_rules.soft_preferences?.length)
    .map((r) => `${r.id}:${r.parsed_rules.soft_preferences.join(",")}`)
    .sort()
    .join("|");
  const restPart = restaurants.map((r) => r.id).sort().join(",");
  return `pref##${respPart}##${restPart}`;
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

  // A restaurant that was re-keyed keeps its old ids as aliases; menu items
  // attached under an old id still belong to it.
  for (const restaurant of restaurants) {
    if (itemsByRestaurant.has(restaurant.id)) continue;
    for (const alias of restaurant.alias_ids ?? []) {
      const aliased = itemsByRestaurant.get(alias);
      if (aliased?.length) {
        itemsByRestaurant.set(restaurant.id, aliased);
        break;
      }
    }
  }

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
    const budgetCap = eventBudgetCap(event);
    const rankedEmpty: RestaurantMatch[] = restaurants
      .map((restaurant) => {
        const distance = haversineMiles(event, restaurant);
        const items = itemsByRestaurant.get(restaurant.id) ?? [];
        const predicted = predictRestaurantCost({
          menuPrices: items.map((item) => item.price),
          priceLevel: restaurant.price_level,
        });
        return {
          restaurant,
          distance_miles: Math.round(distance * 10) / 10,
          within_radius: distance <= event.radius + 0.05,
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
          menu_stats: menuStatsFor(items),
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
    cachedComplexNotes ?? computeMockComplexNotes(complexRulesList, restaurants, guestTokenIndex);

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

  // -------------------------------------------------------------------------
  // Bayesian preference signals — cached per distinct (preferences, restaurants)
  // -------------------------------------------------------------------------
  const prefCacheKey = preferenceSignalsCacheKey(responses, restaurants);
  const cachedPrefSignals =
    event.preference_signals_signature === prefCacheKey
      ? event.preference_signals
      : undefined;

  // Preference signals: responseId → restaurantId → PreferenceSignal.
  // On cache miss we use an empty map (Beta(1,1) prior → no effect on
  // ranking) and fire off background computation for the next load.
  const preferenceSignals: Record<string, Record<string, PreferenceSignal>> =
    cachedPrefSignals ?? {};

  const hasAnyPreferences = responses.some((r) => r.parsed_rules.soft_preferences?.length);
  // Only score preferences against restaurants that actually have menu items —
  // restaurants with no menu data will always have 0% coverage regardless.
  const restaurantsWithMenus = restaurants.filter((r) => (itemsByRestaurant.get(r.id)?.length ?? 0) > 0);
  if (!cachedPrefSignals && hasAnyPreferences && restaurantsWithMenus.length > 0) {
    void (async () => {
      // Single batched call: all pref-having guests × all candidate
      // restaurants in one Gemini request (vs. N sequential calls).
      const computed = await scoreAllPreferencesWithGemini(responses, restaurantsWithMenus);
      if (computed && Object.keys(computed).length > 0) {
        await updateEvent(event.id, {
          preference_signals: computed,
          preference_signals_signature: prefCacheKey,
        });
      }
    })().catch((error) => console.error("preference_signals cache write failed", error));
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

  const budgetCap = eventBudgetCap(event);
  const totalWeight = responses.reduce((sum, response) => sum + severityWeight(response.parsed_rules.severity), 0);
  const coveredAnywhere = new Set<string>();

  const ranked: RestaurantMatch[] = restaurants.map((restaurant) => {
    const distance = haversineMiles(event, restaurant);
    const within_radius = distance <= event.radius + 0.05;
    const items = itemsByRestaurant.get(restaurant.id) ?? [];
    let coveredWeight = 0;
    let bayesianWeightedSum = 0;
    let bayesianPrefWeightTotal = 0;
    let bayesianSampleSize = 0;
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

    const predicted = predictRestaurantCost({
      menuPrices: items.map((item) => item.price),
      safeMenuPrices: safeItems.map((entry) => entry.item.price),
      priceLevel: restaurant.price_level,
    });
    const within_budget = predicted.perPerson <= budgetCap;

    for (const response of responses) {
      const hasSafe = items.some((item) => isSafe(item, response).safe);

      // Binary feasibility scoring (unchanged — drives coverage_pct display)
      if (hasSafe) {
        coveredWeight += severityWeight(response.parsed_rules.severity);
        coveredIds.push(response.id);
        if (within_radius && within_budget) coveredAnywhere.add(response.id);
      }

      // Bayesian utility scoring (tiebreaker when feasibility is equal).
      // Only guests who stated soft preferences contribute — silent guests
      // sit at the Beta(1,1) prior (utility = 0.5) and would otherwise drag
      // every restaurant's mean toward 0.5, drowning out real signal.
      const hasPrefs = (response.parsed_rules.soft_preferences?.length ?? 0) > 0;
      const guestToken = guestTokenIndex(response.id);
      const complexVerdict = getComplexVerdictForGuest(
        complexNotesByRestaurant[restaurant.id],
        guestToken,
      );
      if (hasPrefs) {
        const prefSignal = preferenceSignals[response.id]?.[restaurant.id] ?? null;
        const w = severityWeight(response.parsed_rules.severity);
        bayesianWeightedSum += w * bayesianUtility(hasSafe, prefSignal, complexVerdict);
        bayesianPrefWeightTotal += w;
        bayesianSampleSize += 1;
      }
    }

    const coverage_pct = responses.length === 0 ? 0 : Math.round((coveredIds.length / responses.length) * 100);
    const weighted_coverage_pct =
      totalWeight === 0 ? 0 : Math.round((coveredWeight / totalWeight) * 100);

    // bayesian_score: severity-weighted mean of Beta posterior means, taken
    // only over guests who stated soft preferences. Silent guests would all
    // sit at Beta(1,1).mean = 0.5 and, at 46-of-61 typical scale, drag every
    // restaurant's mean back toward 0.5. Excluding them lets real signal show.
    // Falls back to 0.5 when nobody has preferences (neutral prior).
    const bayesian_score =
      bayesianPrefWeightTotal === 0
        ? 0.5
        : Math.round((bayesianWeightedSum / bayesianPrefWeightTotal) * 1000) / 1000;

    // overall_score: the single number shown to the organiser.
    // Coverage anchors it; Bayesian preference signal nudges it by up to ±20 pts.
    // When no soft preferences exist (all Beta(1,1) → bayes = 0.5) the adjustment
    // is exactly 0, so overall_score === weighted_coverage_pct in that case.
    const bayesian_adj = (bayesian_score - 0.5) * 40;
    const overall_score = Math.round(Math.min(100, Math.max(0, weighted_coverage_pct + bayesian_adj)));

    return {
      restaurant,
      distance_miles: Math.round(distance * 10) / 10,
      within_radius,
      within_budget,
      predicted_cost_per_person: predicted.perPerson,
      predicted_cost_source: predicted.source,
      predicted_party_total: estimatedPartyTotal(predicted.perPerson, event.expected_headcount),
      coverage_pct,
      weighted_coverage_pct,
      covered_count: coveredIds.length,
      total_responses: responses.length,
      safe_items: safeItems,
      complex_notes: complexNotesByRestaurant[restaurant.id] ?? [],
      bayesian_score,
      bayesian_sample_size: bayesianSampleSize,
      overall_score,
      menu_stats: menuStatsFor(items),
    };
  });

  ranked.sort((a, b) => {
    const aEligible = Number(a.within_radius && a.within_budget);
    const bEligible = Number(b.within_radius && b.within_budget);
    if (aEligible !== bEligible) return bEligible - aEligible;
    if (b.weighted_coverage_pct !== a.weighted_coverage_pct) {
      return b.weighted_coverage_pct - a.weighted_coverage_pct;
    }
    // Bayesian preference tiebreaker — only differentiates restaurants
    // with equal feasibility coverage when preferences have been stated.
    if ((b.bayesian_score ?? 0) !== (a.bayesian_score ?? 0)) {
      return (b.bayesian_score ?? 0) - (a.bayesian_score ?? 0);
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
          bayesian_score: row.bayesian_score,
          overall_score: row.overall_score,
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
