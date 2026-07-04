import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMemberNutrition } from '../../food/useMemberNutrition';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeChain(tableData: unknown, dbError: unknown = null) {
  const resolved = { data: tableData, error: dbError };
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    gte:    vi.fn().mockReturnThis(),
    lte:    vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    maybeSingle() { return Promise.resolve(resolved); },
    then(onFulfilled: any, onRejected?: any) {
      return Promise.resolve(resolved).then(onFulfilled, onRejected);
    },
    catch(onRejected: any) { return Promise.resolve(resolved).catch(onRejected); },
    finally(onFinally: any) { return Promise.resolve(resolved).finally(onFinally); },
  };
  return chain;
}

function makeClient(opts: {
  menus?: unknown[]; skips?: unknown[]; prefs?: unknown; dishes?: unknown[];
  session?: { user: { id: string } } | null;
  menuError?: unknown; skipError?: unknown; prefsError?: unknown; dishError?: unknown;
} = {}) {
  const {
    menus = [], skips = [], prefs = null, dishes = [],
    session = { user: { id: 'member-1' } },
    menuError = null, skipError = null, prefsError = null, dishError = null,
  } = opts;

  const menusChain = makeChain(menus, menuError);
  const skipsChain = makeChain(skips, skipError);
  const prefsChain = makeChain(prefs, prefsError);
  const dishesChain = makeChain(dishes, dishError);

  const from = vi.fn((table: string) => {
    if (table === 'menus') return menusChain;
    if (table === 'meal_skip_requests') return skipsChain;
    if (table === 'tenant_meal_preferences') return prefsChain;
    return dishesChain;
  });

  return {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session } }) },
    from,
    _menusChain: menusChain, _skipsChain: skipsChain, _prefsChain: prefsChain, _dishesChain: dishesChain,
  };
}

function menuRow(date: string, block: string, dishId: string | null = 'dish-1') {
  return { date, meal_block: block, menu_items: dishId ? [{ dish_id: dishId }] : [] };
}

function dishRow(id: string, calories = 200, protein = 10) {
  return { id, calories, protein_g: protein, carbs_g: 30, fats_g: 5, fiber_g: 4 };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useMemberNutrition', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('starts in loading state', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useMemberNutrition(client, '2026-07-01', '2026-07-31'));
    expect(result.current.loading).toBe(true);
    await act(async () => {});
  });

  it('returns not_authenticated when there is no session', async () => {
    const client = makeClient({ session: null });
    const { result } = renderHook(() => useMemberNutrition(client, '2026-07-01', '2026-07-31'));
    await act(async () => {});

    expect(result.current.error).toBe('not_authenticated');
    expect(result.current.daily).toEqual([]);
  });

  it('counts a received meal and includes its macros', async () => {
    const client = makeClient({
      menus: [menuRow('2026-07-06', 'Breakfast')],
      dishes: [dishRow('dish-1', 168, 7)],
    });
    const { result } = renderHook(() => useMemberNutrition(client, '2026-07-01', '2026-07-31'));
    await act(async () => {});

    expect(result.current.mealsReceived).toBe(1);
    expect(result.current.mealsSkipped).toBe(0);
    expect(result.current.daily).toHaveLength(1);
    expect(result.current.daily[0].macros.calories).toBe(168);
    expect(result.current.total.calories).toBe(168);
  });

  it('subtracts a meal the member explicitly skipped', async () => {
    const client = makeClient({
      menus: [menuRow('2026-07-06', 'Lunch')],
      skips: [{ skip_date: '2026-07-06', meal_block: 'Lunch' }],
      dishes: [dishRow('dish-1')],
    });
    const { result } = renderHook(() => useMemberNutrition(client, '2026-07-01', '2026-07-31'));
    await act(async () => {});

    expect(result.current.mealsReceived).toBe(0);
    expect(result.current.mealsSkipped).toBe(1);
    expect(result.current.daily).toEqual([]);
  });

  it('excludes a meal block the member has disabled entirely in tenant_meal_preferences', async () => {
    const client = makeClient({
      menus: [menuRow('2026-07-06', 'Dinner')],
      prefs: { meal_breakfast: true, meal_lunch: true, meal_dinner: false },
      dishes: [dishRow('dish-1')],
    });
    const { result } = renderHook(() => useMemberNutrition(client, '2026-07-01', '2026-07-31'));
    await act(async () => {});

    expect(result.current.mealsReceived).toBe(0);
    expect(result.current.mealsSkipped).toBe(1);
  });

  it('a meal that is both enabled and not skipped counts as received even with mixed sibling meals', async () => {
    const client = makeClient({
      menus: [menuRow('2026-07-06', 'Breakfast'), menuRow('2026-07-06', 'Lunch'), menuRow('2026-07-06', 'Dinner')],
      skips: [{ skip_date: '2026-07-06', meal_block: 'Lunch' }],
      prefs: { meal_breakfast: true, meal_lunch: true, meal_dinner: false },
      dishes: [dishRow('dish-1', 150)],
    });
    const { result } = renderHook(() => useMemberNutrition(client, '2026-07-01', '2026-07-31'));
    await act(async () => {});

    // Only Breakfast survives: Lunch skipped, Dinner disabled
    expect(result.current.mealsReceived).toBe(1);
    expect(result.current.mealsSkipped).toBe(2);
    expect(result.current.daily[0].macros.calories).toBe(150);
  });

  it('handles a menu item with no dish_id gracefully — zero macros, still counts as received', async () => {
    const client = makeClient({
      menus: [menuRow('2026-07-06', 'Breakfast', null)], // free-typed item, no dish_id
    });
    const { result } = renderHook(() => useMemberNutrition(client, '2026-07-01', '2026-07-31'));
    await act(async () => {});

    expect(result.current.mealsReceived).toBe(1);
    expect(result.current.daily[0].macros.calories).toBe(0);
  });

  it('defaults an absent tenant_meal_preferences row to all blocks enabled', async () => {
    const client = makeClient({
      menus: [menuRow('2026-07-06', 'Breakfast')],
      prefs: null, // no row at all — new member who hasn't set preferences
      dishes: [dishRow('dish-1')],
    });
    const { result } = renderHook(() => useMemberNutrition(client, '2026-07-01', '2026-07-31'));
    await act(async () => {});

    expect(result.current.mealsReceived).toBe(1);
  });

  it('aggregates multiple days into a correct running total (month boundary)', async () => {
    const client = makeClient({
      menus: [
        menuRow('2026-06-30', 'Dinner'),  // last day of June
        menuRow('2026-07-01', 'Breakfast'), // first day of July
      ],
      dishes: [dishRow('dish-1', 100)],
    });
    const { result } = renderHook(() => useMemberNutrition(client, '2026-06-25', '2026-07-05'));
    await act(async () => {});

    expect(result.current.daily).toHaveLength(2);
    expect(result.current.daily.map(d => d.date)).toEqual(['2026-06-30', '2026-07-01']);
    expect(result.current.total.calories).toBe(200);
  });

  it('surfaces DB errors from any of the three parallel queries', async () => {
    const client = makeClient({ menuError: { message: 'menus broke' } });
    const { result } = renderHook(() => useMemberNutrition(client, '2026-07-01', '2026-07-31'));
    await act(async () => {});

    expect(result.current.error).toBe('menus broke');
  });

  it('empty range is valid — zero totals, no error', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useMemberNutrition(client, '2026-07-01', '2026-07-31'));
    await act(async () => {});

    expect(result.current.daily).toEqual([]);
    expect(result.current.total).toEqual({ calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });
    expect(result.current.error).toBeNull();
  });

  it('refresh re-fetches', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useMemberNutrition(client, '2026-07-01', '2026-07-31'));
    await act(async () => {});

    await act(async () => { await result.current.refresh(); });

    expect(client.auth.getSession).toHaveBeenCalledTimes(2);
  });
});
