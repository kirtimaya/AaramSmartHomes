'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { apiGet, apiPut, apiPost, apiPatch, apiDelete } from '@/lib/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ChefHat, ShoppingCart, MessageSquare,
  Plus, Trash2, CheckCircle2, Loader2,
  Save, RefreshCw, UtensilsCrossed, Mic,
  AlertCircle, Package, Clock, Lightbulb, Edit3,
  Users, Shield, Send, Bot, RotateCcw, ChevronDown,
  Flame, Check
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type MealBlock = 'Breakfast' | 'Lunch' | 'Dinner';
type Tab = 'weekly' | 'menu' | 'log' | 'tester' | 'reorder' | 'suggestions' | 'pantry' | 'dishes';
type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

// ── Spring API response shapes (apps/api AdminMenuController etc.) ─────────────

interface ApiMenuItem { id: string; itemName: string; sortOrder: number; }
interface ApiMenuIngredient { id: string; ingredientName: string; quantity: string | null; unit: string | null; notes: string | null; }
interface ApiMenu {
  id: string; date: string; mealBlock: MealBlock; notes: string | null;
  items: ApiMenuItem[]; ingredients: ApiMenuIngredient[]; createdAt: string | null;
}
interface ApiGroceryAlert {
  id: string; menuId: string | null; mealBlock: string | null; rawUtterance: string;
  extractedItems: string[]; loggedAt: string; resolvedAt: string | null; resolvedBy: string | null;
}
interface ApiFoodSuggestion {
  id: string; suggestion: string; source: 'alexa' | 'chat' | 'web'; tenantId: string | null;
  status: 'pending' | 'noted' | 'implemented'; adminNote: string | null; createdAt: string;
}
interface ApiPantryItem {
  id: string; name: string; category: string; quantity: string | null; unit: string | null;
  status: 'In Stock' | 'Low' | 'Out of Stock'; minThreshold: string | null; minThresholdUnit: string | null;
  lastUpdatedAt: string | null;
}

const DAYS: DayName[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS: MealBlock[] = ['Breakfast', 'Lunch', 'Dinner'];

// Default weekly template — pre-populated from house menu
const DEFAULT_WEEKLY: Record<DayName, Record<MealBlock, string>> = {
  Monday:    { Breakfast: 'Poha + Sev',       Lunch: 'Rice + Roti + Toor Dal + Mix Veg Fry',             Dinner: 'Paratha + Chole' },
  Tuesday:   { Breakfast: 'Idly + Sambar',    Lunch: 'Rice + Roti + Rajma + Bhindi Fry',                Dinner: 'Roti + Palak Paneer' },
  Wednesday: { Breakfast: 'Aloo Paratha',     Lunch: 'Fried Rice / Lemon Rice + Roti + Moong Dal + Aloo Fry', Dinner: 'Roti + Mix Dal Tadka / Egg Tadka' },
  Thursday:  { Breakfast: 'Dosa + Chutney',   Lunch: 'Rice + Roti + Chole + Beetroot Fry',              Dinner: 'Dal Khichdi + Sev' },
  Friday:    { Breakfast: 'Upma',             Lunch: 'Jeera Rice + Roti + Dal Fry + Matar Paneer',      Dinner: 'Roti + Soyachunks Curry / Chicken Curry' },
  Saturday:  { Breakfast: 'Poori + Aloo Sabji', Lunch: 'Mix Veg Pulao + Raita',                          Dinner: 'Roti + Chilly Mushroom' },
  Sunday:    { Breakfast: '',                 Lunch: '',                                                 Dinner: '' },
};

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

interface TesterMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
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
  'ArrivalIntent':            { label: 'Arrived for shift',         icon: ChefHat,         color: 'text-emerald-500' },
  'DepartureIntent':          { label: 'Leaving shift',             icon: UtensilsCrossed, color: 'text-amber-500'   },
  'MorningBriefingIntent':    { label: 'Morning briefing (B+L)',    icon: ChefHat,         color: 'text-amber-500'   },
  'DinnerBriefingIntent':     { label: 'Dinner briefing',           icon: UtensilsCrossed, color: 'text-blue-500'    },
  'TomorrowBriefingIntent':   { label: "Tomorrow's briefing",       icon: ChefHat,         color: 'text-purple-500'  },
  'WaitIntent':               { label: 'Cook checking pantry…',     icon: Loader2,         color: 'text-foreground/40'},
  'ReplaceMenuItemIntent':    { label: 'Menu item replaced',        icon: Edit3,           color: 'text-orange-500'  },
  'AdminModeIntent':          { label: 'Admin mode activated',      icon: Shield,          color: 'text-primary'     },
  'AdminBriefingIntent':      { label: 'Admin full briefing',       icon: ChefHat,         color: 'text-primary'     },
  'SupplyCheckIntent':        { label: 'Supply check',              icon: Package,         color: 'text-secondary'   },
  'CreateGroceryAlertIntent': { label: 'Admin grocery alert',       icon: ShoppingCart,    color: 'text-red-400'     },
  'MissingItemsIntent':       { label: 'Reported missing items',    icon: ShoppingCart,    color: 'text-red-400'     },
  'QueryMenuIntent':          { label: 'Menu query',                icon: MessageSquare,   color: 'text-blue-400'    },
  'FoodSuggestionIntent':     { label: 'Food suggestion',           icon: Lightbulb,       color: 'text-yellow-500'  },
  'AMAZON.YesIntent':         { label: 'Confirmed all available',   icon: CheckCircle2,    color: 'text-emerald-400' },
  'AMAZON.NoIntent':          { label: 'Some items missing',        icon: AlertCircle,     color: 'text-orange-400'  },
  'AMAZON.HelpIntent':        { label: 'Asked for help',            icon: MessageSquare,   color: 'text-blue-400'    },
  'AMAZON.StopIntent':        { label: 'Ended session',             icon: Mic,             color: 'text-foreground/30'},
  'AMAZON.CancelIntent':      { label: 'Cancelled',                 icon: Mic,             color: 'text-foreground/30'},
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

// ── Meal Count Fetcher ────────────────────────────────────────────────────────

async function getMealCount(date: string, block: MealBlock): Promise<number | null> {
  const blockCol =
    block === 'Breakfast' ? 'meal_breakfast' :
    block === 'Lunch'     ? 'meal_lunch'     : 'meal_dinner';

  const { data: prefs } = await supabase
    .from('tenant_meal_preferences')
    .select('tenant_id')
    .eq(blockCol, true);

  if (!prefs?.length) return null;
  const subscribedIds = prefs.map((p: { tenant_id: string }) => p.tenant_id);

  const { data: active } = await supabase
    .from('tenants')
    .select('id')
    .eq('status', 'active')
    .in('id', subscribedIds);

  if (!active?.length) return null;
  const activeIds = active.map((t: { id: string }) => t.id);

  const { count: skips } = await supabase
    .from('meal_skip_requests')
    .select('id', { count: 'exact', head: true })
    .eq('skip_date', date)
    .eq('meal_block', block)
    .in('tenant_id', activeIds);

  return Math.max(0, activeIds.length - (skips ?? 0));
}

// ── Tab 0: Weekly Menu ────────────────────────────────────────────────────────

function getWeekStart(offset = 0): string {
  // Returns the Monday of the week (offset weeks from now), in IST
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const day = ist.getUTCDay(); // 0=Sun, 1=Mon …
  const monday = new Date(ist);
  monday.setUTCDate(ist.getUTCDate() - ((day + 6) % 7) + offset * 7);
  return monday.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const MEAL_COLORS: Record<MealBlock, string> = {
  Breakfast: 'text-amber-600',
  Lunch:     'text-emerald-600',
  Dinner:    'text-blue-600',
};

function WeeklyMenuTab() {
  const [weekOffset, setWeekOffset]   = useState(0);
  const [grid, setGrid]               = useState<Record<DayName, Record<MealBlock, string>>>(
    JSON.parse(JSON.stringify(DEFAULT_WEEKLY))
  );
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<string | null>(null);
  // Tracks which (date, meal) cells already have a saved menu, so saveWeek knows to clear
  // (rather than skip) a cell the admin has emptied out — apiGet/apiPut only, no direct Supabase.
  const existingMenuDaysRef = useRef<Set<string>>(new Set());

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const weekStart = getWeekStart(weekOffset);

  // Load saved menus for this week
  const loadWeek = useCallback(async () => {
    setLoading(true);
    const dates = DAYS.map((_, i) => addDays(weekStart, i));
    try {
      const data = await apiGet<ApiMenu[]>(`/api/admin/menus?from=${dates[0]}&to=${dates[dates.length - 1]}`);
      existingMenuDaysRef.current = new Set(data.map(row => `${row.date}|${row.mealBlock}`));

      if (data.length) {
        const fresh: Record<DayName, Record<MealBlock, string>> = JSON.parse(JSON.stringify(DEFAULT_WEEKLY));
        for (const row of data) {
          const dayIdx = dates.indexOf(row.date);
          if (dayIdx < 0) continue;
          const dayName = DAYS[dayIdx];
          const block = row.mealBlock;
          if (!MEALS.includes(block)) continue;
          const text = row.items.length
            ? row.items.slice().sort((a, b) => a.sortOrder - b.sortOrder).map(i => i.itemName).join(' + ')
            : (row.notes ?? '');
          fresh[dayName][block] = text;
        }
        setGrid(fresh);
      } else {
        // No saved data for this week — show default template
        setGrid(JSON.parse(JSON.stringify(DEFAULT_WEEKLY)));
      }
    } catch {
      existingMenuDaysRef.current = new Set();
      setGrid(JSON.parse(JSON.stringify(DEFAULT_WEEKLY)));
    }
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  const updateCell = (day: DayName, meal: MealBlock, val: string) =>
    setGrid(prev => ({ ...prev, [day]: { ...prev[day], [meal]: val } }));

  const saveWeek = async () => {
    setSaving(true);
    try {
      const dates = DAYS.map((_, i) => addDays(weekStart, i));

      for (let d = 0; d < DAYS.length; d++) {
        const dayName = DAYS[d];
        const date = dates[d];
        for (const meal of MEALS) {
          const text = grid[dayName][meal].trim();
          const hadExisting = existingMenuDaysRef.current.has(`${date}|${meal}`);
          if (!text && !hadExisting) continue; // nothing to save, nothing to clear

          const items = text ? text.split(/\s*[+,]\s*/).map(s => s.trim()).filter(Boolean) : [];
          // ingredients intentionally omitted — this grid never edits them, and the day
          // builder's ingredients for the same meal must survive a weekly-grid save.
          await apiPut('/api/admin/menus', {
            date,
            mealBlock: meal,
            notes: text || null,
            items: items.map((name, i) => ({ itemName: name, sortOrder: i })),
          });
        }
      }

      showToast('Week saved!');
      loadWeek();
    } catch {
      showToast('Save failed. Please try again.');
    }
    setSaving(false);
  };

  const weekEnd = addDays(weekStart, 6);
  const fmtDate = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div className="space-y-6">
      {/* Week navigator */}
      <div className="soft-card p-5 border border-white bg-white/40 flex items-center justify-between gap-4">
        <button onClick={() => setWeekOffset(v => v - 1)}
          className="soft-button w-9 h-9 border border-white text-foreground/40 hover:text-primary text-lg font-black">‹</button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Week of</p>
          <p className="font-black text-foreground">{fmtDate(weekStart)} — {fmtDate(weekEnd)}</p>
        </div>
        <button onClick={() => setWeekOffset(v => v + 1)}
          className="soft-button w-9 h-9 border border-white text-foreground/40 hover:text-primary text-lg font-black">›</button>
        <button onClick={() => setWeekOffset(0)}
          className="soft-button px-4 py-2 border border-white text-[10px] font-black uppercase tracking-widest text-foreground/30 hover:text-primary ml-2">
          This Week
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : (
        <>
          {/* Grid — desktop: 4 columns (day + 3 meals), mobile: stacked cards */}
          <div className="hidden lg:grid grid-cols-[140px_1fr_1fr_1fr] gap-3">
            {/* Header row */}
            <div />
            {MEALS.map(m => (
              <div key={m} className={cn('text-[10px] font-black uppercase tracking-widest text-center py-2', MEAL_COLORS[m])}>
                {m}
              </div>
            ))}
            {/* Data rows */}
            {DAYS.map((day, di) => (
              <React.Fragment key={day}>
                <div className="flex flex-col justify-center py-1">
                  <p className="text-[11px] font-black text-foreground uppercase tracking-widest">{day}</p>
                  <p className="text-[9px] text-foreground/30 font-bold">{fmtDate(addDays(weekStart, di))}</p>
                </div>
                {MEALS.map(meal => (
                  <textarea
                    key={meal}
                    value={grid[day][meal]}
                    onChange={e => updateCell(day, meal, e.target.value)}
                    placeholder={day === 'Sunday' ? 'Rest day' : `${meal} items…`}
                    rows={2}
                    className="soft-ui-in w-full px-3 py-2.5 text-[12px] resize-none focus:outline-none bg-white/70 border border-white leading-relaxed"
                  />
                ))}
              </React.Fragment>
            ))}
          </div>

          {/* Mobile: stacked cards per day */}
          <div className="lg:hidden space-y-4">
            {DAYS.map((day, di) => (
              <div key={day} className="soft-card p-4 border border-white bg-white/40 space-y-3">
                <p className="text-[11px] font-black text-foreground uppercase tracking-widest">
                  {day} <span className="text-foreground/30 normal-case font-bold tracking-normal">— {fmtDate(addDays(weekStart, di))}</span>
                </p>
                {MEALS.map(meal => (
                  <div key={meal} className="space-y-1">
                    <label className={cn('text-[9px] font-black uppercase tracking-widest', MEAL_COLORS[meal])}>{meal}</label>
                    <textarea
                      value={grid[day][meal]}
                      onChange={e => updateCell(day, meal, e.target.value)}
                      placeholder={day === 'Sunday' ? 'Rest day' : `${meal} items…`}
                      rows={2}
                      className="soft-ui-in w-full px-3 py-2.5 text-[12px] resize-none focus:outline-none bg-white/70 border border-white leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <button onClick={saveWeek} disabled={saving}
            className="btn-terracotta w-full py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Full Week'}
          </button>
        </>
      )}

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
  const [mealCount, setMealCount]   = useState<number | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadMenu = useCallback(async () => {
    setLoading(true);
    const [menus, count] = await Promise.all([
      apiGet<ApiMenu[]>(`/api/admin/menus?from=${date}&to=${date}`).catch(() => [] as ApiMenu[]),
      getMealCount(date, block),
    ]);

    setMealCount(count);

    const data = menus.find(m => m.mealBlock === block);
    if (data) {
      setMenuId(data.id);
      setNotes(data.notes ?? '');
      setDishes(data.items.length
        ? data.items.slice().sort((a, b) => a.sortOrder - b.sortOrder).map(i => ({ id: i.id, name: i.itemName }))
        : [{ name: '' }]);
      setIngredients(data.ingredients.length
        ? data.ingredients.map(i => ({ id: i.id, name: i.ingredientName, quantity: i.quantity ?? '', unit: i.unit ?? '' }))
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
      // Single upsert — Spring replaces items/ingredients wholesale server-side, since this
      // tab (unlike the weekly grid) always manages both collections together.
      const saved = await apiPut<ApiMenu>('/api/admin/menus', {
        date,
        mealBlock: block,
        notes: notes || null,
        items: validDishes.map((d, i) => ({ itemName: d.name.trim(), sortOrder: i })),
        ingredients: validIngredients.map(i => ({
          ingredientName: i.name.trim(),
          quantity: i.quantity.trim() || null,
          unit: i.unit || null,
        })),
      });
      setMenuId(saved.id);

      showToast('Menu saved!');
      loadMenu();
    } catch {
      showToast('Save failed. Please try again.');
    }
    setSaving(false);
  };

  const deleteMenu = async () => {
    if (!menuId || !confirm('Delete this menu and all its items?')) return;
    try {
      await apiDelete(`/api/admin/menus/${menuId}`);
      setMenuId(null); setNotes(''); setDishes([{ name: '' }]); setIngredients([{ name: '', quantity: '', unit: '' }]);
      showToast('Menu deleted.');
    } catch {
      showToast('Delete failed. Please try again.');
    }
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
            {/* Meal count badge */}
            {mealCount !== null && (
              <div className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                {mealCount} {mealCount === 1 ? 'person' : 'people'}
              </div>
            )}
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

// ── WhatsApp Cook Sessions (within the Cook Log tab, alongside Alexa logs) ─────

interface CookSession { id: string; phoneE164: string; state: string; active: boolean; createdAt: string; updatedAt: string; }
interface CookSessionMessage { id: string; direction: 'inbound' | 'outbound'; text: string; createdAt: string; }

function WhatsAppCookSessionsSection() {
  const [sessions, setSessions] = useState<CookSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<CookSessionMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setSessions(await apiGet<CookSession[]>('/api/admin/cook-sessions'));
      } catch {
        setSessions([]);
      }
      setLoading(false);
    })();
  }, []);

  const toggle = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    setLoadingMessages(true);
    try {
      setMessages(await apiGet<CookSessionMessage[]>(`/api/admin/cook-sessions/${id}/messages`));
    } catch {
      setMessages([]);
    }
    setLoadingMessages(false);
  };

  if (loading || sessions.length === 0) return null;

  return (
    <div className="soft-card border border-white bg-white/40 p-4 space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
        <Bot className="w-3.5 h-3.5 text-primary" /> WhatsApp Cook Sessions
      </p>
      {sessions.map(s => (
        <div key={s.id} className="soft-well border border-white overflow-hidden">
          <button onClick={() => toggle(s.id)} className="w-full p-3 flex items-center justify-between text-left hover:bg-foreground/5 transition-all">
            <div className="flex items-center gap-3">
              <span className={cn('w-2 h-2 rounded-full', s.active ? 'bg-amber-400' : 'bg-emerald-400')} />
              <span className="text-xs font-bold text-foreground">{s.phoneE164}</span>
              <span className="text-[9px] text-foreground/30 uppercase tracking-widest">{s.state}</span>
            </div>
            <span className="text-[10px] text-foreground/30 font-bold">{formatDate(s.updatedAt)} {formatTime(s.updatedAt)}</span>
          </button>
          {expanded === s.id && (
            <div className="border-t border-foreground/5 px-3 pb-3 pt-2 space-y-1.5">
              {loadingMessages ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin mx-auto" />
              ) : messages.length === 0 ? (
                <p className="text-[10px] text-foreground/30 text-center py-2">No transcript.</p>
              ) : (
                messages.map(m => (
                  <div key={m.id} className={cn('flex', m.direction === 'inbound' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[80%] px-3 py-2 rounded-2xl text-xs font-medium',
                      m.direction === 'inbound' ? 'bg-primary/10 text-primary rounded-br-sm' : 'bg-white border border-foreground/5 text-foreground/70 rounded-bl-sm')}>
                      {m.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Tab 2: Alexa Log ──────────────────────────────────────────────────────────

function AlexaLogTab() {
  const [logs, setLogs]                       = useState<AlexaLog[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [filter, setFilter]                   = useState<'today' | 'week' | 'all'>('today');
  const [viewMode, setViewMode]               = useState<'sessions' | 'events'>('sessions');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    const channel = supabase
      .channel('kitchen-alexa-logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alexa_logs' }, (payload) => {
        const newLog = payload.new as AlexaLog;
        setLogs(prev => prev.some(l => l.id === newLog.id) ? prev : [newLog, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleSession = (sid: string) => setExpandedSessions(prev => {
    const next = new Set(prev);
    next.has(sid) ? next.delete(sid) : next.add(sid);
    return next;
  });

  // Events view: group by date
  const grouped = logs.reduce<Record<string, AlexaLog[]>>((acc, log) => {
    const day = formatDate(log.logged_at);
    if (!acc[day]) acc[day] = [];
    acc[day].push(log);
    return acc;
  }, {});

  // Sessions view: group by session_id, most recent first
  const sessionMap = logs.reduce<Record<string, AlexaLog[]>>((acc, log) => {
    if (!acc[log.session_id]) acc[log.session_id] = [];
    acc[log.session_id].push(log);
    return acc;
  }, {});
  const sortedSessions = Object.entries(sessionMap).sort(([, a], [, b]) => {
    const latestA = a.reduce((m, l) => Math.max(m, new Date(l.logged_at).getTime()), 0);
    const latestB = b.reduce((m, l) => Math.max(m, new Date(l.logged_at).getTime()), 0);
    return latestB - latestA;
  });

  return (
    <div className="space-y-4">
      <WhatsAppCookSessionsSection />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-foreground/5 p-1 rounded-xl">
          {(['today', 'week', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                filter === f ? 'bg-white shadow-lg text-primary' : 'text-foreground/30 hover:text-foreground')}>
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'All Time'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-foreground/5 p-1 rounded-xl">
            {(['sessions', 'events'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={cn('px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                  viewMode === v ? 'bg-white shadow-lg text-primary' : 'text-foreground/30 hover:text-foreground')}>
                {v === 'sessions' ? 'Conversations' : 'Events'}
              </button>
            ))}
          </div>
          <button onClick={fetchLogs} className="soft-button w-8 h-8 border border-white text-foreground/30 hover:text-primary">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : logs.length === 0 ? (
        <EmptyState icon={MessageSquare} text="No Alexa conversations yet. Seed a menu and say 'Alexa, open Aaram Kitchen'." />
      ) : viewMode === 'events' ? (
        // ── Events view (flat log) ──
        <>
          {Object.entries(grouped).map(([day, entries]) => (
            <div key={day} className="space-y-2">
              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-1">{day}</p>
              {entries.map(log => {
                const meta = INTENT_META[log.intent] ?? { label: log.intent, icon: Mic, color: 'text-foreground/30' };
                const Icon = meta.icon;
                return (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="soft-card p-4 border border-white bg-white/40 flex items-start gap-4">
                    <div className={cn('w-8 h-8 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0', meta.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{meta.label}</span>
                        {log.meal_block && <BlockPill block={log.meal_block} />}
                        <span className="text-[10px] text-foreground/20 font-bold ml-auto">{formatTime(log.logged_at)}</span>
                      </div>
                      {log.utterance && <p className="text-xs text-foreground/60 font-bold italic">"{log.utterance}"</p>}
                      {log.reply && <p className="text-[11px] text-foreground/40 font-medium leading-relaxed">{log.reply}</p>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </>
      ) : (
        // ── Sessions / Conversations view ──
        <div className="space-y-3">
          {sortedSessions.map(([sid, turns]) => {
            const sorted    = turns.slice().sort((a, b) => a.logged_at.localeCompare(b.logged_at));
            const first     = sorted[0];
            const convCount = turns.filter(l => l.utterance).length;
            const isExpanded      = expandedSessions.has(sid);
            const isTestSession   = sid.startsWith('test-session-');
            const shortId         = sid.length > 24 ? `…${sid.slice(-12)}` : sid;

            return (
              <div key={sid} className="soft-card border border-white bg-white/40 overflow-hidden">
                {/* Session header — click to expand */}
                <button onClick={() => toggleSession(sid)}
                  className="w-full p-4 flex items-center justify-between gap-4 hover:bg-foreground/5 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center',
                      isTestSession ? 'bg-blue-400/10' : 'bg-primary/10')}>
                      <Mic className={cn('w-4 h-4', isTestSession ? 'text-blue-500' : 'text-primary')} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                        {convCount} turn{convCount !== 1 ? 's' : ''}
                        {isTestSession && (
                          <span className="text-[9px] bg-blue-400/10 text-blue-500 px-1.5 py-0.5 rounded-full uppercase tracking-widest font-black">
                            Web Test
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-foreground/30 font-mono">{shortId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-foreground/40 font-bold">{formatDate(first.logged_at)}</p>
                      <p className="text-[10px] text-foreground/20 font-bold">{formatTime(first.logged_at)}</p>
                    </div>
                    <ChevronDown className={cn('w-4 h-4 text-foreground/30 transition-transform duration-200', isExpanded && 'rotate-180')} />
                  </div>
                </button>

                {/* Chat thread */}
                {isExpanded && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="border-t border-foreground/5 px-4 pb-4 pt-3 space-y-2"
                    >
                      {sorted.map(log => (
                        <div key={log.id} className="space-y-1.5">
                          {/* Centred pill for pure-event entries (no utterance or reply) */}
                          {!log.utterance && !log.reply && (
                            <div className="flex justify-center py-0.5">
                              <span className="text-[9px] text-foreground/30 font-black uppercase tracking-widest bg-foreground/5 px-3 py-1 rounded-full">
                                {INTENT_META[log.intent]?.label ?? log.intent}
                              </span>
                            </div>
                          )}
                          {/* User utterance */}
                          {log.utterance && (
                            <div className="flex justify-end">
                              <div className="max-w-[80%] bg-primary/10 text-primary px-3 py-2 rounded-2xl rounded-br-sm text-xs font-medium">
                                {log.utterance}
                              </div>
                            </div>
                          )}
                          {/* AI reply */}
                          {log.reply && (
                            <div className="flex justify-start">
                              <div className="max-w-[80%] bg-white border border-foreground/5 text-foreground/70 px-3 py-2 rounded-2xl rounded-bl-sm text-xs font-medium shadow-sm">
                                {log.reply}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            );
          })}
        </div>
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
    try {
      const resolvedParam = filter === 'pending' ? 'false' : filter === 'resolved' ? 'true' : null;
      const data = await apiGet<ApiGroceryAlert[]>(
        `/api/admin/grocery-alerts${resolvedParam !== null ? `?resolved=${resolvedParam}` : ''}`);
      setAlerts(data.map(a => ({
        id: a.id,
        meal_block: a.mealBlock,
        raw_utterance: a.rawUtterance,
        extracted_items: a.extractedItems,
        logged_at: a.loggedAt,
        resolved_at: a.resolvedAt,
      })));
    } catch {
      setAlerts([]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // Realtime: new grocery alerts from Alexa appear live
  useEffect(() => {
    const channel = supabase
      .channel('kitchen-grocery-alerts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'grocery_alerts' }, (payload) => {
        const newAlert = payload.new as GroceryAlert;
        setAlerts(prev => {
          if (prev.some(a => a.id === newAlert.id)) return prev;
          return [newAlert, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const markResolved = async (id: string) => {
    setResolving(id);
    try {
      // resolved_by is set server-side from the authenticated admin's email.
      await apiPost(`/api/admin/grocery-alerts/${id}/resolve`);
      setAlerts(p => p.filter(a => a.id !== id));
    } catch {
      // leave the alert in the list so the admin can retry
    }
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
    try {
      const data = await apiGet<ApiFoodSuggestion[]>(
        `/api/admin/food-suggestions${filter !== 'all' ? `?status=${filter}` : ''}`);
      setSuggestions(data.map(s => ({
        id: s.id, suggestion: s.suggestion, source: s.source, status: s.status,
        admin_note: s.adminNote, created_at: s.createdAt,
      })));
    } catch {
      setSuggestions([]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  const updateStatus = async (id: string, status: FoodSuggestion['status']) => {
    try {
      await apiPatch(`/api/admin/food-suggestions/${id}`, { status });
      setSuggestions(p => p.map(s => s.id === id ? { ...s, status } : s));
    } catch {
      // leave prior status displayed; admin can retry
    }
  };

  const saveNote = async (id: string) => {
    setSaving(true);
    try {
      const current = suggestions.find(s => s.id === id);
      await apiPatch(`/api/admin/food-suggestions/${id}`, {
        status: current?.status ?? 'pending',
        adminNote: noteText.trim() || null,
      });
      setSuggestions(p => p.map(s => s.id === id ? { ...s, admin_note: noteText.trim() || null } : s));
      setEditingNote(null);
    } catch {
      // leave the editor open so the admin can retry
    }
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

// ── Tab: Pantry ───────────────────────────────────────────────────────────────

interface PantryItemLocal {
  id: string; name: string; category: string; quantity: string; unit: string;
  status: 'In Stock' | 'Low' | 'Out of Stock'; minThreshold: string; minThresholdUnit: string;
}

const PANTRY_STATUSES: PantryItemLocal['status'][] = ['In Stock', 'Low', 'Out of Stock'];

function PantryTab() {
  const [items, setItems]     = useState<PantryItemLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<string | null>(null);
  const [adding, setAdding]   = useState(false);
  const [toast, setToast]     = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', category: 'General', quantity: '', unit: '', status: 'In Stock' as PantryItemLocal['status'] });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<ApiPantryItem[]>('/api/admin/pantry');
      setItems(data.map(p => ({
        id: p.id, name: p.name, category: p.category, quantity: p.quantity ?? '', unit: p.unit ?? '',
        status: p.status, minThreshold: p.minThreshold ?? '', minThresholdUnit: p.minThresholdUnit ?? '',
      })));
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateField = (id: string, field: 'name' | 'category' | 'quantity' | 'unit' | 'status', value: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const saveItem = async (item: PantryItemLocal) => {
    setSaving(item.id);
    try {
      await apiPut(`/api/admin/pantry/${item.id}`, {
        name: item.name, category: item.category, quantity: item.quantity || null, unit: item.unit || null,
        status: item.status, minThreshold: item.minThreshold || null, minThresholdUnit: item.minThresholdUnit || null,
      });
      showToast('Saved!');
    } catch {
      showToast('Save failed. Please try again.');
    }
    setSaving(null);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this pantry item?')) return;
    try {
      await apiDelete(`/api/admin/pantry/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      showToast('Deleted.');
    } catch {
      showToast('Delete failed. Please try again.');
    }
  };

  const addItem = async () => {
    if (!newItem.name.trim()) return;
    setAdding(true);
    try {
      const created = await apiPost<ApiPantryItem>('/api/admin/pantry', {
        name: newItem.name.trim(), category: newItem.category || 'General',
        quantity: newItem.quantity || null, unit: newItem.unit || null, status: newItem.status,
      });
      setItems(prev => [...prev, {
        id: created.id, name: created.name, category: created.category,
        quantity: created.quantity ?? '', unit: created.unit ?? '', status: created.status,
        minThreshold: created.minThreshold ?? '', minThresholdUnit: created.minThresholdUnit ?? '',
      }]);
      setNewItem({ name: '', category: 'General', quantity: '', unit: '', status: 'In Stock' });
      showToast('Item added!');
    } catch {
      showToast('Add failed. Please try again.');
    }
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="soft-card p-6 border border-white bg-white/40 space-y-4">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground/50 flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-primary" /> Add Pantry Item
        </h3>
        <div className="flex flex-wrap gap-2">
          <input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
            placeholder="Item name" className="soft-ui-in flex-1 min-w-[140px] px-3 py-2.5 text-sm focus:outline-none bg-white/70 border border-white" />
          <input value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
            placeholder="Category" className="soft-ui-in w-32 px-3 py-2.5 text-sm focus:outline-none bg-white/70 border border-white" />
          <input value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))}
            placeholder="Qty" className="soft-ui-in w-20 px-3 py-2.5 text-sm text-center focus:outline-none bg-white/70 border border-white" />
          <input value={newItem.unit} onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}
            placeholder="Unit" className="soft-ui-in w-24 px-3 py-2.5 text-sm focus:outline-none bg-white/70 border border-white" />
          <select value={newItem.status} onChange={e => setNewItem(p => ({ ...p, status: e.target.value as PantryItemLocal['status'] }))}
            className="soft-ui-in w-32 px-2 py-2.5 text-xs focus:outline-none bg-white/70 border border-white">
            {PANTRY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={addItem} disabled={adding || !newItem.name.trim()}
            className="btn-terracotta px-5 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40">
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Package} text="No pantry items yet." />
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="soft-card p-4 border border-white bg-white/40 flex flex-wrap items-center gap-2">
              <input value={item.name} onChange={e => updateField(item.id, 'name', e.target.value)}
                className="soft-ui-in flex-1 min-w-[120px] px-3 py-2 text-sm font-bold focus:outline-none bg-white/70 border border-white" />
              <input value={item.category} onChange={e => updateField(item.id, 'category', e.target.value)}
                className="soft-ui-in w-28 px-3 py-2 text-xs focus:outline-none bg-white/70 border border-white" />
              <input value={item.quantity} onChange={e => updateField(item.id, 'quantity', e.target.value)}
                placeholder="Qty" className="soft-ui-in w-16 px-2 py-2 text-xs text-center focus:outline-none bg-white/70 border border-white" />
              <input value={item.unit} onChange={e => updateField(item.id, 'unit', e.target.value)}
                placeholder="Unit" className="soft-ui-in w-20 px-2 py-2 text-xs focus:outline-none bg-white/70 border border-white" />
              <select value={item.status} onChange={e => updateField(item.id, 'status', e.target.value)}
                className="soft-ui-in w-32 px-2 py-2 text-xs focus:outline-none bg-white/70 border border-white">
                {PANTRY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => saveItem(item)} disabled={saving === item.id}
                className="soft-button w-9 h-9 border border-white text-emerald-500 hover:bg-emerald-500 hover:text-white shrink-0">
                {saving === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => deleteItem(item.id)}
                className="soft-button w-9 h-9 border border-white text-foreground/20 hover:text-red-400 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl z-50">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tab: Dish Catalog ─────────────────────────────────────────────────────────

interface NutritionMicro { name: string; value: number; unit: string; rdv: number; benefit: string; color: string; }
interface DishNutritionLocal {
  servingSize: string | null; calories: number | null; protein: number | null; carbs: number | null;
  fats: number | null; fiber: number | null; micros: NutritionMicro[]; wholeSpices: string[];
  benefits: string[]; cookingTip: string | null; status: 'none' | 'estimated' | 'approved'; updatedAt: string | null;
}
interface DishCatalogLocal {
  id: string; name: string; nameHi: string; imageUrl: string; isFallback: boolean; fallbackPriority: number;
  active: boolean; nutrition: DishNutritionLocal | null;
}

const NUTRITION_STATUS_STYLE: Record<string, string> = {
  none:      'bg-foreground/10 text-foreground/40',
  estimated: 'bg-amber-100 text-amber-700',
  approved:  'bg-emerald-100 text-emerald-700',
};

function DishesTab() {
  const [dishes, setDishes] = useState<DishCatalogLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [newDish, setNewDish] = useState({ name: '', nameHi: '', imageUrl: '', isFallback: false });
  const [estimating, setEstimating] = useState<string | null>(null);
  const [draftOpenFor, setDraftOpenFor] = useState<string | null>(null);
  const [draft, setDraft] = useState<DishNutritionLocal | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchDishes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<DishCatalogLocal[]>('/api/admin/dishes');
      setDishes(data.map(d => ({ ...d, nameHi: d.nameHi ?? '', imageUrl: d.imageUrl ?? '', nutrition: d.nutrition ?? null })));
    } catch {
      setDishes([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDishes(); }, [fetchDishes]);

  const updateField = (id: string, field: 'name' | 'nameHi' | 'imageUrl', value: string) =>
    setDishes(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));

  const toggleFallback = (id: string) =>
    setDishes(prev => prev.map(d => d.id === id ? { ...d, isFallback: !d.isFallback } : d));

  const saveDish = async (dish: DishCatalogLocal, nutritionOverride?: DishNutritionLocal | null) => {
    setSaving(dish.id);
    const nutrition = nutritionOverride !== undefined ? nutritionOverride : dish.nutrition;
    try {
      const saved = await apiPut<DishCatalogLocal>(`/api/admin/dishes/${dish.id}`, {
        name: dish.name, nameHi: dish.nameHi || null, imageUrl: dish.imageUrl || null,
        isFallback: dish.isFallback, fallbackPriority: dish.fallbackPriority, active: dish.active,
        nutrition: nutrition ? {
          servingSize: nutrition.servingSize, calories: nutrition.calories, protein: nutrition.protein,
          carbs: nutrition.carbs, fats: nutrition.fats, fiber: nutrition.fiber, micros: nutrition.micros,
          wholeSpices: nutrition.wholeSpices, benefits: nutrition.benefits, cookingTip: nutrition.cookingTip,
          status: nutrition.status,
        } : null,
      });
      setDishes(prev => prev.map(d => d.id === dish.id ? { ...d, nutrition: saved.nutrition ?? null } : d));
      showToast('Saved!');
    } catch {
      showToast('Save failed. Please try again.');
    }
    setSaving(null);
  };

  const estimateNutrition = async (dish: DishCatalogLocal) => {
    setEstimating(dish.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';
      const res = await fetch('/api/nutrition/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dishName: dish.name }),
      });
      if (!res.ok) throw new Error('estimate failed');
      const raw = await res.json();
      setDraft({
        servingSize: raw.servingSize ?? null, calories: raw.calories ?? null, protein: raw.protein ?? null,
        carbs: raw.carbs ?? null, fats: raw.fats ?? null, fiber: raw.fiber ?? null,
        micros: raw.micros ?? [], wholeSpices: raw.wholeSpices ?? [], benefits: raw.benefits ?? [],
        cookingTip: raw.cookingTip ?? null, status: 'estimated', updatedAt: null,
      });
      setDraftOpenFor(dish.id);
    } catch {
      showToast('Nutrition estimate failed. Please try again.');
    }
    setEstimating(null);
  };

  const openExistingNutrition = (dish: DishCatalogLocal) => {
    setDraft(dish.nutrition ?? {
      servingSize: null, calories: null, protein: null, carbs: null, fats: null, fiber: null,
      micros: [], wholeSpices: [], benefits: [], cookingTip: null, status: 'estimated', updatedAt: null,
    });
    setDraftOpenFor(dish.id);
  };

  const approveDraft = async (dish: DishCatalogLocal) => {
    if (!draft) return;
    await saveDish(dish, { ...draft, status: 'approved' });
    setDraftOpenFor(null);
    setDraft(null);
  };

  const deleteDish = async (id: string) => {
    if (!confirm('Remove this dish from the catalog?')) return;
    try {
      await apiDelete(`/api/admin/dishes/${id}`);
      setDishes(prev => prev.filter(d => d.id !== id));
      showToast('Removed.');
    } catch {
      showToast('Delete failed. Please try again.');
    }
  };

  const addDish = async () => {
    if (!newDish.name.trim()) return;
    setAdding(true);
    try {
      const created = await apiPost<DishCatalogLocal>('/api/admin/dishes', {
        name: newDish.name.trim(), nameHi: newDish.nameHi.trim() || null, imageUrl: newDish.imageUrl.trim() || null,
        isFallback: newDish.isFallback, fallbackPriority: dishes.filter(d => d.isFallback).length, active: true,
      });
      setDishes(prev => [...prev, { ...created, nameHi: created.nameHi ?? '', imageUrl: created.imageUrl ?? '', nutrition: created.nutrition ?? null }]);
      setNewDish({ name: '', nameHi: '', imageUrl: '', isFallback: false });
      showToast('Dish added!');
    } catch {
      showToast('Add failed. Please try again.');
    }
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="soft-card p-6 border border-white bg-white/40 space-y-4">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground/50 flex items-center gap-2">
          <Plus className="w-3.5 h-3.5 text-primary" /> Add Dish
        </h3>
        <p className="text-[10px] text-foreground/30 font-bold">
          &ldquo;Fallback&rdquo; dishes are offered by the WhatsApp cook engine when a proposed dish is rejected.
        </p>
        <div className="flex flex-wrap gap-2">
          <input value={newDish.name} onChange={e => setNewDish(p => ({ ...p, name: e.target.value }))}
            placeholder="Dish name" className="soft-ui-in flex-1 min-w-[140px] px-3 py-2.5 text-sm focus:outline-none bg-white/70 border border-white" />
          <input value={newDish.nameHi} onChange={e => setNewDish(p => ({ ...p, nameHi: e.target.value }))}
            placeholder="Hindi name (for TTS)" className="soft-ui-in w-48 px-3 py-2.5 text-sm focus:outline-none bg-white/70 border border-white" />
          <input value={newDish.imageUrl} onChange={e => setNewDish(p => ({ ...p, imageUrl: e.target.value }))}
            placeholder="Image URL" className="soft-ui-in flex-1 min-w-[140px] px-3 py-2.5 text-sm focus:outline-none bg-white/70 border border-white" />
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-foreground/40 px-2">
            <input type="checkbox" checked={newDish.isFallback} onChange={e => setNewDish(p => ({ ...p, isFallback: e.target.checked }))} /> Fallback
          </label>
          <button onClick={addDish} disabled={adding || !newDish.name.trim()}
            className="btn-terracotta px-5 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40">
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : dishes.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} text="No dishes in the catalog yet." />
      ) : (
        <div className="space-y-2">
          {dishes.map(dish => {
            const status = dish.nutrition?.status ?? 'none';
            return (
              <div key={dish.id} className="soft-card border border-white bg-white/40">
                <div className="p-4 flex flex-wrap items-center gap-2">
                  <input value={dish.name} onChange={e => updateField(dish.id, 'name', e.target.value)}
                    className="soft-ui-in flex-1 min-w-[120px] px-3 py-2 text-sm font-bold focus:outline-none bg-white/70 border border-white" />
                  <input value={dish.nameHi} onChange={e => updateField(dish.id, 'nameHi', e.target.value)}
                    placeholder="Hindi name" className="soft-ui-in w-36 px-3 py-2 text-xs focus:outline-none bg-white/70 border border-white" />
                  <input value={dish.imageUrl} onChange={e => updateField(dish.id, 'imageUrl', e.target.value)}
                    placeholder="Image URL" className="soft-ui-in flex-1 min-w-[120px] px-3 py-2 text-xs focus:outline-none bg-white/70 border border-white" />
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-foreground/40">
                    <input type="checkbox" checked={dish.isFallback} onChange={() => toggleFallback(dish.id)} /> Fallback
                  </label>
                  <span className={cn('px-2 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest', NUTRITION_STATUS_STYLE[status])}>
                    {status}
                  </span>
                  <button
                    onClick={() => status === 'none' ? estimateNutrition(dish) : openExistingNutrition(dish)}
                    disabled={estimating === dish.id}
                    className="soft-button px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/60 hover:text-primary shrink-0 flex items-center gap-1.5"
                  >
                    {estimating === dish.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                    {status === 'none' ? 'Estimate nutrition' : 'View nutrition'}
                  </button>
                  <button onClick={() => saveDish(dish)} disabled={saving === dish.id}
                    className="soft-button w-9 h-9 border border-white text-emerald-500 hover:bg-emerald-500 hover:text-white shrink-0">
                    {saving === dish.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => deleteDish(dish.id)}
                    className="soft-button w-9 h-9 border border-white text-foreground/20 hover:text-red-400 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {draftOpenFor === dish.id && draft && (
                  <div className="border-t border-white/60 p-4 space-y-3 bg-white/30">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/50">
                        Nutrition preview — {dish.name}
                      </h4>
                      <button onClick={() => { setDraftOpenFor(null); setDraft(null); }}
                        className="text-foreground/30 hover:text-foreground text-[10px] font-bold uppercase tracking-widest">
                        Close
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      <label className="col-span-2 sm:col-span-1 text-[9px] font-extrabold uppercase text-foreground/30">
                        Serving
                        <input value={draft.servingSize ?? ''} onChange={e => setDraft(d => d && { ...d, servingSize: e.target.value })}
                          className="soft-ui-in w-full mt-1 px-2 py-1.5 text-xs bg-white/70 border border-white focus:outline-none" />
                      </label>
                      {(['calories', 'protein', 'carbs', 'fats', 'fiber'] as const).map(field => (
                        <label key={field} className="text-[9px] font-extrabold uppercase text-foreground/30 capitalize">
                          {field}
                          <input type="number" value={draft[field] ?? ''}
                            onChange={e => setDraft(d => d && { ...d, [field]: e.target.value === '' ? null : Number(e.target.value) })}
                            className="soft-ui-in w-full mt-1 px-2 py-1.5 text-xs bg-white/70 border border-white focus:outline-none" />
                        </label>
                      ))}
                    </div>

                    <label className="block text-[9px] font-extrabold uppercase text-foreground/30">
                      Cooking tip
                      <textarea value={draft.cookingTip ?? ''} onChange={e => setDraft(d => d && { ...d, cookingTip: e.target.value })}
                        rows={2} className="soft-ui-in w-full mt-1 px-2 py-1.5 text-xs bg-white/70 border border-white focus:outline-none resize-none" />
                    </label>

                    {draft.micros.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {draft.micros.map((m, i) => (
                          <span key={i} className="px-2 py-1 rounded-lg text-[9px] font-bold" style={{ backgroundColor: `${m.color}20`, color: m.color }}>
                            {m.name}: {m.value}{m.unit}
                          </span>
                        ))}
                      </div>
                    )}
                    {draft.benefits.length > 0 && (
                      <ul className="text-[10px] text-foreground/50 font-semibold list-disc list-inside space-y-0.5">
                        {draft.benefits.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    )}

                    <button onClick={() => approveDraft(dish)} disabled={saving === dish.id}
                      className="btn-terracotta px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40">
                      {saving === dish.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Approve &amp; Save
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl z-50">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tab: Alexa Tester ─────────────────────────────────────────────────────────

function AlexaTesterTab() {
  const [messages, setMessages]           = useState<TesterMessage[]>([]);
  const [sessionId, setSessionId]         = useState('');
  const [sessionAttrs, setSessionAttrs]   = useState<Record<string, unknown>>({});
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const bottomRef                         = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const callAlexa = async (utterance?: string, isLaunch = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      const res = await fetch('/api/kitchen/alexa-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ utterance, sessionId, sessionAttributes: sessionAttrs, isLaunch }),
      });

      const data = await res.json() as { reply?: string; sessionAttributes?: Record<string, unknown>; endSession?: boolean; error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }

      const newMsgs: TesterMessage[] = [];
      if (utterance && !isLaunch) newMsgs.push({ id: `u-${Date.now()}`, role: 'user',      text: utterance });
      if (data.reply)              newMsgs.push({ id: `a-${Date.now()}`, role: 'assistant', text: data.reply });
      setMessages(prev => [...prev, ...newMsgs]);
      setSessionAttrs(data.sessionAttributes ?? {});
      if (data.endSession) setSessionActive(false);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    const id = `test-session-${Date.now()}`;
    setSessionId(id);
    setSessionAttrs({});
    setMessages([]);
    setSessionActive(true);
    await callAlexa(undefined, true);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !sessionActive) return;
    const text = input.trim();
    setInput('');
    await callAlexa(text, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="soft-card p-5 border border-white bg-white/40 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-foreground text-sm flex items-center gap-2 uppercase tracking-tight">
            <Bot className="w-4 h-4 text-primary" /> Alexa Kitchen Simulator
          </h3>
          <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest mt-0.5">
            Test conversations live — no Alexa device needed
          </p>
        </div>
        <button onClick={startSession} disabled={loading}
          className="btn-terracotta px-4 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 disabled:opacity-60">
          <RotateCcw className="w-3.5 h-3.5" />
          {sessionActive ? 'New Session' : 'Start Session'}
        </button>
      </div>

      {/* Chat area */}
      <div className="soft-card border border-white bg-white/20 h-[420px] overflow-y-auto p-5 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mic className="w-7 h-7 text-primary/40" />
            </div>
            <div>
              <p className="text-xs font-black text-foreground/30 uppercase tracking-widest">Ready to test</p>
              <p className="text-[11px] text-foreground/20 font-medium mt-1">Click "Start Session" to open Aaram Kitchen</p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={cn('flex items-end gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center shrink-0',
              msg.role === 'user' ? 'bg-primary/10' : 'bg-foreground/5')}>
              {msg.role === 'user'
                ? <span className="text-sm">👤</span>
                : <Bot className="w-3.5 h-3.5 text-foreground/40" />}
            </div>
            <div className={cn('max-w-[75%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed',
              msg.role === 'user'
                ? 'bg-primary text-white rounded-br-sm'
                : 'bg-white/90 text-foreground/80 border border-foreground/5 rounded-bl-sm shadow-sm')}>
              {msg.text}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex items-end gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-foreground/30" />
            </div>
            <div className="bg-white/90 border border-foreground/5 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground/25 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-foreground/25 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-foreground/25 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <p className="text-xs text-red-500 font-bold bg-red-50 border border-red-200 px-4 py-2 rounded-xl">{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="soft-card p-3 border border-white bg-white/40 flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!sessionActive || loading}
          placeholder={sessionActive ? 'Kuch bolo… (e.g. "aaj lunch mein kya hai")' : 'Start a session first'}
          className="soft-ui-in flex-1 px-4 py-3 text-sm focus:outline-none bg-white/70 border border-white disabled:opacity-40"
        />
        <button onClick={sendMessage}
          disabled={!input.trim() || !sessionActive || loading}
          className="btn-terracotta px-5 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          <Send className="w-3.5 h-3.5" />
          Send
        </button>
      </div>

      {sessionActive && (
        <p className="text-[10px] text-foreground/20 font-bold text-center uppercase tracking-widest font-mono">
          Session · {sessionId}
        </p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function KitchenPage() {
  const [tab, setTab] = useState<Tab>('weekly');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'weekly',      label: 'Weekly Plan',   icon: Edit3         },
    { id: 'menu',        label: 'Day Builder',   icon: ChefHat       },
    { id: 'log',         label: 'Cook Log',      icon: MessageSquare },
    { id: 'tester',      label: 'Tester',        icon: Bot           },
    { id: 'reorder',     label: 'Reorder List',  icon: ShoppingCart  },
    { id: 'suggestions', label: 'Suggestions',   icon: Lightbulb     },
    { id: 'pantry',      label: 'Pantry',        icon: Package       },
    { id: 'dishes',      label: 'Dish Catalog',  icon: UtensilsCrossed },
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
            {tab === 'weekly'      && <WeeklyMenuTab />}
            {tab === 'menu'        && <MenuBuilderTab />}
            {tab === 'log'         && <AlexaLogTab />}
            {tab === 'tester'      && <AlexaTesterTab />}
            {tab === 'reorder'     && <ReorderListTab />}
            {tab === 'suggestions' && <SuggestionsTab />}
            {tab === 'pantry'      && <PantryTab />}
            {tab === 'dishes'      && <DishesTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
