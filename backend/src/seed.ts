import { idFromKey } from "./ids.js";
import {
  SEED_MENU_ITEMS as LEGACY_MENU,
  SEED_RESTAURANTS as LEGACY_RESTAURANTS,
  type LegacyMenuFlags,
  type LegacyMenuItem,
  type LegacyRestaurant,
} from "./legacy-seed.js";
import type { AllergenFlags, AllergenLevel, MenuItem, Restaurant } from "./types.js";

function level(present: boolean | undefined, confidence: "high" | "low"): AllergenLevel {
  if (!present) return "none";
  return confidence === "high" ? "confirmed" : "inferred";
}

function allergenFlags(flags: LegacyMenuFlags, confidence: "high" | "low"): AllergenFlags {
  return {
    pork: level(flags.contains_pork, confidence),
    shellfish: level(flags.contains_shellfish, confidence),
    fish: level(flags.contains_fish, confidence),
    beef: level(flags.contains_beef, confidence),
    chicken: level(flags.contains_chicken, confidence),
    egg: level(flags.contains_egg, confidence),
    dairy: level(flags.contains_dairy, confidence),
    meat_dairy_combo: level(flags.meat_dairy_combo, confidence),
    gluten: level(flags.contains_gluten, confidence),
    nuts: level(flags.contains_nuts, confidence),
    peanuts: level(flags.contains_peanuts, confidence),
    soy: level(flags.contains_soy, confidence),
    sesame: level(flags.contains_sesame, confidence),
    alcohol: level(flags.contains_alcohol, confidence),
  };
}

function mapMenuItem(item: LegacyMenuItem): MenuItem {
  const retrieval = item.confidence === "high" ? 0.9 : 0.45;
  return {
    _id: idFromKey(item.id),
    restaurant_id: idFromKey(item.restaurant_id),
    name: item.name,
    description: item.description,
    estimated_ingredients: item.estimated_ingredients.map((name) => ({
      name,
      status: item.confidence === "high" ? "extracted" : "inferred",
      retrieval_confidence: retrieval,
    })),
    allergen_flags: allergenFlags(item.flags, item.confidence),
    dietary_compatible: {
      vegetarian: Boolean(item.flags.vegetarian || item.flags.vegan),
      vegan: Boolean(item.flags.vegan),
      gluten_free: item.flags.contains_gluten === true ? false : item.flags.contains_gluten === false ? true : null,
    },
    embedding: null,
    needs_human_review: item.confidence === "low",
    status: item.confidence === "low" ? "needs_review" : "ready",
    retrieval_confidence: retrieval,
    price: item.price,
  };
}

function mapRestaurant(restaurant: LegacyRestaurant, menuItems: MenuItem[]): Restaurant {
  const _id = idFromKey(restaurant.id);
  return {
    _id,
    name: restaurant.name,
    address: restaurant.location,
    cuisine: restaurant.cuisine,
    price_level: restaurant.price_level,
    location: { type: "Point", coordinates: [restaurant.lng, restaurant.lat] },
    data_source: { tier: 1 },
    accessibility: { dine_in: { is_preliminary: true } },
    review_evidence: [],
    menu_item_ids: menuItems.filter((item) => item.restaurant_id === _id).map((item) => item._id),
  };
}

export const SEED_MENU_ITEMS: MenuItem[] = LEGACY_MENU.map(mapMenuItem);
export const SEED_RESTAURANTS: Restaurant[] = LEGACY_RESTAURANTS.map((restaurant) =>
  mapRestaurant(restaurant, SEED_MENU_ITEMS)
);
