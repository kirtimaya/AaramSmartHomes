'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { cn } from '@/lib/utils';
import {
  IndianRupee, ArrowUpRight, ArrowDownRight, Wallet, Activity,
  Plus, Edit2, Trash2, X, Check, Loader2, Leaf, Zap, Sofa,
  Smartphone, Home, ChevronDown, ChevronUp, TrendingUp, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/lib/supabase';
import { Property, Room } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────
type ExpenseCategory = 'smart_devices' | 'organic_nature' | 'furniture' | 'maintenance' | 'utilities' | 'other';

type ExpenseItem = {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  property_id?: string;
  note?: string;
};

type RentEntry = {
  room_id: string;
  room_name: string;
  property_id: string;
  property_name: string;
  monthly_rent: number;
  status: string;
};

const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string; icon: React.FC<any>; bg: string }> = {
  smart_devices: { label: 'Smart Devices', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', icon: Smartphone },
  organic_nature: { label: 'Organic & Nature', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Leaf },
  furniture:      { label: 'Furniture & Interiors', color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/20', icon: Sofa },
  maintenance:    { label: 'Maintenance', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200', icon: Activity },
  utilities:      { label: 'Utilities', color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20', icon: Zap },
  other:          { label: 'Other', color: 'text-foreground/50', bg: 'bg-white/60 border-white', icon: Home },
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// ─── Local storage key for expenses (replace with Supabase table when ready) ─
const LS_KEY = 'aaram_expenses_v1';
const LS_RENT_KEY = 'aaram_rents_v1';

function loadLS<T>(key: string, def: T): T {
  if (typeof window === 'undefined') return def;
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return def; }
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function SummaryCard({ title, value, trend, isPositive, icon: Icon, sub }: { title: string; value: string; trend?: string; isPositive?: boolean; icon: React.FC<any>; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="soft-card p-7 border border-white group hover:scale-[1.01] transition-all bg-white/30">
      <div className="flex justify-between items-start mb-5">
        <div className="w-11 h-11 rounded-2xl soft-ui-in bg-white/50 flex items-center justify-center text-primary shadow-inner">
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-lg border border-white',
            isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary')}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {trend}
          </div>
        )}
      </div>
      <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em]">{title}</p>
      <h3 className="text-2xl font-bold mt-1 text-foreground tracking-tighter">{value}</h3>
      {sub && <p className="text-[9px] font-bold text-foreground/25 uppercase tracking-widest mt-1">{sub}</p>}
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FinancialHub() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<(Room & { property_id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Rent data: { [room_id]: monthly_rent }
  const [rentMap, setRentMap] = useState<Record<string, number>>({});
  const [editingRent, setEditingRent] = useState<string | null>(null); // room_id
  const [rentDraft, setRentDraft] = useState('');

  // Expense items
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState<ExpenseCategory | null>(null);
  const [newExpense, setNewExpense] = useState({ label: '', amount: '', note: '', property_id: '' });
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ExpenseCategory>>(new Set());

  useEffect(() => {
    fetchData();
    setExpenses(loadLS<ExpenseItem[]>(LS_KEY, defaultExpenses()));
    setRentMap(loadLS<Record<string, number>>(LS_RENT_KEY, {}));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [propsRes, roomsRes] = await Promise.all([
      supabase.from('properties').select('*').order('name'),
      supabase.from('rooms').select('*'),
    ]);
    if (propsRes.data) setProperties(propsRes.data);
    if (roomsRes.data) setRooms(roomsRes.data as any);
    setLoading(false);
  };

  const saveExpenses = (updated: ExpenseItem[]) => {
    setExpenses(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  };

  const saveRentMap = (updated: Record<string, number>) => {
    setRentMap(updated);
    localStorage.setItem(LS_RENT_KEY, JSON.stringify(updated));
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalMonthlyRent = useMemo(() =>
    Object.values(rentMap).reduce((s, v) => s + (v || 0), 0), [rentMap]);

  const totalExpenses = useMemo(() =>
    expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const netIncome = totalMonthlyRent - totalExpenses;

  const expensesByCategory = useMemo(() => {
    const map: Partial<Record<ExpenseCategory, ExpenseItem[]>> = {};
    for (const e of expenses) {
      if (!map[e.category]) map[e.category] = [];
      map[e.category]!.push(e);
    }
    return map;
  }, [expenses]);

  const categoryTotals = useMemo(() =>
    Object.entries(expensesByCategory).map(([cat, items]) => ({
      cat: cat as ExpenseCategory,
      total: items!.reduce((s, i) => s + i.amount, 0),
      count: items!.length,
    })), [expensesByCategory]);

  const chartData = useMemo(() =>
    categoryTotals.map(c => ({
      name: CATEGORY_META[c.cat].label.split(' ')[0],
      amount: c.total,
    })), [categoryTotals]);

  const roomsByProperty = useMemo(() => {
    const map: Record<string, typeof rooms> = {};
    for (const r of rooms) {
      if (!map[r.property_id]) map[r.property_id] = [];
      map[r.property_id].push(r);
    }
    return map;
  }, [rooms]);

  // ── Rent edit ─────────────────────────────────────────────────────────────
  const handleSaveRent = (roomId: string) => {
    const val = parseFloat(rentDraft);
    if (!isNaN(val) && val >= 0) {
      saveRentMap({ ...rentMap, [roomId]: val });
    }
    setEditingRent(null);
  };

  // ── Expense CRUD ──────────────────────────────────────────────────────────
  const handleAddExpense = (cat: ExpenseCategory) => {
    const amt = parseFloat(newExpense.amount);
    if (!newExpense.label || isNaN(amt)) return;
    const item: ExpenseItem = {
      id: Date.now().toString(),
      label: newExpense.label,
      amount: amt,
      category: cat,
      note: newExpense.note || undefined,
      property_id: newExpense.property_id || undefined,
    };
    saveExpenses([...expenses, item]);
    setIsAddingExpense(null);
    setNewExpense({ label: '', amount: '', note: '', property_id: '' });
  };

  const handleDeleteExpense = (id: string) => {
    saveExpenses(expenses.filter(e => e.id !== id));
    setEditingExpense(null);
  };

  const handleUpdateExpense = (updated: ExpenseItem) => {
    saveExpenses(expenses.map(e => e.id === updated.id ? updated : e));
    setEditingExpense(null);
  };

  const toggleCategory = (cat: ExpenseCategory) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  if (loading) return <AdminLayout><div className="min-h-[60vh] flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin mb-4" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-10 pb-20 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest border border-secondary/20">
              <Leaf className="w-2.5 h-2.5" /> Fiscal Intelligence
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tighter text-foreground">
              Aaram <span className="text-primary italic">Financials</span>
            </h1>
            <p className="text-foreground/40 text-sm">Live rent income, categorised expenses, and portfolio P&L.</p>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <SummaryCard title="Monthly Rent Income" value={fmt(totalMonthlyRent)} icon={IndianRupee} isPositive trend={`${rooms.length} rooms`} sub="Across all properties" />
          <SummaryCard title="Total Expenses" value={fmt(totalExpenses)} icon={Activity} isPositive={false} trend={`${expenses.length} items`} sub="All categories combined" />
          <SummaryCard
            title="Net Income" value={fmt(netIncome)} icon={TrendingUp}
            isPositive={netIncome >= 0} trend={netIncome >= 0 ? 'Profit' : 'Loss'}
            sub="Rent minus all expenses"
          />
        </div>

        {/* ── Expense Breakdown Chart ── */}
        {chartData.length > 0 && (
          <div className="soft-card border border-white p-8 bg-white/30">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-3"><div className="w-1.5 h-6 rounded-full bg-primary" /> Expense Breakdown</h3>
                <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">By category</p>
              </div>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={32}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'rgba(61,61,61,0.4)', fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'rgba(61,61,61,0.3)', fontWeight: 'bold' }} tickFormatter={v => `₹${v/1000}k`} />
                  <Tooltip cursor={{ fill: 'rgba(214,125,97,0.05)' }}
                    contentStyle={{ backgroundColor: '#FDFBF7', border: '1px solid #fff', borderRadius: '16px' }}
                    formatter={(val: any) => [fmt(val), 'Amount']} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={['#D67D61', '#10b981', '#f59e0b', '#94a3b8', '#8b5cf6', '#6b7280'][i % 6]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 1: PROPERTY RENT
        ════════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 rounded-full bg-secondary" />
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Property Rent Income</h2>
              <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Set monthly rent per room — click to edit</p>
            </div>
          </div>

          {properties.map(property => {
            const propRooms = roomsByProperty[property.id] || [];
            const propRentTotal = propRooms.reduce((s, r) => s + (rentMap[r.id] || 0), 0);

            return (
              <div key={property.id} className="soft-card border border-white p-6 space-y-4 bg-white/30">
                <div className="flex justify-between items-center pb-3 border-b border-white/40">
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-tight">{property.name}</h3>
                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{property.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Monthly Total</p>
                    <p className="text-xl font-bold text-secondary tracking-tighter">{fmt(propRentTotal)}</p>
                  </div>
                </div>

                {propRooms.length === 0 ? (
                  <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest italic">No rooms found — add rooms in Properties tab</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {propRooms.map(room => (
                      <div key={room.id} className={cn(
                        'soft-well px-4 py-3 border border-white flex items-center justify-between gap-3 group',
                        editingRent === room.id && 'border-secondary/30 bg-secondary/5'
                      )}>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-foreground truncate">{room.name}</p>
                          <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{room.type} · {room.sqft} sqft</p>
                        </div>
                        {editingRent === room.id ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold text-foreground/40">₹</span>
                            <input
                              type="number" autoFocus
                              value={rentDraft}
                              onChange={e => setRentDraft(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveRent(room.id); if (e.key === 'Escape') setEditingRent(null); }}
                              className="w-24 soft-ui-in py-1.5 px-2 text-xs bg-white/60 border border-white outline-none text-right font-bold"
                              placeholder="0"
                            />
                            <button onClick={() => handleSaveRent(room.id)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-white shadow-sm">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingRent(null)} className="w-7 h-7 rounded-lg soft-button border border-white text-foreground/30">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            <p className={cn('text-sm font-bold tracking-tighter', rentMap[room.id] ? 'text-secondary' : 'text-foreground/20')}>
                              {rentMap[room.id] ? fmt(rentMap[room.id]) : '—'}
                            </p>
                            <button
                              onClick={() => { setEditingRent(room.id); setRentDraft((rentMap[room.id] || '').toString()); }}
                              className="w-7 h-7 rounded-lg soft-button border border-white text-secondary/40 hover:text-secondary opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 2 — EXPENSE CATEGORIES
        ════════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Operating Expenses</h2>
              <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Categorised costs — click any item to edit</p>
            </div>
          </div>

          {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map(cat => {
            const meta = CATEGORY_META[cat];
            const items = expensesByCategory[cat] || [];
            const total = items.reduce((s, i) => s + i.amount, 0);
            const isCollapsed = collapsedCategories.has(cat);
            const Icon = meta.icon;

            return (
              <div key={cat} className="soft-card border border-white overflow-hidden bg-white/30">
                {/* Category Header */}
                <div
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', meta.bg)}>
                      <Icon className={cn('w-4 h-4', meta.color)} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm uppercase tracking-tight">{meta.label}</h3>
                      <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{items.length} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn('text-lg font-bold tracking-tighter', meta.color)}>{total > 0 ? fmt(total) : '—'}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setIsAddingExpense(cat); setNewExpense({ label: '', amount: '', note: '', property_id: '' }); }}
                      className="w-8 h-8 rounded-xl soft-button border border-white text-secondary hover:bg-secondary hover:text-white transition-all flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    {isCollapsed ? <ChevronDown className="w-4 h-4 text-foreground/30" /> : <ChevronUp className="w-4 h-4 text-foreground/30" />}
                  </div>
                </div>

                {/* Items */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="px-5 pb-5 space-y-2 border-t border-white/40">
                        {items.length === 0 ? (
                          <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest italic pt-4">No items yet. Click + to add.</p>
                        ) : (
                          <div className="pt-3 space-y-2">
                            {items.map(item => {
                              const propName = item.property_id ? properties.find(p => p.id === item.property_id)?.name : null;
                              return (
                                <div key={item.id} className="flex items-center gap-3 group soft-well px-4 py-3 border border-white hover:border-white/60 transition-all">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-foreground">{item.label}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {item.note && <p className="text-[9px] font-bold text-foreground/30 italic">{item.note}</p>}
                                      {propName && (
                                        <span className="text-[8px] font-bold text-primary bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest">{propName}</span>
                                      )}
                                    </div>
                                  </div>
                                  <p className={cn('text-sm font-bold tracking-tighter shrink-0', meta.color)}>{fmt(item.amount)}</p>
                                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                    <button onClick={() => setEditingExpense({...item})} className="w-7 h-7 rounded-lg soft-button border border-white text-secondary hover:bg-secondary hover:text-white transition-all">
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => handleDeleteExpense(item.id)} className="w-7 h-7 rounded-lg soft-button border border-white text-primary/40 hover:text-primary transition-all">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </section>

      </div>

      {/* ════ ADD EXPENSE MODAL ════ */}
      <AnimatePresence>
        {isAddingExpense && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddingExpense(null)} className="absolute inset-0 bg-background/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-background soft-card border border-white w-full max-w-sm p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-tight">Add Expense</h2>
                  <p className={cn('text-[9px] font-extrabold uppercase tracking-widest', CATEGORY_META[isAddingExpense].color)}>
                    {CATEGORY_META[isAddingExpense].label}
                  </p>
                </div>
                <button onClick={() => setIsAddingExpense(null)} className="soft-button w-8 h-8 border border-white text-foreground/30"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Description</label>
                  <input type="text" autoFocus value={newExpense.label}
                    onChange={e => setNewExpense({...newExpense, label: e.target.value})}
                    className="soft-ui-in w-full py-3.5 px-5 text-xs bg-white/60 border border-white outline-none"
                    placeholder="e.g. Alexa Echo Dot" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Amount (₹)</label>
                  <input type="number" value={newExpense.amount}
                    onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                    className="soft-ui-in w-full py-3.5 px-5 text-xs bg-white/60 border border-white outline-none"
                    placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Note (optional)</label>
                  <input type="text" value={newExpense.note}
                    onChange={e => setNewExpense({...newExpense, note: e.target.value})}
                    className="soft-ui-in w-full py-3.5 px-5 text-xs bg-white/60 border border-white outline-none"
                    placeholder="e.g. Purchased for Villa 32" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Property (optional)</label>
                  <select value={newExpense.property_id}
                    onChange={e => setNewExpense({...newExpense, property_id: e.target.value})}
                    className="soft-ui-in w-full py-3.5 px-5 text-xs bg-white/60 border border-white outline-none appearance-none">
                    <option value="">— All Properties —</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <button onClick={() => handleAddExpense(isAddingExpense)}
                  disabled={!newExpense.label || !newExpense.amount}
                  className="w-full btn-terracotta py-3.5 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-40">
                  <Save className="w-4 h-4" /> Add Expense
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════ EDIT EXPENSE MODAL ════ */}
      <AnimatePresence>
        {editingExpense && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingExpense(null)} className="absolute inset-0 bg-background/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-background soft-card border border-white w-full max-w-sm p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold uppercase tracking-tight">Edit Expense</h2>
                <button onClick={() => setEditingExpense(null)} className="soft-button w-8 h-8 border border-white text-foreground/30"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Description</label>
                  <input type="text" value={editingExpense.label}
                    onChange={e => setEditingExpense({...editingExpense, label: e.target.value})}
                    className="soft-ui-in w-full py-3.5 px-5 text-xs bg-white/60 border border-white outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Amount (₹)</label>
                  <input type="number" value={editingExpense.amount}
                    onChange={e => setEditingExpense({...editingExpense, amount: parseFloat(e.target.value) || 0})}
                    className="soft-ui-in w-full py-3.5 px-5 text-xs bg-white/60 border border-white outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Category</label>
                  <select value={editingExpense.category}
                    onChange={e => setEditingExpense({...editingExpense, category: e.target.value as ExpenseCategory})}
                    className="soft-ui-in w-full py-3.5 px-5 text-xs bg-white/60 border border-white outline-none appearance-none">
                    {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map(c => (
                      <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Note</label>
                  <input type="text" value={editingExpense.note || ''}
                    onChange={e => setEditingExpense({...editingExpense, note: e.target.value})}
                    className="soft-ui-in w-full py-3.5 px-5 text-xs bg-white/60 border border-white outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Property</label>
                  <select value={editingExpense.property_id || ''}
                    onChange={e => setEditingExpense({...editingExpense, property_id: e.target.value || undefined})}
                    className="soft-ui-in w-full py-3.5 px-5 text-xs bg-white/60 border border-white outline-none appearance-none">
                    <option value="">— All Properties —</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => handleDeleteExpense(editingExpense.id)}
                    className="soft-button px-4 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleUpdateExpense(editingExpense)}
                    className="flex-1 btn-terracotta py-3.5 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

// ─── Default expense seed data ────────────────────────────────────────────────
function defaultExpenses(): ExpenseItem[] {
  return [
    { id: '1', label: 'Amazon Echo Dot (x3)', amount: 9000, category: 'smart_devices', note: 'Voice control per villa' },
    { id: '2', label: 'Smart Door Lock', amount: 15000, category: 'smart_devices', note: 'Per villa entry' },
    { id: '3', label: 'Automated LED Lighting', amount: 12000, category: 'smart_devices', note: 'Motion-sensor strips' },
    { id: '4', label: 'Indoor Plants & Pots', amount: 5500, category: 'organic_nature', note: 'Common area greens' },
    { id: '5', label: 'Bamboo Furniture Set', amount: 22000, category: 'organic_nature', note: 'Eco-friendly living room' },
    { id: '6', label: 'Herb Garden Kit', amount: 3200, category: 'organic_nature', note: 'Kitchen herb wall' },
    { id: '7', label: 'Sofa & Lounge Chairs', amount: 45000, category: 'furniture', note: 'Living room set' },
    { id: '8', label: 'Bed Frames & Mattresses', amount: 38000, category: 'furniture', note: 'Master suite' },
    { id: '9', label: 'Kitchen Appliances', amount: 28000, category: 'furniture', note: 'Microwave, mixer, etc.' },
    { id: '10', label: 'Plumbing & Water', amount: 8000, category: 'maintenance' },
    { id: '11', label: 'Housekeeping', amount: 6000, category: 'maintenance', note: 'Monthly' },
    { id: '12', label: 'Electricity (3 villas)', amount: 14000, category: 'utilities' },
    { id: '13', label: 'Internet (fiber)', amount: 3500, category: 'utilities' },
  ];
}
