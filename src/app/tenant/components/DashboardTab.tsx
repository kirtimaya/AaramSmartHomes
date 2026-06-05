'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, CheckCircle2, Zap, AlertCircle, Clock,
  Coffee, Utensils, Moon, CreditCard, Bell, Gift,
  Ticket as TicketIcon, ArrowRight, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Tenant } from '@/lib/types';

// ── IST helpers ───────────────────────────────────────────────────────────────

function getISTDate() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function getISTNow() {
  // Returns a Date where getUTCHours()/getUTCMinutes() == IST local time
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000);
}

// ── Next-meal logic ───────────────────────────────────────────────────────────

type MealBlock = 'Breakfast' | 'Lunch' | 'Dinner';

interface MealPrefs {
  meal_breakfast: boolean;
  meal_lunch: boolean;
  meal_dinner: boolean;
}

const MEAL_WINDOWS: { block: MealBlock; openH: number; closeH: number; icon: React.ElementType; color: string; bg: string } [] = [
  { block: 'Breakfast', openH: 8,    closeH: 10,   icon: Coffee,   color: 'text-amber-600',   bg: 'bg-amber-500/10'   },
  { block: 'Lunch',     openH: 13,   closeH: 15,   icon: Utensils, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  { block: 'Dinner',    openH: 20.5, closeH: 22.5, icon: Moon,     color: 'text-blue-600',    bg: 'bg-blue-500/10'    },
];

function getNextMeal(prefs: MealPrefs | null): { block: MealBlock; when: string; icon: React.ElementType; color: string; bg: string } | null {
  if (!prefs) return null;
  const now   = getISTNow();
  const t     = now.getUTCHours() + now.getUTCMinutes() / 60;

  for (const m of MEAL_WINDOWS) {
    const key = `meal_${m.block.toLowerCase()}` as keyof MealPrefs;
    if (!prefs[key]) continue;
    if (t < m.closeH) {
      const when = t < m.openH ? `Today at ${formatHour(m.openH)}` : `Now until ${formatHour(m.closeH)}`;
      return { ...m, when };
    }
  }

  // All done today — return tomorrow's first subscribed meal
  for (const m of MEAL_WINDOWS) {
    const key = `meal_${m.block.toLowerCase()}` as keyof MealPrefs;
    if (prefs[key]) return { ...m, when: `Tomorrow at ${formatHour(m.openH)}` };
  }
  return null;
}

function formatHour(h: number): string {
  const hh  = Math.floor(h);
  const mm  = Math.round((h % 1) * 60);
  const ampm = hh < 12 ? 'AM' : 'PM';
  const h12  = hh % 12 || 12;
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${ampm}` : `${h12}:00 ${ampm}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Unit { room_number: string; status: string; lease_end_date?: string; property_name?: string }
interface Bill  { total_amount: number; status: 'unpaid' | 'paid'; bill_month: string }
interface Notice {
  id:   string;
  type: 'dues' | 'ticket' | 'update';
  title: string;
  body:  string;
  time:  string;
  read:  boolean;
}

interface Props {
  tenantProfile: Tenant;
  onRaiseTicket: () => void;
}

// ── Bento card entrance variants ──────────────────────────────────────────────

const fadeUp = (i: number) => ({
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
});

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardTab({ tenantProfile, onRaiseTicket }: Props) {
  const [unit,      setUnit]      = useState<Unit | null>(null);
  const [prefs,     setPrefs]     = useState<MealPrefs | null>(null);
  const [nextMenu,  setNextMenu]  = useState<string[] | null>(null);
  const [bill,      setBill]      = useState<Bill | null>(null);
  const [notices,   setNotices]   = useState<Notice[]>([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    const today    = getISTDate();
    const nowMonth = today.slice(0, 7);

    await Promise.all([
      // Unit / room info  — SELECT units JOIN properties
      (async () => {
        if (!tenantProfile.room_id) return;
        const { data } = await supabase
          .from('units')
          .select('room_number, status, lease_end_date, properties(name)')
          .eq('id', tenantProfile.room_id)
          .single();
        if (data) setUnit({
          room_number: (data as any).room_number,
          status:      (data as any).status,
          lease_end_date: (data as any).lease_end_date,
          property_name: (data as any).properties?.name,
        });
      })(),

      // Meal preferences + next meal menu
      (async () => {
        const { data: p } = await supabase
          .from('tenant_meal_preferences')
          .select('meal_breakfast, meal_lunch, meal_dinner')
          .eq('tenant_id', tenantProfile.id)
          .single();
        if (!p) return;
        const mealPrefs: MealPrefs = p as MealPrefs;
        setPrefs(mealPrefs);

        const next = getNextMeal(mealPrefs);
        if (!next) return;
        const { data: menus } = await supabase
          .from('menus')
          .select('menu_items(item_name)')
          .eq('date', today)
          .eq('meal_block', next.block)
          .single();
        if (menus) {
          setNextMenu(((menus as any).menu_items as { item_name: string }[])
            .map(i => i.item_name).slice(0, 4));
        }
      })(),

      // Current electricity bill  — SELECT room_electricity_bills JOIN electricity_bills
      (async () => {
        if (!tenantProfile.room_id) return;
        const { data } = await supabase
          .from('room_electricity_bills')
          .select('total_amount, status, electricity_bills!inner(bill_month, status)')
          .eq('unit_id', tenantProfile.room_id)
          .eq('electricity_bills.status', 'published')
          .eq('electricity_bills.bill_month', nowMonth)
          .single();
        if (data) setBill({
          total_amount: (data as any).total_amount,
          status:       (data as any).status,
          bill_month:   (data as any).electricity_bills?.bill_month,
        });
      })(),

      // Recent tickets for notification feed  — SELECT tickets
      (async () => {
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id, category, status, created_at, description')
          .eq('tenant_id', tenantProfile.id)
          .order('created_at', { ascending: false })
          .limit(4);

        const feed: Notice[] = [];

        if (tickets) {
          for (const t of tickets) {
            feed.push({
              id:    t.id,
              type:  'ticket',
              title: `Ticket: ${t.category}`,
              body:  `Status changed to ${t.status}`,
              time:  new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
              read:  t.status === 'Resolved',
            });
          }
        }

        // Dues notice — inserted below once bill state is available
        setNotices(feed);
      })(),
    ]);

    setLoading(false);
  }, [tenantProfile]);

  useEffect(() => { load(); }, [load]);

  // Prepend dues notice once bill is known
  useEffect(() => {
    if (!bill) return;
    if (bill.status === 'unpaid') {
      setNotices(prev => {
        const hasDues = prev.some(n => n.type === 'dues');
        if (hasDues) return prev;
        return [{
          id:    'dues-notice',
          type:  'dues',
          title: 'Electricity Bill Due',
          body:  `₹${bill.total_amount.toLocaleString('en-IN')} for ${bill.bill_month}`,
          time:  'This month',
          read:  false,
        }, ...prev];
      });
    }
  }, [bill]);

  const nextMeal = getNextMeal(prefs);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={cn('rounded-2xl bg-white/30 h-40', i === 0 && 'md:col-span-2')} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

      {/* ── 1. Room Status  (desktop: col 1-2, row 1) ─────────────────────── */}
      <motion.div
        custom={0} initial="hidden" animate="visible" variants={fadeUp(0)}
        className="md:col-span-2 lg:col-span-2 lg:row-start-1"
      >
        <div className="soft-card border border-white bg-white/40 p-7 h-full flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">Your Room</p>
                <p className="text-3xl font-black tracking-tighter text-foreground leading-none mt-0.5">
                  {unit?.room_number ?? tenantProfile.room_id ?? '—'}
                </p>
                {unit?.property_name && (
                  <p className="text-xs font-bold text-foreground/40 mt-1">{unit.property_name}</p>
                )}
              </div>
            </div>
            <div className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-extrabold uppercase tracking-widest shrink-0',
              unit?.status === 'Occupied'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            )}>
              <CheckCircle2 className="w-3 h-3" />
              {unit?.status ?? 'Active'}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-3 pt-1 border-t border-white/60">
            <div className="soft-well border border-white px-4 py-2.5 rounded-xl">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Status</p>
              <p className="text-sm font-black text-foreground mt-0.5">{tenantProfile.status === 'active' ? 'Active Resident' : tenantProfile.status}</p>
            </div>
            {tenantProfile.move_in_date && (
              <div className="soft-well border border-white px-4 py-2.5 rounded-xl">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Move-in</p>
                <p className="text-sm font-black text-foreground mt-0.5">
                  {new Date(tenantProfile.move_in_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
            {unit?.lease_end_date && (
              <div className="soft-well border border-white px-4 py-2.5 rounded-xl">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Lease ends</p>
                <p className="text-sm font-black text-foreground mt-0.5">
                  {new Date(unit.lease_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── 2. Notification Center  (desktop: col 3, rows 1-3) ─────────────── */}
      <motion.div
        custom={1} initial="hidden" animate="visible" variants={fadeUp(1)}
        className="md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-3"
      >
        <div className="soft-card border border-white bg-white/30 p-6 h-full flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-foreground/5 flex items-center justify-center">
              <Bell className="w-4 h-4 text-foreground/50" />
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-foreground/50">Notifications</p>
            {notices.filter(n => !n.read).length > 0 && (
              <span className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-black text-white">
                {notices.filter(n => !n.read).length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[360px] lg:max-h-none scrollbar-none">
            {notices.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">All caught up!</p>
              </div>
            ) : notices.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className={cn(
                  'p-4 rounded-2xl border transition-all',
                  n.read
                    ? 'bg-foreground/3 border-foreground/8 opacity-60'
                    : n.type === 'dues'   ? 'bg-red-50    border-red-200/50'
                    : n.type === 'ticket' ? 'bg-blue-50   border-blue-200/50'
                    :                       'bg-emerald-50 border-emerald-200/50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                    n.type === 'dues'   ? 'bg-red-100    text-red-500'
                    : n.type === 'ticket' ? 'bg-blue-100  text-blue-500'
                    :                       'bg-emerald-100 text-emerald-500'
                  )}>
                    {n.type === 'dues'   ? <CreditCard  className="w-3.5 h-3.5" /> :
                     n.type === 'ticket' ? <TicketIcon  className="w-3.5 h-3.5" /> :
                                          <Gift        className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-tight text-foreground leading-none">{n.title}</p>
                    <p className="text-[11px] text-foreground/50 font-medium mt-1 leading-snug">{n.body}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                </div>
                <p className="text-[9px] font-bold text-foreground/25 uppercase tracking-widest mt-2">{n.time}</p>
              </motion.div>
            ))}

            {/* Static referral bonus notice */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="p-4 rounded-2xl border bg-secondary/5 border-secondary/20"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                  <Gift className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-tight text-foreground">Referral Bonus Active</p>
                  <p className="text-[11px] text-foreground/50 font-medium mt-1">Refer a friend and earn ₹1,000 off your next month's rent.</p>
                </div>
              </div>
              <p className="text-[9px] font-bold text-foreground/25 uppercase tracking-widest mt-2">This month</p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ── 3. Next Meal Widget  (desktop: col 1, row 2) ───────────────────── */}
      <motion.div
        custom={2} initial="hidden" animate="visible" variants={fadeUp(2)}
        className="lg:col-start-1 lg:row-start-2"
      >
        <div className="soft-card border border-white bg-white/40 p-6 h-full flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-foreground/30" />
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">Next Meal</p>
          </div>

          {nextMeal ? (
            <>
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner', nextMeal.bg)}>
                  <nextMeal.icon className={cn('w-6 h-6', nextMeal.color)} />
                </div>
                <div>
                  <p className="text-lg font-black tracking-tight text-foreground">{nextMeal.block}</p>
                  <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">{nextMeal.when}</p>
                </div>
              </div>
              {nextMenu && nextMenu.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {nextMenu.map(item => (
                    <span key={item} className="px-2.5 py-1 rounded-full bg-white/70 border border-white text-[11px] font-bold text-foreground shadow-sm">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-foreground/30 italic">Menu not set yet — check back soon.</p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2 py-2">
              <p className="text-sm font-bold text-foreground/40">No active meal subscriptions.</p>
              <p className="text-[11px] text-foreground/25">Enable meals in the Meals tab.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── 4. Dues Card  (desktop: col 2, row 2) ─────────────────────────── */}
      <motion.div
        custom={3} initial="hidden" animate="visible" variants={fadeUp(3)}
        className="lg:col-start-2 lg:row-start-2"
      >
        <div className={cn(
          'soft-card border p-6 h-full flex flex-col gap-4',
          bill?.status === 'unpaid' ? 'border-red-400/20 bg-red-500/5' : 'border-white bg-white/40'
        )}>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-foreground/30" />
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">Pending Dues</p>
          </div>

          {bill ? (
            <>
              <div>
                <p className="text-3xl font-black tracking-tighter text-foreground">
                  ₹{bill.total_amount.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mt-1">
                  Electricity · {bill.bill_month}
                </p>
              </div>
              <div className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-extrabold uppercase tracking-widest w-fit',
                bill.status === 'paid'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-600 border-red-500/20'
              )}>
                {bill.status === 'paid'
                  ? <><CheckCircle2 className="w-3 h-3" /> Paid</>
                  : <><AlertCircle  className="w-3 h-3" /> Due</>}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm font-black text-foreground">All Clear</p>
                <p className="text-[11px] text-foreground/30">No pending dues this month.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── 5. Quick Action CTA  (desktop: col 1-2, row 3) ─────────────────── */}
      <motion.div
        custom={4} initial="hidden" animate="visible" variants={fadeUp(4)}
        className="md:col-span-2 lg:col-span-2 lg:col-start-1 lg:row-start-3"
      >
        <button
          onClick={onRaiseTicket}
          className="w-full soft-card border border-primary/20 bg-primary/5 p-6 flex items-center justify-between gap-4 hover:bg-primary/10 hover:border-primary/30 transition-all group rounded-2xl text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner group-hover:bg-primary/20 transition-colors">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-base font-black tracking-tighter uppercase text-foreground">Raise a Support Ticket</p>
              <p className="text-[11px] text-foreground/40 font-bold mt-0.5">Report maintenance, housekeeping, or any concern</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-primary/50 shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>

    </div>
  );
}
