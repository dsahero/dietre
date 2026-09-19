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
import type { DietResponse, MenuFlags, MenuItem, ParsedRules, Severity } from "@/shared/lib/types";

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

  for (const cr of rules.complex_restrictions ?? []) {
    if (/meat\s*(and|&|\+)\s*dairy/i.test(cr)) {
      const hasMeat =
        itemHasFlag(item.flags, "contains_pork") ||
        itemHasFlag(item.flags, "contains_beef") ||
        itemHasFlag(item.flags, "contains_chicken") ||
        itemHasFlag(item.flags, "contains_fish") ||
        itemHasFlag(item.flags, "contains_shellfish") ||
        item.estimated_ingredients.some((i) =>
          /(beef|steak|pork|bacon|chicken|ham|lamb|sausage|fish|salmon)/i.test(i),
        );
      const hasDairy =
        itemHasFlag(item.flags, "contains_dairy") ||
        item.estimated_ingredients.some((i) =>
          /(cheese|dairy|milk|butter|parmesan|cream|cheddar|mozzarella)/i.test(i),
        );
      if (item.flags.meat_dairy_combo || (hasMeat && hasDairy)) {
        hits.push("meat dairy combo");
      }
    }
  }

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
