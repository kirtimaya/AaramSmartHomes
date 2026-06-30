'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  UserMinus, Clock, ChevronLeft, ChevronRight,
  ClipboardCheck, Truck, Key, Home, MapPin,
  Phone, Mail, X, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────
type TenantRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  room_id: string | null;
  property_id: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
  status: string;
};
type RoomRow = { id: string; name: string; property_id: string };
type PropertyRow = { id: string; name: string; location: string };

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const entry = Object.entries(localStorage).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (!entry) return {};
  try {
    const token = JSON.parse(entry[1])?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

function calcProgress(t: TenantRow): number {
  let done = 0;
  if (t.status === 'notice' || t.move_out_date) done++;
  if (t.move_out_date) done++;
  return Math.round((done / 2) * 100);
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub: string }) {
  return (
    <div className="soft-card p-6 border border-white space-y-4 bg-white/40">
      <div className="flex justify-between items-start">
        <div className="w-12 h-12 rounded-2xl bg-white soft-ui-out border border-white flex items-center justify-center shadow-lg shadow-black/5">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-foreground/30">{label}</p>
          <h4 className="text-3xl font-bold tracking-tighter text-foreground">{value}</h4>
        </div>
      </div>
      <div className="pt-2 border-t border-white/40">
        <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest">{sub}</p>
      </div>
    </div>
  );
}

function StatusIcon({ icon: Icon, active, label }: { icon: React.ElementType; active?: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center border',
        active ? 'bg-secondary text-white border-secondary shadow-md scale-110' : 'bg-white/50 text-foreground/20 border-white soft-ui-out',
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <span className={cn('text-[8px] font-extrabold uppercase tracking-widest', active ? 'text-secondary' : 'text-foreground/20')}>
        {label}
      </span>
    </div>
  );
}

function ContactModal({ tenant, onClose }: { tenant: TenantRow; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="soft-card border border-white bg-background w-full max-w-xs rounded-2xl p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Contact Tenant</p>
          <button onClick={onClose} className="text-foreground/30 hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <p className="font-bold text-lg text-foreground tracking-tight">{tenant.name}</p>
        </div>
        <div className="space-y-3">
          {tenant.phone && (
            <a href={`tel:${tenant.phone}`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl soft-well border border-white hover:bg-white/60 transition-colors w-full">
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Phone</p>
                <p className="text-sm font-bold text-foreground">{tenant.phone}</p>
              </div>
            </a>
          )}
          {tenant.email && (
            <a href={`mailto:${tenant.email}`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl soft-well border border-white hover:bg-white/60 transition-colors w-full">
              <Mail className="w-4 h-4 text-secondary shrink-0" />
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Email</p>
                <p className="text-sm font-bold text-foreground truncate">{tenant.email}</p>
              </div>
            </a>
          )}
          {!tenant.phone && !tenant.email && (
            <p className="text-center text-[11px] font-bold text-foreground/30 uppercase tracking-widest py-4">
              No contact info on file
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MoveOutsPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [tenants, setTenants]       = useState<TenantRow[]>([]);
  const [rooms, setRooms]           = useState<RoomRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actionMap, setActionMap]   = useState<Record<string, 'loading' | 'done'>>({});
  const [contactTenant, setContactTenant] = useState<TenantRow | null>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: tData } = await supabase
      .from('tenants')
      .select('id, name, email, phone, room_id, property_id, move_in_date, move_out_date, status')
      .or('status.eq.notice,move_out_date.not.is.null')
      .neq('status', 'moved_out')
      .order('move_out_date', { ascending: true, nullsFirst: false });

    const rows = (tData ?? []) as TenantRow[];

    const roomIds = [...new Set(rows.map(t => t.room_id).filter(Boolean))] as string[];
    const propIds = [...new Set(rows.map(t => t.property_id).filter(Boolean))] as string[];

    const [rRes, pRes] = await Promise.all([
      roomIds.length ? supabase.from('rooms').select('id, name, property_id').in('id', roomIds) : { data: [] },
      propIds.length ? supabase.from('properties').select('id, name, location').in('id', propIds) : { data: [] },
    ]);

    setTenants(rows);
    setRooms((rRes.data ?? []) as RoomRow[]);
    setProperties((pRes.data ?? []) as PropertyRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const markMovedOut = async (tenantId: string) => {
    setActionMap(m => ({ ...m, [tenantId]: 'loading' }));
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status: 'moved_out' }),
      });
      if (!res.ok) throw new Error();
      setActionMap(m => ({ ...m, [tenantId]: 'done' }));
      showToast('Tenant marked as moved out');
      setTimeout(() => setTenants(prev => prev.filter(t => t.id !== tenantId)), 800);
    } catch {
      setActionMap(m => { const n = { ...m }; delete n[tenantId]; return n; });
      showToast('Failed to update status', false);
    }
  };

  // Filter by selected month (tenants with move_out_date in this month, OR notice tenants without date)
  const filteredTenants = tenants.filter(t => {
    if (!t.move_out_date) return true;
    const d = new Date(t.move_out_date);
    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
  });

  const upcomingIn7 = filteredTenants.filter(t => {
    const d = daysUntil(t.move_out_date);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  const noDateSet = filteredTenants.filter(t => !t.move_out_date).length;

  const prevMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <AdminLayout>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-[11px] font-extrabold uppercase tracking-widest shadow-lg',
              toast.ok ? 'bg-secondary text-white' : 'bg-primary text-white',
            )}
          >
            {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Modal */}
      <AnimatePresence>
        {contactTenant && (
          <ContactModal tenant={contactTenant} onClose={() => setContactTenant(null)} />
        )}
      </AnimatePresence>

      <div className="space-y-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">Transition Management</h1>
            <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-[0.2em]">Tenant Move-Outs & Unit Prep</p>
          </div>

          <div className="flex items-center gap-4 soft-well p-1.5 border border-white bg-white/40">
            <button onClick={prevMonth} className="soft-button w-10 h-10 border border-white">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-6 text-xs font-extrabold uppercase tracking-[0.2em] text-foreground">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            <button onClick={nextMonth} className="soft-button w-10 h-10 border border-white">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <SummaryCard icon={UserMinus}      label="Pending Vacancies"  value={String(filteredTenants.length)} sub="This month" />
          <SummaryCard icon={ClipboardCheck} label="Move-out in 7 Days" value={String(upcomingIn7)}            sub="Immediate attention" />
          <SummaryCard icon={Key}            label="Date Not Confirmed"  value={String(noDateSet)}              sub="Needs scheduling" />
        </div>

        {/* List */}
        <div className="space-y-6">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-foreground/40 px-2 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Upcoming Transitions
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="soft-card border border-white p-16 text-center">
              <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-widest">
                No move-outs for {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredTenants.map((tenant, idx) => {
                const room     = rooms.find(r => r.id === tenant.room_id);
                const property = properties.find(p => p.id === (tenant.property_id ?? room?.property_id));
                const progress = calcProgress(tenant);
                const days     = daysUntil(tenant.move_out_date);
                const state    = actionMap[tenant.id];

                return (
                  <motion.div
                    key={tenant.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: state === 'done' ? 0 : 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="soft-card p-0 overflow-hidden border border-white flex flex-col lg:flex-row"
                  >
                    {/* Date Badge */}
                    <div className="bg-primary/5 p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/40 min-w-[160px]">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary/60">Departure</span>
                      <span className="text-4xl font-bold tracking-tighter text-primary">
                        {tenant.move_out_date ? new Date(tenant.move_out_date).getDate() : '--'}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary/60">
                        {tenant.move_out_date
                          ? new Date(tenant.move_out_date).toLocaleString('default', { month: 'short', year: '2-digit' })
                          : 'TBD'}
                      </span>
                      {days !== null && (
                        <span className={cn(
                          'mt-2 text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full',
                          days < 0   ? 'bg-foreground/10 text-foreground/40'
                          : days <= 3 ? 'bg-primary/15 text-primary'
                          : days <= 7 ? 'bg-amber-500/15 text-amber-600'
                          : 'bg-secondary/10 text-secondary',
                        )}>
                          {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`}
                        </span>
                      )}
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl soft-ui-out border border-white flex items-center justify-center text-primary font-bold bg-white/50 text-lg shrink-0">
                            {tenant.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-foreground leading-tight">{tenant.name}</h3>
                            <span className={cn(
                              'text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border',
                              tenant.status === 'notice' ? 'border-amber-400/30 text-amber-600 bg-amber-50' : 'border-primary/20 text-primary bg-primary/5',
                            )}>
                              {tenant.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {room && property && (
                            <div className="flex items-center gap-2 text-[11px] font-bold text-foreground/50">
                              <Home className="w-3.5 h-3.5 text-primary" />
                              {property.name} · {room.name}
                            </div>
                          )}
                          {property && (
                            <div className="flex items-center gap-2 text-[11px] font-bold text-foreground/50">
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              {property.location}
                            </div>
                          )}
                          {tenant.move_in_date && (
                            <div className="text-[11px] font-bold text-foreground/40">
                              Moved in: {new Date(tenant.move_in_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">
                          <span>Preparation Status</span>
                          <span className="text-secondary">{progress}% Complete</span>
                        </div>
                        <div className="h-2 w-full bg-white/60 rounded-full soft-ui-in shadow-inner overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.05 }}
                            className="h-full bg-secondary rounded-full shadow-sm"
                          />
                        </div>
                        <div className="flex gap-4">
                          <StatusIcon icon={ClipboardCheck} active={tenant.status === 'notice' || !!tenant.move_out_date} label="Notice" />
                          <StatusIcon icon={Truck}          active={!!tenant.move_out_date}  label="Date Set" />
                          <StatusIcon icon={Key}            active={false}                   label="Vacated" />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-8 bg-white/20 border-t lg:border-t-0 lg:border-l border-white/40 flex flex-row lg:flex-col justify-center gap-4">
                      <button
                        onClick={() => setContactTenant(tenant)}
                        className="soft-button flex-1 py-3 px-6 text-[11px] font-extrabold uppercase tracking-widest border border-white hover:text-primary transition-all whitespace-nowrap"
                      >
                        Contact
                      </button>
                      <button
                        onClick={() => markMovedOut(tenant.id)}
                        disabled={!!state}
                        className={cn(
                          'flex-1 py-3 px-6 text-[11px] font-extrabold uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center gap-2',
                          state === 'done'
                            ? 'bg-secondary/10 text-secondary border border-secondary/20 rounded-2xl'
                            : 'btn-terracotta shadow-md',
                        )}
                      >
                        {state === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {state === 'done'    ? 'Moved Out ✓' : 'Mark Moved Out'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
