/*
 * Spoonacular chain menu-item search + embedding re-rank.
 * 1) Retrieve candidates by chain + name (Spoonacular menuItems).
 * 2) Embed query item and each candidate (Gemini).
 * 3) Rank by cosine similarity for close-match selection.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const spoonacularKey = process.env.SPOONACULAR_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

const embedModel = genAI?.getGenerativeModel({
  model: "gemini-embedding-001",
});

const textModel = genAI?.getGenerativeModel({
  model: "gemini-3.5-flash-lite",
});

/** Menu item from .data/menus.json (buffalo-wild-wings-2). */
export const PARTY_BONELESS_WINGS = {
  id: "buffalo-wild-wings-2",
  restaurant_id: "buffalo-wild-wings",
  restaurantChain: "Buffalo Wild Wings",
  name: "Party Boneless Wings",
  price: 14,
  description: "Party wings and catering bundles for groups.",
  ingredients: [] as string[],
} as const;

export interface LocalMenuItem {
  name: string;
  restaurantChain?: string;
  description?: string;
  price?: number | null;
}

export interface SpoonacularMenuItem {
  id: number;
  title: string;
  restaurantChain?: string;
  image?: string;
  imageType?: string;
  servings?: { number?: number; size?: number; unit?: string };
  nutrition?: {
    nutrients?: { name: string; amount: number; unit: string; percentOfDailyNeeds?: number }[];
    caloricBreakdown?: {
      percentProtein?: number;
      percentFat?: number;
      percentCarbs?: number;
    };
  };
  badges?: string[];
  breadcrumbs?: string[];
  generatedText?: string | null;
  likes?: number;
  price?: number | null;
  spoonacularScore?: number | null;
}

export interface SpoonacularMenuSearchResult {
  query: string;
  restaurantChain?: string;
  totalMenuItems: number;
  menuItems: SpoonacularMenuItem[];
}

export interface RankedMenuMatch {
  item: SpoonacularMenuItem;
  similarity: number;
  embedText: string;
}

export interface VectorMatchResult {
  query: LocalMenuItem;
  queryEmbedText: string;
  /** Dish name used for Spoonacular retrieval (catering words stripped). */
  normalizedSearchName: string;
  spoonacularQuery: string;
  totalMenuItems: number;
  matches: RankedMenuMatch[];
}

/**
 * Turn a menu title into a Spoonacular-friendly dish query via Gemini.
 * Drops catering/size/bundle modifiers; keeps the core dish type.
 * Falls back to the raw name if Gemini is unavailable.
 */
export async function normalizeSearchName(
  name: string,
  description?: string,
): Promise<string> {
  if (!textModel) return name;

  const prompt = `Normalize this restaurant menu item into a short Spoonacular search query.
Strip modifiers that describe portion, catering, or marketing (party, platter,
family size, bundle, shareable, etc.). Keep the core dish identity
(e.g. "Party Boneless Wings" → "boneless wings"). Do not invent a different dish.
Return ONLY the search phrase, nothing else.

Name: ${name}
Description: ${description ?? "(none)"}`;

  try {
    const result = await textModel.generateContent(prompt);
    const cleaned = result.response
      .text()
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\s+/g, " ");
    return cleaned || name;
  } catch {
    return name;
  }
}

/**
 * Search Spoonacular's chain restaurant menu catalog.
 * Optionally filter client-side by restaurantChain (API has no chain param).
 */
export async function searchSpoonacularMenuItems(
  itemName: string,
  options: { restaurantChain?: string; number?: number } = {},
): Promise<SpoonacularMenuSearchResult> {
  if (!spoonacularKey) {
    throw new Error("SPOONACULAR_API_KEY is not set");
  }

  const number = Math.min(Math.max(options.number ?? 10, 1), 10);
  const rawQuery = options.restaurantChain
    ? `${options.restaurantChain} ${itemName}`
    : itemName;
  const query = encodeURIComponent(rawQuery.slice(0, 100));

  const url =
    `https://api.spoonacular.com/food/menuItems/search` +
    `?query=${query}&number=${number}&addMenuItemInformation=true` +
    `&apiKey=${spoonacularKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Spoonacular menu search failed for "${rawQuery}": HTTP ${res.status} ${body}`,
    );
  }

  const data = (await res.json()) as {
    totalMenuItems?: number;
    menuItems?: SpoonacularMenuItem[];
  };

  let menuItems = data.menuItems ?? [];
  if (options.restaurantChain) {
    const chain = options.restaurantChain.toLowerCase();
    const filtered = menuItems.filter((item) =>
      (item.restaurantChain ?? "").toLowerCase().includes(chain),
    );
    if (filtered.length > 0) menuItems = filtered;
  }

  return {
    query: rawQuery,
    restaurantChain: options.restaurantChain,
    totalMenuItems: data.totalMenuItems ?? 0,
    menuItems,
  };
}

/** Text used for embedding the local menu item (price left out on purpose). */
export function localItemEmbedText(item: LocalMenuItem): string {
  const parts = [
    `name: ${item.name}`,
    item.restaurantChain ? `chain: ${item.restaurantChain}` : null,
    item.description ? `description: ${item.description}` : null,
  ];
  return parts.filter(Boolean).join("\n");
}

/** Text used for embedding a Spoonacular candidate. */
export function spoonacularItemEmbedText(item: SpoonacularMenuItem): string {
  const parts = [
    `name: ${item.title}`,
    item.restaurantChain ? `chain: ${item.restaurantChain}` : null,
    item.breadcrumbs?.length
      ? `category: ${item.breadcrumbs.join(", ")}`
      : null,
    item.badges?.length ? `badges: ${item.badges.join(", ")}` : null,
    item.generatedText ? `description: ${item.generatedText}` : null,
  ];
  return parts.filter(Boolean).join("\n");
}

async function embedText(text: string): Promise<number[]> {
  if (!embedModel) {
    throw new Error("GEMINI_API_KEY is not set (needed for embeddings)");
  }
  const result = await embedModel.embedContent(text);
  const values = result.embedding.values;
  if (!values?.length) {
    throw new Error("Empty embedding returned from Gemini");
  }
  return values;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    throw new Error("Embedding length mismatch");
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Retrieve Spoonacular candidates by normalized name/chain, embed all,
 * rank by cosine sim against the full local item (name + description).
 */
export async function matchMenuItemByEmbedding(
  item: LocalMenuItem,
  options: { number?: number; minSimilarity?: number } = {},
): Promise<VectorMatchResult> {
  const normalizedSearchName = await normalizeSearchName(
    item.name,
    item.description,
  );

  const search = await searchSpoonacularMenuItems(normalizedSearchName, {
    restaurantChain: item.restaurantChain,
    number: options.number ?? 10,
  });

  const queryEmbedText = localItemEmbedText(item);
  const queryVec = await embedText(queryEmbedText);

  const matches: RankedMenuMatch[] = [];
  for (const candidate of search.menuItems) {
    const embedTextStr = spoonacularItemEmbedText(candidate);
    const candidateVec = await embedText(embedTextStr);
    const similarity = cosineSimilarity(queryVec, candidateVec);
    if (
      options.minSimilarity !== undefined &&
      similarity < options.minSimilarity
    ) {
      continue;
    }
    matches.push({ item: candidate, similarity, embedText: embedTextStr });
  }

  matches.sort((a, b) => b.similarity - a.similarity);

  return {
    query: item,
    queryEmbedText,
    normalizedSearchName,
    spoonacularQuery: search.query,
    totalMenuItems: search.totalMenuItems,
    matches,
  };
}

/** Vector-match Party Boneless Wings against Spoonacular BWW candidates. */
export async function matchPartyBonelessWings(): Promise<VectorMatchResult> {
  return matchMenuItemByEmbedding({
    name: PARTY_BONELESS_WINGS.name,
    restaurantChain: PARTY_BONELESS_WINGS.restaurantChain,
    description: PARTY_BONELESS_WINGS.description,
    price: PARTY_BONELESS_WINGS.price,
  });
}

// Run when executed directly: npm run food-matcher
const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1]?.replace(/\\/g, "/").endsWith("/backend/lib/food_matcher.ts");

if (isDirectRun) {
  matchPartyBonelessWings()
    .then((result) => {
      const summary = {
        query: result.query,
        normalizedSearchName: result.normalizedSearchName,
        queryEmbedText: result.queryEmbedText,
        spoonacularQuery: result.spoonacularQuery,
        totalMenuItems: result.totalMenuItems,
        matches: result.matches.map((m) => ({
          id: m.item.id,
          title: m.item.title,
          restaurantChain: m.item.restaurantChain,
          similarity: Math.round(m.similarity * 1000) / 1000,
          badges: m.item.badges ?? [],
          breadcrumbs: m.item.breadcrumbs ?? [],
        })),
      };
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
