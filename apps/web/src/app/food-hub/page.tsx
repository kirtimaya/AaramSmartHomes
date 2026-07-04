'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils, Clock, Package, AlertCircle, Plus, Edit2, Trash2,
  Calendar, Leaf, Coffee, CheckCircle2, X, PieChart as PieIcon,
  ChefHat, Timer, Bell, RefreshCw, Wallet, ChevronDown, Zap,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

type MealType = 'Breakfast' | 'Lunch' | 'Dinner';
type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

interface PantryItem {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  status: 'In Stock' | 'Low' | 'Out of Stock';
  category: string;
  last_updated_at: string;
}

interface Expense {
  id: string;
  item: string;
  amount: number;
  date: string;
  category: string;
}

interface MenuRow {
  date: string;
  meal_block: string;
  notes: string | null;
  menu_items: Array<{ item_name: string; sort_order: number }>;
  last_alexa_update?: string | null;
}

// ── IST Helpers ────────────────────────────────────────────────────────────────

function getISTDate(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDaysToIST(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function getWeekMondayIST(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const day = ist.getUTCDay();
  const monday = new Date(ist);
  monday.setUTCDate(ist.getUTCDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

const MEAL_TIMINGS: Record<MealType, string> = {
  Breakfast: '08:00 AM – 10:00 AM',
  Lunch:     '01:00 PM – 03:00 PM',
  Dinner:    '08:30 PM – 10:30 PM',
};

// ── Static Expenses (non-DB for now) ──────────────────────────────────────────

const INITIAL_EXPENSES: Expense[] = [
  { id: '1', item: 'Organic Veggies',  amount: 3500,  date: '2026-05-10', category: 'Fresh' },
  { id: '2', item: 'Milk Supply',      amount: 4800,  date: '2026-05-08', category: 'Dairy' },
  { id: '3', item: 'Grocery Refill',   amount: 12000, date: '2026-05-05', category: 'Essentials' },
  { id: '4', item: 'Gas Cylinder',     amount: 1150,  date: '2026-05-02', category: 'Utilities' },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FoodHub() {
  const todayIST = getISTDate();
  const todayDayName = DAYS[new Date(todayIST + 'T00:00:00Z').getUTCDay() === 0 ? 6 : new Date(todayIST + 'T00:00:00Z').getUTCDay() - 1];

  const [activeDay, setActiveDay] = useState<DayOfWeek>(todayDayName);
  const [showTimings, setShowTimings] = useState(false);
  const [walletBalance] = useState(2450);

  // ── DB State ─────────────────────────────────────────────────────────────────

  const [weekMenu, setWeekMenu]       = useState<Record<DayOfWeek, Record<MealType, { text: string; alexaUpdated?: string | null }>>>(
    Object.fromEntries(DAYS.map(d => [d, Object.fromEntries(MEALS.map(m => [m, { text: '' }]))])) as any
  );
  const [pantry, setPantry]           = useState<PantryItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [pantryLoading, setPantryLoading] = useState(true);
  const [alexaUpdates, setAlexaUpdates]   = useState<Record<string, string>>({}); // menuItemId → time

  // ── Expenses (local) ──────────────────────────────────────────────────────────

  const [expenses, setExpenses]       = useState(INITIAL_EXPENSES);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [newExpense, setNewExpense]    = useState({ item: '', amount: '', category: 'Essentials' });

  const monthlyBudget = 35000;
  const spent = useMemo(() => expenses.reduce((a, e) => a + e.amount, 0), [expenses]);
  const margin = monthlyBudget - spent;

  const chartData = [
    { name: 'Spent',  value: spent,              color: '#D67D61' },
    { name: 'Margin', value: Math.max(0, margin), color: '#8BA88E' },
  ];

  // ── Fetch weekly menu from DB ─────────────────────────────────────────────────

  const loadWeekMenu = useCallback(async () => {
    setMenuLoading(true);
    const weekStart = getWeekMondayIST();
    const dates = DAYS.map((_, i) => addDaysToIST(weekStart, i));

    const { data } = await supabase
      .from('menus')
      .select('date, meal_block, notes, menu_items(item_name, sort_order)')
      .in('date', dates);

    const fresh: Record<DayOfWeek, Record<MealType, { text: string; alexaUpdated?: string | null }>> =
      Object.fromEntries(DAYS.map(d => [d, Object.fromEntries(MEALS.map(m => [m, { text: '' }]))])) as any;

    if (data?.length) {
      for (const row of data as MenuRow[]) {
        const dayIdx = dates.indexOf(row.date);
        if (dayIdx < 0) continue;
        const dayName = DAYS[dayIdx];
        const block = row.meal_block as MealType;
        if (!MEALS.includes(block)) continue;
        const items = (row.menu_items ?? []) as { item_name: string; sort_order: number }[];
        const text = items.length
          ? items.sort((a, b) => a.sort_order - b.sort_order).map(i => i.item_name).join(', ')
          : (row.notes ?? '');
        fresh[dayName][block] = { text };
      }
    }
    setWeekMenu(fresh);
    setMenuLoading(false);
  }, []);

  // ── Fetch pantry from DB ──────────────────────────────────────────────────────

  const loadPantry = useCallback(async () => {
    setPantryLoading(true);
    const { data } = await supabase
      .from('pantry_items')
      .select('id, name, category, quantity, unit, status, last_updated_at')
      .order('name');
    if (data) setPantry(data as PantryItem[]);
    setPantryLoading(false);
  }, []);

  useEffect(() => {
    loadWeekMenu();
    loadPantry();
  }, [loadWeekMenu, loadPantry]);

  // ── Supabase Realtime — menu_items changes (Alexa updates) ────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('food-hub-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, (payload) => {
        loadWeekMenu();
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const id = (payload.new as any)?.id as string;
          if (id) {
            setAlexaUpdates(prev => ({ ...prev, [id]: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) }));
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pantry_items' }, () => {
        loadPantry();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadWeekMenu, loadPantry]);

  // ── Derived: reminders from pantry ───────────────────────────────────────────

  const reminders = useMemo(
    () => pantry.filter(p => p.status !== 'In Stock').slice(0, 5),
    [pantry]
  );

  // ── Expense helpers ───────────────────────────────────────────────────────────

  const handleAddOrUpdateExpense = () => {
    if (!newExpense.item || !newExpense.amount) return;
    if (editingExpense) {
      setExpenses(expenses.map(e => e.id === editingExpense.id
        ? { ...e, item: newExpense.item, amount: parseFloat(newExpense.amount), category: newExpense.category }
        : e));
    } else {
      setExpenses([{ id: Math.random().toString(36).slice(2), item: newExpense.item, amount: parseFloat(newExpense.amount), date: todayIST, category: newExpense.category }, ...expenses]);
    }
    setNewExpense({ item: '', amount: '', category: 'Essentials' });
    setEditingExpense(null);
    setShowAddExpense(false);
  };

  const deleteExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id));

  const editExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({ item: expense.item, amount: expense.amount.toString(), category: expense.category });
    setShowAddExpense(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const activeDayMenu = weekMenu[activeDay];
  const hasAlexaUpdate = Object.keys(alexaUpdates).length > 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 lg:p-12 pb-24 overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[100px]" />
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, -45, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-1/4 -left-1/4 w-2/3 h-2/3 bg-secondary/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
            <ChefHat className="w-3.5 h-3.5" /> Aaram Culinary Ecosystem
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-foreground tracking-tighter uppercase leading-none">
            Food <span className="text-primary italic">Hub</span>
          </h1>
          <p className="text-foreground/50 font-medium text-sm mt-2 uppercase tracking-widest">Nourishing Lives with Smart Nutrition</p>
          {hasAlexaUpdate && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold">
              <Zap className="w-3 h-3" /> Menu updated via Alexa
            </motion.div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap gap-4">
          <div className="soft-card px-5 py-3 flex items-center gap-4 bg-white/60 backdrop-blur-md">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-foreground/40 leading-none mb-1 tracking-tighter">Culinary Wallet</p>
              <p className="text-lg font-black text-foreground">₹{walletBalance.toLocaleString()}</p>
            </div>
          </div>
          <Link href="/food-hub/nutrition"
            className="soft-button px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] text-secondary hover:text-secondary/80 flex items-center gap-2">
            <Leaf className="w-4 h-4" /> Nutrition
          </Link>
        </motion.div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">

          {/* 1. Weekly Menu */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="soft-card p-6 md:p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
              <Utensils className="w-40 h-40" />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Calendar className="w-4 h-4" /></span>
                  Weekly Menu
                </h2>
                <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest mt-1 ml-11">Live from Kitchen Dashboard</p>
              </div>
              <div className="flex gap-3">
                <button onClick={loadWeekMenu}
                  className="soft-button w-9 h-9 border-white text-foreground/40 hover:text-primary transition-colors"
                  title="Refresh menu">
                  <RefreshCw className={cn('w-4 h-4', menuLoading && 'animate-spin')} />
                </button>
                <button onClick={() => setShowTimings(!showTimings)}
                  className="soft-button px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/50 hover:text-primary transition-colors">
                  <Clock className="w-3.5 h-3.5 mr-2" /> Timings
                </button>
              </div>
            </div>

            {/* Timings */}
            <AnimatePresence>
              {showTimings && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-8">
                  <div className="grid grid-cols-3 gap-4 p-5 soft-well border border-white/60">
                    {Object.entries(MEAL_TIMINGS).map(([meal, time]) => (
                      <div key={meal} className="text-center">
                        <p className="text-[9px] font-black text-primary uppercase tracking-tighter mb-1">{meal}</p>
                        <p className="text-xs font-bold text-foreground">{time}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Day Selector */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-6 mb-8 snap-x">
              {DAYS.map(day => {
                const isToday = day === todayDayName;
                return (
                  <button key={day} onClick={() => setActiveDay(day)}
                    className={cn('flex-shrink-0 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border snap-center',
                      activeDay === day ? 'btn-terracotta border-primary shadow-xl scale-105' : 'soft-button border-white text-foreground/30 hover:text-foreground/60')}>
                    {day.slice(0, 3)}
                    {isToday && <div className="mt-1 w-5 h-1 bg-white/50 rounded-full mx-auto" />}
                  </button>
                );
              })}
            </div>

            {/* Menu Cards */}
            {menuLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MEALS.map(m => (
                  <div key={m} className="soft-well p-6 animate-pulse h-24 rounded-2xl bg-foreground/5" />
                ))}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={activeDay} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {MEALS.map(type => {
                    const { text } = activeDayMenu?.[type] ?? { text: '' };
                    return (
                      <motion.div whileHover={{ scale: 1.02 }} key={type}
                        className="soft-well p-6 border border-white flex flex-col gap-3 group/item">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center text-primary group-hover/item:bg-primary/10 transition-colors">
                            {type === 'Breakfast' ? <Coffee className="w-4 h-4" /> : type === 'Lunch' ? <Utensils className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
                          </div>
                          <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{type}</p>
                        </div>
                        <p className="text-base font-bold text-foreground leading-tight">
                          {text || <span className="text-foreground/30 italic text-sm">Not set</span>}
                        </p>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </motion.section>

          {/* 2. Pantry Inventory */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="soft-card p-6 md:p-10 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary"><Package className="w-4 h-4" /></span>
                  Pantry Inventory
                </h2>
                <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest mt-1 ml-11">Live · Alexa-connected</p>
              </div>
              <div className="flex gap-3">
                <div className="px-3 py-1.5 soft-well border border-white text-[9px] font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary" /> {pantry.filter(i => i.status === 'In Stock').length} In Stock
                </div>
                <div className="px-3 py-1.5 soft-well border border-white text-[9px] font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" /> {pantry.filter(i => i.status !== 'In Stock').length} Alert
                </div>
              </div>
            </div>

            {pantryLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => <div key={i} className="soft-well p-6 animate-pulse h-28 rounded-2xl bg-foreground/5" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {pantry.map((item, idx) => (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.04 }}
                    key={item.id} className="soft-well p-6 border border-white group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mb-1">{item.category}</p>
                        <h4 className="font-bold text-foreground text-base tracking-tight">{item.name}</h4>
                      </div>
                      <div className={cn('w-2.5 h-2.5 rounded-full shadow-sm mt-1',
                        item.status === 'In Stock' ? 'bg-secondary' : item.status === 'Low' ? 'bg-amber-400' : 'bg-red-400')} />
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-xs font-bold text-foreground/60">
                        {item.quantity && item.unit ? `${item.quantity} ${item.unit}` : item.quantity ?? '—'} left
                      </p>
                      <span className={cn('text-[9px] font-black uppercase px-2 py-1 rounded-lg',
                        item.status === 'In Stock' ? 'bg-secondary/10 text-secondary' :
                        item.status === 'Low' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-500')}>
                        {item.status}
                      </span>
                    </div>
                    {item.status !== 'In Stock' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-0 right-0 p-1">
                        <AlertCircle className="w-3 h-3 text-red-400/40" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">

          {/* 3. Supply Alerts (from pantry) */}
          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="soft-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Bell className="w-4 h-4" /></span>
              <h3 className="text-xl font-black uppercase tracking-tighter">Supply Alerts</h3>
              {reminders.length > 0 && (
                <span className="ml-auto text-[9px] font-black bg-red-400/10 text-red-500 border border-red-400/20 px-2 py-0.5 rounded-full uppercase">
                  {reminders.length} item{reminders.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {pantryLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 soft-well animate-pulse rounded-xl bg-foreground/5" />)}</div>
            ) : reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <CheckCircle2 className="w-10 h-10 text-secondary/30" />
                <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">All supplies in stock</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reminders.map((rem, idx) => (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                    key={rem.id} className="flex items-center justify-between p-4 soft-well border border-white group hover:bg-white/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner',
                        rem.status === 'Low' ? 'bg-amber-500/10' : 'bg-red-500/10')}>
                        <AlertCircle className={cn('w-5 h-5', rem.status === 'Low' ? 'text-amber-500' : 'text-red-500')} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground uppercase tracking-tight">{rem.name}</p>
                        <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-[0.1em]">
                          {rem.quantity && rem.unit ? `${rem.quantity} ${rem.unit}` : rem.quantity ?? '—'} · {rem.status}
                        </p>
                      </div>
                    </div>
                    <span className={cn('text-[9px] font-black px-2 py-1 rounded-full border',
                      rem.status === 'Low' ? 'bg-amber-500/10 text-amber-600 border-amber-400/20' : 'bg-red-500/10 text-red-500 border-red-400/20')}>
                      {rem.status === 'Low' ? 'Reorder' : 'Urgent'}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            <button className="mt-8 w-full py-4 btn-terracotta text-[10px] font-black uppercase tracking-[0.25em] shadow-xl">
              Automated Order Hub
            </button>
          </motion.section>

          {/* 4. Fiscal Hub */}
          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="soft-card p-6 md:p-8 relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary"><PieIcon className="w-4 h-4" /></span>
                <h3 className="text-xl font-black uppercase tracking-tighter">Fiscal Hub</h3>
              </div>
              <button onClick={() => { setEditingExpense(null); setNewExpense({ item: '', amount: '', category: 'Essentials' }); setShowAddExpense(true); }}
                className="w-8 h-8 rounded-lg soft-button border-white text-primary">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="h-64 w-full mb-8 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={8} dataKey="value" animationBegin={0} animationDuration={1500}>
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(242,238,230,0.9)', borderRadius: '16px', border: 'none', backdropFilter: 'blur(10px)' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-[10px] font-black uppercase text-foreground/30 tracking-widest leading-none mb-1">Unused</p>
                <p className="text-xl font-black text-secondary leading-none">₹{margin.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="soft-well p-4 border border-white">
                <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest mb-1 leading-none">Net Spent</p>
                <p className="text-xl font-black text-primary leading-none">₹{spent.toLocaleString()}</p>
              </div>
              <div className="soft-well p-4 border border-white">
                <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest mb-1 leading-none">Budget</p>
                <p className="text-xl font-black text-foreground leading-none">₹{(monthlyBudget / 1000).toFixed(0)}k</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">Live Transaction Feed</h4>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="max-h-60 overflow-y-auto no-scrollbar space-y-3 pr-1">
                {expenses.map((exp, idx) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    key={exp.id} className="group flex justify-between items-center p-4 soft-well bg-white/30 border border-white/60 hover:bg-white/50 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-foreground truncate uppercase">{exp.item}</p>
                      <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-tighter">{exp.category} · {exp.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-black text-primary">₹{exp.amount}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => editExpense(exp)} className="p-1.5 hover:text-secondary transition-colors"><Edit2 className="w-3 h-3" /></button>
                        <button onClick={() => deleteExpense(exp.id)} className="p-1.5 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      <AnimatePresence>
        {showAddExpense && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddExpense(false)} className="absolute inset-0 bg-black/10 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md soft-card p-8 md:p-10 space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter">
                  {editingExpense ? 'Modify' : 'Log'} <span className="text-primary italic">Record</span>
                </h3>
                <button onClick={() => setShowAddExpense(false)} className="w-10 h-10 rounded-xl soft-button border-white text-foreground/40 hover:text-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Description</label>
                  <input type="text" value={newExpense.item} onChange={e => setNewExpense({ ...newExpense, item: e.target.value })}
                    placeholder="e.g. Fresh Dairy Batch"
                    className="w-full p-4 soft-well bg-white/40 border border-white outline-none focus:ring-2 ring-primary/20 text-sm font-bold placeholder:text-foreground/20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Amount (₹)</label>
                    <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full p-4 soft-well bg-white/40 border border-white outline-none focus:ring-2 ring-primary/20 text-sm font-bold placeholder:text-foreground/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Category</label>
                    <div className="relative">
                      <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                        className="w-full p-4 soft-well bg-white/40 border border-white outline-none focus:ring-2 ring-primary/20 text-sm font-bold appearance-none cursor-pointer">
                        <option>Essentials</option><option>Fresh</option><option>Dairy</option><option>Utilities</option><option>Supplies</option><option>Beverages</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAddExpense(false)}
                  className="flex-1 py-4 soft-button border-white text-foreground/40 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white">Discard</button>
                <button onClick={handleAddOrUpdateExpense}
                  className="flex-[1.5] py-4 btn-terracotta text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
                  {editingExpense ? 'Update' : 'Commit Entry'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile floating nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden">
        <div className="soft-card px-6 py-3 flex gap-8 bg-white/80 backdrop-blur-lg border-white/60">
          <button className="text-primary"><Utensils className="w-5 h-5" /></button>
          <button className="text-foreground/40"><Package className="w-5 h-5" /></button>
          <button className="text-foreground/40"><Bell className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}
