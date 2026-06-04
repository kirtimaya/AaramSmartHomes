'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ChefHat, ShoppingCart, MessageSquare,
  Plus, Trash2, CheckCircle2, Loader2,
  Save, RefreshCw, UtensilsCrossed, Mic,
  AlertCircle, Package, Clock, Lightbulb, Edit3
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type MealBlock = 'Breakfast' | 'Lunch' | 'Dinner';
type Tab = 'menu' | 'log' | 'reorder' | 'suggestions';

interface MenuRow { id: string; notes: string | null; }
interface Dish    { id?: string; name: string; }
interface Ingredient { id?: string; name: string; quantity: string; unit: string; }

interface AlexaLog {
  id: string;
  session_id: string;
  intent: string;
  utterance: string | null;
  reply: string | null;
  meal_block: string | null;
  logged_at: string;
}

interface GroceryAlert {
  id: string;
  meal_block: string | null;
  raw_utterance: string;
  extracted_items: string[];
  logged_at: string;
  resolved_at: string | null;
}

interface FoodSuggestion {
  id: string;
  suggestion: string;
  source: 'alexa' | 'chat' | 'web';
  status: 'pending' | 'noted' | 'implemented';
  admin_note: string | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const UNITS = ['pieces', 'grams', 'kg', 'liters', 'ml', 'cups', 'tbsp', 'tsp', 'bunches', 'packets', 'as needed'];

function getISTDate() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const INTENT_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  'ArrivalIntent':         { label: 'Arrived for shift',       icon: ChefHat,         color: 'text-emerald-500' },
  'DepartureIntent':       { label: 'Leaving shift',           icon: UtensilsCrossed, color: 'text-amber-500'   },
  'MissingItemsIntent':    { label: 'Reported missing items',  icon: ShoppingCart,    color: 'text-red-400'     },
  'AMAZON.YesIntent':      { label: 'Confirmed all available', icon: CheckCircle2,    color: 'text-emerald-400' },
  'AMAZON.NoIntent':       { label: 'Some items missing',      icon: AlertCircle,     color: 'text-orange-400'  },
  'AMAZON.HelpIntent':     { label: 'Asked for help',          icon: MessageSquare,   color: 'text-blue-400'    },
  'AMAZON.StopIntent':     { label: 'Ended session',           icon: Mic,             color: 'text-foreground/30'},
  'AMAZON.CancelIntent':   { label: 'Cancelled',               icon: Mic,             color: 'text-foreground/30'},
};

const BLOCK_COLORS: Record<string, string> = {
  Breakfast: 'bg-amber-400/10 text-amber-600 border-amber-400/20',
  Lunch:     'bg-emerald-400/10 text-emerald-600 border-emerald-400/20',
  Dinner:    'bg-blue-400/10 text-blue-600 border-blue-400/20',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function BlockPill({ block }: { block: string | null }) {
  if (!block) return null;
  return (
    <span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest', BLOCK_COLORS[block] ?? 'bg-foreground/5 text-foreground/40 border-foreground/10')}>
      {block}
    </span>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center">
        <Icon className="w-7 h-7 text-foreground/20" />
      </div>
      <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">{text}</p>
    </div>
  );
}

// ── Tab 1: Menu Builder ───────────────────────────────────────────────────────

function MenuBuilderTab() {
  const [date, setDate]             = useState(getISTDate());
  const [block, setBlock]           = useState<MealBlock>('Breakfast');
  const [menuId, setMenuId]         = useState<string | null>(null);
  const [notes, setNotes]           = useState('');
  const [dishes, setDishes]         = useState<Dish[]>([{ name: '' }]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', quantity: '', unit: '' }]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadMenu = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('menus')
      .select('id, notes, menu_items(id, item_name, sort_order), menu_ingredients(id, ingredient_name, quantity, unit)')
      .eq('date', date)
      .eq('meal_block', block)
      .single();

    if (data) {
      setMenuId(data.id);
      setNotes(data.notes ?? '');
      const items = (data.menu_items as any[]) ?? [];
      setDishes(items.length
        ? items.sort((a: any, b: any) => a.sort_order - b.sort_order).map((i: any) => ({ id: i.id, name: i.item_name }))
        : [{ name: '' }]);
      const ings = (data.menu_ingredients as any[]) ?? [];
      setIngredients(ings.length
        ? ings.map((i: any) => ({ id: i.id, name: i.ingredient_name, quantity: i.quantity ?? '', unit: i.unit ?? '' }))
        : [{ name: '', quantity: '', unit: '' }]);
    } else {
      setMenuId(null);
      setNotes('');
      setDishes([{ name: '' }]);
      setIngredients([{ name: '', quantity: '', unit: '' }]);
    }
    setLoading(false);
  }, [date, block]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const saveMenu = async () => {
    const validDishes = dishes.filter(d => d.name.trim());
    const validIngredients = ingredients.filter(i => i.name.trim());
    if (!validDishes.length && !validIngredients.length) { showToast('Add at least one dish or ingredient.'); return; }

    setSaving(true);
    try {
      let id = menuId;

      if (!id) {
        const { data: newMenu, error } = await supabase
          .from('menus').insert({ date, meal_block: block, notes: notes || null }).select('id').single();
        if (error || !newMenu) throw error;
        id = newMenu.id;
        setMenuId(id);
      } else {
        await supabase.from('menus').update({ notes: notes || null }).eq('id', id);
      }

      await supabase.from('menu_items').delete().eq('menu_id', id);
      if (validDishes.length) {
        await supabase.from('menu_items').insert(
          validDishes.map((d, i) => ({ menu_id: id, item_name: d.name.trim(), sort_order: i }))
        );
      }

      await supabase.from('menu_ingredients').delete().eq('menu_id', id);
      if (validIngredients.length) {
        await supabase.from('menu_ingredients').insert(
          validIngredients.map(i => ({
            menu_id: id,
            ingredient_name: i.name.trim(),
            quantity: i.quantity.trim() || null,
            unit: i.unit || null,
          }))
        );
      }

      showToast('Menu saved!');
      loadMenu();
    } catch {
      showToast('Save failed. Please try again.');
    }
    setSaving(false);
  };

  const deleteMenu = async () => {
    if (!menuId || !confirm('Delete this menu and all its items?')) return;
    await supabase.from('menus').delete().eq('id', menuId);
    setMenuId(null); setNotes(''); setDishes([{ name: '' }]); setIngredients([{ name: '', quantity: '', unit: '' }]);
    showToast('Menu deleted.');
  };

  const updateDish = (i: number, val: string) => setDishes(p => { const n = [...p]; n[i] = { ...n[i], name: val }; return n; });
  const addDish = () => setDishes(p => [...p, { name: '' }]);
  const removeDish = (i: number) => setDishes(p => p.length === 1 ? [{ name: '' }] : p.filter((_, j) => j !== i));

  const updateIng = (i: number, field: keyof Ingredient, val: string) =>
    setIngredients(p => { const n = [...p]; n[i] = { ...n[i], [field]: val }; return n; });
  const addIng = () => setIngredients(p => [...p, { name: '', quantity: '', unit: '' }]);
  const removeIng = (i: number) => setIngredients(p => p.length === 1 ? [{ name: '', quantity: '', unit: '' }] : p.filter((_, j) => j !== i));

  return (
    <div className="space-y-6">
      {/* Date + Block selector */}
      <div className="soft-card p-6 border border-white bg-white/40">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="soft-ui-in px-4 py-2.5 text-sm font-bold focus:outline-none bg-white/70 border border-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">Meal</label>
            <div className="flex gap-1 bg-foreground/5 p-1 rounded-xl">
              {(['Breakfast', 'Lunch', 'Dinner'] as MealBlock[]).map(b => (
                <button
                  key={b}
                  onClick={() => setBlock(b)}
                  className={cn('px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                    block === b ? 'bg-white shadow-lg text-primary' : 'text-foreground/30 hover:text-foreground')}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-end gap-2">
            {menuId && (
              <button onClick={deleteMenu} className="soft-button px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 border border-white">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <div className={cn('px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border',
              menuId ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-foreground/5 text-foreground/40 border-foreground/10')}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : menuId ? '● Saved' : '○ New'}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dishes */}
          <div className="soft-card p-6 border border-white bg-white/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground/50 flex items-center gap-2">
                <UtensilsCrossed className="w-3.5 h-3.5 text-primary" /> Today's Dishes
              </h3>
              <button onClick={addDish} className="soft-button w-7 h-7 border border-white text-primary hover:bg-primary hover:text-white transition-all">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {dishes.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={d.name}
                    onChange={e => updateDish(i, e.target.value)}
                    placeholder={`Dish ${i + 1} (e.g. Dal Tadka)`}
                    className="soft-ui-in flex-1 px-4 py-3 text-sm focus:outline-none bg-white/70 border border-white"
                  />
                  <button onClick={() => removeDish(i)} className="soft-button w-9 h-9 border border-white text-foreground/20 hover:text-red-400 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {dishes.length === 0 && <p className="text-xs text-foreground/30 text-center py-4">No dishes yet.</p>}
          </div>

          {/* Ingredients */}
          <div className="soft-card p-6 border border-white bg-white/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground/50 flex items-center gap-2">
                <ShoppingCart className="w-3.5 h-3.5 text-primary" /> Required Ingredients
              </h3>
              <button onClick={addIng} className="soft-button w-7 h-7 border border-white text-primary hover:bg-primary hover:text-white transition-all">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={ing.name}
                    onChange={e => updateIng(i, 'name', e.target.value)}
                    placeholder="Ingredient"
                    className="soft-ui-in flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white/70 border border-white min-w-0"
                  />
                  <input
                    value={ing.quantity}
                    onChange={e => updateIng(i, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="soft-ui-in w-16 px-3 py-2.5 text-sm text-center focus:outline-none bg-white/70 border border-white shrink-0"
                  />
                  <select
                    value={ing.unit}
                    onChange={e => updateIng(i, 'unit', e.target.value)}
                    className="soft-ui-in w-24 px-2 py-2.5 text-xs focus:outline-none bg-white/70 border border-white shrink-0"
                  >
                    <option value="">unit</option>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button onClick={() => removeIng(i)} className="soft-button w-9 h-9 border border-white text-foreground/20 hover:text-red-400 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes + Save */}
      {!loading && (
        <div className="soft-card p-6 border border-white bg-white/40 space-y-4">
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes (dietary requirements, special instructions…)"
            className="soft-ui-in w-full px-4 py-3 text-sm focus:outline-none bg-white/70 border border-white"
          />
          <button
            onClick={saveMenu}
            disabled={saving}
            className="btn-terracotta w-full py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {menuId ? 'Update Menu' : 'Save Menu'}
          </button>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tab 2: Alexa Log ──────────────────────────────────────────────────────────

function AlexaLogTab() {
  const [logs, setLogs]       = useState<AlexaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'today' | 'week' | 'all'>('today');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('alexa_logs').select('*').order('logged_at', { ascending: false }).limit(200);
    const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    if (filter === 'today') {
      query = query.gte('logged_at', now.toISOString().slice(0, 10));
    } else if (filter === 'week') {
      const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query = query.gte('logged_at', week.toISOString());
    }
    const { data } = await query;
    setLogs(data ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Group by date
  const grouped = logs.reduce<Record<string, AlexaLog[]>>((acc, log) => {
    const day = formatDate(log.logged_at);
    if (!acc[day]) acc[day] = [];
    acc[day].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-foreground/5 p-1 rounded-xl">
          {(['today', 'week', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                filter === f ? 'bg-white shadow-lg text-primary' : 'text-foreground/30 hover:text-foreground')}>
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'All Time'}
            </button>
          ))}
        </div>
        <button onClick={fetchLogs} className="soft-button w-8 h-8 border border-white text-foreground/30 hover:text-primary">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : logs.length === 0 ? (
        <EmptyState icon={MessageSquare} text="No Alexa conversations yet. Seed a menu and say 'Alexa, open Aaram Kitchen'." />
      ) : (
        Object.entries(grouped).map(([day, entries]) => (
          <div key={day} className="space-y-2">
            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-1">{day}</p>
            {entries.map(log => {
              const meta = INTENT_META[log.intent] ?? { label: log.intent, icon: Mic, color: 'text-foreground/30' };
              const Icon = meta.icon;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="soft-card p-4 border border-white bg-white/40 flex items-start gap-4"
                >
                  <div className={cn('w-8 h-8 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0', meta.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{meta.label}</span>
                      {log.meal_block && <BlockPill block={log.meal_block} />}
                      <span className="text-[10px] text-foreground/20 font-bold ml-auto">{formatTime(log.logged_at)}</span>
                    </div>
                    {log.utterance && (
                      <p className="text-xs text-foreground/60 font-bold italic">"{log.utterance}"</p>
                    )}
                    {log.reply && (
                      <p className="text-[11px] text-foreground/40 font-medium leading-relaxed">{log.reply}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

// ── Tab 3: Reorder List ───────────────────────────────────────────────────────

function ReorderListTab() {
  const [alerts, setAlerts]   = useState<GroceryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'pending' | 'resolved' | 'all'>('pending');
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('grocery_alerts').select('*').order('logged_at', { ascending: false });
    if (filter === 'pending')  query = query.is('resolved_at', null);
    if (filter === 'resolved') query = query.not('resolved_at', 'is', null);
    const { data } = await query;
    setAlerts(data ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const markResolved = async (id: string) => {
    setResolving(id);
    await supabase.from('grocery_alerts').update({ resolved_at: new Date().toISOString(), resolved_by: 'admin' }).eq('id', id);
    setAlerts(p => p.filter(a => a.id !== id));
    setResolving(null);
  };

  // Stats
  const pending  = alerts.filter(a => !a.resolved_at);
  const allItems = pending.flatMap(a => a.extracted_items);
  const freq     = allItems.reduce<Record<string, number>>((acc, i) => { acc[i] = (acc[i] ?? 0) + 1; return acc; }, {});
  const topItems = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      {filter !== 'resolved' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="soft-card p-4 border border-white bg-white/40">
            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Pending Alerts</p>
            <p className="text-2xl font-black text-foreground mt-1">{pending.length}</p>
          </div>
          <div className="soft-card p-4 border border-white bg-white/40">
            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Unique Items</p>
            <p className="text-2xl font-black text-foreground mt-1">{Object.keys(freq).length}</p>
          </div>
          {topItems[0] && (
            <div className="soft-card p-4 border border-white bg-white/40 col-span-2">
              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-2">Most Requested</p>
              <div className="flex flex-wrap gap-1">
                {topItems.map(([item, count]) => (
                  <span key={item} className="px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black">
                    {item} ×{count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-foreground/5 p-1 rounded-xl">
          {(['pending', 'resolved', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                filter === f ? 'bg-white shadow-lg text-primary' : 'text-foreground/30 hover:text-foreground')}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={fetchAlerts} className="soft-button w-8 h-8 border border-white text-foreground/30 hover:text-primary">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : alerts.length === 0 ? (
        <EmptyState icon={Package} text={filter === 'pending' ? 'No pending items to order. Everything is stocked!' : 'No alerts found.'} />
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="soft-card p-5 border border-white bg-white/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Items chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {alert.extracted_items.map(item => (
                      <span key={item} className="px-3 py-1 rounded-full bg-red-400/10 text-red-600 border border-red-400/20 text-[11px] font-black uppercase tracking-wide">
                        {item}
                      </span>
                    ))}
                    {alert.extracted_items.length === 0 && (
                      <span className="text-xs text-foreground/30 italic">No items extracted</span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {alert.meal_block && <BlockPill block={alert.meal_block} />}
                    <span className="flex items-center gap-1 text-[10px] text-foreground/30 font-bold">
                      <Clock className="w-3 h-3" /> {timeAgo(alert.logged_at)}
                    </span>
                    {alert.resolved_at && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Ordered {formatDate(alert.resolved_at)}
                      </span>
                    )}
                  </div>

                  {/* Raw utterance */}
                  <p className="text-[11px] text-foreground/40 italic">"{alert.raw_utterance}"</p>
                </div>

                {/* Action */}
                {!alert.resolved_at && (
                  <button
                    onClick={() => markResolved(alert.id)}
                    disabled={resolving === alert.id}
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
                  >
                    {resolving === alert.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Mark Ordered
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Food Suggestions ───────────────────────────────────────────────────

const STATUS_META = {
  pending:     { label: 'Pending',     color: 'bg-amber-400/10 text-amber-600 border-amber-400/20'   },
  noted:       { label: 'Noted',       color: 'bg-blue-400/10 text-blue-600 border-blue-400/20'      },
  implemented: { label: 'Implemented', color: 'bg-emerald-400/10 text-emerald-600 border-emerald-400/20' },
};

const SOURCE_META = {
  alexa: { label: 'Alexa', color: 'text-primary'         },
  chat:  { label: 'Chat',  color: 'text-emerald-600'     },
  web:   { label: 'Web',   color: 'text-foreground/40'   },
};

function SuggestionsTab() {
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<'pending' | 'noted' | 'implemented' | 'all'>('pending');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText]       = useState('');
  const [saving, setSaving]           = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('food_suggestions').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    setSuggestions(data ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  const updateStatus = async (id: string, status: FoodSuggestion['status']) => {
    await supabase.from('food_suggestions').update({ status }).eq('id', id);
    setSuggestions(p => p.map(s => s.id === id ? { ...s, status } : s));
  };

  const saveNote = async (id: string) => {
    setSaving(true);
    await supabase.from('food_suggestions').update({ admin_note: noteText.trim() || null }).eq('id', id);
    setSuggestions(p => p.map(s => s.id === id ? { ...s, admin_note: noteText.trim() || null } : s));
    setEditingNote(null);
    setSaving(false);
  };

  const counts = {
    pending:     suggestions.filter(s => s.status === 'pending').length,
    noted:       suggestions.filter(s => s.status === 'noted').length,
    implemented: suggestions.filter(s => s.status === 'implemented').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(['pending', 'noted', 'implemented'] as const).map(s => (
          <div key={s} className="soft-card p-4 border border-white bg-white/40">
            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest capitalize">{s}</p>
            <p className="text-2xl font-black text-foreground mt-1">{counts[s]}</p>
          </div>
        ))}
      </div>

      {/* Filter + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-foreground/5 p-1 rounded-xl">
          {(['pending', 'noted', 'implemented', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                filter === f ? 'bg-white shadow-lg text-primary' : 'text-foreground/30 hover:text-foreground')}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={fetchSuggestions} className="soft-button w-8 h-8 border border-white text-foreground/30 hover:text-primary">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : suggestions.length === 0 ? (
        <EmptyState icon={Lightbulb} text="No suggestions yet. Tenants can give feedback via Alexa or the Aara chatbot." />
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => {
            const meta   = STATUS_META[s.status];
            const source = SOURCE_META[s.source] ?? SOURCE_META.web;
            return (
              <motion.div key={s.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="soft-card p-5 border border-white bg-white/40 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground leading-relaxed">"{s.suggestion}"</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className={cn('text-[10px] font-black uppercase tracking-widest', source.color)}>
                        via {source.label}
                      </span>
                      <span className="text-[10px] text-foreground/30 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(s.created_at)}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest', meta.color)}>
                        {meta.label}
                      </span>
                    </div>
                    {s.admin_note && (
                      <p className="mt-2 text-xs text-foreground/50 italic bg-foreground/5 px-3 py-2 rounded-xl border border-foreground/10">
                        Note: {s.admin_note}
                      </p>
                    )}
                  </div>

                  {/* Status actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {s.status !== 'noted' && (
                      <button onClick={() => updateStatus(s.id, 'noted')}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-400/20 text-[10px] font-black uppercase tracking-wide hover:bg-blue-500/20 transition-all">
                        Mark Noted
                      </button>
                    )}
                    {s.status !== 'implemented' && (
                      <button onClick={() => updateStatus(s.id, 'implemented')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-400/20 text-[10px] font-black uppercase tracking-wide hover:bg-emerald-500/20 transition-all">
                        Mark Done
                      </button>
                    )}
                    <button onClick={() => { setEditingNote(s.id); setNoteText(s.admin_note ?? ''); }}
                      className="px-3 py-1.5 rounded-lg soft-button border border-white text-foreground/40 text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                      <Edit3 className="w-3 h-3" /> Note
                    </button>
                  </div>
                </div>

                {/* Inline note editor */}
                {editingNote === s.id && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 pt-1">
                    <input
                      autoFocus
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add an internal note for this suggestion…"
                      className="soft-ui-in flex-1 px-4 py-2.5 text-xs focus:outline-none bg-white/70 border border-white"
                    />
                    <button onClick={() => saveNote(s.id)} disabled={saving}
                      className="btn-terracotta px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </button>
                    <button onClick={() => setEditingNote(null)}
                      className="soft-button px-3 py-2 border border-white text-foreground/30 text-[10px] font-black">
                      ✕
                    </button>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function KitchenPage() {
  const [tab, setTab] = useState<Tab>('menu');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'menu',        label: 'Menu Builder',  icon: ChefHat       },
    { id: 'log',         label: 'Alexa Log',     icon: MessageSquare },
    { id: 'reorder',     label: 'Reorder List',  icon: ShoppingCart  },
    { id: 'suggestions', label: 'Suggestions',   icon: Lightbulb     },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">Kitchen Hub</h1>
            <p className="text-xs text-foreground/40 font-bold uppercase tracking-widest mt-1">
              Manage menus · Alexa conversations · Inventory alerts
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <ChefHat className="w-6 h-6" />
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 bg-foreground/5 p-1.5 rounded-2xl w-fit">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
                  tab === t.id ? 'bg-white shadow-lg text-primary scale-[1.02]' : 'text-foreground/30 hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'menu'        && <MenuBuilderTab />}
            {tab === 'log'         && <AlexaLogTab />}
            {tab === 'reorder'     && <ReorderListTab />}
            {tab === 'suggestions' && <SuggestionsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
