/*
 * Menu text → RawMenuItem[] pipeline (page content only).
 *
 * 1. Gemini parses combined menu text into structured items
 *    (name, price, description, explicit ingredients from the text).
 * 2. Export is ground truth only — no flags, confidence, or estimates.
 * 3. rawItemsToMenuItems() converts to app MenuItem[] when needed later.
 * 4. enrichMenuItems() (optional, later) fills missing ingredients via
 *    Spoonacular / Gemini guess.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Confidence, MenuFlags, MenuItem } from "@/shared/lib/types";

const geminiKey = process.env.GEMINI_API_KEY;
const geminiModel = geminiKey
  ? new GoogleGenerativeAI(geminiKey).getGenerativeModel({ model: "gemini-3.5-flash-lite" })
  : null;

const spoonacularKey = process.env.SPOONACULAR_API_KEY;

// ---------------------------------------------------------------------------
// Flag mapping — same vocabulary as parser.ts EXCLUDE_TO_FLAGS
// ---------------------------------------------------------------------------

type FlagKey = keyof MenuFlags;

const INGREDIENT_TO_FLAGS: Record<string, FlagKey[]> = {
  pork: ["contains_pork"],
  bacon: ["contains_pork"],
  ham: ["contains_pork"],
  sausage: ["contains_pork"],
  pepperoni: ["contains_pork"],
  prosciutto: ["contains_pork"],
  pancetta: ["contains_pork"],
  shrimp: ["contains_shellfish"],
  crab: ["contains_shellfish"],
  lobster: ["contains_shellfish"],
  crawfish: ["contains_shellfish"],
  mussel: ["contains_shellfish"],
  mussels: ["contains_shellfish"],
  scallop: ["contains_shellfish"],
  scallops: ["contains_shellfish"],
  clam: ["contains_shellfish"],
  clams: ["contains_shellfish"],
  oyster: ["contains_shellfish"],
  fish: ["contains_fish"],
  salmon: ["contains_fish"],
  tuna: ["contains_fish"],
  cod: ["contains_fish"],
  tilapia: ["contains_fish"],
  mahi: ["contains_fish"],
  anchovy: ["contains_fish"],
  anchovies: ["contains_fish"],
  beef: ["contains_beef"],
  steak: ["contains_beef"],
  brisket: ["contains_beef"],
  burger: ["contains_beef"],
  lamb: ["contains_beef"],
  veal: ["contains_beef"],
  chicken: ["contains_chicken"],
  turkey: ["contains_chicken"],
  poultry: ["contains_chicken"],
  egg: ["contains_egg"],
  eggs: ["contains_egg"],
  mayo: ["contains_egg"],
  mayonnaise: ["contains_egg"],
  aioli: ["contains_egg"],
  dairy: ["contains_dairy"],
  milk: ["contains_dairy"],
  cheese: ["contains_dairy"],
  cream: ["contains_dairy"],
  butter: ["contains_dairy"],
  yogurt: ["contains_dairy"],
  mozzarella: ["contains_dairy"],
  cheddar: ["contains_dairy"],
  parmesan: ["contains_dairy"],
  "sour cream": ["contains_dairy"],
  "cream cheese": ["contains_dairy"],
  whey: ["contains_dairy"],
  gluten: ["contains_gluten"],
  wheat: ["contains_gluten"],
  flour: ["contains_gluten"],
  bread: ["contains_gluten"],
  pasta: ["contains_gluten"],
  noodle: ["contains_gluten"],
  noodles: ["contains_gluten"],
  tortilla: ["contains_gluten"],
  bun: ["contains_gluten"],
  croissant: ["contains_gluten"],
  bagel: ["contains_gluten"],
  pita: ["contains_gluten"],
  wrap: ["contains_gluten"],
  breading: ["contains_gluten"],
  panko: ["contains_gluten"],
  almond: ["contains_nuts"],
  cashew: ["contains_nuts"],
  walnut: ["contains_nuts"],
  pecan: ["contains_nuts"],
  pistachio: ["contains_nuts"],
  hazelnut: ["contains_nuts"],
  macadamia: ["contains_nuts"],
  peanut: ["contains_peanuts"],
  peanuts: ["contains_peanuts"],
  "peanut butter": ["contains_peanuts"],
  soy: ["contains_soy"],
  "soy sauce": ["contains_soy"],
  tofu: ["contains_soy"],
  edamame: ["contains_soy"],
  tempeh: ["contains_soy"],
  miso: ["contains_soy"],
  teriyaki: ["contains_soy"],
  sesame: ["contains_sesame"],
  tahini: ["contains_sesame"],
  alcohol: ["contains_alcohol"],
  wine: ["contains_alcohol"],
  beer: ["contains_alcohol"],
  bourbon: ["contains_alcohol"],
  rum: ["contains_alcohol"],
  vodka: ["contains_alcohol"],
};

// ---------------------------------------------------------------------------
// Step 1: Gemini parses menu text → raw items
// ---------------------------------------------------------------------------

/**
 * Ground-truth item as listed on the page/PDF — no flags, confidence, or estimates.
 */
export type RawMenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  price: number | null;
  description: string;
  /** Ingredients explicitly present in the name or description text only. */
  ingredients: string[];
};

function extractJsonPayload(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const startArr = cleaned.indexOf("[");
    const endArr = cleaned.lastIndexOf("]");
    if (startArr >= 0 && endArr > startArr) {
      return JSON.parse(cleaned.slice(startArr, endArr + 1));
    }
    const startObj = cleaned.indexOf("{");
    const endObj = cleaned.lastIndexOf("}");
    if (startObj >= 0 && endObj > startObj) {
      return JSON.parse(cleaned.slice(startObj, endObj + 1));
    }
    throw new Error("Gemini response was not valid JSON");
  }
}

function coercePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  return null;
}

function coerceMenuItemArray(parsed: unknown): Omit<RawMenuItem, "id" | "restaurant_id">[] {
  const list = Array.isArray(parsed)
    ? parsed
    : parsed != null &&
        typeof parsed === "object" &&
        Array.isArray((parsed as Record<string, unknown>).items)
      ? ((parsed as Record<string, unknown>).items as unknown[])
      : parsed != null &&
          typeof parsed === "object" &&
          Array.isArray((parsed as Record<string, unknown>).menu_items)
        ? ((parsed as Record<string, unknown>).menu_items as unknown[])
        : null;
  if (!list) return [];
  return list
    .filter(
      (item: unknown): item is Omit<RawMenuItem, "id" | "restaurant_id"> =>
        item != null &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).name === "string" &&
        String((item as Record<string, unknown>).name).trim().length > 0,
    )
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        name: String(row.name).trim(),
        price: coercePrice(row.price),
        description: typeof row.description === "string" ? row.description : "",
        ingredients: Array.isArray(row.ingredients)
          ? row.ingredients.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          : [],
      };
    });
}

async function parseMenuTextChunk(
  menuText: string,
): Promise<Omit<RawMenuItem, "id" | "restaurant_id">[]> {
  if (!geminiModel || !menuText.trim()) return [];

  const prompt = `You are extracting dishes from restaurant menu text (often from a PDF — layout may be jumbled, columns mixed, prices on separate lines).

For each food/drink dish extract:
- name: dish name (required)
- price: numeric dollars if listed (e.g. 18 or 18.5). Accept "$18", "18", "18.00" as numbers. Use null only when no price appears near the item.
- description: description/subtitle if present, else ""
- ingredients: ingredients EXPLICITLY mentioned in the name or description only — do NOT invent

Menu text:
${menuText}

Return a JSON array (or {"items":[...]}):
[{ "name": string, "price": number|null, "description": string, "ingredients": string[] }]

Rules:
- Include real menu dishes and drinks people order. Skip headers, hours, addresses, allergen disclaimers, and pure marketing blurbs.
- If text is messy, still recover dish names you can identify.
- Prefer recall: if unsure whether something is a dish but it looks like one with a price or description, include it.
- Prices are often on the same line or the next line as the dish name — attach them when possible.
- For "Egg, Bacon on Brioche Bun" → ingredients: ["egg", "bacon", "brioche", "bun"]
- Do NOT invent ingredients absent from the text.`;

  const result = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });
  const text = result.response.text().trim();
  return coerceMenuItemArray(extractJsonPayload(text));
}

async function parseMenuTextToItems(
  menuText: string,
): Promise<Omit<RawMenuItem, "id" | "restaurant_id">[]> {
  if (!geminiModel || !menuText.trim()) return [];

  const CHUNK = 24_000;
  const OVERLAP = 800;
  const chunks: string[] = [];
  if (menuText.length <= CHUNK) {
    chunks.push(menuText);
  } else {
    for (let i = 0; i < menuText.length; i += CHUNK - OVERLAP) {
      chunks.push(menuText.slice(i, i + CHUNK));
      if (i + CHUNK >= menuText.length) break;
    }
  }

  try {
    const byName = new Map<string, Omit<RawMenuItem, "id" | "restaurant_id">>();
    for (const chunk of chunks) {
      const items = await parseMenuTextChunk(chunk);
      for (const item of items) {
        const key = item.name.toLowerCase();
        const prev = byName.get(key);
        if (!prev) {
          byName.set(key, item);
          continue;
        }
        // Keep the richer duplicate
        byName.set(key, {
          name: prev.name,
          price: prev.price ?? item.price,
          description: prev.description.length >= item.description.length ? prev.description : item.description,
          ingredients: [...new Set([...prev.ingredients, ...item.ingredients])],
        });
      }
    }
    return [...byName.values()];
  } catch (err) {
    console.error("Gemini menu parse failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Step 2: Spoonacular probabilistic ingredient modeling
// ---------------------------------------------------------------------------

interface IngredientProbability {
  ingredient: string;
  probability: number;
}

/**
 * Search Spoonacular for recipes matching a menu item name.
 * Return the probabilistic ingredient profile: for each ingredient found
 * across the result set, its frequency (0–1) across matching recipes.
 */
async function spoonacularIngredientProfile(
  itemName: string,
): Promise<IngredientProbability[]> {
  if (!spoonacularKey) return [];

  try {
    const query = encodeURIComponent(itemName.slice(0, 100));
    const url =
      `https://api.spoonacular.com/recipes/complexSearch` +
      `?query=${query}&number=10&addRecipeInformation=true` +
      `&fillIngredients=true&apiKey=${spoonacularKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Spoonacular search failed for "${itemName}": HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as {
      results?: {
        extendedIngredients?: { name?: string; nameClean?: string }[];
      }[];
    };

    const recipes = data.results ?? [];
    if (recipes.length === 0) return [];

    // Count how many recipes contain each ingredient
    const counts = new Map<string, number>();
    for (const recipe of recipes) {
      const seen = new Set<string>();
      for (const ing of recipe.extendedIngredients ?? []) {
        const name = (ing.nameClean ?? ing.name ?? "").toLowerCase().trim();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }

    // Convert to probabilities
    const total = recipes.length;
    return [...counts.entries()]
      .map(([ingredient, count]) => ({
        ingredient,
        probability: Math.round((count / total) * 100) / 100,
      }))
      .sort((a, b) => b.probability - a.probability);
  } catch (err) {
    console.log(
      `Spoonacular error for "${itemName}":`,
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// Step 3: Ingredients → MenuFlags
// ---------------------------------------------------------------------------

/** Threshold above which a probabilistic ingredient gets flagged. */
const FLAG_THRESHOLD = 0.3;

function ingredientsToFlags(ingredients: string[]): MenuFlags {
  const flags: MenuFlags = {};

  for (const raw of ingredients) {
    const ing = raw.toLowerCase().trim();
    // Check each known ingredient pattern
    for (const [keyword, flagKeys] of Object.entries(INGREDIENT_TO_FLAGS)) {
      if (ing === keyword || ing.includes(keyword)) {
        for (const fk of flagKeys) {
          flags[fk] = true;
        }
      }
    }
  }

  // Infer vegetarian/vegan
  const hasMeat =
    flags.contains_pork ||
    flags.contains_beef ||
    flags.contains_chicken ||
    flags.contains_fish ||
    flags.contains_shellfish;
  const hasAnimal = hasMeat || flags.contains_egg || flags.contains_dairy;

  if (!hasMeat) flags.vegetarian = true;
  if (!hasAnimal) flags.vegan = true;

  return flags;
}

function probabilisticIngredientsToFlags(
  profile: IngredientProbability[],
): { flags: MenuFlags; flaggedIngredients: string[] } {
  const flagged: string[] = [];

  for (const { ingredient, probability } of profile) {
    if (probability < FLAG_THRESHOLD) continue;
    for (const [keyword] of Object.entries(INGREDIENT_TO_FLAGS)) {
      if (ingredient === keyword || ingredient.includes(keyword)) {
        flagged.push(ingredient);
        break;
      }
    }
  }

  return { flags: ingredientsToFlags(flagged), flaggedIngredients: flagged };
}

// ---------------------------------------------------------------------------
// Step 4: Gemini guess ingredients for items with no description
// ---------------------------------------------------------------------------

/**
 * When there's no description and no Spoonacular key, ask Gemini
 * to estimate likely ingredients from the item name alone.
 * Less reliable than Spoonacular, but better than nothing.
 */
async function geminiGuessIngredients(itemName: string): Promise<string[]> {
  if (!geminiModel) return [];

  const prompt = `What are the most likely key ingredients in a restaurant dish called "${itemName}"?
Return ONLY a JSON array of ingredient strings. Focus on allergen-relevant ingredients (dairy, egg, gluten/wheat, nuts, peanuts, shellfish, fish, soy, sesame, pork, beef, chicken).
Example: ["chicken", "flour", "egg", "butter"]`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonText = text.replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API: menu text → RawMenuItem[] (page content only)
// ---------------------------------------------------------------------------

export interface ItemModelingResult {
  items: RawMenuItem[];
  stats: {
    total: number;
    withIngredients: number;
    withoutIngredients: number;
  };
}

/**
 * Parse menu text → RawMenuItem[] using ONLY what's explicitly in the text.
 * No flags, confidence, guessing, or Spoonacular.
 */
export async function modelMenuItems(
  restaurantId: string,
  menuText: string,
): Promise<ItemModelingResult> {
  const parsed = await parseMenuTextToItems(menuText);
  console.log(`[${restaurantId}] parsed ${parsed.length} menu items from text`);

  const items: RawMenuItem[] = [];
  let idCounter = 1;
  let withIngredients = 0;

  for (const raw of parsed) {
    if (raw.ingredients.length > 0) {
      withIngredients++;
      console.log(`  [explicit] ${raw.name}: ${raw.ingredients.join(", ")}`);
    }

    items.push({
      id: `${restaurantId}-${idCounter++}`,
      restaurant_id: restaurantId,
      name: raw.name,
      price: raw.price,
      description: raw.description,
      ingredients: raw.ingredients,
    });
  }

  return {
    items,
    stats: {
      total: parsed.length,
      withIngredients,
      withoutIngredients: parsed.length - withIngredients,
    },
  };
}

/**
 * Convert raw page items into app MenuItem[] (flags + confidence).
 * Still uses only explicit ingredients — no estimation.
 */
export function rawItemsToMenuItems(rawItems: RawMenuItem[]): MenuItem[] {
  return rawItems.map((raw) => {
    const hasExplicit = raw.ingredients.length > 0;
    return {
      id: raw.id,
      restaurant_id: raw.restaurant_id,
      name: raw.name,
      description: raw.description,
      estimated_ingredients: raw.ingredients,
      flags: hasExplicit ? ingredientsToFlags(raw.ingredients) : {},
      confidence: hasExplicit ? ("high" as Confidence) : ("low" as Confidence),
      price: raw.price,
    };
  });
}

// ---------------------------------------------------------------------------
// Enrichment: fill in missing ingredients (call separately, later)
// ---------------------------------------------------------------------------

export interface EnrichmentResult {
  items: MenuItem[];
  stats: {
    spoonacularHits: number;
    geminiGuesses: number;
    unchanged: number;
  };
}

/**
 * Second pass: for items with no explicit ingredients, try Spoonacular
 * recipe matching → probabilistic ingredients, or fall back to Gemini guess.
 * Call AFTER rawItemsToMenuItems when you want estimation.
 */
export async function enrichMenuItems(
  items: MenuItem[],
): Promise<EnrichmentResult> {
  const stats = { spoonacularHits: 0, geminiGuesses: 0, unchanged: 0 };

  for (const item of items) {
    if (item.confidence === "high" || item.estimated_ingredients.length > 0) {
      continue;
    }

    let ingredients: string[] = [];

    if (spoonacularKey) {
      const profile = await spoonacularIngredientProfile(item.name);
      if (profile.length > 0) {
        stats.spoonacularHits++;
        ingredients = profile
          .filter((p) => p.probability >= FLAG_THRESHOLD)
          .map((p) => p.ingredient);
        console.log(
          `  [spoonacular] ${item.name}: ${ingredients.length} ingredients above threshold`,
        );
      }
    }

    if (ingredients.length === 0) {
      ingredients = await geminiGuessIngredients(item.name);
      if (ingredients.length > 0) {
        stats.geminiGuesses++;
        console.log(`  [gemini-guess] ${item.name}: ${ingredients.join(", ")}`);
      } else {
        stats.unchanged++;
      }
    }

    if (ingredients.length > 0) {
      item.estimated_ingredients = ingredients;
      item.flags = ingredientsToFlags(ingredients);
    }
  }

  return { items, stats };
}
