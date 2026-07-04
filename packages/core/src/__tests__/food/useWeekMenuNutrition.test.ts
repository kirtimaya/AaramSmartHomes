import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWeekMenuNutrition } from '../../food/useWeekMenuNutrition';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeChain(tableData: unknown, dbError: unknown = null) {
  const resolved = { data: tableData, error: dbError };
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    gte:    vi.fn().mockReturnThis(),
    lte:    vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    then(onFulfilled: any, onRejected?: any) {
      return Promise.resolve(resolved).then(onFulfilled, onRejected);
    },
    catch(onRejected: any) { return Promise.resolve(resolved).catch(onRejected); },
    finally(onFinally: any) { return Promise.resolve(resolved).finally(onFinally); },
  };
  return chain;
}

function dishRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id, serving_size: '1 bowl', calories: 200, protein_g: 10, carbs_g: 30, fats_g: 5, fiber_g: 4,
    micros: [], whole_spices: [], benefits: [], cooking_tip: null,
    nutrition_status: 'approved', nutrition_updated_at: null,
    ...overrides,
  };
}

function makeClient(menus: unknown[], dishes: unknown[] = [], menuError: unknown = null, dishError: unknown = null) {
  const menusChain = makeChain(menus, menuError);
  const dishesChain = makeChain(dishes, dishError);
  const from = vi.fn((table: string) => (table === 'menus' ? menusChain : dishesChain));
  return { from, _menusChain: menusChain, _dishesChain: dishesChain };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useWeekMenuNutrition', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('starts in loading state', async () => {
    const client = makeClient([]);
    const { result } = renderHook(() => useWeekMenuNutrition(client, '2026-07-06', '2026-07-12'));
    expect(result.current.loading).toBe(true);
    expect(result.current.days).toEqual([]);
    await act(async () => {});
  });

  it('joins menu_items to dish_catalog via dish_id and sums macros per block', async () => {
    const menus = [
      { date: '2026-07-06', meal_block: 'Breakfast', menu_items: [{ item_name: 'Ragi Idli', dish_id: 'dish-1' }] },
    ];
    const dishes = [dishRow('dish-1', { calories: 168, protein_g: 7 })];
    const client = makeClient(menus, dishes);

    const { result } = renderHook(() => useWeekMenuNutrition(client, '2026-07-06', '2026-07-12'));
    await act(async () => {});

    expect(result.current.days).toHaveLength(1);
    const block = result.current.days[0].blocks.Breakfast;
    expect(block.items).toHaveLength(1);
    expect(block.items[0].nutrition?.calories).toBe(168);
    expect(block.macros.calories).toBe(168);
    expect(block.macros.protein).toBe(7);
    expect(block.uncatalogued).toBe(0);
  });

  it('degrades gracefully when an item has no dish_id — contributes zero macros, flagged uncatalogued', async () => {
    const menus = [
      { date: '2026-07-06', meal_block: 'Lunch', menu_items: [{ item_name: 'Poha + Sev', dish_id: null }] },
    ];
    const client = makeClient(menus, []);

    const { result } = renderHook(() => useWeekMenuNutrition(client, '2026-07-06', '2026-07-12'));
    await act(async () => {});

    const block = result.current.days[0].blocks.Lunch;
    expect(block.items[0].nutrition).toBeNull();
    expect(block.macros).toEqual({ calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });
    expect(block.uncatalogued).toBe(1);
  });

  it('degrades gracefully when dish_id points at a dish not returned by the batch fetch', async () => {
    // e.g. dish was deleted after the menu item linked it
    const menus = [
      { date: '2026-07-06', meal_block: 'Dinner', menu_items: [{ item_name: 'Ghost Dish', dish_id: 'dish-missing' }] },
    ];
    const client = makeClient(menus, []); // dish_catalog query returns nothing

    const { result } = renderHook(() => useWeekMenuNutrition(client, '2026-07-06', '2026-07-12'));
    await act(async () => {});

    const block = result.current.days[0].blocks.Dinner;
    expect(block.items[0].nutrition).toBeNull();
    expect(block.macros.calories).toBe(0);
  });

  it('does not query dish_catalog at all when no menu item has a dish_id', async () => {
    const menus = [{ date: '2026-07-06', meal_block: 'Breakfast', menu_items: [{ item_name: 'Free text item', dish_id: null }] }];
    const client = makeClient(menus, []);

    renderHook(() => useWeekMenuNutrition(client, '2026-07-06', '2026-07-12'));
    await act(async () => {});

    expect(client.from).not.toHaveBeenCalledWith('dish_catalog');
  });

  it('surfaces DB errors from the menus query', async () => {
    const client = makeClient(null as any, [], { message: 'menus failed' });
    const { result } = renderHook(() => useWeekMenuNutrition(client, '2026-07-06', '2026-07-12'));
    await act(async () => {});

    expect(result.current.error).toBe('menus failed');
    expect(result.current.days).toEqual([]);
  });

  it('surfaces DB errors from the dish_catalog batch query', async () => {
    const menus = [{ date: '2026-07-06', meal_block: 'Breakfast', menu_items: [{ item_name: 'X', dish_id: 'dish-1' }] }];
    const client = makeClient(menus, null as any, null, { message: 'dish fetch failed' });
    const { result } = renderHook(() => useWeekMenuNutrition(client, '2026-07-06', '2026-07-12'));
    await act(async () => {});

    expect(result.current.error).toBe('dish fetch failed');
  });

  it('groups multiple meal blocks on the same date under one day entry', async () => {
    const menus = [
      { date: '2026-07-06', meal_block: 'Breakfast', menu_items: [] },
      { date: '2026-07-06', meal_block: 'Lunch', menu_items: [] },
      { date: '2026-07-06', meal_block: 'Dinner', menu_items: [] },
    ];
    const client = makeClient(menus, []);
    const { result } = renderHook(() => useWeekMenuNutrition(client, '2026-07-06', '2026-07-12'));
    await act(async () => {});

    expect(result.current.days).toHaveLength(1);
    expect(result.current.days[0].date).toBe('2026-07-06');
  });

  it('sorts days ascending by date regardless of query order', async () => {
    const menus = [
      { date: '2026-07-08', meal_block: 'Breakfast', menu_items: [] },
      { date: '2026-07-06', meal_block: 'Breakfast', menu_items: [] },
      { date: '2026-07-07', meal_block: 'Breakfast', menu_items: [] },
    ];
    const client = makeClient(menus, []);
    const { result } = renderHook(() => useWeekMenuNutrition(client, '2026-07-06', '2026-07-08'));
    await act(async () => {});

    expect(result.current.days.map(d => d.date)).toEqual(['2026-07-06', '2026-07-07', '2026-07-08']);
  });

  it('empty menu range is valid — no error, empty days', async () => {
    const client = makeClient([], []);
    const { result } = renderHook(() => useWeekMenuNutrition(client, '2026-07-06', '2026-07-12'));
    await act(async () => {});

    expect(result.current.days).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('refresh re-fetches', async () => {
    const client = makeClient([], []);
    const { result } = renderHook(() => useWeekMenuNutrition(client, '2026-07-06', '2026-07-12'));
    await act(async () => {});

    await act(async () => { await result.current.refresh(); });

    expect(client.from).toHaveBeenCalledWith('menus');
  });
});
