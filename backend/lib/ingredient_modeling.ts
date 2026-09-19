/*
 * Menu text → MenuItem[] pipeline.
 *
 * 1. Gemini parses the combined menu text into structured items
 *    (name, price, description, explicit ingredients).
 * 2. Items WITH listed ingredients → high confidence, flag directly.
 * 3. Items WITHOUT ingredients → Spoonacular recipe search → probabilistic
 *    ingredient modeling based on frequency across matching recipes.
 * 4. EXCLUDE_TO_FLAGS from parser.ts sets MenuFlags from ingredient list.
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

interface RawParsedItem {
  name: string;
  price: number | null;
  description: string;
  ingredients: string[];
}

async function parseMenuTextToItems(
  menuText: string,
): Promise<RawParsedItem[]> {
  if (!geminiModel || !menuText.trim()) return [];

  const prompt = `Parse this restaurant menu text into structured items.
For each item extract:
- name: the item name
- price: numeric price (null if not listed)
- description: the description/subtitle if present, else ""
- ingredients: array of ingredients EXPLICITLY mentioned in the name or description. Only include ingredients you can see in the text — do NOT guess.

Menu text:
${menuText.slice(0, 80_000)}

Return ONLY a JSON array:
[{ "name": string, "price": number|null, "description": string, "ingredients": string[] }]

Rules:
- Include food items only, skip section headers, category labels, and non-food entries.
- For "Egg, Bacon on Brioche Bun" → ingredients: ["egg", "bacon", "brioche", "bun"]
- For "Cheese Pizza" with no description → ingredients: ["cheese"] (only what's in the name)
- Do NOT invent ingredients that aren't in the text.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonText = text.replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is RawParsedItem =>
        item != null &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).name === "string",
    );
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
// Public API: menu text → MenuItem[]
// ---------------------------------------------------------------------------

export interface ItemModelingResult {
  items: MenuItem[];
  stats: {
    total: number;
    withIngredients: number;
    withoutIngredients: number;
  };
}

/**
 * Parse menu text → MenuItem[] using ONLY what's explicitly in the text.
 * No guessing, no Spoonacular, no Gemini ingredient estimation.
 * Items with ingredients listed → high confidence + flags set.
 * Items without → low confidence, empty ingredients, no flags.
 */
export async function modelMenuItems(
  restaurantId: string,
  menuText: string,
): Promise<ItemModelingResult> {
  const rawItems = await parseMenuTextToItems(menuText);
  console.log(`[${restaurantId}] parsed ${rawItems.length} menu items from text`);

  const items: MenuItem[] = [];
  let idCounter = 1;
  let withIngredients = 0;

  for (const raw of rawItems) {
    const hasExplicit = raw.ingredients.length > 0;
    if (hasExplicit) {
      withIngredients++;
      console.log(`  [explicit] ${raw.name}: ${raw.ingredients.join(", ")}`);
    }

    const flags = hasExplicit ? ingredientsToFlags(raw.ingredients) : {};

    items.push({
      id: `${restaurantId}-${idCounter++}`,
      restaurant_id: restaurantId,
      name: raw.name,
      description: raw.description,
      estimated_ingredients: raw.ingredients,
      flags,
      confidence: hasExplicit ? "high" : "low",
      price: raw.price ?? 0,
    });
  }

  return {
    items,
    stats: {
      total: rawItems.length,
      withIngredients,
      withoutIngredients: rawItems.length - withIngredients,
    },
  };
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
 * Second pass: for items with confidence "low" (no explicit ingredients),
 * try Spoonacular recipe matching → probabilistic ingredients, or fall back
 * to Gemini guessing. Call this AFTER modelMenuItems when you want estimation.
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

    // Try Spoonacular first
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

    // Fallback: Gemini guess
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
