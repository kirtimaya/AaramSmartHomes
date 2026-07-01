import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminFinancials } from '../../admin/useAdminFinancials';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeChain(data: unknown, dbError: unknown = null) {
  const resolved = { data, error: dbError };
  const chain: any = {
    select:  vi.fn().mockReturnThis(),
    order:   vi.fn().mockReturnThis(),
    then(onFulfilled: any, onRejected?: any) {
      return Promise.resolve(resolved).then(onFulfilled, onRejected);
    },
    catch(f: any) { return Promise.resolve(resolved).catch(f); },
    finally(f: any) { return Promise.resolve(resolved).finally(f); },
  };
  return chain;
}

const EXPENSES = [
  { id: 'e1', label: 'Internet', amount: 1500, category: 'wifi',        expense_date: '2024-01-10', property_id: 'p1' },
  { id: 'e2', label: 'Repairs',  amount: 5000, category: 'maintenance', expense_date: '2024-01-15', property_id: 'p1' },
  { id: 'e3', label: 'Power',    amount: 3200, category: 'electricity', expense_date: '2024-02-05', property_id: 'p1' },
];

const INCOME = [
  { id: 'i1', room_id: 'r1', amount: 15000, income_type: 'rent',    income_date: '2024-01-01', category: 'Rent' },
  { id: 'i2', room_id: 'r2', amount: 12000, income_type: 'rent',    income_date: '2024-02-01', category: 'Rent' },
  { id: 'i3', room_id: 'r1', amount: 30000, income_type: 'deposit', income_date: '2024-01-01', category: 'Deposit' },
];

function makeClient(
  expenses = EXPENSES,
  income   = INCOME,
  authed   = true,
  expError: unknown = null,
  incError: unknown = null,
) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: authed ? { user: { id: 'admin-1' } } : null },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'expenses')        return makeChain(expenses, expError);
      if (table === 'income_records')  return makeChain(income, incError);
      return makeChain([]);
    }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAdminFinancials', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('starts in loading state', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminFinancials(client));
    expect(result.current.loading).toBe(true);
    await act(async () => {});
  });

  it('loads and computes all-time totals', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminFinancials(client));
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    // income: 15000 + 12000 + 30000 = 57000
    expect(result.current.totalIncome).toBe(57000);
    // expenses: 1500 + 5000 + 3200 = 9700
    expect(result.current.totalExpenses).toBe(9700);
    expect(result.current.netProfit).toBe(47300);
  });

  it('builds monthlyPoints for last 6 months', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminFinancials(client));
    await act(async () => {});

    expect(result.current.monthlyPoints).toHaveLength(6);
    // Each point has a month string + income + expense
    const point = result.current.monthlyPoints[0];
    expect(point).toHaveProperty('month');
    expect(point).toHaveProperty('income');
    expect(point).toHaveProperty('expense');
  });

  it('builds categorySlices sorted by total descending', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminFinancials(client));
    await act(async () => {});

    // maintenance (5000) > electricity (3200) > wifi (1500)
    expect(result.current.categorySlices[0].category).toBe('maintenance');
    expect(result.current.categorySlices[0].total).toBe(5000);
    // pct should sum to 100
    const totalPct = result.current.categorySlices.reduce((s, sl) => s + sl.pct, 0);
    expect(totalPct).toBe(100);
  });

  it('builds recentTransactions sorted by date descending', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminFinancials(client));
    await act(async () => {});

    const txs = result.current.recentTransactions;
    expect(txs.length).toBeGreaterThan(0);
    // Should be sorted newest first
    for (let i = 1; i < txs.length; i++) {
      expect(txs[i - 1].date >= txs[i].date).toBe(true);
    }
  });

  it('returns not_authenticated when session is null', async () => {
    const client = makeClient(EXPENSES, INCOME, false);
    const { result } = renderHook(() => useAdminFinancials(client));
    await act(async () => {});

    expect(result.current.error).toBe('not_authenticated');
  });

  it('surfaces expense DB error', async () => {
    const client = makeClient(EXPENSES, INCOME, true, { message: 'expenses table error' });
    const { result } = renderHook(() => useAdminFinancials(client));
    await act(async () => {});

    expect(result.current.error).toBe('expenses table error');
  });

  it('handles empty data — zero totals, no crash', async () => {
    const client = makeClient([], []);
    const { result } = renderHook(() => useAdminFinancials(client));
    await act(async () => {});

    expect(result.current.totalIncome).toBe(0);
    expect(result.current.totalExpenses).toBe(0);
    expect(result.current.netProfit).toBe(0);
    expect(result.current.categorySlices).toEqual([]);
    expect(result.current.recentTransactions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('refresh re-fetches and resets refreshing flag', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminFinancials(client));
    await act(async () => {});

    await act(async () => { await result.current.refresh(); });
    expect(result.current.refreshing).toBe(false);
    expect(client.auth.getSession).toHaveBeenCalledTimes(2);
  });

  it('netProfit is negative when expenses exceed income', async () => {
    const bigExpenses = [{ ...EXPENSES[0], amount: 100000 }];
    const smallIncome = [{ ...INCOME[0], amount: 5000 }];
    const client = makeClient(bigExpenses, smallIncome);
    const { result } = renderHook(() => useAdminFinancials(client));
    await act(async () => {});

    expect(result.current.netProfit).toBe(-95000);
  });
});
