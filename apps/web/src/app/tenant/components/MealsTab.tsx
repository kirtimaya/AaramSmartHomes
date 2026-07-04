'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee, Utensils, Moon, CheckCircle2, SkipForward,
  RotateCcw, Loader2, Calendar, Lock, Info, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { isMealLocked, cutoffLabel } from '@aaram/core';

// ────────────────────────────────────────────────────────────────────────────
// Types & constants
// ────────────────────────────────────────────────────────────────────────────

type MealBlock = 'Breakfast' | 'Lunch' | 'Dinner';

interface MealPrefs {
  meal_breakfast: boolean;
  meal_lunch:     boolean;
  meal_dinner:    boolean;
}

interface MenuItem { item_name: string; sort_order: number }
interface DayMenu  { date: string; block: MealBlock; items: MenuItem[] }

const BLOCK_META: Record<MealBlock, {
  time: string; icon: React.ElementType; color: string; bg: string; border: string;
}> = {
  Breakfast: { time: '8:00 – 10:00 AM', icon: Coffee,   color: 'text-amber-600',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  Lunch:     { time: '1:00 – 3:00 PM',  icon: Utensils, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  Dinner:    { time: '8:30 – 10:30 PM', icon: Moon,     color: 'text-blue-600',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
};

const MEAL_BLOCKS: MealBlock[] = ['Breakfast', 'Lunch', 'Dinner'];

// ────────────────────────────────────────────────────────────────────────────
// IST date utilities  (all timezone-safe — pure UTC+5:30 arithmetic)
// ────────────────────────────────────────────────────────────────────────────

/** Returns the IST date string "YYYY-MM-DD" for today + offsetDays */
function istDate(offsetDays = 0): string {
  const ms = Date.now() + (5.5 + offsetDays * 24) * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Display helpers derived from an IST dateStr — timezone-safe via UTC noon parsing */
function istDayInfo(dateStr: string): { day: number; weekday: string; label: string } {
  const d = new Date(`${dateStr}T12:00:00Z`); // noon UTC is safe for all zones
  return {
    day:     d.getUTCDate(),
    weekday: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getUTCDay()],
    label:   d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Cutoff logic — server-side truth lives in the meal_skip_requests trigger
// (supabase/migrations/20260709_meal_skip_cutoff.sql); isMealLocked/cutoffLabel
// here are the client-side mirror from @aaram/core so the UI can grey out the
// button before even attempting the write. Rule: locked once we're within 8
// hours of the meal's window start (effective cutoffs: Breakfast 12:00 AM,
// Lunch 5:00 AM, Dinner 12:30 PM IST, all on the meal's own calendar day).
// ────────────────────────────────────────────────────────────────────────────
// Lock badge with tooltip
// ────────────────────────────────────────────────────────────────────────────

function LockBadge({ block }: { block: MealBlock }) {
  return (
    <div className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-foreground/5 text-foreground/30 text-[9px] font-extrabold uppercase tracking-widest cursor-default select-none">
      <Lock className="w-3 h-3" />
      Locked
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-xl bg-foreground text-background text-[10px] font-bold leading-snug text-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl">
        Changes locked — kitchen prep has started for {block.toLowerCase()}.<br />
        <span className="opacity-60">Cutoff: {cutoffLabel(block)} IST</span>
      </span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

interface Props { userId: string }

export function MealsTab({ userId }: Props) {
  const [prefs,       setPrefs]       = useState<MealPrefs>({ meal_breakfast: true, meal_lunch: true, meal_dinner: true });
  const [skips,       setSkips]       = useState<Set<MealBlock>>(new Set());
  const [weekMenus,   setWeekMenus]   = useState<DayMenu[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [savingPref,  setSavingPref]  = useState<MealBlock | null>(null);
  const [skipSaving,  setSkipSaving]  = useState<MealBlock | null>(null);
  const [vacSkips,    setVacSkips]    = useState<Map<string, Set<MealBlock>>>(new Map());
  const [selDate,     setSelDate]     = useState<string | null>(null);
  const [vacSaving,   setVacSaving]   = useState(false);
  const [calPage,     setCalPage]     = useState(0);
  const [toast,       setToast]       = useState<string | null>(null);

  const today = istDate(0);
  const DAYS_PER_PAGE = 14;

  // Calendar: next 30 days as IST date strings (starting tomorrow)
  const calDates: string[] = Array.from({ length: 30 }, (_, i) => istDate(i + 1));
  const totalPages = Math.ceil(calDates.length / DAYS_PER_PAGE);
  const pagedDates = calDates.slice(calPage * DAYS_PER_PAGE, (calPage + 1) * DAYS_PER_PAGE);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Initial load ────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoadingInit(true);

    const [prefsRes, menusRes, todaySkipsRes, futureSkipsRes] = await Promise.all([
      // SELECT * FROM tenant_meal_preferences WHERE tenant_id = ?
      supabase.from('tenant_meal_preferences').select('*').eq('tenant_id', userId).single(),

      // SELECT date, meal_block, menu_items(*) FROM menus WHERE date BETWEEN today AND today+7
      supabase.from('menus')
        .select('date, meal_block, menu_items(item_name, sort_order)')
        .gte('date', today)
        .lte('date', istDate(7)),

      // SELECT meal_block FROM meal_skip_requests WHERE tenant_id = ? AND skip_date = today
      supabase.from('meal_skip_requests')
        .select('meal_block')
        .eq('tenant_id', userId)
        .eq('skip_date', today),

      // SELECT skip_date, meal_block FROM meal_skip_requests WHERE tenant_id = ? AND skip_date > today
      // Kitchen Hub queries this table to calculate daily prep headcount
      supabase.from('meal_skip_requests')
        .select('skip_date, meal_block')
        .eq('tenant_id', userId)
        .gt('skip_date', today),
    ]);

    if (prefsRes.data) {
      setPrefs({
        meal_breakfast: prefsRes.data.meal_breakfast,
        meal_lunch:     prefsRes.data.meal_lunch,
        meal_dinner:    prefsRes.data.meal_dinner,
      });
    }

    if (menusRes.data) {
      setWeekMenus((menusRes.data as any[]).map(m => ({
        date:  m.date,
        block: m.meal_block as MealBlock,
        items: ((m.menu_items as any[]) ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })));
    }

    if (todaySkipsRes.data) {
      setSkips(new Set(todaySkipsRes.data.map((s: any) => s.meal_block as MealBlock)));
    }

    if (futureSkipsRes.data) {
      const map = new Map<string, Set<MealBlock>>();
      for (const row of futureSkipsRes.data as any[]) {
        if (!map.has(row.skip_date)) map.set(row.skip_date, new Set());
        map.get(row.skip_date)!.add(row.meal_block as MealBlock);
      }
      setVacSkips(map);
    }

    setLoadingInit(false);
  }, [userId, today]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Subscription toggle ─────────────────────────────────────────────────

  const togglePref = async (block: MealBlock) => {
    if (savingPref) return;
    setSavingPref(block);
    const key  = `meal_${block.toLowerCase()}` as keyof MealPrefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    // UPSERT INTO tenant_meal_preferences ON CONFLICT (tenant_id) DO UPDATE
    await supabase.from('tenant_meal_preferences').upsert(
      { tenant_id: userId, ...next, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id' }
    );
    setSavingPref(null);
    showToast(`${block} subscription ${next[key] ? 'enabled' : 'disabled'}.`);
  };

  // ── Today skip toggle ───────────────────────────────────────────────────

  const toggleSkipToday = async (block: MealBlock) => {
    if (skipSaving || isMealLocked(block, today)) return;
    setSkipSaving(block);
    const already = skips.has(block);
    let error;

    if (already) {
      // DELETE FROM meal_skip_requests WHERE ...
      ({ error } = await supabase.from('meal_skip_requests')
        .delete()
        .eq('tenant_id', userId).eq('skip_date', today).eq('meal_block', block));
      if (!error) {
        setSkips(prev => { const s = new Set(prev); s.delete(block); return s; });
        showToast(`${block} skip removed — you're back on the list.`);
      }
    } else {
      // INSERT INTO meal_skip_requests — reduces today's Kitchen Hub prep count
      ({ error } = await supabase.from('meal_skip_requests').upsert(
        { tenant_id: userId, skip_date: today, meal_block: block },
        { onConflict: 'tenant_id,skip_date,meal_block' }
      ));
      if (!error) {
        setSkips(prev => new Set([...prev, block]));
        showToast(`${block} skipped for today.`);
      }
    }

    if (error) {
      showToast(error.message.includes('MEAL_SKIP_CUTOFF_PASSED')
        ? 'Kitchen prep has started — changes are locked.'
        : 'Something went wrong. Please try again.');
    }
    setSkipSaving(null);
  };

  // ── Vacation calendar toggle ─────────────────────────────────────────────

  const toggleVacSkip = async (dateStr: string, block: MealBlock) => {
    if (vacSaving || isMealLocked(block, dateStr)) return;
    setVacSaving(true);

    const existing = vacSkips.get(dateStr)?.has(block) ?? false;
    const next     = new Map(vacSkips);
    let error;

    if (existing) {
      // DELETE FROM meal_skip_requests WHERE tenant_id = ? AND skip_date = ? AND meal_block = ?
      ({ error } = await supabase.from('meal_skip_requests')
        .delete()
        .eq('tenant_id', userId).eq('skip_date', dateStr).eq('meal_block', block));
      if (!error) {
        next.get(dateStr)?.delete(block);
        if ((next.get(dateStr)?.size ?? 0) === 0) next.delete(dateStr);
      }
    } else {
      // UPSERT — Kitchen Hub queries meal_skip_requests daily at 6 AM to finalize prep counts
      ({ error } = await supabase.from('meal_skip_requests').upsert(
        { tenant_id: userId, skip_date: dateStr, meal_block: block },
        { onConflict: 'tenant_id,skip_date,meal_block' }
      ));
      if (!error) {
        if (!next.has(dateStr)) next.set(dateStr, new Set());
        next.get(dateStr)!.add(block);
      }
    }

    setVacSkips(next);
    setVacSaving(false);

    if (error) {
      showToast(error.message.includes('MEAL_SKIP_CUTOFF_PASSED')
        ? 'Kitchen prep has started — changes are locked.'
        : 'Something went wrong. Please try again.');
      return;
    }
    const { label } = istDayInfo(dateStr);
    showToast(existing ? 'Skip removed.' : `${block} skipped for ${label}.`);
  };

  // ── Derived ─────────────────────────────────────────────────────────────

  const subscribedBlocks = MEAL_BLOCKS.filter(b => prefs[`meal_${b.toLowerCase()}` as keyof MealPrefs]);

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-8">

      {/* ── 1. Subscription toggles ──────────────────────────────────────── */}
      <section className="soft-card border border-white bg-white/40 p-7 space-y-6">
        <div>
          <h2 className="text-xl font-black tracking-tighter uppercase flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Utensils className="w-3.5 h-3.5" />
            </span>
            My Meal Plan
          </h2>
          <p className="text-[10px] text-foreground/35 uppercase font-extrabold tracking-widest mt-1 ml-10">
            Long-term subscription · takes effect from next day
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MEAL_BLOCKS.map(block => {
            const meta   = BLOCK_META[block];
            const key    = `meal_${block.toLowerCase()}` as keyof MealPrefs;
            const on     = prefs[key];
            const saving = savingPref === block;

            return (
              <motion.button
                key={block}
                whileTap={{ scale: 0.97 }}
                onClick={() => togglePref(block)}
                disabled={!!savingPref}
                className={cn(
                  'relative flex flex-col gap-3 p-5 rounded-2xl border text-left transition-all duration-200',
                  on
                    ? `${meta.bg} ${meta.border} shadow-sm`
                    : 'bg-foreground/5 border-foreground/10 opacity-60 hover:opacity-80'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', on ? meta.bg : 'bg-foreground/10')}>
                    {saving
                      ? <Loader2 className="w-4 h-4 animate-spin text-foreground/30" />
                      : <meta.icon className={cn('w-4 h-4', on ? meta.color : 'text-foreground/30')} />}
                  </div>
                  {/* Toggle pill */}
                  <div className={cn(
                    'w-10 h-5 rounded-full border-2 relative transition-colors shrink-0',
                    on ? 'bg-primary border-primary' : 'bg-foreground/10 border-foreground/20'
                  )}>
                    <motion.div
                      layout
                      transition={{ type: 'spring', damping: 25, stiffness: 500 }}
                      className={cn(
                        'w-3.5 h-3.5 rounded-full absolute top-0.5 bg-white',
                        on ? 'left-[calc(100%-18px)]' : 'left-0.5'
                      )}
                    />
                  </div>
                </div>
                <div>
                  <p className={cn('text-sm font-black uppercase tracking-tight', on ? 'text-foreground' : 'text-foreground/40')}>{block}</p>
                  <p className="text-[10px] text-foreground/35 font-bold mt-0.5">{meta.time}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── 2. Today's Menu with skip controls ───────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-black tracking-tighter uppercase flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
            <Calendar className="w-3.5 h-3.5" />
          </span>
          Today's Menu
          <span className="text-[10px] font-bold text-foreground/25 uppercase tracking-widest">
            {istDayInfo(today).label}
          </span>
        </h2>

        {subscribedBlocks.length === 0 ? (
          <div className="soft-card border border-white p-8 text-center space-y-2">
            <p className="text-sm font-bold text-foreground/30">No meals subscribed.</p>
            <p className="text-[11px] text-foreground/20">Enable at least one meal above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subscribedBlocks.map(block => {
              const meta    = BLOCK_META[block];
              const menu    = weekMenus.find(m => m.date === today && m.block === block);
              const skipped = skips.has(block);
              const locked  = isMealLocked(block, today);
              const saving  = skipSaving === block;

              return (
                <motion.div
                  key={block}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'soft-card border p-5 transition-all',
                    skipped ? 'border-red-400/20 bg-red-500/5 opacity-75' : 'border-white bg-white/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner', meta.bg)}>
                        <meta.icon className={cn('w-5 h-5', meta.color)} />
                      </div>
                      <div>
                        <p className={cn('text-xs font-extrabold uppercase tracking-widest', meta.color)}>{block}</p>
                        <p className="text-[10px] text-foreground/35 font-bold">{meta.time}</p>
                      </div>
                    </div>

                    {locked ? (
                      <LockBadge block={block} />
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleSkipToday(block)}
                        disabled={saving}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border transition-all',
                          skipped
                            ? 'bg-white text-emerald-600 border-emerald-400/30 hover:bg-emerald-50'
                            : 'bg-red-50  text-red-500  border-red-400/20 hover:bg-red-100'
                        )}
                      >
                        {saving
                          ? <Loader2     className="w-3 h-3 animate-spin" />
                          : skipped
                            ? <RotateCcw  className="w-3 h-3" />
                            : <SkipForward className="w-3 h-3" />}
                        {skipped ? 'Undo Skip' : 'Skip Today'}
                      </motion.button>
                    )}
                  </div>

                  {skipped ? (
                    <div className="mt-4 px-4 py-2.5 rounded-xl bg-red-500/5 border border-red-400/10">
                      <p className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest">
                        Opted out of {block.toLowerCase()} today
                      </p>
                    </div>
                  ) : menu?.items.length ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {menu.items.map(item => (
                        <span key={item.item_name} className="px-2.5 py-1 rounded-full bg-white/70 border border-white text-[11px] font-bold text-foreground shadow-sm">
                          {item.item_name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-[11px] text-foreground/25 italic">Menu not set yet — check back soon.</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 3. Weekly Menu ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-black tracking-tighter uppercase flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Calendar className="w-3.5 h-3.5" />
          </span>
          This Week
        </h2>

        {subscribedBlocks.length === 0 ? (
          <p className="text-sm text-foreground/30 font-bold">Subscribe to at least one meal to see the weekly schedule.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none -mx-1 px-1">
            {Array.from({ length: 7 }, (_, i) => {
              const dateStr   = istDate(i);
              const { day, weekday, label } = istDayInfo(dateStr);
              const isToday   = i === 0;
              const dayLabel  = isToday ? 'Today' : i === 1 ? 'Tomorrow' : label;

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'shrink-0 snap-start w-44 soft-card border p-4 space-y-3 rounded-2xl',
                    isToday ? 'border-primary/20 bg-primary/5' : 'border-white bg-white/40'
                  )}
                >
                  <div>
                    <p className={cn('text-[10px] font-extrabold uppercase tracking-widest', isToday ? 'text-primary' : 'text-foreground/40')}>
                      {dayLabel}
                    </p>
                    <p className="text-[9px] font-bold text-foreground/25 uppercase tracking-widest">
                      {weekday} {day}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {subscribedBlocks.map(block => {
                      const meta  = BLOCK_META[block];
                      const items = weekMenus
                        .filter(m => m.date === dateStr && m.block === block)
                        .flatMap(m => m.items);
                      return (
                        <div key={block} className={cn('p-2.5 rounded-xl', meta.bg, 'border', meta.border)}>
                          <p className={cn('text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1', meta.color)}>
                            <meta.icon className="w-2.5 h-2.5" /> {block}
                          </p>
                          {items.length > 0 ? (
                            <p className="text-[10px] font-bold text-foreground/60 mt-1 leading-snug">
                              {items.slice(0, 2).map(i => i.item_name).join(', ')}
                              {items.length > 2 && ` +${items.length - 2}`}
                            </p>
                          ) : (
                            <p className="text-[9px] text-foreground/25 italic mt-1">TBD</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 4. Vacation / Opt-Out Calendar ────────────────────────────────── */}
      <section className="soft-card border border-white bg-white/30 p-7 space-y-6">
        <div>
          <h2 className="text-xl font-black tracking-tighter uppercase flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            Vacation Mode
          </h2>
          <p className="text-[10px] text-foreground/35 uppercase font-extrabold tracking-widest mt-1 ml-10">
            Mark future days you'll be away — helps the kitchen reduce food waste
          </p>
        </div>

        <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200/50">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-700 font-bold leading-snug">
            Skips are saved to <code className="text-[10px] bg-blue-100 px-1 py-0.5 rounded">meal_skip_requests</code>.
            The Kitchen Hub queries this table each morning to calculate exact daily prep quantities.
          </p>
        </div>

        {/* Calendar pager */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">
              {new Date(`${pagedDates[0]}T12:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCalPage(p => Math.max(0, p - 1))}
                disabled={calPage === 0}
                className="soft-button w-7 h-7 border border-white text-foreground/40 disabled:opacity-30"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => setCalPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={calPage >= totalPages - 1}
                className="soft-button w-7 h-7 border border-white text-foreground/40 disabled:opacity-30"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {pagedDates.map(dateStr => {
              const { day, weekday } = istDayInfo(dateStr);
              const daySkips  = vacSkips.get(dateStr);
              const hasSkips  = (daySkips?.size ?? 0) > 0;
              const isSelected = selDate === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelDate(isSelected ? null : dateStr)}
                  className={cn(
                    'flex flex-col items-center py-2 px-1 rounded-xl border text-center transition-all',
                    isSelected ? 'bg-primary text-white border-primary shadow-md scale-105' :
                    hasSkips   ? 'bg-amber-50 border-amber-300/50 text-amber-700' :
                                 'bg-white/50 border-white/60 text-foreground/50 hover:bg-white/80'
                  )}
                >
                  <span className="text-[9px] font-extrabold leading-none">{weekday}</span>
                  <span className="text-sm font-black leading-none mt-1">{day}</span>
                  {hasSkips && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Meal checkboxes for selected date */}
        <AnimatePresence>
          {selDate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{   opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-white/60 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black uppercase tracking-tight text-foreground">
                    {new Date(`${selDate}T12:00:00Z`).toLocaleDateString('en-IN', {
                      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
                    })}
                  </p>
                  <p className="text-[9px] font-bold text-foreground/25 uppercase tracking-widest">tap to skip / unskip</p>
                </div>

                {subscribedBlocks.length === 0 ? (
                  <p className="text-sm text-foreground/30 font-bold">No active meal subscriptions.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {subscribedBlocks.map(block => {
                      const meta    = BLOCK_META[block];
                      const skipped = vacSkips.get(selDate)?.has(block) ?? false;
                      const locked  = isMealLocked(block, selDate);

                      return (
                        <button
                          key={block}
                          onClick={() => !locked && toggleVacSkip(selDate, block)}
                          disabled={locked || vacSaving}
                          className={cn(
                            'flex items-center gap-3 p-4 rounded-2xl border transition-all text-left',
                            locked  ? 'opacity-40 cursor-not-allowed bg-foreground/5  border-foreground/10' :
                            skipped ? 'bg-red-50   border-red-300/50   shadow-sm hover:bg-red-100' :
                                      'bg-white/50 border-white/60       hover:bg-white/80'
                          )}
                        >
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', skipped ? 'bg-red-100' : meta.bg)}>
                            {locked
                              ? <Lock className="w-4 h-4 text-foreground/30" />
                              : <meta.icon className={cn('w-4 h-4', skipped ? 'text-red-500' : meta.color)} />}
                          </div>
                          <div>
                            <p className="text-xs font-extrabold uppercase tracking-tight text-foreground">{block}</p>
                            {skipped && <p className="text-[10px] text-red-500 font-bold">Skipped</p>}
                            {locked  && <p className="text-[10px] text-foreground/30 font-bold">Locked</p>}
                          </div>
                          {!locked && (
                            <div className={cn(
                              'ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                              skipped ? 'bg-red-500 border-red-500' : 'border-foreground/20 bg-white'
                            )}>
                              {skipped && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-widest shadow-2xl z-50 whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
