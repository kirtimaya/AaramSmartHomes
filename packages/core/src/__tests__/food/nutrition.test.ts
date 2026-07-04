import { describe, it, expect } from 'vitest';
import { sumMacros, addMacros, rdvPercent, macroCalorieBreakdown } from '../../food/nutrition';
import type { DishNutrition } from '@aaram/types';

function dish(overrides: Partial<DishNutrition> = {}): DishNutrition {
  return {
    servingSize: '1 bowl', calories: 200, protein: 10, carbs: 30, fats: 5, fiber: 4,
    micros: [], wholeSpices: [], benefits: [], cookingTip: null, status: 'approved', updatedAt: null,
    ...overrides,
  };
}

describe('sumMacros', () => {
  it('sums macros across multiple dishes', () => {
    const totals = sumMacros([dish({ calories: 200, protein: 10 }), dish({ calories: 150, protein: 8 })]);
    expect(totals.calories).toBe(350);
    expect(totals.protein).toBe(18);
  });

  it('treats null/undefined dishes as contributing zero', () => {
    const totals = sumMacros([dish({ calories: 100 }), null, undefined]);
    expect(totals.calories).toBe(100);
  });

  it('treats dishes with null macro fields as zero for that field', () => {
    const totals = sumMacros([dish({ calories: null, protein: 10 })]);
    expect(totals.calories).toBe(0);
    expect(totals.protein).toBe(10);
  });

  it('empty list returns all-zero totals', () => {
    expect(sumMacros([])).toEqual({ calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });
  });
});

describe('addMacros', () => {
  it('adds two totals together', () => {
    const a = { calories: 100, protein: 5, carbs: 10, fats: 2, fiber: 1 };
    const b = { calories: 200, protein: 8, carbs: 20, fats: 4, fiber: 3 };
    expect(addMacros(a, b)).toEqual({ calories: 300, protein: 13, carbs: 30, fats: 6, fiber: 4 });
  });
});

describe('rdvPercent', () => {
  it('computes percentage of RDV', () => {
    expect(rdvPercent(9, 18)).toBe(50);
    expect(rdvPercent(18, 18)).toBe(100);
  });

  it('rounds to nearest whole percent', () => {
    expect(rdvPercent(1, 3)).toBe(33);
  });

  it('returns 0 when rdv is 0 or negative — avoids divide-by-zero', () => {
    expect(rdvPercent(5, 0)).toBe(0);
    expect(rdvPercent(5, -1)).toBe(0);
  });
});

describe('macroCalorieBreakdown', () => {
  it('splits macros into % of total calories using 4/4/9 kcal-per-gram', () => {
    // protein 10g=40kcal, carbs 30g=120kcal, fats 5g=45kcal -> total 205kcal
    const result = macroCalorieBreakdown({ protein: 10, carbs: 30, fats: 5 });
    expect(result.proteinPct).toBe(20);  // 40/205
    expect(result.carbsPct).toBe(59);    // 120/205
    expect(result.fatsPct).toBe(22);     // 45/205
  });

  it('returns all-zero when there are no macros at all (avoids NaN)', () => {
    expect(macroCalorieBreakdown({ protein: 0, carbs: 0, fats: 0 })).toEqual({
      proteinPct: 0, carbsPct: 0, fatsPct: 0,
    });
  });

  it('single macro source gives 100% to that source', () => {
    const result = macroCalorieBreakdown({ protein: 0, carbs: 20, fats: 0 });
    expect(result.carbsPct).toBe(100);
    expect(result.proteinPct).toBe(0);
    expect(result.fatsPct).toBe(0);
  });
});
