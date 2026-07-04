import { useState, useEffect, useCallback } from 'react';
import type { DishNutrition } from '@aaram/types';
import { sumMacros, type MacroTotals } from './nutrition';

export type MealBlock = 'Breakfast' | 'Lunch' | 'Dinner';

export type MenuDishEntry = {
  itemName: string;
  dishId: string | null;
  /** null when uncatalogued (no dish_id match) or the matched dish has no nutrition data yet */
  nutrition: DishNutrition | null;
};

export type MenuBlockNutrition = {
  items: MenuDishEntry[];
  macros: MacroTotals;
  /** count of items with no dish_id — surfaced so admin UI can hint "N dishes uncatalogued" */
  uncatalogued: number;
};

export type DayMenuNutrition = {
  date: string; // YYYY-MM-DD
  blocks: Record<MealBlock, MenuBlockNutrition>;
};

export type WeekMenuNutritionState = {
  days: DayMenuNutrition[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export type WeekMenuNutritionClient = {
  from: (table: string) => any;
};

const MEAL_BLOCKS: MealBlock[] = ['Breakfast', 'Lunch', 'Dinner'];

function emptyBlock(): MenuBlockNutrition {
  return { items: [], macros: sumMacros([]), uncatalogued: 0 };
}

function toDishNutrition(row: any): DishNutrition {
  return {
    servingSize: row.serving_size ?? null,
    calories: row.calories ?? null,
    protein: row.protein_g ?? null,
    carbs: row.carbs_g ?? null,
    fats: row.fats_g ?? null,
    fiber: row.fiber_g ?? null,
    micros: row.micros ?? [],
    wholeSpices: row.whole_spices ?? [],
    benefits: row.benefits ?? [],
    cookingTip: row.cooking_tip ?? null,
    status: row.nutrition_status ?? 'none',
    updatedAt: row.nutrition_updated_at ?? null,
  };
}

/**
 * Fetches menus + menu_items for a date range and joins each item to its
 * dish_catalog nutrition row via dish_id (Phase 3's MenuService.saveItem
 * link). Both tables are `anyone_read` in RLS, so this works for guests too
 * — the food hub's public showcase (Phase 5) and the member dashboard both
 * use this same hook.
 */
export function useWeekMenuNutrition(
  client: WeekMenuNutritionClient,
  fromDate: string,
  toDate: string,
): WeekMenuNutritionState {
  const [days, setDays] = useState<DayMenuNutrition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: menus, error: menuErr } = await client
        .from('menus')
        .select('date, meal_block, menu_items(item_name, dish_id)')
        .gte('date', fromDate)
        .lte('date', toDate);
      if (menuErr) throw new Error(menuErr.message);

      const dishIds = Array.from(new Set(
        (menus ?? []).flatMap((m: any) => (m.menu_items ?? []).map((i: any) => i.dish_id)).filter(Boolean),
      ));

      const dishMap = new Map<string, DishNutrition>();
      if (dishIds.length > 0) {
        const { data: dishes, error: dishErr } = await client
          .from('dish_catalog')
          .select('id, serving_size, calories, protein_g, carbs_g, fats_g, fiber_g, micros, whole_spices, benefits, cooking_tip, nutrition_status, nutrition_updated_at')
          .in('id', dishIds);
        if (dishErr) throw new Error(dishErr.message);
        for (const d of dishes ?? []) dishMap.set(d.id, toDishNutrition(d));
      }

      const byDate = new Map<string, DayMenuNutrition>();
      for (const menu of (menus ?? []) as any[]) {
        const block = menu.meal_block as MealBlock;
        if (!MEAL_BLOCKS.includes(block)) continue;

        if (!byDate.has(menu.date)) {
          byDate.set(menu.date, {
            date: menu.date,
            blocks: { Breakfast: emptyBlock(), Lunch: emptyBlock(), Dinner: emptyBlock() },
          });
        }

        const items: MenuDishEntry[] = ((menu.menu_items ?? []) as any[]).map(i => ({
          itemName: i.item_name,
          dishId: i.dish_id ?? null,
          nutrition: i.dish_id ? (dishMap.get(i.dish_id) ?? null) : null,
        }));

        byDate.get(menu.date)!.blocks[block] = {
          items,
          macros: sumMacros(items.map(i => i.nutrition)),
          uncatalogued: items.filter(i => !i.dishId).length,
        };
      }

      setDays(Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [client, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  return { days, loading, error, refresh: load };
}
