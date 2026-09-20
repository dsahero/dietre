/**
 * parser.ts
 * ─────────
 * Source of truth for:
 *  1. Allergen mapping (loaded from backend/data/allergen-map.json)
 *  2. Item safety checks against a guest's parsed rules (itemConflicts, isItemSafeForResponse)
 *  3. Gemini batch judgment for complex/compound rules (judgeResponseAgainstMenuWithGemini)
 *  4. Thin Gemini wrapper for raw-text intake (parseDietaryWithGemini) — used only
 *     by the legacy /api/parse form path; the chat flow produces SUBMIT_JSON directly.
 *
 * What was removed:
 *  - parseDietaryText: 200-line regex parser (replaced by Gemini in the chat flow)
 *  - EXCLUDE_TO_FLAGS hardcoded in TS (now lives in backend/data/allergen-map.json)
 */

import allergenMapJson from "@/backend/data/allergen-map.json";
import type { DietResponse, MenuFlags, MenuItem, ParsedRules, PreferenceSignal, Restaurant, Severity } from "@/shared/lib/types";
import { withTimeout } from "@/backend/lib/with-timeout";

// ---------------------------------------------------------------------------
// Allergen map
// ---------------------------------------------------------------------------

type FlagKey = keyof MenuFlags;

const EXCLUDE_TO_FLAGS = allergenMapJson.excludeToFlags as Record<string, FlagKey[]>;

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const k = normalize(v);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export function parseDietaryText(raw: string): ParsedRules {
  const text = raw.toLowerCase();
  const hard: string[] = [];
  const complex: string[] = [];
  const soft: string[] = [];

  const addHard = (...items: string[]) => hard.push(...items);
  const addComplex = (...items: string[]) => complex.push(...items);
  const addSoft = (...items: string[]) => soft.push(...items);

  // Detect compound / conditional meat & dairy separation rules (e.g. kosher style, can only eat dairy and meat separately, no mixing meat and dairy)
  const isMeatDairyComboOnly =
    /(meat|beef|poultry|chicken|pork)\s*(and|&|\+|\/|,|\s+)*\s*(dairy|milk|cheese)\s*(together|combo|mix(ing)?|combined|separat(e|ely)|not together|apart|distinct)/i.test(text) ||
    /(dairy|milk|cheese)\s*(and|&|\+|\/|,|\s+)*\s*(meat|beef|poultry|chicken|pork)\s*(together|combo|mix(ing)?|combined|separat(e|ely)|not together|apart|distinct)/i.test(text) ||
    /(can\s*only|only)\s*eat\s*(dairy|milk|cheese|meat|beef)\s*(and|&|\+|,|\s+)*\s*(meat|beef|dairy|milk|cheese)\s*separat/i.test(text) ||
    /(mix(ing)?\s*(meat|dairy|milk)|can('?t|not|never)\s*(eat|mix|have)\s*(meat|dairy|milk)\s*(and|&|\+)\s*(dairy|milk|meat)\s*together)/i.test(text) ||
    /\bkosher\b/i.test(text) ||
    (/(dairy|milk)/i.test(text) && /(meat|beef)/i.test(text) && /(separat|not together|don'?t mix|never mix|no mix|apart)/i.test(text));

  if (isMeatDairyComboOnly) {
    addComplex("yes dairy, yes meat, not together");
    addHard("meat dairy combo");
    if (/\bkosher\b/.test(text)) {
      addHard("pork", "shellfish");
      addSoft("kosher");
    }
  }

  // Cross-contamination special requirements
  if (/(cross[- ]contamination|dedicated (fryer|prep|surface|kitchen)|separate (fryer|prep|cookware))/i.test(text)) {
    addComplex("Strict cross-contamination parameter: requires dedicated prep surfaces or fryer");
  }

  if (/\bvegan\b/.test(text) || /no animal/.test(text) || /plant[- ]based/.test(text)) {
    addHard("meat", "dairy", "egg", "animal products");
    addSoft("plant-based");
  } else if (/\bvegetarian\b/.test(text) || /no meat\b/.test(text)) {
    addHard("meat", "fish", "shellfish");
    addSoft("vegetarian");
  }

  if (/\bhalal\b|i'?m\s*halal|imhalal/i.test(text)) {
    addHard("pork", "alcohol");
    addSoft("halal");
  }

  const allergyOrBan = (pattern: RegExp, exclude: string, forceHard = false) => {
    if (!pattern.test(text)) return;
    // If user only bans combining meat and dairy, do NOT ban standalone dairy or standalone meat/beef (they are NOT allergic to milk!)
    if (isMeatDairyComboOnly && (exclude === "dairy" || exclude === "beef" || exclude === "meat")) {
      if (!/(allergic to (dairy|milk|beef)|lactose intolerant|strictly no dairy|never eat dairy|no meat at all)/i.test(text)) {
        return;
      }
    }
    const allowedHere = new RegExp(
      `\\b${exclude.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b[^\\.\\n]{0,16}\\b(fine|ok|okay|alright|allowed)\\b`,
      "i"
    );
    if (allowedHere.test(text)) return;
    const windowMatch = text.match(pattern);
    const around = windowMatch
      ? text.slice(Math.max(0, (windowMatch.index ?? 0) - 40), (windowMatch.index ?? 0) + 40)
      : text;
    const isSoft =
      !forceHard &&
      /(prefer|like|hate|can't stand|dont like|don't like|rather not|not a fan)/.test(around) &&
      !/(allerg|anaphyla|celiac|cannot eat|can't eat|no |without |medical|religious)/.test(around);
    if (isSoft) addSoft(`no ${exclude}`);
    else addHard(exclude);
  };

  allergyOrBan(/\bpeanuts?\b/, "peanuts", true);
  allergyOrBan(/\b(tree ?nuts?|almonds?|walnuts?|cashews?|pistachios?|hazelnuts?|pecans?)\b/, "tree nuts");
  allergyOrBan(/\b(shellfish|shrimp|crab|lobster|crawfish|mussels?|scallops?)\b/, "shellfish");
  allergyOrBan(/\b(gluten|wheat|celiac)\b/, "gluten", /\bceliac\b/.test(text));
  allergyOrBan(/\b(dairy|lactose|milk|cheese)\b/, "dairy");
  allergyOrBan(/\bpork\b|\bbacon\b|\bham\b/, "pork");
  allergyOrBan(/\b(sesame|tahini)\b/, "sesame");
  allergyOrBan(/\b(soy|soya|soybean)\b/, "soy");
  allergyOrBan(/\beggs?\b/, "egg");
  allergyOrBan(/\b(alcohol|wine|beer)\b/, "alcohol");
  allergyOrBan(/\bfish\b|\bsalmon\b|\btuna\b/, "fish");
  allergyOrBan(/\bbeef\b|\bred meat\b/, "beef");
  allergyOrBan(/\bcilantro\b|\bcoriander\b/, "cilantro");

  if (/\bspicy\b|\bheat\b|\bhot food\b/.test(text)) addSoft("spicy");
  if (/\bmild\b|\bno spice\b/.test(text)) addSoft("mild");
  if (/\blight(er)?\b|\bhealthy\b/.test(text)) addSoft("light");
  if (/\bcheap\b|\bbudget\b/.test(text)) addSoft("budget");
  if (/\bhigh protein\b/.test(text)) addSoft("high protein");

  let severity: Severity = "low";
  // Ignore negated "no allergies" so it doesn't inflate severity
  const severityText = text.replace(/\bno\s+allerg(y|ies)\b/g, " ");
  if (/(allerg|anaphyla|celiac|epi[- ]?pen|medical|will make me sick|anaphyl)/.test(severityText)) {
    severity = "high";
  } else if (
    /(halal|kosher|vegan|vegetarian|religious|hindu|muslim|jewish|ethical|intoleran|lactose)/.test(
      text
    )
  ) {
    severity = "medium";
  }

  return {
    hard_excludes: unique(hard),
    complex_restrictions: unique(complex),
    soft_preferences: unique(soft),
    severity,
  };
}

// ---------------------------------------------------------------------------
// Flag helpers
// ---------------------------------------------------------------------------

function itemHasFlag(flags: MenuFlags, key: FlagKey): boolean {
  return Boolean(flags[key]);
}

function excludeHitsFlags(exclude: string, flags: MenuFlags): boolean {
  const key = normalize(exclude);
  if (key === "vegan" || key === "animal products") return !flags.vegan;
  if (key === "vegetarian" || key === "meat") {
    if (flags.vegan || flags.vegetarian) return false;
    return (
      itemHasFlag(flags, "contains_pork") ||
      itemHasFlag(flags, "contains_beef") ||
      itemHasFlag(flags, "contains_chicken") ||
      itemHasFlag(flags, "contains_fish") ||
      itemHasFlag(flags, "contains_shellfish")
    );
  }
  if (key === "meat dairy combo" || key === "meat and dairy") {
    if (itemHasFlag(flags, "meat_dairy_combo")) return true;
    const hasMeat =
      itemHasFlag(flags, "contains_pork") ||
      itemHasFlag(flags, "contains_beef") ||
      itemHasFlag(flags, "contains_chicken") ||
      itemHasFlag(flags, "contains_fish") ||
      itemHasFlag(flags, "contains_shellfish");
    return hasMeat && itemHasFlag(flags, "contains_dairy");
  }
  const mapped = EXCLUDE_TO_FLAGS[key];
  if (mapped && mapped.length > 0) {
    return mapped.some((flag) => itemHasFlag(flags, flag));
  }
  return false;
}

function excludeHitsIngredients(exclude: string, ingredients: string[]): boolean {
  const key = normalize(exclude);
  if (!key) return false;
  return ingredients.some((ingredient) => {
    const item = normalize(ingredient);
    return item === key || item.includes(key) || key.includes(item);
  });
}

// ---------------------------------------------------------------------------
// Safety checks (used by matching.ts)
// ---------------------------------------------------------------------------

export function itemConflicts(item: MenuItem, rules: ParsedRules): string[] {
  const hits: string[] = [];

  for (const exclude of rules.hard_excludes) {
    if (
      excludeHitsFlags(exclude, item.flags) ||
      excludeHitsIngredients(exclude, item.estimated_ingredients)
    ) {
      hits.push(exclude);
    }
  }

  // Complex restrictions (e.g. "yes dairy, yes meat, not together", halal
  // certification, cross-contamination prep) are NOT evaluated here.
  // Compound rules require semantic reasoning that keyword/flag matching
  // cannot express correctly — they are handled exclusively by
  // judgeResponseAgainstMenuWithGemini() (per-item safety) and
  // fetchComplexNotesFromGemini() (per-restaurant advisory notes).

  return unique(hits);
}

export function isItemSafeForResponse(
  item: MenuItem,
  response: DietResponse,
): { safe: boolean; uncertain: boolean; conflicts: string[] } {
  const conflicts = itemConflicts(item, response.parsed_rules);
  if (conflicts.length > 0) return { safe: false, uncertain: false, conflicts };

  const uncertain = item.confidence === "low";
  if (response.parsed_rules.severity === "high" && uncertain) {
    return { safe: false, uncertain: true, conflicts: [] };
  }
  return { safe: true, uncertain, conflicts: [] };
}

export function severityWeight(severity: Severity): number {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Allergen / dietary status helpers (used by collections.ts etc.)
// ---------------------------------------------------------------------------

export type AllergenFlagStatus = "confirmed" | "inferred" | "none";

const ALLERGEN_FLAG_KEYS: [string, FlagKey][] = [
  ["pork",            "contains_pork"],
  ["shellfish",       "contains_shellfish"],
  ["fish",            "contains_fish"],
  ["beef",            "contains_beef"],
  ["chicken",         "contains_chicken"],
  ["egg",             "contains_egg"],
  ["dairy",           "contains_dairy"],
  ["gluten",          "contains_gluten"],
  ["nuts",            "contains_nuts"],
  ["peanuts",         "contains_peanuts"],
  ["soy",             "contains_soy"],
  ["sesame",          "contains_sesame"],
  ["alcohol",         "contains_alcohol"],
  ["meat_dairy_combo","meat_dairy_combo"],
];

export function allergenFlagsFromMenu(item: MenuItem): Record<string, AllergenFlagStatus> {
  const inferred = item.confidence === "low";
  const out: Record<string, AllergenFlagStatus> = {};
  for (const [name, flag] of ALLERGEN_FLAG_KEYS) {
    out[name] = item.flags[flag] ? (inferred ? "inferred" : "confirmed") : "none";
  }
  return out;
}

export function dietaryCompatibleFromMenu(item: MenuItem): {
  vegetarian: boolean;
  vegan: boolean;
} {
  return {
    vegetarian: Boolean(item.flags.vegetarian || item.flags.vegan),
    vegan: Boolean(item.flags.vegan),
  };
}

// ---------------------------------------------------------------------------
// Gemini: batch judgment of a guest's rules against the full menu
// (complex/compound rules that keyword matching can't express)
// ---------------------------------------------------------------------------

export async function judgeResponseAgainstMenuWithGemini(
  response: DietResponse,
  items: MenuItem[],
): Promise<Record<string, { safe: boolean; uncertain: boolean; reasoning: string }> | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || items.length === 0) return null;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: "gemini-3.6-flash",
    });

    const menuSummary = items
      .map(
        (item) =>
          `- id: ${item.id} | name: ${item.name} | description: ${item.description} | estimated_ingredients: ${item.estimated_ingredients.join(", ") || "none listed"} | confidence: ${item.confidence}`,
      )
      .join("\n");

    const prompt = `You are checking a catering menu against one guest's dietary rules. Pay special attention to compound rules a simple keyword match would miss — e.g. "don't mix meat and dairy" (a dish is unsafe if it contains BOTH; dishes with only meat or only dairy are SAFE), cross-contamination phrasing, or combination rules.

Guest's own words: "${response.raw_text}"
Hard restrictions (must never be present): ${response.parsed_rules.hard_excludes.join(", ") || "none"}
Complex & Special Requirements: ${response.parsed_rules.complex_restrictions?.join(", ") || "none"}
Soft preferences (not a safety issue): ${response.parsed_rules.soft_preferences.join(", ") || "none"}
Severity: ${response.parsed_rules.severity}

Menu items:
${menuSummary}

Return ONLY JSON, keyed by item id:
{"<id>": {"safe": boolean, "uncertain": boolean, "reasoning": "<one sentence a host can read>"}}
- safe: false if the item conflicts with any hard restriction or complex rule.
- uncertain: true if ingredient data is too thin to be confident.
Include every item id. No prose outside the JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as Record<
      string,
      { safe?: boolean; uncertain?: boolean; reasoning?: string }
    >;

    const out: Record<string, { safe: boolean; uncertain: boolean; reasoning: string }> = {};
    for (const item of items) {
      const entry = parsed[item.id];
      out[item.id] = {
        safe: entry?.safe !== false,
        uncertain: Boolean(entry?.uncertain),
        reasoning: entry?.reasoning ?? "",
      };
    }
    return out;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Thin Gemini wrapper for raw-text intake (legacy /api/parse form path only).
// The chat flow emits SUBMIT_JSON directly — this is only a fallback.
// ---------------------------------------------------------------------------

export async function parseDietaryWithGemini(raw: string): Promise<{
  rules: ParsedRules;
  source: "gemini" | "mock";
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  const mock: ParsedRules = {
    hard_excludes: [],
    complex_restrictions: [],
    soft_preferences: [],
    severity: "low",
  };
  if (!apiKey) return { rules: mock, source: "mock" };

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: "gemini-3.6-flash",
    });

    const prompt = `Parse this guest's dietary needs for catering. Return ONLY JSON:
{"hard_excludes": string[], "complex_restrictions": string[], "soft_preferences": string[], "severity": "high"|"medium"|"low"}

Rules:
- hard_excludes: simple banned ingredients (pork, shellfish, peanuts, tree nuts, gluten, soy, sesame, egg, alcohol, dairy, fish, meat, meat dairy combo, animal products, vegan, vegetarian).
- CRITICAL: if the guest can eat meat and dairy SEPARATELY (kosher, "no mixing"), put "meat dairy combo" in hard_excludes and "yes dairy, yes meat, not together" in complex_restrictions. Do NOT put standalone "dairy" or "meat" in hard_excludes.
- complex_restrictions: compound or conditional rules that can't reduce to a single banned ingredient.
- soft_preferences: taste/spice/cuisine leanings, "no cilantro" if dislike not allergy.
- severity: high = medical allergy/celiac, medium = religious/ethical (halal/kosher/vegan), low = taste.

Guest text:
${raw}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as ParsedRules;
    return {
      rules: {
        hard_excludes: unique(parsed.hard_excludes ?? []),
        complex_restrictions: unique(parsed.complex_restrictions ?? []),
        soft_preferences: unique(parsed.soft_preferences ?? []),
        severity:
          parsed.severity === "high" || parsed.severity === "medium" || parsed.severity === "low"
            ? parsed.severity
            : "low",
      },
      source: "gemini",
    };
  } catch {
    return { rules: mock, source: "mock" };
  }
}

// ---------------------------------------------------------------------------
// Bayesian preference signal extraction
// ---------------------------------------------------------------------------
// One Gemini call per guest that has soft_preferences, evaluating all
// candidate restaurants at once. Returns one PreferenceSignal per
// restaurant — direction (positive/negative/neutral) and strength (1–3)
// — which the caller feeds into a Beta(1,1) prior update.

export async function scorePreferencesWithGemini(
  response: DietResponse,
  restaurants: Restaurant[],
): Promise<Record<string, PreferenceSignal> | null> {
  const prefs = response.parsed_rules.soft_preferences;
  if (!prefs?.length || restaurants.length === 0) return null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: "gemini-3.6-flash",
    });

    const prefsText = prefs.join(", ");
    const restaurantsText = restaurants
      .map((r) => `- id: ${r.id} | "${r.name}" | cuisine: ${r.cuisine}`)
      .join("\n");

    const prompt = `You are evaluating restaurant options against one guest's soft preferences (taste, style, cuisine leanings — NOT safety constraints).

Guest preferences: "${prefsText}"

Restaurants:
${restaurantsText}

For each restaurant, does its cuisine type or style align with the guest's stated preferences?

Return ONLY JSON keyed by restaurant id:
{"<restaurant_id>": {"direction": "positive"|"negative"|"neutral", "strength": 1|2|3}}

direction: "positive" = preference aligns, "negative" = preference conflicts, "neutral" = no relevant signal.
strength: 1 = weak/vague, 2 = clear relevant match or mismatch, 3 = strong obvious alignment or conflict.
For "neutral" direction always use strength 1.`;

    const result = await withTimeout(
      model.generateContent(prompt),
      8000,
      "Preference signal scoring",
    );
    const text = result.response.text().trim();
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as Record<
      string,
      { direction?: string; strength?: number }
    >;

    const out: Record<string, PreferenceSignal> = {};
    for (const restaurant of restaurants) {
      const entry = parsed[restaurant.id];
      const dir = entry?.direction;
      const str = entry?.strength;
      out[restaurant.id] = {
        direction: dir === "positive" || dir === "negative" ? dir : "neutral",
        strength: str === 1 || str === 2 || str === 3 ? str : 1,
      };
    }
    return out;
  } catch {
    return null;
  }
}
