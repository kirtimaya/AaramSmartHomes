'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wifi,
  Coffee,
  Dumbbell,
  Bell,
  Wind,
  ShieldCheck,
  UtensilsCrossed,
  MessageSquare,
  CreditCard,
  ChevronRight,
  Plus,
  LogOut,
  Settings,
  Home,
  Star,
  Shield,
  User,
  Zap,
  Leaf,
  Heart,
  Calendar,
  Phone,
  CheckCircle2,
  Building2,
  Waves,
  MapPin,
  Sparkles,
  Utensils,
  Coffee as CoffeeIcon,
  Moon,
  SkipForward,
  RotateCcw,
  Loader2,
  Info,
  Upload,
  Lock,
  ChevronDown,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Tenant, Property, RoomElectricityBill, ElectricityBill, BillSplit, Notification } from '@/lib/types';

import { supabase } from '@/lib/supabase';

// ── Meal types ────────────────────────────────────────────────────────────────

type MealBlock = 'Breakfast' | 'Lunch' | 'Dinner';

interface MealPrefs {
  meal_breakfast: boolean;
  meal_lunch: boolean;
  meal_dinner: boolean;
}

interface TodayMenuItem {
  item_name: string;
  sort_order: number;
}

interface TodayMenu {
  block: MealBlock;
  items: TodayMenuItem[];
}

function getISTDate() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const BLOCK_META: Record<MealBlock, { label: string; time: string; icon: React.ElementType; color: string; bg: string }> = {
  Breakfast: { label: 'Breakfast', time: '8:00 – 10:00 AM', icon: CoffeeIcon, color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/20' },
  Lunch:     { label: 'Lunch',     time: '1:00 – 3:00 PM',  icon: Utensils,  color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Dinner:    { label: 'Dinner',    time: '8:30 – 10:30 PM', icon: Moon,      color: 'text-blue-600',   bg: 'bg-blue-500/10 border-blue-500/20' },
};

// ── Meals Tab ─────────────────────────────────────────────────────────────────

function MealsTab({ userId }: { userId: string }) {
  const [prefs, setPrefs]             = useState<MealPrefs>({ meal_breakfast: true, meal_lunch: true, meal_dinner: true });
  const [todayMenus, setTodayMenus]   = useState<TodayMenu[]>([]);
  const [skips, setSkips]             = useState<Set<MealBlock>>(new Set());
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [saving, setSaving]           = useState(false);
  const [skipSaving, setSkipSaving]   = useState<MealBlock | null>(null);
  const [toast, setToast]             = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const today = getISTDate();

  const loadData = useCallback(async () => {
    setLoadingPrefs(true);

    // Load preferences, today's menus, and today's skips in parallel
    const [prefsRes, menusRes, skipsRes] = await Promise.all([
      supabase.from('tenant_meal_preferences').select('*').eq('tenant_id', userId).single(),
      supabase
        .from('menus')
        .select('meal_block, menu_items(item_name, sort_order)')
        .eq('date', today),
      supabase
        .from('meal_skip_requests')
        .select('meal_block')
        .eq('tenant_id', userId)
        .eq('skip_date', today),
    ]);

    if (prefsRes.data) {
      setPrefs({
        meal_breakfast: prefsRes.data.meal_breakfast,
        meal_lunch:     prefsRes.data.meal_lunch,
        meal_dinner:    prefsRes.data.meal_dinner,
      });
    }

    if (menusRes.data) {
      const menus: TodayMenu[] = (menusRes.data as any[]).map(m => ({
        block: m.meal_block as MealBlock,
        items: ((m.menu_items as any[]) ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));
      setTodayMenus(menus);
    }

    if (skipsRes.data) {
      setSkips(new Set(skipsRes.data.map((s: { meal_block: string }) => s.meal_block as MealBlock)));
    }

    setLoadingPrefs(false);
  }, [userId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  const savePrefs = async (newPrefs: MealPrefs) => {
    setSaving(true);
    await supabase
      .from('tenant_meal_preferences')
      .upsert({ tenant_id: userId, ...newPrefs, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' });
    setSaving(false);
    showToast('Meal preferences saved.');
  };

  const togglePref = async (block: MealBlock) => {
    const key = `meal_${block.toLowerCase()}` as keyof MealPrefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await savePrefs(next);
  };

  const toggleSkip = async (block: MealBlock) => {
    setSkipSaving(block);
    const alreadySkipped = skips.has(block);

    if (alreadySkipped) {
      await supabase
        .from('meal_skip_requests')
        .delete()
        .eq('tenant_id', userId)
        .eq('skip_date', today)
        .eq('meal_block', block);
      setSkips(prev => { const s = new Set(prev); s.delete(block); return s; });
      showToast(`${block} skip removed — you're back on the list.`);
    } else {
      await supabase
        .from('meal_skip_requests')
        .upsert({ tenant_id: userId, skip_date: today, meal_block: block }, { onConflict: 'tenant_id,skip_date,meal_block' });
      setSkips(prev => new Set([...prev, block]));
      showToast(`${block} skipped for today.`);
    }
    setSkipSaving(null);
  };

  const subscribedBlocks: MealBlock[] = (['Breakfast', 'Lunch', 'Dinner'] as MealBlock[]).filter(b => {
    const key = `meal_${b.toLowerCase()}` as keyof MealPrefs;
    return prefs[key];
  });

  if (loadingPrefs) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Subscription panel */}
      <section className="soft-card p-8 border border-white bg-white/40 space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Utensils className="w-4 h-4" />
            </span>
            My Meal Plan
          </h2>
          <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest mt-1 ml-11">
            Toggle which meals are included in your subscription
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['Breakfast', 'Lunch', 'Dinner'] as MealBlock[]).map(block => {
            const meta = BLOCK_META[block];
            const Icon = meta.icon;
            const key  = `meal_${block.toLowerCase()}` as keyof MealPrefs;
            const on   = prefs[key];

            return (
              <motion.button
                key={block}
                whileTap={{ scale: 0.97 }}
                onClick={() => togglePref(block)}
                disabled={saving}
                className={cn(
                  'relative flex flex-col gap-3 p-6 rounded-2xl border text-left transition-all',
                  on
                    ? `${meta.bg} shadow-sm`
                    : 'bg-foreground/5 border-foreground/10 opacity-60'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', on ? meta.bg : 'bg-foreground/10')}>
                    <Icon className={cn('w-5 h-5', on ? meta.color : 'text-foreground/30')} />
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                    on ? 'bg-primary border-primary' : 'border-foreground/20 bg-white'
                  )}>
                    {on && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <div>
                  <p className={cn('text-sm font-black uppercase tracking-tight', on ? 'text-foreground' : 'text-foreground/40')}>{meta.label}</p>
                  <p className="text-[10px] text-foreground/40 font-bold mt-0.5">{meta.time}</p>
                </div>
                {!on && (
                  <span className="absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/30 tracking-widest">
                    Off
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Today's meals + skip controls */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
              <Calendar className="w-4 h-4" />
            </span>
            Today's Menu
          </h2>
          <span className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
        </div>

        {subscribedBlocks.length === 0 ? (
          <div className="soft-card p-10 border border-white text-center space-y-3">
            <p className="text-foreground/30 font-bold text-sm">No meals subscribed.</p>
            <p className="text-[11px] text-foreground/20">Toggle on at least one meal above to see today's menu.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subscribedBlocks.map(block => {
              const meta     = BLOCK_META[block];
              const Icon     = meta.icon;
              const menu     = todayMenus.find(m => m.block === block);
              const skipped  = skips.has(block);
              const isSaving = skipSaving === block;

              return (
                <motion.div
                  key={block}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'soft-card p-6 border transition-all',
                    skipped ? 'border-red-400/20 bg-red-500/5 opacity-70' : 'border-white bg-white/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner', meta.bg)}>
                        <Icon className={cn('w-5 h-5', meta.color)} />
                      </div>
                      <div>
                        <p className={cn('text-xs font-black uppercase tracking-widest', meta.color)}>{meta.label}</p>
                        <p className="text-[10px] text-foreground/40 font-bold">{meta.time}</p>
                      </div>
                    </div>

                    {/* Skip toggle */}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleSkip(block)}
                      disabled={isSaving}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                        skipped
                          ? 'bg-white text-emerald-600 border-emerald-400/30 hover:bg-emerald-50'
                          : 'bg-red-50 text-red-500 border-red-400/20 hover:bg-red-100'
                      )}
                    >
                      {isSaving
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : skipped
                          ? <RotateCcw className="w-3 h-3" />
                          : <SkipForward className="w-3 h-3" />}
                      {skipped ? 'Undo Skip' : 'Skip Today'}
                    </motion.button>
                  </div>

                  {/* Menu items */}
                  {skipped ? (
                    <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/5 border border-red-400/10">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                        You've opted out of {block.toLowerCase()} today
                      </p>
                    </div>
                  ) : menu?.items.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {menu.items.map(item => (
                        <span key={item.item_name} className="px-3 py-1.5 rounded-full bg-white/60 border border-white text-xs font-bold text-foreground shadow-sm">
                          {item.item_name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-[11px] text-foreground/30 italic">Menu not set yet — check back soon.</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

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

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function UnifiedUserDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'meals' | 'support'>('home');
  const [tenantProfile, setTenantProfile] = useState<Tenant | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [electricityBill, setElectricityBill] = useState<(RoomElectricityBill & { electricity_bills: ElectricityBill }) | null>(null);

  // New bill splitting state
  const [billStatus, setBillStatus] = useState<{ id?: string; status: string | null; uploaded_by_name?: string; uploaded_at?: string; rejection_reason?: string } | null>(null);
  const [billSplit, setBillSplit] = useState<{ bill: ElectricityBill; my_split: BillSplit; summary: { tenant_name: string; total_payable: number; room_id: string }[] } | null>(null);
  const [acSubmission, setAcSubmission] = useState<{ ac_units_submitted: number } | null>(null);
  const [tenantRoom, setTenantRoom] = useState<{ has_ac: boolean; property_id: string; name: string } | null>(null);
  const [acInput, setAcInput] = useState('');
  const [acSubmitting, setAcSubmitting] = useState(false);
  const [billUploading, setBillUploading] = useState(false);
  const [splitExpanded, setSplitExpanded] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        fetchProfileAndData();
      }
    }
  }, [user, loading, router]);

  const fetchProfileAndData = async () => {
    setDashboardLoading(true);
    try {
      // 1. Fetch Tenant Profile
      const { data: profile, error: profileError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', user?.id)
        .single();

      let currentProfile: Tenant;

      if (profileError || !profile) {
        // Not a tenant — redirect to guest portal
        router.push('/guest');
        return;
      }
      currentProfile = profile as Tenant;

      setTenantProfile(currentProfile);

      // 2. Fetch All Properties
      const { data: props, error: propsError } = await supabase
        .from('properties')
        .select('*');

      if (!propsError && props) {
        setProperties(props as Property[]);
      }

      // 3. Fetch current month electricity sub-bill for this tenant's unit (legacy)
      //    Uses room_id column — if this table doesn't exist or column name differs,
      //    the query returns null and is silently skipped.
      if (currentProfile.room_id) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: elecBill, error: elecBillErr } = await supabase
          .from('room_electricity_bills')
          .select('*, electricity_bills!inner(*)')
          .eq('room_id', currentProfile.room_id)
          .eq('electricity_bills.status', 'published')
          .eq('electricity_bills.bill_month', currentMonth)
          .maybeSingle();
        if (!elecBillErr && elecBill) setElectricityBill(elecBill as any);

        // 4. Fetch tenant's room info (has_ac, property_id)
        const { data: roomData } = await supabase
          .from('rooms')
          .select('id, has_ac, property_id, name')
          .eq('id', currentProfile.room_id)
          .single();
        if (roomData) setTenantRoom(roomData as any);

        // 5. Fetch bill status for this property/month
        if (roomData?.property_id) {
          const { data: billStatusData } = await supabase
            .from('electricity_bills')
            .select('id, status, rejection_reason, uploaded_by_name, created_at')
            .eq('property_id', roomData.property_id)
            .eq('bill_month', `${currentMonth}-01`)
            .not('status', 'eq', 'rejected')
            .maybeSingle();
          setBillStatus(billStatusData
            ? { id: billStatusData.id, status: billStatusData.status, uploaded_by_name: billStatusData.uploaded_by_name, uploaded_at: billStatusData.created_at, rejection_reason: billStatusData.rejection_reason }
            : { status: null }
          );

          // 6. If bill exists and validated/split/locked, get AC submission
          if (billStatusData?.id) {
            const { data: submissionData } = await supabase
              .from('tenant_ac_submissions')
              .select('ac_units_submitted')
              .eq('bill_id', billStatusData.id)
              .eq('room_id', currentProfile.room_id)
              .maybeSingle();
            if (submissionData) {
              setAcSubmission(submissionData);
              setAcInput(String(submissionData.ac_units_submitted));
            }
          }

          // 7. If bill is locked, fetch bill split
          if (billStatusData?.status === 'locked') {
            const { data: splitData } = await supabase
              .from('bill_splits')
              .select('*')
              .eq('bill_id', billStatusData.id)
              .eq('room_id', currentProfile.room_id)
              .single();
            const { data: allSplitsData } = await supabase
              .from('bill_splits')
              .select('tenant_name, total_payable, room_id')
              .eq('bill_id', billStatusData.id)
              .order('tenant_name');
            if (splitData) {
              setBillSplit({
                bill: { ...billStatusData, bill_month: billStatusData.id } as any,
                my_split: splitData,
                summary: allSplitsData || [],
              });
            }
          }
        }
      }
      // 8. Fetch notifications
      const notifsRes = await fetch('/api/notifications', { headers: getAuthHeader() as Record<string, string> });
      if (notifsRes.ok) {
        const { notifications: n } = await notifsRes.json();
        if (n) setNotifications(n);
      }
    } catch (err) {
      console.error('Dashboard initialization error:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Poll notifications every 30s
  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch('/api/notifications', { headers: getAuthHeader() as Record<string, string> });
      if (res.ok) {
        const { notifications: n } = await res.json();
        if (n) setNotifications(n);
      }
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const markNotifRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH', headers: getAuthHeader() as Record<string, string> });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  if (loading || dashboardLoading || !user || !tenantProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 text-center px-6">
          <div className="w-20 h-20 soft-ui-out flex items-center justify-center text-primary animate-pulse border border-white">
            <Shield className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold text-foreground/30 uppercase tracking-[0.4em]">Synchronizing Lifestyle</p>
            <p className="text-[10px] font-bold text-primary italic">Hand-crafting your sanctuary...</p>
          </div>
        </div>
      </div>
    );
  }

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member';
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const getAuthHeader = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const sbEntry = Object.entries(localStorage).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (sbEntry) {
      try {
        const token = JSON.parse(sbEntry[1])?.access_token;
        if (token) return { Authorization: `Bearer ${token}` };
      } catch { /* ignore */ }
    }
    const key = Object.keys(localStorage).find(k => k.includes('supabase') && k.includes('auth'));
    if (!key) return {};
    try {
      const session = JSON.parse(localStorage.getItem(key) || '{}');
      const token = session?.access_token || session?.currentSession?.access_token;
      if (token) return { Authorization: `Bearer ${token}` };
    } catch { /* ignore */ }
    return {};
  };

  const handleSubmitACUnits = async () => {
    if (!billStatus?.id || !acInput) return;
    setAcSubmitting(true);
    try {
      const res = await fetch(`/api/bills/${billStatus.id}/ac-units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() as Record<string, string> },
        body: JSON.stringify({ ac_units_submitted: Number(acInput) }),
      });
      if (res.ok) {
        const data = await res.json();
        setAcSubmission({ ac_units_submitted: data.ac_units_submitted });
      }
    } finally {
      setAcSubmitting(false);
    }
  };

  const handleUploadBill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantRoom?.property_id) return;
    setBillUploading(true);
    const fd = new FormData();
    fd.append('property_id', tenantRoom.property_id);
    fd.append('bill_month', new Date().toISOString().slice(0, 7));
    fd.append('image', file);
    fd.append('total_amount', '0');
    try {
      const res = await fetch('/api/bills/upload', {
        method: 'POST',
        headers: getAuthHeader() as Record<string, string>,
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setBillStatus({ id: data.id, status: data.status, uploaded_by_name: data.uploaded_by_name, uploaded_at: data.created_at });
      }
    } finally {
      setBillUploading(false);
    }
  };

  const universalBenefits = [
    { icon: Wifi, label: 'Hyper-WiFi', desc: 'Secure mesh networking across all nodes.' },
    { icon: Coffee, label: 'Kitchen Hub', desc: 'Curated meal plans and on-call chefs.' },
    { icon: ShieldCheck, label: 'Biometric Security', desc: 'Zero-touch entry via Aaram Mobile App.' },
    { icon: Sparkles, label: 'Deep Cleaning', desc: 'Weekly professional architectural care.' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 selection:bg-primary/20">
      {/* Dynamic Header */}
      <div className={cn(
        "px-6 pt-12 pb-24 rounded-b-[64px] border-b border-white transition-colors duration-1000",
        "bg-accent/40"
      )}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 text-secondary text-[10px] font-extrabold uppercase tracking-widest border border-white shadow-sm">
                <ShieldCheck className="w-3 h-3 text-primary" />
                Active Sanctuary Node
              </div>
            <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-foreground">
                Namaste, <span className="text-primary italic">{userName}</span>
            </h1>
            <p className="text-foreground/40 text-base max-w-xl font-medium leading-relaxed">
                Welcome back to your space. Everything is set to your preferences.
            </p>
          </div>
          <div className="flex items-center gap-4">
             {/* Notification Bell */}
             <div className="relative">
               <button
                 onClick={() => setShowNotifs(v => !v)}
                 className="soft-button w-14 h-14 border border-white shadow-xl relative"
               >
                 <Bell className="w-6 h-6 text-foreground/40" />
                 {unreadCount > 0 && (
                   <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                     {unreadCount}
                   </span>
                 )}
               </button>
               <AnimatePresence>
                 {showNotifs && (
                   <motion.div
                     initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                     className="absolute right-0 top-16 w-80 soft-card border border-white bg-background/95 backdrop-blur z-50 p-3 space-y-2 max-h-80 overflow-y-auto shadow-2xl"
                   >
                     <p className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 px-1">Notifications</p>
                     {notifications.length === 0 && (
                       <p className="text-xs text-foreground/30 text-center py-4">All caught up!</p>
                     )}
                     {notifications.map(n => (
                       <button key={n.id} onClick={() => markNotifRead(n.id)}
                         className={cn('w-full text-left p-3 rounded-xl text-xs space-y-0.5 transition-all', n.read ? 'opacity-50' : 'bg-primary/5 border border-primary/10')}>
                         <p className="font-bold text-foreground">{n.title}</p>
                         <p className="text-foreground/50 text-[10px] leading-relaxed">{n.message}</p>
                       </button>
                     ))}
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
             <button
                onClick={handleSignOut}
                className="soft-button w-14 h-14 border border-white text-red-300 group hover:text-red-500 shadow-xl"
              >
                <LogOut className="w-6 h-6 transition-transform group-hover:scale-110" />
              </button>
             <button className="soft-button w-14 h-14 border border-white shadow-xl">
                <Settings className="w-6 h-6 text-foreground/40" />
              </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-12 space-y-12">
        {/* Navigation Tabs */}
        <div className="flex justify-center">
            <div className="flex gap-2 p-2 soft-ui-out bg-white/80 backdrop-blur-md border border-white w-fit rounded-[24px] shadow-2xl">
               <>
                 <button onClick={() => setActiveTab('home')} className={cn("tab-user", activeTab === 'home' && "active")}>Home</button>
                 <button onClick={() => setActiveTab('meals')} className={cn("tab-user", activeTab === 'meals' && "active")}>Meals</button>
                 <button onClick={() => setActiveTab('support')} className={cn("tab-user", activeTab === 'support' && "active")}>Concierge</button>
               </>
            </div>
        </div>

        <AnimatePresence mode="wait">
            {activeTab === 'home' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="soft-card p-8 border border-white space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">Your Unit</p>
                                <p className="text-2xl font-black text-foreground">101A • Master Duplex</p>
                            </div>
                        </div>
                        <div className="soft-card p-8 border border-white space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/5 flex items-center justify-center text-secondary shadow-inner">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">Automation</p>
                                <p className="text-2xl font-black text-foreground">8 Nodes Active</p>
                            </div>
                        </div>
                        <div className="soft-card p-8 border border-white space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center text-foreground/40 shadow-inner">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">Electricity Dues</p>
                                {billSplit ? (
                                  <p className="text-2xl font-black text-foreground">
                                    ₹{Number(billSplit.my_split.total_payable).toLocaleString('en-IN')}
                                    <span className={cn('text-[10px] font-bold ml-1', billSplit.my_split.paid ? 'text-emerald-500' : 'text-primary')}>
                                      {billSplit.my_split.paid ? 'PAID' : 'DUE'}
                                    </span>
                                  </p>
                                ) : (
                                  <p className="text-2xl font-black text-foreground/30">—</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Electricity Sub-bill card */}
                    {electricityBill && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="soft-card border border-amber-500/20 bg-amber-500/5 p-8 space-y-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-inner">
                              <Zap className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-extrabold uppercase tracking-widest text-foreground/40">Electricity Bill</p>
                              <p className="text-sm font-black text-foreground uppercase">
                                {(electricityBill as any).electricity_bills?.bill_month}
                              </p>
                            </div>
                          </div>
                          <p className="text-3xl font-black text-primary tracking-tighter">
                            ₹{electricityBill.total_amount.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-amber-500/10">
                          <div className="soft-well border border-white p-3">
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 mb-0.5 flex items-center gap-1">
                              <Wind className="w-3 h-3 text-blue-500" /> AC Charge
                            </p>
                            <p className="text-lg font-black text-blue-600">₹{electricityBill.ac_amount.toLocaleString('en-IN')}</p>
                            <p className="text-[9px] text-foreground/30 font-bold">{electricityBill.ac_units} units</p>
                          </div>
                          <div className="soft-well border border-white p-3">
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 mb-0.5 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-amber-500" /> Common Share
                            </p>
                            <p className="text-lg font-black text-amber-600">₹{electricityBill.common_share_amount.toLocaleString('en-IN')}</p>
                            <p className="text-[9px] text-foreground/30 font-bold">{Number(electricityBill.common_share_units.toFixed(1))} units</p>
                          </div>
                        </div>
                        <div className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest border',
                          electricityBill.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-600 border-red-500/20'
                        )}>
                          {electricityBill.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                          {electricityBill.status === 'paid' ? 'Paid' : 'Payment Due'}
                        </div>
                      </motion.div>
                    )}

                    {/* ── Upload Electricity Bill Card ── */}
                    {tenantRoom && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="soft-card border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-inner">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Electricity Bill</p>
                            <p className="text-sm font-black text-foreground uppercase">
                              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        {billStatus?.status === null || !billStatus ? (
                          <label className={cn('w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer transition-all',
                            billUploading ? 'bg-foreground/10 text-foreground/40' : 'bg-amber-500 text-white shadow-lg')}>
                            {billUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {billUploading ? 'Uploading...' : `Upload Bill for ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`}
                            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUploadBill} disabled={billUploading} />
                          </label>
                        ) : billStatus.status === 'rejected' ? (
                          <div className="space-y-2">
                            <p className="text-xs text-red-600 font-bold">Bill was rejected: {billStatus.rejection_reason}</p>
                            <label className="w-full py-3 rounded-xl bg-amber-500 text-white flex items-center justify-center gap-2 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer">
                              <Upload className="w-4 h-4" /> Re-upload Bill
                              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUploadBill} />
                            </label>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <button disabled className="w-full py-3 rounded-xl bg-foreground/10 text-foreground/40 text-[10px] font-extrabold uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              Bill already uploaded for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                            </button>
                            <p className="text-[9px] text-foreground/40 font-bold text-center">
                              Uploaded by {billStatus.uploaded_by_name || 'someone'} · {billStatus.uploaded_at ? new Date(billStatus.uploaded_at).toLocaleDateString('en-IN') : ''}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* ── AC Units Submission Card ── */}
                    {tenantRoom?.has_ac && billStatus?.id && billStatus.status !== 'locked' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="soft-card border border-blue-500/20 bg-blue-500/5 p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner">
                            <Wind className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">AC Units</p>
                            <p className="text-sm font-black text-foreground uppercase">
                              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        {billStatus.status === 'validated' || billStatus.status === 'split_calculated' ? (
                          <div className="flex gap-2 items-center">
                            <input type="number" min="0" value={acInput} onChange={e => setAcInput(e.target.value)}
                              placeholder="Units used this month"
                              className="soft-ui-in flex-1 bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
                            <button onClick={handleSubmitACUnits} disabled={acSubmitting || !acInput}
                              className="px-4 py-2 rounded-xl bg-blue-500 text-white text-[10px] font-extrabold uppercase tracking-widest disabled:opacity-50 flex items-center gap-1.5">
                              {acSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              {acSubmission ? 'Update' : 'Submit'}
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-foreground/40 font-bold">AC submission available once bill is validated.</p>
                        )}
                        {acSubmission && (
                          <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest">
                            Submitted: {acSubmission.ac_units_submitted} units
                          </p>
                        )}
                      </motion.div>
                    )}

                    {/* ── My Bill Share Card ── */}
                    {billSplit ? (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="soft-card border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner">
                              <Lock className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">My Electricity Share</p>
                              <p className="text-sm font-black text-foreground uppercase">
                                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <p className="text-3xl font-black text-emerald-700 tracking-tighter">
                            ₹{Number(billSplit.my_split.total_payable).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 border-t border-emerald-500/10 pt-3">
                          <div className="soft-well border border-white p-3">
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 mb-0.5 flex items-center gap-1">
                              <Wind className="w-3 h-3 text-blue-500" /> AC Charge
                            </p>
                            <p className="text-lg font-black text-blue-600">₹{Number(billSplit.my_split.ac_charge).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="soft-well border border-white p-3">
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 mb-0.5 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-amber-500" /> Common Share
                            </p>
                            <p className="text-lg font-black text-amber-600">₹{Number(billSplit.my_split.common_share).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        <button onClick={() => setSplitExpanded(!splitExpanded)}
                          className="w-full text-[9px] font-extrabold uppercase tracking-widest text-foreground/40 flex items-center justify-center gap-1.5">
                          All Tenants <ChevronDown className={cn('w-3 h-3 transition-transform', splitExpanded && 'rotate-180')} />
                        </button>
                        {splitExpanded && (
                          <div className="space-y-1.5">
                            {billSplit.summary.map((s, i) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <span className="font-bold text-foreground/60">{s.tenant_name}</span>
                                <span className="font-black text-foreground">₹{Number(s.total_payable).toLocaleString('en-IN')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ) : billStatus?.status && billStatus.status !== 'locked' && tenantRoom && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="soft-card border border-foreground/10 bg-white/30 p-6 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-foreground/5 flex items-center justify-center text-foreground/30 shadow-inner">
                            <Lock className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">My Electricity Share</p>
                            <p className="text-sm font-bold text-foreground/40 uppercase">
                              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-foreground/40">Pending — bill is being processed</p>
                      </motion.div>
                    )}

                    <div className="soft-card p-10 border border-white bg-white/40 flex flex-col md:flex-row gap-10 items-center">
                        <div className="space-y-4 flex-1">
                            <h2 className="text-3xl font-black tracking-tighter uppercase">Living Area Status</h2>
                            <p className="text-foreground/45 max-w-sm text-sm">Light levels are optimized for mid-day focus. AC is set to 22°C Energy Saver mode.</p>
                            <div className="flex gap-4 pt-2">
                                <button className="soft-button px-6 py-3 border border-white text-[10px] font-extrabold uppercase tracking-widest">Adjust Climate</button>
                                <button className="btn-terracotta px-6 py-3 text-[10px] font-extrabold uppercase tracking-widest shadow-lg">Scene: Relax</button>
                            </div>
                        </div>
                        <div className="w-full md:w-64 h-64 soft-ui-out bg-white/50 rounded-[48px] border border-white flex items-center justify-center relative overflow-hidden group">
                           <Shield className="w-20 h-20 text-primary/10 transition-transform duration-1000 group-hover:scale-125" />
                           <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/30">Security Status</p>
                               <p className="text-lg font-black text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-5 h-5" /> FORTIFIED</p>
                           </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {activeTab === 'meals' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <MealsTab userId={tenantProfile.id} />
                </motion.div>
            )}

            {activeTab === 'support' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-12 py-10">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl font-black tracking-tighter uppercase">Direct Line to Aaram</h2>
                        <p className="text-foreground/40 text-lg uppercase tracking-widest font-bold">Priority Connect Node</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="soft-card p-10 border border-white space-y-8 bg-white/60">
                             <div className="space-y-2">
                                <h3 className="text-xl font-bold uppercase tracking-tight">Speak with a Lead</h3>
                                <p className="text-xs text-foreground/40 leading-relaxed font-bold">Instant connection with our property managers regarding visits or stay details.</p>
                             </div>
                             <div className="space-y-4">
                                <button className="w-full btn-terracotta py-5 flex items-center justify-center gap-3 text-sm font-bold shadow-2xl">
                                    <Phone className="w-5 h-5" />
                                    Call Management
                                </button>
                                <button className="w-full soft-button py-5 flex items-center justify-center gap-3 text-sm font-bold border border-white bg-white/40">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                    WhatsApp Concierge
                                </button>
                             </div>
                        </div>

                        <div className="soft-card p-10 border border-white space-y-8 bg-secondary/5">
                             <div className="space-y-2">
                                <h3 className="text-xl font-bold uppercase tracking-tight">Request Documentation</h3>
                                <p className="text-xs text-foreground/40 leading-relaxed font-bold">Get digital copies of floor plans, rental agreements, or community guidelines.</p>
                             </div>
                             <div className="space-y-4">
                                <div className="soft-well p-4 border border-white flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Agreement Template</span>
                                    <Plus className="w-4 h-4 text-primary cursor-pointer" />
                                </div>
                                <div className="soft-well p-4 border border-white flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Floor Plan - p1 Duplex</span>
                                    <Plus className="w-4 h-4 text-primary cursor-pointer" />
                                </div>
                             </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .tab-user {
            padding: 10px 24px;
            border-radius: 16px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        }
        .tab-user.active {
            background: #E07A5F;
            color: white;
            box-shadow: 0 10px 20px -10px rgba(224, 122, 95, 0.4);
            transform: scale(1.05);
        }
        .tab-user:not(.active):hover {
            background: rgba(255,255,255,0.8);
            color: black;
        }
      `}</style>
    </div>
  );
}
