import type { BudgetRange, PredictedCostSource } from "@/shared/lib/types";

/** Honest Places priceLevel midpoints when menu prices are missing. */
export const PLACES_PRICE_LEVEL_ESTIMATE: Record<1 | 2 | 3, number> = {
  1: 12,
  2: 25,
  3: 45,
};

/** Cap used when an event only has a legacy $ / $$ / $$$ tier. */
export const BUDGET_RANGE_CAP: Record<BudgetRange, number> = {
  $: 15,
  $$: 35,
  $$$: 75,
};

export type PredictedCost = {
  /** Rounded dollars per person. */
  perPerson: number;
  source: PredictedCostSource;
  /** How many priced dishes contributed (0 when Places fallback). */
  sampleSize: number;
};

function meanPositivePrices(prices: number[]): number | null {
  const valid = prices.filter((p) => typeof p === "number" && Number.isFinite(p) && p > 0);
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round((sum / valid.length) * 100) / 100;
}

/**
 * Predicted per-person cost for a restaurant.
 *
 * Prefer mean of safe-menu dish prices when available, else mean of all
 * menu item prices, else a labeled Places priceLevel midpoint. Never invents
 * precision beyond what the source supports.
 */
export function predictRestaurantCost(input: {
  menuPrices: number[];
  safeMenuPrices?: number[];
  priceLevel: 1 | 2 | 3;
}): PredictedCost {
  const safeMean = meanPositivePrices(input.safeMenuPrices ?? []);
  if (safeMean !== null) {
    return {
      perPerson: Math.round(safeMean),
      source: "safe_menu_avg",
      sampleSize: (input.safeMenuPrices ?? []).filter((p) => p > 0).length,
    };
  }

  const menuMean = meanPositivePrices(input.menuPrices);
  if (menuMean !== null) {
    return {
      perPerson: Math.round(menuMean),
      source: "menu_avg",
      sampleSize: input.menuPrices.filter((p) => p > 0).length,
    };
  }

  return {
    perPerson: PLACES_PRICE_LEVEL_ESTIMATE[input.priceLevel],
    source: "places_estimate",
    sampleSize: 0,
  };
}

/** Host max $/person: prefer numeric field, else map legacy tier. */
export function eventBudgetCap(event: {
  budget_per_person?: number;
  budget_range: BudgetRange;
}): number {
  if (
    typeof event.budget_per_person === "number" &&
    Number.isFinite(event.budget_per_person) &&
    event.budget_per_person > 0
  ) {
    return event.budget_per_person;
  }
  return BUDGET_RANGE_CAP[event.budget_range];
}

export function budgetRangeFromPerPerson(perPerson: number): BudgetRange {
  if (perPerson <= BUDGET_RANGE_CAP.$) return "$";
  if (perPerson <= BUDGET_RANGE_CAP.$$) return "$$";
  return "$$$";
}

/** Default create-form budget when host hasn't typed yet. */
export const DEFAULT_BUDGET_PER_PERSON = 25;

export function formatPredictedCost(cost: PredictedCost): string {
  const dollars = `~$${cost.perPerson}/pp`;
  if (cost.source === "safe_menu_avg") {
    return `${dollars} · safe menu avg`;
  }
  if (cost.source === "menu_avg") {
    return `${dollars} · menu avg`;
  }
  return `${dollars} · Places estimate`;
}

export function formatBudgetPerPerson(perPerson: number): string {
  return `$${Math.round(perPerson)}/person`;
}

export function estimatedPartyTotal(perPerson: number, headcount: number): number {
  const n = Number.isFinite(headcount) && headcount > 0 ? headcount : 1;
  return Math.round(perPerson * n);
}
