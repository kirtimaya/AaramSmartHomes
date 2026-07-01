import { useState, useEffect, useCallback, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'rent' | 'maintenance' | 'electricity' | 'gas' | 'wifi'
  | 'maid' | 'furniture' | 'smart_devices' | 'organic_nature'
  | 'utilities' | 'other' | 'custom' | 'security_deposit' | 'setup_expense';

export type ExpenseItem = {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  property_id?: string | null;
  note?: string;
  expense_date?: string;
};

export type IncomeRecord = {
  id: string;
  room_id: string;
  amount: number;
  income_type: 'rent' | 'deposit' | 'setup_cost' | 'custom';
  category?: string;
  income_date: string;
  note?: string;
};

export type MonthlyPoint = {
  month: string;  // "Jan", "Feb", …
  income: number;
  expense: number;
};

export type CategorySlice = {
  category: ExpenseCategory;
  total: number;
  pct: number;
};

export type AdminFinancialsState = {
  expenses: ExpenseItem[];
  income: IncomeRecord[];
  // KPIs (all-time)
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  // Current-month KPIs
  monthIncome: number;
  monthExpenses: number;
  // Chart data
  monthlyPoints: MonthlyPoint[];
  categorySlices: CategorySlice[];
  // Recent (last 10 combined)
  recentTransactions: Array<{ id: string; label: string; amount: number; date: string; type: 'income' | 'expense'; category?: string }>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export type AdminFinancialsClient = {
  auth: {
    getSession: () => Promise<{ data: { session: { user: { id: string } } | null } }>;
  };
  from: (table: string) => any;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function isoMonth(dateStr: string) {
  return dateStr.slice(0, 7); // "2024-03"
}

function shortMonth(dateStr: string) {
  const d = new Date(dateStr + '-01');
  return d.toLocaleString('en-US', { month: 'short' });
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAdminFinancials(client: AdminFinancialsClient): AdminFinancialsState {
  const [expenses,  setExpenses]  = useState<ExpenseItem[]>([]);
  const [income,    setIncome]    = useState<IncomeRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) { setError('not_authenticated'); return; }

      const [expRes, incRes] = await Promise.all([
        client.from('expenses').select('*').order('expense_date', { ascending: false }),
        client.from('income_records').select('*').order('income_date', { ascending: false }),
      ]);

      if (expRes.error) throw new Error(expRes.error.message);
      if (incRes.error) throw new Error(incRes.error.message);

      setExpenses((expRes.data ?? []) as ExpenseItem[]);
      setIncome((incRes.data ?? []) as IncomeRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const thisMonth = useMemo(() => isoMonth(new Date().toISOString().slice(0, 10)), []);

  const totalIncome   = useMemo(() => income.reduce((s, r) => s + r.amount, 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((s, r) => s + r.amount, 0), [expenses]);
  const netProfit     = totalIncome - totalExpenses;

  const monthIncome   = useMemo(() => income.filter(r => isoMonth(r.income_date) === thisMonth).reduce((s, r) => s + r.amount, 0), [income, thisMonth]);
  const monthExpenses = useMemo(() => expenses.filter(r => r.expense_date && isoMonth(r.expense_date) === thisMonth).reduce((s, r) => s + r.amount, 0), [expenses, thisMonth]);

  // Last 6 months bar chart
  const monthlyPoints = useMemo((): MonthlyPoint[] => {
    const months: string[] = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push(m.toISOString().slice(0, 7));
    }
    return months.map(m => ({
      month:   shortMonth(m),
      income:  income.filter(r => isoMonth(r.income_date) === m).reduce((s, r) => s + r.amount, 0),
      expense: expenses.filter(r => r.expense_date && isoMonth(r.expense_date) === m).reduce((s, r) => s + r.amount, 0),
    }));
  }, [income, expenses]);

  // Expense pie breakdown
  const categorySlices = useMemo((): CategorySlice[] => {
    const totals: Partial<Record<ExpenseCategory, number>> = {};
    for (const e of expenses) {
      totals[e.category] = (totals[e.category] ?? 0) + e.amount;
    }
    const grand = Object.values(totals).reduce((s, v) => s + (v ?? 0), 0) || 1;
    return Object.entries(totals)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, 6)
      .map(([category, total]) => ({
        category: category as ExpenseCategory,
        total:    total ?? 0,
        pct:      Math.round(((total ?? 0) / grand) * 100),
      }));
  }, [expenses]);

  // Recent combined list
  const recentTransactions = useMemo(() => {
    const inc = income.slice(0, 10).map(r => ({
      id:       r.id,
      label:    r.category ?? r.income_type,
      amount:   r.amount,
      date:     r.income_date,
      type:     'income' as const,
      category: r.income_type,
    }));
    const exp = expenses.slice(0, 10).map(r => ({
      id:       r.id,
      label:    r.label,
      amount:   r.amount,
      date:     r.expense_date ?? '',
      type:     'expense' as const,
      category: r.category,
    }));
    return [...inc, ...exp]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [income, expenses]);

  return {
    expenses, income,
    totalIncome, totalExpenses, netProfit,
    monthIncome, monthExpenses,
    monthlyPoints, categorySlices, recentTransactions,
    loading, refreshing, error, refresh,
  };
}
