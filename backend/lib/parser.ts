import type { DietResponse, MenuFlags, MenuItem, ParsedRules, Severity } from "@/shared/lib/types";

type FlagKey =
  | "contains_pork"
  | "contains_shellfish"
  | "contains_fish"
  | "contains_beef"
  | "contains_chicken"
  | "contains_egg"
  | "contains_dairy"
  | "meat_dairy_combo"
  | "contains_gluten"
  | "contains_nuts"
  | "contains_peanuts"
  | "contains_soy"
  | "contains_sesame"
  | "contains_alcohol"
  | "vegetarian"
  | "vegan";

const EXCLUDE_TO_FLAGS: Record<string, FlagKey[]> = {
  pork: ["contains_pork"],
  bacon: ["contains_pork"],
  ham: ["contains_pork"],
  shellfish: ["contains_shellfish"],
  shrimp: ["contains_shellfish"],
  crab: ["contains_shellfish"],
  lobster: ["contains_shellfish"],
  crawfish: ["contains_shellfish"],
  mussel: ["contains_shellfish"],
  scallop: ["contains_shellfish"],
  fish: ["contains_fish"],
  salmon: ["contains_fish"],
  tuna: ["contains_fish"],
  beef: ["contains_beef"],
  steak: ["contains_beef"],
  lamb: ["contains_beef"],
  chicken: ["contains_chicken"],
  turkey: ["contains_chicken"],
  egg: ["contains_egg"],
  eggs: ["contains_egg"],
  dairy: ["contains_dairy"],
  milk: ["contains_dairy"],
  cheese: ["contains_dairy"],
  lactose: ["contains_dairy"],
  butter: ["contains_dairy"],
  gluten: ["contains_gluten"],
  wheat: ["contains_gluten"],
  "tree nuts": ["contains_nuts"],
  "tree nut": ["contains_nuts"],
  nuts: ["contains_nuts", "contains_peanuts"],
  nut: ["contains_nuts", "contains_peanuts"],
  almond: ["contains_nuts"],
  cashew: ["contains_nuts"],
  walnut: ["contains_nuts"],
  pecan: ["contains_nuts"],
  peanut: ["contains_peanuts"],
  peanuts: ["contains_peanuts"],
  soy: ["contains_soy"],
  soya: ["contains_soy"],
  tofu: ["contains_soy"],
  sesame: ["contains_sesame"],
  tahini: ["contains_sesame"],
  alcohol: ["contains_alcohol"],
  "meat dairy combo": ["meat_dairy_combo"],
  "meat and dairy": ["meat_dairy_combo"],
  meat: ["contains_pork", "contains_beef", "contains_chicken", "contains_fish", "contains_shellfish"],
  "animal products": [
    "contains_pork",
    "contains_beef",
    "contains_chicken",
    "contains_fish",
    "contains_shellfish",
    "contains_egg",
    "contains_dairy",
  ],
  honey: [],
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = normalize(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function parseDietaryText(raw: string): ParsedRules {
  const text = raw.toLowerCase();
  const hard: string[] = [];
  const soft: string[] = [];

  const addHard = (...items: string[]) => hard.push(...items);
  const addSoft = (...items: string[]) => soft.push(...items);

  if (/\bvegan\b/.test(text) || /no animal/.test(text) || /plant[- ]based/.test(text)) {
    addHard("meat", "dairy", "egg", "animal products");
    addSoft("plant-based");
  } else if (/\bvegetarian\b/.test(text) || /no meat/.test(text)) {
    addHard("meat", "fish", "shellfish");
    addSoft("vegetarian");
  }

  if (/\bhalal\b/.test(text)) {
    addHard("pork", "alcohol");
    addSoft("halal");
  }
  if (/\bkosher\b/.test(text)) {
    addHard("pork", "shellfish", "meat dairy combo");
    addSoft("kosher");
  }

  const allergyOrBan = (pattern: RegExp, exclude: string, forceHard = false) => {
    if (!pattern.test(text)) return;
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
  if (/(allerg|anaphyla|celiac|epi[- ]?pen|medical|will make me sick|anaphyl)/.test(text)) {
    severity = "high";
  } else if (/(halal|kosher|vegan|vegetarian|religious|hindu|muslim|jewish|ethical)/.test(text)) {
    severity = "medium";
  }

  return {
    hard_excludes: unique(hard),
    soft_preferences: unique(soft),
    severity,
  };
}

export async function parseDietaryWithGemini(raw: string): Promise<{
  rules: ParsedRules;
  source: "gemini" | "mock";
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { rules: parseDietaryText(raw), source: "mock" };
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You parse dietary needs for catering. Return ONLY JSON with this shape:
{"hard_excludes": string[], "soft_preferences": string[], "severity": "high"|"medium"|"low"}
Rules:
- hard_excludes: allergens, religious bans, vegan/vegetarian exclusions (use short tokens like pork, gluten, dairy, shellfish, peanuts, tree nuts, soy, sesame, egg, alcohol, meat, fish, meat dairy combo, animal products)
- soft_preferences: tastes, spice, cuisine leanings, "no cilantro" if dislike not allergy
- severity: high for medical/allergy/celiac, medium for religious/ethical (halal, kosher, vegan), low for taste
Text:
${raw}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonText = text.replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(jsonText) as ParsedRules;
    return {
      rules: {
        hard_excludes: unique(parsed.hard_excludes ?? []),
        soft_preferences: unique(parsed.soft_preferences ?? []),
        severity:
          parsed.severity === "high" || parsed.severity === "medium" || parsed.severity === "low"
            ? parsed.severity
            : "low",
      },
      source: "gemini",
    };
  } catch {
    return { rules: parseDietaryText(raw), source: "mock" };
  }
}

// For compound/unusual rules a fixed exclude→flag dictionary can't express
// (e.g. "don't mix meat and dairy," a specific combination of allergens),
// ask Gemini to read the actual ingredients and reason about it directly.
// One call per response, batching every menu item — never one call per
// item, which would be far too slow and expensive. Callers should cache
// the result (see backend/lib/db.ts's ai_judgments store) since responses
// and menu items are both effectively immutable once created.
export async function judgeResponseAgainstMenuWithGemini(
  response: DietResponse,
  items: MenuItem[]
): Promise<Record<string, { safe: boolean; uncertain: boolean; reasoning: string }> | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || items.length === 0) return null;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const menuSummary = items
      .map(
        (item) =>
          `- id: ${item.id} | name: ${item.name} | description: ${item.description} | estimated_ingredients: ${item.estimated_ingredients.join(", ") || "none listed"} | confidence: ${item.confidence}`
      )
      .join("\n");

    const prompt = `You are checking a catering menu against one guest's dietary rules, stated in their own words. Pay special attention to compound or combination rules a simple ingredient-keyword match would miss — e.g. "don't mix meat and dairy" (a dish is unsafe if it contains BOTH, even if neither ingredient alone is excluded), cross-contamination phrasing, or rules that depend on how ingredients are combined rather than a single banned ingredient.

Guest's own words: "${response.raw_text}"
Hard restrictions (must never be present): ${response.parsed_rules.hard_excludes.join(", ") || "none"}
Soft preferences (not a safety issue): ${response.parsed_rules.soft_preferences.join(", ") || "none"}
Severity: ${response.parsed_rules.severity}

Menu items:
${menuSummary}

Return ONLY JSON, an object keyed by item id, each value shaped exactly like:
{"safe": boolean, "uncertain": boolean, "reasoning": string}
- safe: false if the item conflicts with any hard restriction, including compound rules.
- uncertain: true if the ingredient list is too vague/thin to be confident either way (be honest — don't guess past what the data supports).
- reasoning: one short sentence a host could read and immediately understand.
Include every item id. No prose outside the JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonText = text.replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(jsonText) as Record<
      string,
      { safe?: boolean; uncertain?: boolean; reasoning?: string }
    >;

    const out: Record<string, { safe: boolean; uncertain: boolean; reasoning: string }> = {};
    for (const item of items) {
      const entry = parsed[item.id];
      out[item.id] = {
        safe: entry?.safe !== false,
        uncertain: Boolean(entry?.uncertain),
        reasoning: entry?.reasoning || "",
      };
    }
    return out;
  } catch {
    return null;
  }
}

function itemHasFlag(flags: MenuFlags, key: FlagKey): boolean {
  return Boolean(flags[key]);
}

function excludeHitsFlags(exclude: string, flags: MenuFlags): boolean {
  const key = normalize(exclude);
  if (key === "vegan" || key === "animal products") {
    return !flags.vegan;
  }
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

export function itemConflicts(item: MenuItem, rules: ParsedRules): string[] {
  const hits: string[] = [];
  for (const exclude of rules.hard_excludes) {
    if (excludeHitsFlags(exclude, item.flags) || excludeHitsIngredients(exclude, item.estimated_ingredients)) {
      hits.push(exclude);
    }
  }
  return unique(hits);
}

export function isItemSafeForResponse(item: MenuItem, response: DietResponse): {
  safe: boolean;
  uncertain: boolean;
  conflicts: string[];
} {
  const conflicts = itemConflicts(item, response.parsed_rules);
  if (conflicts.length > 0) {
    return { safe: false, uncertain: false, conflicts };
  }
  const severe = response.parsed_rules.severity === "high";
  const uncertain = item.confidence === "low";
  if (severe && uncertain) {
    return { safe: false, uncertain: true, conflicts: [] };
  }
  return { safe: true, uncertain, conflicts: [] };
}

export function severityWeight(severity: Severity): number {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}
