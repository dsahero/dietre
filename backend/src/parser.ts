import type { Guest, MenuItem, PreferenceVector } from "./types.js";

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

type MenuFlags = Partial<Record<FlagKey, boolean>>;

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

export function parseDietaryText(raw: string): PreferenceVector {
  const text = raw.toLowerCase();
  const hard: string[] = [];
  const soft: string[] = [];

  const addHard = (...items: string[]) => hard.push(...items);
  const addSoft = (...items: string[]) => soft.push(...items);

  if (
    /\bvegan\b/.test(text) ||
    /no animal/.test(text) ||
    /animal products/.test(text) ||
    /plant[- ]based/.test(text)
  ) {
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

  const listMatch = text.match(/anaphyla\w*(?:tic)?(?: to|:)\s*([^\.]+)/i) || text.match(/allergic to\s*([^\.]+)/i);
  if (listMatch) {
    const chunk = listMatch[1]
      .replace(/\([^)]*\)/g, ",")
      .replace(/\b(plus|all the usual|and also)\b/g, ",");
    const synonyms: Record<string, string[]> = {
      nightshades: ["tomato", "pepper", "potato"],
      nightshade: ["tomato", "pepper", "potato"],
      legumes: ["beans", "lentils", "chickpeas"],
      legume: ["beans", "lentils", "chickpeas"],
      potatoes: ["potato"],
    };
    for (const part of chunk.split(/,| and /)) {
      const token = part.replace(/\b(and|or|the|a|an|to|all|usual)\b/g, " ").replace(/^[:;\-\s]+/, "").trim();
      if (token.length > 2 && token.length < 40) {
        addHard(token, ...(synonyms[normalize(token)] ?? []));
      }
    }
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
    if (exclude === "dairy" && /(mix|combo|together|with meat|meat with)/.test(around)) {
      addHard("meat dairy combo");
      return;
    }
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

  let severity: PreferenceVector["severity"] = "low";
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

export function mockConfidence(raw: string, rules: PreferenceVector): number {
  const text = raw.trim();
  if (text.length < 12) return 0.35;
  if (rules.hard_excludes.length === 0 && rules.soft_preferences.length === 0) return 0.4;
  if (rules.severity === "high") return 0.78;
  if (rules.severity === "medium") return 0.7;
  return 0.62;
}

export async function parseDietaryWithGemini(raw: string): Promise<{
  preference_vector: PreferenceVector;
  confidence: number;
  source: "gemini" | "mock";
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const preference_vector = parseDietaryText(raw);
    return { preference_vector, confidence: mockConfidence(raw, preference_vector), source: "mock" };
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You parse dietary needs for catering. Return ONLY JSON with this shape:
{"hard_excludes": string[], "soft_preferences": string[], "severity": "high"|"medium"|"low", "confidence": number}
Rules:
- hard_excludes: allergens, religious bans, vegan/vegetarian exclusions (use short tokens like pork, gluten, dairy, shellfish, peanuts, tree nuts, soy, sesame, egg, alcohol, meat, fish, meat dairy combo, animal products)
- soft_preferences: tastes, spice, cuisine leanings, "no cilantro" if dislike not allergy
- severity: high for medical/allergy/celiac, medium for religious/ethical (halal, kosher, vegan), low for taste
- confidence: 0-1 how sure you are the parse captured the guest's rules
Text:
${raw}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonText = text.replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(jsonText) as PreferenceVector & { confidence?: number };
    const preference_vector: PreferenceVector = {
      hard_excludes: unique(parsed.hard_excludes ?? []),
      soft_preferences: unique(parsed.soft_preferences ?? []),
      severity:
        parsed.severity === "high" || parsed.severity === "medium" || parsed.severity === "low"
          ? parsed.severity
          : "low",
    };
    const confidence =
      typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.85;
    return { preference_vector, confidence, source: "gemini" };
  } catch {
    const preference_vector = parseDietaryText(raw);
    return { preference_vector, confidence: mockConfidence(raw, preference_vector), source: "mock" };
  }
}

function itemHasFlag(flags: MenuFlags, key: FlagKey): boolean {
  return Boolean(flags[key]);
}

export function menuItemToFlags(item: MenuItem): MenuFlags {
  const a = item.allergen_flags;
  return {
    contains_pork: a.pork !== "none",
    contains_shellfish: a.shellfish !== "none",
    contains_fish: a.fish !== "none",
    contains_beef: a.beef !== "none",
    contains_chicken: a.chicken !== "none",
    contains_egg: a.egg !== "none",
    contains_dairy: a.dairy !== "none",
    meat_dairy_combo: a.meat_dairy_combo !== "none",
    contains_gluten: a.gluten !== "none",
    contains_nuts: a.nuts !== "none",
    contains_peanuts: a.peanuts !== "none",
    contains_soy: a.soy !== "none",
    contains_sesame: a.sesame !== "none",
    contains_alcohol: a.alcohol !== "none",
    vegetarian: item.dietary_compatible.vegetarian,
    vegan: item.dietary_compatible.vegan,
  };
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

export function itemConflicts(item: MenuItem, rules: PreferenceVector): string[] {
  const flags = menuItemToFlags(item);
  const ingredients = item.estimated_ingredients.map((row) => row.name);
  const hits: string[] = [];
  for (const exclude of rules.hard_excludes) {
    if (excludeHitsFlags(exclude, flags) || excludeHitsIngredients(exclude, ingredients)) {
      hits.push(exclude);
    }
  }
  return unique(hits);
}

export function isItemSafeForGuest(
  item: MenuItem,
  guest: Pick<Guest, "preference_vector">
): {
  safe: boolean;
  uncertain: boolean;
  conflicts: string[];
} {
  const conflicts = itemConflicts(item, guest.preference_vector);
  if (conflicts.length > 0) {
    return { safe: false, uncertain: false, conflicts };
  }
  const severe = guest.preference_vector.severity === "high";
  const uncertain = item.needs_human_review || item.retrieval_confidence < 0.6;
  if (severe && uncertain) {
    return { safe: false, uncertain: true, conflicts: [] };
  }
  return { safe: true, uncertain, conflicts: [] };
}

export function severityWeight(severity: PreferenceVector["severity"]): number {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}
