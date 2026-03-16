'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { cn } from '@/lib/utils';
import {
  IndianRupee, ArrowUpRight, ArrowDownRight, Activity,
  Plus, Edit2, Trash2, X, Check, Loader2, Leaf, Zap, Sofa,
  Smartphone, Home, ChevronDown, ChevronUp, TrendingUp, Save,
  Building2, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/lib/supabase';
import { Property, Room } from '@/lib/types';

// ─── Types ─────────────────────────────────────────────────────────────────
type ExpenseCategory = 'smart_devices' | 'organic_nature' | 'furniture' | 'maintenance' | 'utilities' | 'other';

type ExpenseItem = {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  property_id?: string; // undefined = overall/shared
  note?: string;
};

const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string; icon: React.FC<any>; bg: string; dot: string }> = {
  smart_devices: { label: 'Smart Devices',       color: 'text-blue-500',    bg: 'bg-blue-500/8 border-blue-500/20',     dot: 'bg-blue-500',    icon: Smartphone },
  organic_nature: { label: 'Organic & Nature',   color: 'text-emerald-600', bg: 'bg-emerald-500/8 border-emerald-500/20', dot: 'bg-emerald-500', icon: Leaf },
  furniture:      { label: 'Furniture & Interiors', color: 'text-amber-600', bg: 'bg-amber-500/8 border-amber-500/20',   dot: 'bg-amber-500',   icon: Sofa },
  maintenance:    { label: 'Maintenance',         color: 'text-slate-500',   bg: 'bg-slate-100 border-slate-200',         dot: 'bg-slate-400',   icon: Activity },
  utilities:      { label: 'Utilities',           color: 'text-violet-500',  bg: 'bg-violet-500/8 border-violet-500/20', dot: 'bg-violet-400',  icon: Zap },
  other:          { label: 'Other',               color: 'text-foreground/50', bg: 'bg-white/60 border-white/40',        dot: 'bg-foreground/20', icon: Home },
};

const ALL_CATS = Object.keys(CATEGORY_META) as ExpenseCategory[];
const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const uid = () => Math.random().toString(36).slice(2);

const LS_EXP   = 'aaram_expenses_v2';
const LS_RENT  = 'aaram_rents_v1';
function loadLS<T>(k: string, d: T): T {
  if (typeof window === 'undefined') return d;
  try { return JSON.parse(localStorage.getItem(k) || '') as T; } catch { return d; }
}

// ─── Inline add-row inside a category ─────────────────────────────────────
function InlineAddRow({ onAdd, onCancel, properties }: {
  onAdd: (label: string, amount: number, note: string, property_id: string) => void;
  onCancel: () => void;
  properties: Property[];
}) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote]   = useState('');
  const [pid, setPid]     = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => {
    const a = parseFloat(amount);
    if (!label || isNaN(a) || a <= 0) return;
    onAdd(label, a, note, pid);
  };

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      className="soft-well border border-secondary/30 bg-secondary/5 p-3 space-y-3">
      <div className="grid grid-cols-12 gap-2">
        <input ref={ref} type="text" value={label} onChange={e => setLabel(e.target.value)}
          placeholder="Item description..." onKeyDown={e => e.key === 'Enter' && submit()}
          className="col-span-5 soft-ui-in py-2.5 px-4 text-xs bg-white/60 border border-white outline-none" />
        <div className="col-span-2 flex items-center soft-ui-in border border-white bg-white/60 px-3">
          <span className="text-[10px] font-bold text-foreground/40 mr-1">₹</span>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="0" className="w-full text-xs bg-transparent outline-none font-bold" />
        </div>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="Note (optional)" onKeyDown={e => e.key === 'Enter' && submit()}
          className="col-span-3 soft-ui-in py-2.5 px-3 text-xs bg-white/60 border border-white outline-none" />
        <div className="col-span-2 flex gap-1.5">
          <button onClick={submit} className="flex-1 py-2 rounded-xl bg-secondary text-white flex items-center justify-center hover:bg-secondary/80 transition-all">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={onCancel} className="w-9 soft-button border border-white text-foreground/30">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <select value={pid} onChange={e => setPid(e.target.value)}
          className="soft-ui-in py-2 px-3 text-[10px] bg-white/60 border border-white outline-none appearance-none flex-1">
          <option value="">— Shared / All Properties —</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <p className="self-center text-[9px] font-bold text-foreground/30 uppercase tracking-widest">← assign to property</p>
      </div>
    </motion.div>
  );
}

// ─── Inline edit row ────────────────────────────────────────────────────────
function InlineEditRow({ item, properties, onSave, onDelete, onCancel }: {
  item: ExpenseItem; properties: Property[];
  onSave: (i: ExpenseItem) => void; onDelete: (id: string) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState({ ...item });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="soft-well border border-secondary/30 bg-secondary/5 p-3 space-y-2">
      <div className="grid grid-cols-12 gap-2">
        <input type="text" value={draft.label} onChange={e => setDraft({...draft, label: e.target.value})}
          className="col-span-5 soft-ui-in py-2.5 px-4 text-xs bg-white/60 border border-white outline-none font-semibold" />
        <div className="col-span-2 flex items-center soft-ui-in border border-white bg-white/60 px-3">
          <span className="text-[10px] font-bold text-foreground/40 mr-1">₹</span>
          <input type="number" value={draft.amount} onChange={e => setDraft({...draft, amount: parseFloat(e.target.value)||0})}
            className="w-full text-xs bg-transparent outline-none font-bold" />
        </div>
        <select value={draft.category} onChange={e => setDraft({...draft, category: e.target.value as ExpenseCategory})}
          className="col-span-3 soft-ui-in py-2 px-2 text-[10px] bg-white/60 border border-white outline-none appearance-none">
          {ALL_CATS.map(c => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
        </select>
        <div className="col-span-2 flex gap-1.5">
          <button onClick={() => onSave(draft)} className="flex-1 py-2 rounded-xl bg-secondary text-white flex items-center justify-center hover:bg-secondary/80 transition-all">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(item.id)} className="w-9 soft-button border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <input type="text" value={draft.note||''} onChange={e => setDraft({...draft, note: e.target.value})}
          placeholder="Note..." className="soft-ui-in flex-1 py-2 px-3 text-[10px] bg-white/40 border border-white outline-none" />
        <select value={draft.property_id||''} onChange={e => setDraft({...draft, property_id: e.target.value||undefined})}
          className="soft-ui-in py-2 px-3 text-[10px] bg-white/60 border border-white outline-none appearance-none flex-1">
          <option value="">— Shared —</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={onCancel} className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest hover:text-foreground/50 transition-all">Cancel</button>
      </div>
    </motion.div>
  );
}

// ─── Single expense line ────────────────────────────────────────────────────
function ExpenseLine({ item, properties, onEdit }: { item: ExpenseItem; properties: Property[]; onEdit: () => void }) {
  const meta = CATEGORY_META[item.category];
  const prop = item.property_id ? properties.find(p => p.id === item.property_id) : null;
  return (
    <div className="flex items-center gap-3 group px-4 py-2.5 soft-well border border-white hover:border-secondary/20 transition-all">
      <div className={cn('w-2 h-2 rounded-full shrink-0', meta.dot)} />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-bold text-foreground">{item.label}</span>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className={cn('text-[8px] font-extrabold uppercase tracking-widest', meta.color)}>{meta.label}</span>
          {item.note && <span className="text-[9px] text-foreground/30 italic">{item.note}</span>}
          {prop && <span className="text-[8px] font-bold text-primary bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest">{prop.name}</span>}
          {!item.property_id && <span className="text-[8px] font-bold text-foreground/20 uppercase tracking-widest">Shared</span>}
        </div>
      </div>
      <span className={cn('text-sm font-bold tracking-tighter shrink-0', meta.color)}>{fmt(item.amount)}</span>
      <button onClick={onEdit} className="w-7 h-7 rounded-lg soft-button border border-white text-secondary/40 hover:text-secondary hover:border-secondary/30 opacity-0 group-hover:opacity-100 transition-all shrink-0">
        <Edit2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Summary card ──────────────────────────────────────────────────────────
function SummaryCard({ title, value, trend, isPositive, icon: Icon, sub }: { title: string; value: string; trend?: string; isPositive?: boolean; icon: React.FC<any>; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="soft-card p-6 border border-white bg-white/30 hover:scale-[1.01] transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-2xl soft-ui-in bg-white/50 flex items-center justify-center text-primary shadow-inner">
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

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function FinancialHub() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms]           = useState<(Room & { property_id: string })[]>([]);
  const [loading, setLoading]       = useState(true);

  const [rentMap, setRentMap]   = useState<Record<string, number>>({});
  const [editingRent, setEditingRent] = useState<string | null>(null);
  const [rentDraft, setRentDraft]     = useState('');

  const [expenses, setExpenses]       = useState<ExpenseItem[]>([]);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [addingInCat, setAddingInCat] = useState<{ cat: ExpenseCategory; scope: 'property' | 'overall'; propId?: string } | null>(null);

  // View toggle: 'property' (primary) or 'overall' (secondary)
  const [expView, setExpView] = useState<'property' | 'overall'>('property');
  const [collapsedProps, setCollapsedProps]  = useState<Set<string>>(new Set());
  const [collapsedCats, setCollapsedCats]    = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
    setExpenses(loadLS<ExpenseItem[]>(LS_EXP, defaultExpenses()));
    setRentMap(loadLS<Record<string, number>>(LS_RENT, {}));
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

  const saveExp = (e: ExpenseItem[]) => { setExpenses(e); localStorage.setItem(LS_EXP, JSON.stringify(e)); };
  const saveRent = (m: Record<string, number>) => { setRentMap(m); localStorage.setItem(LS_RENT, JSON.stringify(m)); };

  const addExpenseItem = (label: string, amount: number, note: string, property_id: string, cat: ExpenseCategory) => {
    saveExp([...expenses, { id: uid(), label, amount, category: cat, note: note||undefined, property_id: property_id||undefined }]);
    setAddingInCat(null);
  };
  const updateExpenseItem = (updated: ExpenseItem) => { saveExp(expenses.map(e => e.id === updated.id ? updated : e)); setEditingId(null); };
  const deleteExpenseItem = (id: string) => { saveExp(expenses.filter(e => e.id !== id)); setEditingId(null); };

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalRent = useMemo(() => Object.values(rentMap).reduce((s, v) => s + (v||0), 0), [rentMap]);
  const totalExp  = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const netIncome = totalRent - totalExp;

  const roomsByProp   = useMemo(() => {
    const m: Record<string, typeof rooms> = {};
    for (const r of rooms) { if (!m[r.property_id]) m[r.property_id] = []; m[r.property_id].push(r); }
    return m;
  }, [rooms]);

  const expByProp = useMemo(() => {
    const m: Record<string, ExpenseItem[]> = { __shared: [] };
    for (const e of expenses) { const k = e.property_id || '__shared'; if (!m[k]) m[k] = []; m[k].push(e); }
    return m;
  }, [expenses]);

  const expByCat = useMemo(() => {
    const m: Partial<Record<ExpenseCategory, ExpenseItem[]>> = {};
    for (const e of expenses) { if (!m[e.category]) m[e.category] = []; m[e.category]!.push(e); }
    return m;
  }, [expenses]);

  const chartData = useMemo(() => ALL_CATS.map(c => ({
    name: CATEGORY_META[c].label.split(' ')[0],
    amount: (expByCat[c] || []).reduce((s, i) => s + i.amount, 0),
  })).filter(d => d.amount > 0), [expByCat]);

  // ── Rent helpers ──────────────────────────────────────────────────────────
  const propRentTotal = (propId: string) => (roomsByProp[propId] || []).reduce((s, r) => s + (rentMap[r.id]||0), 0);
  const propExpTotal  = (propId: string) => (expByProp[propId] || []).reduce((s, e) => s + e.amount, 0);

  const toggleProp = (id: string) => { setCollapsedProps(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleCat  = (id: string) => { setCollapsedCats(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  if (loading) return <AdminLayout><div className="min-h-[60vh] flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin mb-4" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-10 pb-20 max-w-7xl mx-auto">

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest border border-secondary/20">
            <Leaf className="w-2.5 h-2.5" /> Fiscal Intelligence
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold tracking-tighter">Aaram <span className="text-primary italic">Financials</span></h1>
          <p className="text-foreground/40 text-sm">Live rent · Categorised expenses · P&L per property</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard title="Monthly Rent" value={fmt(totalRent)} icon={IndianRupee} isPositive trend={`${rooms.length} rooms`} sub="Across all properties" />
          <SummaryCard title="Total Expenses" value={fmt(totalExp)} icon={Activity} isPositive={false} trend={`${expenses.length} items`} sub="All categories" />
          <SummaryCard title="Net Income" value={fmt(netIncome)} icon={TrendingUp} isPositive={netIncome >= 0} trend={netIncome >= 0 ? 'Profit' : 'Loss'} sub="Rent − expenses" />
        </div>

        {/* Mini chart */}
        {chartData.length > 0 && (
          <div className="soft-card border border-white p-6 bg-white/30">
            <h3 className="font-bold text-sm flex items-center gap-3 mb-4"><div className="w-1.5 h-5 rounded-full bg-primary" /> Expense Breakdown by Category</h3>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={28}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'rgba(61,61,61,0.4)', fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'rgba(61,61,61,0.3)', fontWeight: 'bold' }} tickFormatter={v => `₹${v/1000}k`} />
                  <Tooltip cursor={{ fill: 'rgba(214,125,97,0.04)' }}
                    contentStyle={{ backgroundColor: '#FDFBF7', border: '1px solid #fff', borderRadius: '14px' }}
                    formatter={(v: any) => [fmt(v), 'Expense']} />
                  <Bar dataKey="amount" radius={[5, 5, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={['#D67D61','#10b981','#f59e0b','#94a3b8','#8b5cf6','#6b7280'][i%6]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ══ RENT SECTION ══ */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 rounded-full bg-secondary" />
            <div><h2 className="text-xl font-bold uppercase tracking-tight">Property Rent Income</h2>
              <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Click any room to set monthly rent</p>
            </div>
          </div>
          {properties.map(property => {
            const pRooms = roomsByProp[property.id] || [];
            return (
              <div key={property.id} className="soft-card border border-white p-6 bg-white/30 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-white/40">
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-tight">{property.name}</h3>
                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{property.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Monthly Total</p>
                    <p className="text-xl font-bold text-secondary tracking-tighter">{fmt(propRentTotal(property.id))}</p>
                  </div>
                </div>
                {pRooms.length === 0
                  ? <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest italic">No rooms — add in Properties tab</p>
                  : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {pRooms.map(room => (
                        <div key={room.id} className={cn('soft-well px-4 py-3 border border-white flex items-center justify-between gap-3 group', editingRent === room.id && 'border-secondary/40 bg-secondary/5')}>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-foreground truncate">{room.name}</p>
                            <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{room.type} · {room.sqft} sqft</p>
                          </div>
                          {editingRent === room.id ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold text-foreground/40">₹</span>
                              <input type="number" autoFocus value={rentDraft}
                                onChange={e => setRentDraft(e.target.value)}
                                onKeyDown={e => { if (e.key==='Enter') { saveRent({...rentMap,[room.id]:parseFloat(rentDraft)||0}); setEditingRent(null); } if(e.key==='Escape') setEditingRent(null); }}
                                className="w-20 soft-ui-in py-1.5 px-2 text-xs bg-white/60 border border-white outline-none text-right font-bold" />
                              <button onClick={() => { saveRent({...rentMap,[room.id]:parseFloat(rentDraft)||0}); setEditingRent(null); }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-white"><Check className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingRent(null)} className="w-7 h-7 rounded-lg soft-button border border-white text-foreground/30"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 shrink-0">
                              <p className={cn('text-sm font-bold tracking-tighter', rentMap[room.id] ? 'text-secondary' : 'text-foreground/20')}>{rentMap[room.id] ? fmt(rentMap[room.id]) : '—'}</p>
                              <button onClick={() => { setEditingRent(room.id); setRentDraft((rentMap[room.id]||'').toString()); }} className="w-7 h-7 rounded-lg soft-button border border-white text-secondary/40 hover:text-secondary opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                }
              </div>
            );
          })}
        </section>

        {/* ══ OPERATING EXPENSES ══ */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full bg-primary" />
              <div><h2 className="text-xl font-bold uppercase tracking-tight">Operating Expenses</h2>
                <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Add · Edit · Delete expenses inline</p>
              </div>
            </div>
            {/* View toggle */}
            <div className="flex p-1 soft-well border border-white rounded-2xl gap-1">
              <button onClick={() => setExpView('property')}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all',
                  expView === 'property' ? 'bg-white shadow-sm text-secondary' : 'text-foreground/40 hover:text-foreground/60')}>
                <Building2 className="w-3.5 h-3.5" /> Property View
              </button>
              <button onClick={() => setExpView('overall')}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all',
                  expView === 'overall' ? 'bg-white shadow-sm text-primary' : 'text-foreground/40 hover:text-foreground/60')}>
                <LayoutGrid className="w-3.5 h-3.5" /> Category View
              </button>
            </div>
          </div>

          {/* ── PROPERTY VIEW (primary) ── */}
          <AnimatePresence mode="wait">
            {expView === 'property' && (
              <motion.div key="property" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                {properties.map(property => {
                  const items = expByProp[property.id] || [];
                  const total = items.reduce((s, e) => s + e.amount, 0);
                  const rent  = propRentTotal(property.id);
                  const net   = rent - total;
                  const isCollapsed = collapsedProps.has(property.id);

                  return (
                    <div key={property.id} className="soft-card border border-white overflow-hidden bg-white/30">
                      {/* Property header */}
                      <div onClick={() => toggleProp(property.id)}
                        className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/20 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-[13px] uppercase tracking-tight">{property.name}</h3>
                            <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{property.location} · {items.length} expense items</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex gap-3">
                            <div className="text-right">
                              <p className="text-[8px] font-bold text-foreground/30 uppercase tracking-widest">Expenses</p>
                              <p className="text-sm font-bold text-primary tracking-tighter">{fmt(total)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] font-bold text-foreground/30 uppercase tracking-widest">Rent</p>
                              <p className="text-sm font-bold text-secondary tracking-tighter">{fmt(rent)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] font-bold text-foreground/30 uppercase tracking-widest">Net</p>
                              <p className={cn('text-sm font-bold tracking-tighter', net >= 0 ? 'text-emerald-600' : 'text-primary')}>{fmt(net)}</p>
                            </div>
                          </div>
                          {/* Quick add button */}
                          <button onClick={e => { e.stopPropagation();
                            setAddingInCat({ cat: 'other', scope: 'property', propId: property.id });
                            setCollapsedProps(p => { const n = new Set(p); n.delete(property.id); return n; });
                          }}
                            className="w-8 h-8 rounded-xl soft-button border border-white text-secondary hover:bg-secondary hover:text-white transition-all flex items-center justify-center shrink-0"
                            title="Add expense to this property">
                            <Plus className="w-4 h-4" />
                          </button>
                          {isCollapsed ? <ChevronDown className="w-4 h-4 text-foreground/30 shrink-0" /> : <ChevronUp className="w-4 h-4 text-foreground/30 shrink-0" />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <div className="px-5 pb-5 space-y-2 border-t border-white/40 pt-4">
                              {items.length === 0 && addingInCat?.propId !== property.id && (
                                <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest italic py-2">No expenses yet for this property.</p>
                              )}
                              {items.map(item => editingId === item.id
                                ? <InlineEditRow key={item.id} item={item} properties={properties}
                                    onSave={updateExpenseItem} onDelete={deleteExpenseItem} onCancel={() => setEditingId(null)} />
                                : <ExpenseLine key={item.id} item={item} properties={properties} onEdit={() => setEditingId(item.id)} />
                              )}
                              {/* Inline add for this property */}
                              <AnimatePresence>
                                {addingInCat?.propId === property.id && (
                                  <InlineAddRow key="add-prop"
                                    properties={properties}
                                    onAdd={(label, amount, note) => addExpenseItem(label, amount, note, property.id, addingInCat.cat)}
                                    onCancel={() => setAddingInCat(null)} />
                                )}
                              </AnimatePresence>
                              {/* Category quick-adds inside the property */}
                              <div className="pt-2 flex flex-wrap gap-2">
                                {ALL_CATS.map(cat => {
                                  const meta = CATEGORY_META[cat];
                                  const Icon = meta.icon;
                                  return (
                                    <button key={cat} onClick={() => { setAddingInCat({ cat, scope: 'property', propId: property.id }); }}
                                      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-extrabold uppercase tracking-widest transition-all hover:scale-[1.02]', meta.bg, meta.color)}>
                                      <Icon className="w-3 h-3" /> + {meta.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* Shared / unassigned */}
                <div className="soft-card border border-white overflow-hidden bg-white/20">
                  <div onClick={() => toggleProp('__shared')}
                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-foreground/5 border border-white flex items-center justify-center text-foreground/40">
                        <LayoutGrid className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[13px] uppercase tracking-tight text-foreground/60">Shared / Portfolio-Wide</h3>
                        <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{(expByProp['__shared']||[]).length} items not tied to a specific property</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-primary tracking-tighter">{fmt((expByProp['__shared']||[]).reduce((s,e)=>s+e.amount,0))}</p>
                      <button onClick={e => { e.stopPropagation(); setAddingInCat({ cat: 'other', scope: 'overall' }); setCollapsedProps(p => { const n=new Set(p); n.delete('__shared'); return n; }); }}
                        className="w-8 h-8 rounded-xl soft-button border border-white text-secondary hover:bg-secondary hover:text-white transition-all flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </button>
                      {collapsedProps.has('__shared') ? <ChevronDown className="w-4 h-4 text-foreground/30" /> : <ChevronUp className="w-4 h-4 text-foreground/30" />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {!collapsedProps.has('__shared') && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div className="px-5 pb-5 space-y-2 border-t border-white/40 pt-4">
                          {(expByProp['__shared']||[]).map(item => editingId === item.id
                            ? <InlineEditRow key={item.id} item={item} properties={properties} onSave={updateExpenseItem} onDelete={deleteExpenseItem} onCancel={() => setEditingId(null)} />
                            : <ExpenseLine key={item.id} item={item} properties={properties} onEdit={() => setEditingId(item.id)} />
                          )}
                          <AnimatePresence>
                            {addingInCat?.scope === 'overall' && (
                              <InlineAddRow key="add-shared" properties={properties}
                                onAdd={(label, amount, note, pid) => addExpenseItem(label, amount, note, pid, addingInCat.cat)}
                                onCancel={() => setAddingInCat(null)} />
                            )}
                          </AnimatePresence>
                          <div className="pt-2 flex flex-wrap gap-2">
                            {ALL_CATS.map(cat => {
                              const meta = CATEGORY_META[cat]; const Icon = meta.icon;
                              return (
                                <button key={cat} onClick={() => setAddingInCat({ cat, scope: 'overall' })}
                                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-extrabold uppercase tracking-widest transition-all hover:scale-[1.02]', meta.bg, meta.color)}>
                                  <Icon className="w-3 h-3" /> + {meta.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ── CATEGORY VIEW (secondary) ── */}
            {expView === 'overall' && (
              <motion.div key="overall" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                {ALL_CATS.map(cat => {
                  const meta  = CATEGORY_META[cat];
                  const Icon  = meta.icon;
                  const items = expByCat[cat] || [];
                  const total = items.reduce((s, i) => s + i.amount, 0);
                  const isCollapsed = collapsedCats.has(cat);

                  return (
                    <div key={cat} className="soft-card border border-white overflow-hidden bg-white/30">
                      <div onClick={() => toggleCat(cat)} className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/20 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', meta.bg)}>
                            <Icon className={cn('w-4 h-4', meta.color)} />
                          </div>
                          <div><h3 className="font-bold text-[13px] uppercase tracking-tight">{meta.label}</h3>
                            <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{items.length} items</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={cn('text-lg font-bold tracking-tighter', meta.color)}>{total > 0 ? fmt(total) : '—'}</span>
                          <button onClick={e => { e.stopPropagation(); setAddingInCat({ cat, scope: 'overall' }); setCollapsedCats(p => { const n=new Set(p); n.delete(cat); return n; }); }}
                            className="w-8 h-8 rounded-xl soft-button border border-white text-secondary hover:bg-secondary hover:text-white transition-all flex items-center justify-center">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          {isCollapsed ? <ChevronDown className="w-4 h-4 text-foreground/30" /> : <ChevronUp className="w-4 h-4 text-foreground/30" />}
                        </div>
                      </div>
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <div className="px-5 pb-5 space-y-2 border-t border-white/40 pt-4">
                              {items.length === 0 && addingInCat?.cat !== cat && (
                                <p className="text-[10px] font-bold text-foreground/20 italic py-2">No items yet.</p>
                              )}
                              {items.map(item => editingId === item.id
                                ? <InlineEditRow key={item.id} item={item} properties={properties} onSave={updateExpenseItem} onDelete={deleteExpenseItem} onCancel={() => setEditingId(null)} />
                                : <ExpenseLine key={item.id} item={item} properties={properties} onEdit={() => setEditingId(item.id)} />
                              )}
                              <AnimatePresence>
                                {addingInCat?.cat === cat && addingInCat.scope === 'overall' && (
                                  <InlineAddRow key="add-cat" properties={properties}
                                    onAdd={(label, amount, note, pid) => addExpenseItem(label, amount, note, pid, cat)}
                                    onCancel={() => setAddingInCat(null)} />
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </AdminLayout>
  );
}

function defaultExpenses(): ExpenseItem[] {
  return [
    { id: '1', label: 'Amazon Echo Dot (x3)', amount: 9000, category: 'smart_devices', note: 'Voice control per villa' },
    { id: '2', label: 'Smart Door Locks', amount: 15000, category: 'smart_devices' },
    { id: '3', label: 'Automated LED Lighting', amount: 12000, category: 'smart_devices', note: 'Motion-sensor strips' },
    { id: '4', label: 'Indoor Plants & Pots', amount: 5500, category: 'organic_nature', note: 'Common area greens' },
    { id: '5', label: 'Bamboo Furniture Set', amount: 22000, category: 'organic_nature' },
    { id: '6', label: 'Herb Garden Wall', amount: 3200, category: 'organic_nature' },
    { id: '7', label: 'Sofa & Lounge Chairs', amount: 45000, category: 'furniture' },
    { id: '8', label: 'Bed Frames & Mattresses', amount: 38000, category: 'furniture' },
    { id: '9', label: 'Kitchen Appliances', amount: 28000, category: 'furniture' },
    { id: '10', label: 'Plumbing & Water', amount: 8000, category: 'maintenance' },
    { id: '11', label: 'Housekeeping', amount: 6000, category: 'maintenance', note: 'Monthly' },
    { id: '12', label: 'Electricity (3 villas)', amount: 14000, category: 'utilities' },
    { id: '13', label: 'Internet Fiber', amount: 3500, category: 'utilities' },
  ];
}
