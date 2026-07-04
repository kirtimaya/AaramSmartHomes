import { useState, useEffect, useCallback } from 'react';
import type { DishNutrition } from '@aaram/types';
import { sumMacros, addMacros, type MacroTotals } from './nutrition';

export type MealBlock = 'Breakfast' | 'Lunch' | 'Dinner';

export type NutritionDataPoint = { date: string; macros: MacroTotals };

export type MemberNutritionState = {
  /** One entry per day in range that had at least one meal actually received. */
  daily: NutritionDataPoint[];
  /** Sum of `daily` across the whole requested range. */
  total: MacroTotals;
  mealsReceived: number;
  mealsSkipped: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export type MemberNutritionClient = {
  auth: {
    getSession: () => Promise<{ data: { session: { user: { id: string } } | null } }>;
  };
  from: (table: string) => any;
};

const EMPTY_TOTALS: MacroTotals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };

function toDishNutrition(row: any): DishNutrition {
  return {
    servingSize: null, calories: row.calories ?? null, protein: row.protein_g ?? null,
    carbs: row.carbs_g ?? null, fats: row.fats_g ?? null, fiber: row.fiber_g ?? null,
    micros: [], wholeSpices: [], benefits: [], cookingTip: null,
    status: 'none', updatedAt: null,
  };
}

/**
 * A member's ACTUAL meal consumption over a date range: the menus that ran
 * minus their own meal_skip_requests minus any meal block they've disabled
 * entirely in tenant_meal_preferences. Call this hook once per range you
 * need totals for (e.g. once with a week range, once with a month range) —
 * it's a plain range-in/totals-out hook, not itself week/month-aware.
 */
export function useMemberNutrition(
  client: MemberNutritionClient,
  fromDate: string,
  toDate: string,
): MemberNutritionState {
  const [daily, setDaily] = useState<NutritionDataPoint[]>([]);
  const [mealsReceived, setMealsReceived] = useState(0);
  const [mealsSkipped, setMealsSkipped] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) { setError('not_authenticated'); return; }
      const userId = session.user.id;

      const [menusRes, skipsRes, prefsRes] = await Promise.all([
        client.from('menus').select('date, meal_block, menu_items(dish_id)').gte('date', fromDate).lte('date', toDate),
        client.from('meal_skip_requests').select('skip_date, meal_block').eq('tenant_id', userId).gte('skip_date', fromDate).lte('skip_date', toDate),
        client.from('tenant_meal_preferences').select('meal_breakfast, meal_lunch, meal_dinner').eq('tenant_id', userId).maybeSingle(),
      ]);
      if (menusRes.error) throw new Error(menusRes.error.message);
      if (skipsRes.error) throw new Error(skipsRes.error.message);
      if (prefsRes.error) throw new Error(prefsRes.error.message);

      const skipSet = new Set((skipsRes.data ?? []).map((s: any) => `${s.skip_date}|${s.meal_block}`));
      const prefs = prefsRes.data as { meal_breakfast?: boolean; meal_lunch?: boolean; meal_dinner?: boolean } | null;
      const blockEnabled: Record<MealBlock, boolean> = {
        Breakfast: prefs?.meal_breakfast !== false,
        Lunch: prefs?.meal_lunch !== false,
        Dinner: prefs?.meal_dinner !== false,
      };

      const dishIds = Array.from(new Set(
        (menusRes.data ?? []).flatMap((m: any) => (m.menu_items ?? []).map((i: any) => i.dish_id)).filter(Boolean),
      ));
      const dishMap = new Map<string, DishNutrition>();
      if (dishIds.length > 0) {
        const { data: dishes, error: dishErr } = await client
          .from('dish_catalog')
          .select('id, calories, protein_g, carbs_g, fats_g, fiber_g')
          .in('id', dishIds);
        if (dishErr) throw new Error(dishErr.message);
        for (const d of dishes ?? []) dishMap.set(d.id, toDishNutrition(d));
      }

      const byDate = new Map<string, MacroTotals>();
      let received = 0;
      let skipped = 0;

      for (const menu of (menusRes.data ?? []) as any[]) {
        const block = menu.meal_block as MealBlock;
        const wasSkipped = skipSet.has(`${menu.date}|${block}`);
        const enabled = blockEnabled[block] ?? true;

        if (wasSkipped || !enabled) {
          skipped++;
          continue;
        }
        received++;

        const items = (menu.menu_items ?? []) as any[];
        const macros = sumMacros(items.map(i => (i.dish_id ? dishMap.get(i.dish_id) ?? null : null)));
        byDate.set(menu.date, addMacros(byDate.get(menu.date) ?? { ...EMPTY_TOTALS }, macros));
      }

      setDaily(Array.from(byDate.entries())
        .map(([date, macros]) => ({ date, macros }))
        .sort((a, b) => a.date.localeCompare(b.date)));
      setMealsReceived(received);
      setMealsSkipped(skipped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [client, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const total = daily.reduce((acc, d) => addMacros(acc, d.macros), { ...EMPTY_TOTALS });

  return { daily, total, mealsReceived, mealsSkipped, loading, error, refresh: load };
}
