import type { DishNutrition } from '@aaram/types';

// ── Types ──────────────────────────────────────────────────────────────────────

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
};

export type MacroCalorieBreakdown = {
  proteinPct: number;
  carbsPct: number;
  fatsPct: number;
};

const EMPTY_TOTALS: MacroTotals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };

// ── Macro summation ────────────────────────────────────────────────────────────

/** Sums macros across dishes. Dishes with no nutrition data (calories == null) contribute 0. */
export function sumMacros(dishes: (DishNutrition | null | undefined)[]): MacroTotals {
  return dishes.reduce<MacroTotals>((acc, d) => {
    if (!d) return acc;
    return {
      calories: acc.calories + (d.calories ?? 0),
      protein: acc.protein + (d.protein ?? 0),
      carbs: acc.carbs + (d.carbs ?? 0),
      fats: acc.fats + (d.fats ?? 0),
      fiber: acc.fiber + (d.fiber ?? 0),
    };
  }, { ...EMPTY_TOTALS });
}

/** Adds two macro totals together — useful for rolling up day totals into a week/month total. */
export function addMacros(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fats: a.fats + b.fats,
    fiber: a.fiber + b.fiber,
  };
}

// ── RDV (recommended daily value) ─────────────────────────────────────────────

/** Percentage of the recommended daily value a micronutrient's value represents, rounded to whole percent. */
export function rdvPercent(value: number, rdv: number): number {
  if (!rdv || rdv <= 0) return 0;
  return Math.round((value / rdv) * 100);
}

// ── Macro calorie breakdown (for pie/donut charts) ────────────────────────────

const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARBS = 4;
const KCAL_PER_G_FATS = 9;

/**
 * Splits macro grams into their share of total calories contributed
 * (protein/carbs at 4 kcal/g, fat at 9 kcal/g), normalized to sum to 100.
 * Returns all-zero when there's nothing to show (avoids NaN from a 0/0 divide).
 */
export function macroCalorieBreakdown(macros: Pick<MacroTotals, 'protein' | 'carbs' | 'fats'>): MacroCalorieBreakdown {
  const proteinKcal = macros.protein * KCAL_PER_G_PROTEIN;
  const carbsKcal = macros.carbs * KCAL_PER_G_CARBS;
  const fatsKcal = macros.fats * KCAL_PER_G_FATS;
  const total = proteinKcal + carbsKcal + fatsKcal;

  if (total <= 0) return { proteinPct: 0, carbsPct: 0, fatsPct: 0 };

  return {
    proteinPct: Math.round((proteinKcal / total) * 100),
    carbsPct: Math.round((carbsKcal / total) * 100),
    fatsPct: Math.round((fatsKcal / total) * 100),
  };
}
