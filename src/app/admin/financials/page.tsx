'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { cn } from '@/lib/utils';
import {
  IndianRupee, ArrowUpRight, ArrowDownRight, Activity,
  Plus, Edit2, Trash2, X, Check, Loader2, Leaf, Zap, Sofa,
  Smartphone, Home, ChevronDown, ChevronUp, TrendingUp, Save,
  Building2, LayoutGrid, Wifi, Sparkles, Flame, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { supabase } from '@/lib/supabase';
import { Property, Room } from '@/lib/types';
import { useAaraCommands } from '@/hooks/useAaraCommands';

// ─── Types ─────────────────────────────────────────────────────────────────
type ExpenseCategory = 'rent' | 'maintenance' | 'electricity' | 'gas' | 'wifi' | 'maid' | 'furniture' | 'smart_devices' | 'organic_nature' | 'utilities' | 'other' | 'custom';
type IncomeType = 'rent' | 'deposit' | 'setup_cost' | 'custom';

type ExpenseItem = {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  property_id?: string | null;
  note?: string;
  expense_date?: string;
  room_ids?: string[];
};

type IncomeRecord = {
  id: string;
  room_id: string;
  amount: number;
  income_type: IncomeType;
  category?: string;
  income_date: string;
  note?: string;
};

const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string; icon: React.FC<any>; bg: string; dot: string }> = {
  rent:           { label: 'Rent',                color: 'text-rose-500',    bg: 'bg-rose-500/8 border-rose-500/20',     dot: 'bg-rose-500',    icon: Home },
  maintenance:    { label: 'Maintenance',         color: 'text-slate-500',   bg: 'bg-slate-100 border-slate-200',         dot: 'bg-slate-400',   icon: Activity },
  electricity:    { label: 'Electricity Bill',    color: 'text-amber-500',   bg: 'bg-amber-500/8 border-amber-500/20',   dot: 'bg-amber-500',   icon: Zap },
  gas:            { label: 'Gas Refill',          color: 'text-orange-600',  bg: 'bg-orange-500/8 border-orange-500/20', dot: 'bg-orange-500',  icon: Flame },
  wifi:           { label: 'Wifi',                color: 'text-blue-500',    bg: 'bg-blue-500/8 border-blue-500/20',     dot: 'bg-blue-500',    icon: Wifi },
  maid:           { label: 'Maid/Cleaning',       color: 'text-emerald-600', bg: 'bg-emerald-500/8 border-emerald-500/20', dot: 'bg-emerald-500', icon: Sparkles },
  furniture:      { label: 'Furniture & Interiors', color: 'text-amber-600', bg: 'bg-amber-500/8 border-amber-500/20',   dot: 'bg-amber-500',   icon: Sofa },
  smart_devices:  { label: 'Smart Devices',       color: 'text-cyan-500',    bg: 'bg-cyan-500/8 border-cyan-500/20',     dot: 'bg-cyan-500',    icon: Smartphone },
  organic_nature: { label: 'Organic & Nature',   color: 'text-emerald-700', bg: 'bg-emerald-700/8 border-emerald-700/20', dot: 'bg-emerald-700', icon: Leaf },
  utilities:      { label: 'General Utilities',   color: 'text-violet-500',  bg: 'bg-violet-500/8 border-violet-500/20', dot: 'bg-violet-400',  icon: Zap },
  other:          { label: 'Other',               color: 'text-foreground/50', bg: 'bg-white/60 border-white/40',        dot: 'bg-foreground/20', icon: Home },
  custom:         { label: 'Custom',              color: 'text-secondary',   bg: 'bg-secondary/10 border-secondary/20',  dot: 'bg-secondary',   icon: Plus },
};

const ALL_CATS = Object.keys(CATEGORY_META) as ExpenseCategory[];
const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// Month-Year helpers
const getFirstDayOfMonth = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

const formatMonthName = (dateStr: string) => {
  const [y, m] = dateStr.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

// ─── Inline add-row inside a category ─────────────────────────────────────
function InlineAddRow({ onAdd, onCancel, properties, defaultDate }: {
  onAdd: (label: string, amount: number, note: string, property_id: string, date: string) => void;
  onCancel: () => void;
  properties: Property[];
  defaultDate: string;
}) {
  const [label, textLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');
  const [pid, setPid]       = useState('');
  const [date, setDate]     = useState(defaultDate);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => {
    const a = parseFloat(amount);
    if (!label || isNaN(a) || a <= 0) return;
    onAdd(label, a, note, pid, date);
  };

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      className="soft-well border border-secondary/30 bg-secondary/5 p-3 space-y-3">
      <div className="grid grid-cols-12 gap-2">
        <input ref={ref} type="text" value={label} onChange={e => textLabel(e.target.value)}
          placeholder="Item description..." onKeyDown={e => e.key === 'Enter' && submit()}
          className="col-span-4 soft-ui-in py-2.5 px-4 text-xs bg-white/60 border border-white outline-none" />
        <div className="col-span-2 flex items-center soft-ui-in border border-white bg-white/60 px-3">
          <span className="text-[10px] font-bold text-foreground/40 mr-1">₹</span>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="0" className="w-full text-xs bg-transparent outline-none font-bold" />
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="col-span-2 soft-ui-in py-2.5 px-2 text-[10px] bg-white/60 border border-white outline-none font-bold" />
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="Note" onKeyDown={e => e.key === 'Enter' && submit()}
          className="col-span-2 soft-ui-in py-2.5 px-3 text-xs bg-white/60 border border-white outline-none" />
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

// ─── Modals ──────────────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="soft-card bg-white w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function RoomFinancialModal({ room, onClose, onAddIncome, onUpdateIncome, onDeleteIncome, onAddExpense, onUpdateExpense, onDeleteExpense, incomeRecords, expenses }: {
  room: Room; 
  onClose: () => void;
  onAddIncome: (d: any) => void;
  onUpdateIncome: (d: any) => void;
  onDeleteIncome: (id: string) => void;
  onAddExpense: (d: any) => void;
  onUpdateExpense: (d: any) => void;
  onDeleteExpense: (id: string) => void;
  incomeRecords: IncomeRecord[];
  expenses: ExpenseItem[];
}) {
  const [tab, setTab] = useState<'view' | 'income' | 'expense'>('view');
  
  // Income form
  const [incType, setIncType]   = useState<IncomeType>('rent');
  const [incAmt, setIncAmt]     = useState('');
  const [incDate, setIncDate]   = useState(new Date().toISOString().split('T')[0]);
  const [incNote, setIncNote]   = useState('');

  // Editing state
  const [editingIncId, setEditingIncId] = useState<string | null>(null);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editForm, setEditForm]         = useState<any>(null);

  // Expense form
  const [expName, setExpName] = useState('');
  const [expAmt, setExpAmt]   = useState('');
  const [expCat, setExpCat]   = useState<ExpenseCategory>('other');
  const [customExpCat, setCustomExpCat] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  const submitIncome = async () => {
    const a = parseFloat(incAmt);
    if (isNaN(a) || a <= 0) return;
    await onAddIncome({ room_id: room.id, amount: a, income_type: incType, income_date: incDate, note: incNote });
    setTab('view');
    setIncAmt(''); setIncNote('');
  };

  const submitExpense = async () => {
    const a = parseFloat(expAmt);
    if (!expName || isNaN(a) || a <= 0) return;
    const finalCat = expCat === 'custom' && customExpCat ? customExpCat : expCat;
    await onAddExpense({ label: expName, amount: a, category: finalCat, expense_date: expDate, room_ids: [room.id] });
    setTab('view');
    setExpName(''); setExpAmt('');
  };

  const roomIncomes = incomeRecords.filter(r => r.room_id === room.id);
  const roomExpenses = expenses.filter(e => e.room_ids?.includes(room.id));

  return (
    <>
      <div className="p-6 border-b border-secondary/10 flex justify-between items-center bg-secondary/5">
        <div>
          <h2 className="text-xl font-bold tracking-tighter uppercase text-secondary">{room.name}</h2>
          <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em]">{room.type}</p>
        </div>
        <button onClick={onClose} className="p-2 soft-button border border-white text-foreground/30 hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b border-white bg-white/40">
        {(['view', 'income', 'expense'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all',
              tab === t ? 'bg-white text-secondary border-b-2 border-secondary' : 'text-foreground/30 hover:text-foreground/50')}>
            {t === 'view' ? 'Activity Log' : t === 'income' ? '+ Record Income' : '+ Record Expense'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white/60">
        <AnimatePresence mode="wait">
          {tab === 'view' && (
            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 border-b border-foreground/5 pb-2">Recent Income</h3>
                {roomIncomes.length === 0 ? <p className="text-xs italic text-foreground/20">No income records found.</p> : 
                  roomIncomes.map(rec => (
                    <div key={rec.id} className="group relative">
                      {editingIncId === rec.id ? (
                        <div className="p-3 soft-well border border-secondary/30 bg-secondary/5 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                             <input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})} className="soft-ui-in p-2 text-xs bg-white border-white" />
                             <input type="date" value={editForm.income_date} onChange={e => setEditForm({...editForm, income_date: e.target.value})} className="soft-ui-in p-2 text-xs bg-white border-white" />
                          </div>
                          <input type="text" value={editForm.note||''} onChange={e => setEditForm({...editForm, note: e.target.value})} placeholder="Note" className="w-full soft-ui-in p-2 text-xs bg-white border-white" />
                          <div className="flex gap-2">
                            <button onClick={() => { onUpdateIncome(editForm); setEditingIncId(null); }} className="flex-1 py-2 bg-secondary text-white text-[10px] font-bold rounded-lg uppercase tracking-widest">Save</button>
                            <button onClick={() => setEditingIncId(null)} className="flex-1 py-2 bg-white border border-white text-foreground/40 text-[10px] font-bold rounded-lg uppercase tracking-widest">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center p-3 soft-well border border-white hover:border-secondary/20 transition-all">
                          <div>
                            <p className="text-xs font-bold text-foreground uppercase tracking-tight">{rec.income_type} {rec.category && `· ${rec.category}`}</p>
                            <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{rec.income_date} {rec.note && `· ${rec.note}`}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-secondary">{fmt(rec.amount)}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingIncId(rec.id); setEditForm(rec); }} className="p-1.5 soft-button border border-white text-secondary hover:bg-secondary hover:text-white transition-all"><Edit2 className="w-3 h-3" /></button>
                              <button onClick={() => onDeleteIncome(rec.id)} className="p-1.5 soft-button border border-white text-primary hover:bg-primary hover:text-white transition-all"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
              <div className="space-y-3 pt-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 border-b border-foreground/5 pb-2">Recent Expenses</h3>
                {roomExpenses.length === 0 ? <p className="text-xs italic text-foreground/20">No expense items found.</p> : 
                  roomExpenses.map(exp => (
                    <div key={exp.id} className="group relative">
                      {editingExpId === exp.id ? (
                        <div className="p-3 soft-well border border-primary/30 bg-primary/5 space-y-3">
                          <input type="text" value={editForm.label} onChange={e => setEditForm({...editForm, label: e.target.value})} className="w-full soft-ui-in p-2 text-xs bg-white border-white font-bold" />
                          <div className="grid grid-cols-2 gap-2">
                             <input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})} className="soft-ui-in p-2 text-xs bg-white border-white" />
                             <input type="date" value={editForm.expense_date} onChange={e => setEditForm({...editForm, expense_date: e.target.value})} className="soft-ui-in p-2 text-xs bg-white border-white" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { onUpdateExpense(editForm); setEditingExpId(null); }} className="flex-1 py-2 bg-primary text-white text-[10px] font-bold rounded-lg uppercase tracking-widest">Save</button>
                            <button onClick={() => setEditingExpId(null)} className="flex-1 py-2 bg-white border border-white text-foreground/40 text-[10px] font-bold rounded-lg uppercase tracking-widest">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center p-3 soft-well border border-white hover:border-primary/20 transition-all">
                          <div>
                            <p className="text-xs font-bold text-foreground uppercase tracking-tight">{exp.label}</p>
                            <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{exp.expense_date} · {CATEGORY_META[exp.category]?.label || exp.category}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-primary">-{fmt(exp.amount)}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingExpId(exp.id); setEditForm(exp); }} className="p-1.5 soft-button border border-white text-secondary hover:bg-secondary hover:text-white transition-all"><Edit2 className="w-3 h-3" /></button>
                              <button onClick={() => onDeleteExpense(exp.id)} className="p-1.5 soft-button border border-white text-primary hover:bg-primary hover:text-white transition-all"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
            </motion.div>
          )}

          {tab === 'income' && (
            <motion.div key="income" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-sm mx-auto">
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Income Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['rent', 'deposit', 'setup_cost', 'custom'] as IncomeType[]).map(t => (
                    <button key={t} onClick={() => setIncType(t)}
                      className={cn('py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all',
                        incType === t ? 'bg-secondary text-white border-secondary' : 'bg-white border-white text-foreground/40')}>
                      {t.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Amount (₹)</label>
                <input type="number" value={incAmt} onChange={e => setIncAmt(e.target.value)}
                  className="w-full soft-ui-in py-3 px-4 text-sm bg-white/80 border border-white outline-none font-black text-secondary" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Income Date</label>
                <input type="date" value={incDate} onChange={e => setIncDate(e.target.value)}
                  className="w-full soft-ui-in py-3 px-4 text-xs bg-white/80 border border-white outline-none font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Note</label>
                <input type="text" value={incNote} onChange={e => setIncNote(e.target.value)}
                  className="w-full soft-ui-in py-3 px-4 text-xs bg-white/80 border border-white outline-none" placeholder="Optional remark..." />
              </div>
              <button onClick={submitIncome} className="w-full py-4 rounded-2xl bg-secondary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save Record
              </button>
            </motion.div>
          )}

          {tab === 'expense' && (
            <motion.div key="expense" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-sm mx-auto">
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Expense Name</label>
                <input type="text" value={expName} onChange={e => setExpName(e.target.value)}
                  className="w-full soft-ui-in py-3 px-4 text-xs bg-white/80 border border-white outline-none font-bold" placeholder="Reason for expense..." />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Amount (₹)</label>
                <input type="number" value={expAmt} onChange={e => setExpAmt(e.target.value)}
                  className="w-full soft-ui-in py-3 px-4 text-sm bg-white/80 border border-white outline-none font-black text-primary" placeholder="0.00" />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Category</label>
                  <select value={expCat} onChange={e => setExpCat(e.target.value as any)}
                    className="w-full soft-ui-in py-3 px-4 text-xs bg-white/80 border border-white outline-none font-bold appearance-none">
                    {ALL_CATS.map(c => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
                  </select>
                </div>
                {expCat === 'custom' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-secondary/60">Custom Category Name</label>
                    <input type="text" value={customExpCat} onChange={e => setCustomExpCat(e.target.value)}
                      placeholder="e.g. Legal Fees" className="w-full soft-ui-in py-3 px-4 text-xs bg-secondary/5 border-secondary/20 outline-none font-bold" />
                  </motion.div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Expense Date</label>
                <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)}
                  className="w-full soft-ui-in py-3 px-4 text-xs bg-white/80 border border-white outline-none font-bold" />
              </div>
              <button onClick={submitExpense} className="w-full py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save Expense
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function SharedExpenseModal({ property, rooms, allProperties, onClose, onAddShared }: {
  property?: Property;
  rooms: (Room & { property_id: string })[];
  allProperties: Property[];
  onClose: () => void;
  onAddShared: (d: any) => void;
}) {
  const [name, setName] = useState('');
  const [amt, setAmt]   = useState('');
  const [cat, setCat]   = useState<ExpenseCategory>('other');
  const [customCat, setCustomCat] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selProps, setSelProps] = useState<Set<string>>(new Set(property ? [property.id] : allProperties.map(p => p.id)));

  const togglePropSel = (id: string) => {
    const n = new Set(selProps);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelProps(n);
  };

  const submit = () => {
    const a = parseFloat(amt);
    if (!name || isNaN(a) || a <= 0 || selProps.size === 0) return;
    
    // Collect all rooms for selected properties
    const roomsToInclude = rooms.filter(r => selProps.has(r.property_id)).map(r => r.id);
    
    const finalCat = cat === 'custom' && customCat ? customCat : cat;
    onAddShared({ label: name, amount: a, category: finalCat, property_id: null, room_ids: roomsToInclude, expense_date: date });
    onClose();
  };

  return (
    <>
      <div className="p-6 border-b border-primary/10 flex justify-between items-center bg-primary/5">
        <div>
          <h2 className="text-xl font-bold tracking-tighter uppercase text-primary">Shared Expense</h2>
          <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em]">
            Distributed across portfolio
          </p>
        </div>
        <button onClick={onClose} className="p-2 soft-button border border-white text-foreground/30 hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white/60 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Expense Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full soft-ui-in py-3 px-4 text-xs bg-white/80 border border-white outline-none font-bold" placeholder="e.g. WiFi Bill" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Total Amount (₹)</label>
            <input type="number" value={amt} onChange={e => setAmt(e.target.value)}
              className="w-full soft-ui-in py-3 px-4 text-sm bg-white/80 border border-white outline-none font-black text-primary" placeholder="0.00" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Expense Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full soft-ui-in py-3 px-4 text-xs bg-white/80 border border-white outline-none font-bold" />
        </div>

        <div className="space-y-4">
          <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Category</label>
          <div className="flex flex-wrap gap-2">
            {ALL_CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={cn('px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all',
                  cat === c ? 'bg-primary text-white border-primary' : 'bg-white border-white text-foreground/40')}>
                {CATEGORY_META[c].label}
              </button>
            ))}
          </div>
          {cat === 'custom' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
              <input type="text" value={customCat} onChange={e => setCustomCat(e.target.value)}
                placeholder="Name your custom category..." 
                className="w-full soft-ui-in py-3 px-4 text-xs bg-secondary/5 border-secondary/20 outline-none font-bold" />
            </motion.div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Select Properties ({selProps.size})</label>
            <button onClick={() => setSelProps(new Set(allProperties.map(p => p.id)))} className="text-[8px] font-black uppercase text-secondary">Select All</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {allProperties.map(p => (
              <button key={p.id} onClick={() => togglePropSel(p.id)}
                className={cn('p-4 rounded-2xl border text-left transition-all relative overflow-hidden',
                  selProps.has(p.id) ? 'bg-secondary/5 border-secondary/30 ring-1 ring-secondary/20' : 'bg-white/40 border-white text-foreground/30')}>
                <p className="text-[10px] font-black uppercase tracking-tighter truncate">{p.name}</p>
                <p className="text-[8px] font-bold opacity-40">{p.location}</p>
                {selProps.has(p.id) && <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-secondary" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-white/80 border-t border-white flex gap-4">
        <button onClick={onClose} className="flex-1 py-4 rounded-2xl soft-button border border-white text-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">Cancel</button>
        <button onClick={submit} className="flex-[2] py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all">Record Distributable Expense</button>
      </div>
    </>
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
function ExpenseLine({ item, properties, onEdit }: { item: ExpenseItem & { splitAmt?: number }; properties: Property[]; onEdit: () => void }) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
  const prop = item.property_id ? properties.find(p => p.id === item.property_id) : null;
  const displayAmt = item.splitAmt !== undefined ? item.splitAmt : item.amount;
  
  return (
    <div className="flex items-center gap-3 group px-4 py-2.5 soft-well border border-white hover:border-secondary/20 transition-all">
      <div className={cn('w-2 h-2 rounded-full shrink-0', meta.dot)} />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-bold text-foreground">{item.label}</span>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className={cn('text-[8px] font-extrabold uppercase tracking-widest', meta.color)}>
            {CATEGORY_META[item.category] ? meta.label : item.category}
          </span>
          {item.note && <span className="text-[9px] text-foreground/30 italic">{item.note}</span>}
          {prop && <span className="text-[8px] font-bold text-primary bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest">{prop.name}</span>}
          {!item.property_id && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md uppercase tracking-widest">Added from shared expense</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className={cn('text-sm font-bold tracking-tighter', meta.color)}>{fmt(displayAmt)}</span>
        {item.splitAmt !== undefined && <p className="text-[7px] font-bold text-foreground/20 uppercase tracking-tighter">Split share</p>}
      </div>
      <button onClick={onEdit} className="w-7 h-7 rounded-lg soft-button border border-white text-secondary/40 hover:text-secondary hover:border-secondary/30 opacity-0 group-hover:opacity-100 transition-all shrink-0">
        <Edit2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Summary card ──────────────────────────────────────────────────────────
function SummaryCard({ title, value, trend, isPositive, icon: Icon, sub, onClick }: { title: string; value: string; trend?: string; isPositive?: boolean; icon: React.FC<any>; sub?: string; onClick?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={onClick}
      className={cn("soft-card p-6 border border-white bg-white/30 transition-all", onClick && "cursor-pointer hover:scale-[1.02] hover:bg-white/40 active:scale-[0.98]")}>
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

  // Month-based Rent Selection
  const [selectedMonth, setSelectedMonth] = useState(getFirstDayOfMonth(new Date()));
  const [rentRecords, setRentRecords]     = useState<IncomeRecord[]>([]);

  const [expenses, setExpenses]       = useState<ExpenseItem[]>([]);
  const [allTimeInc, setAllTimeInc]   = useState<IncomeRecord[]>([]);
  const [allTimeExp, setAllTimeExp]   = useState<ExpenseItem[]>([]);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [addingInCat, setAddingInCat] = useState<{ cat: ExpenseCategory; scope: 'property' | 'overall'; propId?: string } | null>(null);
  
  const [collapsedProps, setCollapsedProps]  = useState<Set<string>>(new Set());
  const [collapsedCats, setCollapsedCats]    = useState<Set<string>>(new Set());

  // View toggle: 'property' or 'overall'
  const [expView, setExpView] = useState<'property' | 'overall'>('property');

  // Modal States
  const [roomModal, setRoomModal] = useState<{ roomId: string; propertyId: string } | null>(null);
  const [sharedExpModal, setSharedExpModal] = useState<{ propertyId: string | null } | null>(null);
  const [sourceDetail, setSourceDetail] = useState<{ title: string; type: 'income' | 'expense'; isLifetime?: boolean } | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  // ─── AARA Command Integration ───
  useAaraCommands({
    SELECT_PROPERTY: (data) => {
      const el = document.getElementById(`property-${data.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setCollapsedProps(prev => {
          const next = new Set(prev);
          if (next.has(data.id)) next.delete(data.id);
          return next;
        });
      }
    },
    SELECT_ROOM: (data) => {
      const room = rooms.find(r => r.id === data.id);
      if (room) {
        setRoomModal({ roomId: room.id, propertyId: room.property_id });
      }
    }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = selectedMonth;
      const date = new Date(selectedMonth);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

      const [propsRes, roomsRes, expRes, rentRes, allExpRes, allRentRes] = await Promise.all([
        supabase.from('properties').select('*').order('name'),
        supabase.from('rooms').select('*'),
        supabase.from('expenses').select(`*, expense_room_splits(room_id)`).gte('expense_date', start).lte('expense_date', end).order('expense_date', { ascending: false }),
        supabase.from('income_records').select('*').gte('income_date', start).lte('income_date', end),
        supabase.from('expenses').select(`*, expense_room_splits(room_id)`),
        supabase.from('income_records').select('*')
      ]);

      if (propsRes.data) setProperties(propsRes.data);
      if (roomsRes.data) setRooms(roomsRes.data as any);
      if (expRes.data) {
        setExpenses(expRes.data.map((e: any) => ({ ...e, room_ids: e.expense_room_splits?.map((s: any) => s.room_id) || [] })));
      }
      if (rentRes.data) setRentRecords(rentRes.data);
      if (allExpRes.data) {
        setAllTimeExp(allExpRes.data.map((e: any) => ({ ...e, room_ids: e.expense_room_splits?.map((s: any) => s.room_id) || [] })));
      }
      if (allRentRes.data) setAllTimeInc(allRentRes.data);
    } catch (err) {
      console.error('Error fetching financials:', err);
    } finally {
      setLoading(false);
    }
  };

  const addExpenseItem = async (label: string, amount: number, note: string, property_id: string, date: string, cat: ExpenseCategory) => {
    const { data, error } = await supabase.from('expenses').insert({
      label, amount, category: cat, note: note||undefined, property_id: property_id||null, expense_date: date
    }).select().single();
    
    if (error) {
      alert(`Failed to add: ${error.message}`);
    } else if (data) {
      // If the added date is within current month, add to local state
      const start = selectedMonth;
      const d = new Date(selectedMonth);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      
      if (date >= start && date <= end) {
        setExpenses([data, ...expenses]);
      } else {
        alert(`Record saved for ${date}. Switch to that month to view it.`);
      }
    }
    setAddingInCat(null);
  };

  const updateExpenseItem = async (updated: ExpenseItem) => {
    const { error } = await supabase.from('expenses').update({
      label: updated.label, amount: updated.amount, category: updated.category, 
      note: updated.note, property_id: updated.property_id, expense_date: updated.expense_date
    }).eq('id', updated.id);
    if (error) {
      alert(`Update failed: ${error.message}`);
    } else {
      setExpenses(expenses.map(e => e.id === updated.id ? updated : e));
      setEditingId(null);
    }
  };

  const deleteExpenseItem = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      alert(`Delete failed: ${error.message}`);
    } else {
      setExpenses(expenses.filter(e => e.id !== id));
      setEditingId(null);
    }
  };

  // ── Rent Map Helper ──────────────────────────────────────────────────────
  const rentMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rentRecords) { 
      m[r.room_id] = (m[r.room_id] || 0) + r.amount; 
    }
    return m;
  }, [rentRecords]);

  // ── Computed ──────────────────────────────────────────────────────────────
  // ── Computed Current Month ──────────────────────────────────────────────────
  const totalRent = useMemo(() => rentRecords.filter(r => r.income_type === 'rent').reduce((s, v) => s + (v.amount||0), 0), [rentRecords]);
  const otherInc  = useMemo(() => rentRecords.filter(r => r.income_type !== 'rent').reduce((s, v) => s + (v.amount||0), 0), [rentRecords]);
  const totalExp  = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const netIncome = (totalRent + otherInc) - totalExp;

  // ── Computed Lifetime ────────────────────────────────────────────────────────
  const lifeRent = useMemo(() => allTimeInc.filter(r => r.income_type === 'rent').reduce((s, v) => s + (v.amount||0), 0), [allTimeInc]);
  const lifeOther = useMemo(() => allTimeInc.filter(r => r.income_type !== 'rent').reduce((s, v) => s + (v.amount||0), 0), [allTimeInc]);
  const lifeExp = useMemo(() => allTimeExp.reduce((s, e) => s + (e.amount||0), 0), [allTimeExp]);
  const lifeNet = (lifeRent + lifeOther) - lifeExp;

  const roomsByProp   = useMemo(() => {
    const m: Record<string, typeof rooms> = {};
    for (const r of rooms) { if (!m[r.property_id]) m[r.property_id] = []; m[r.property_id].push(r); }
    return m;
  }, [rooms]);

  const expByProp = useMemo(() => {
    const m: Record<string, (ExpenseItem & { splitAmt?: number })[]> = { __shared: [] };
    const roomToProp: Record<string, string> = {};
    rooms.forEach(r => roomToProp[r.id] = r.property_id);

    for (const e of expenses) { 
      // 1. Direct property link
      if (e.property_id) {
        if (!m[e.property_id]) m[e.property_id] = [];
        m[e.property_id].push(e);
      } 
      // 2. Shared / Distributable
      else {
        m.__shared.push(e);
        
        if (e.room_ids && e.room_ids.length > 0) {
          const involvedProps = Array.from(new Set(e.room_ids.map(rid => roomToProp[rid]).filter(Boolean)));
          if (involvedProps.length > 0) {
            const splitShare = e.amount / involvedProps.length;
            involvedProps.forEach(pid => {
              if (!m[pid]) m[pid] = [];
              m[pid].push({ ...e, splitAmt: splitShare });
            });
          }
        }
      }
    }
    return m;
  }, [expenses, rooms]);

  const addIncomeRecord = async (d: any) => {
    const { error } = await supabase.from('income_records').insert(d);
    if (error) alert(`Failed to add income: ${error.message}`);
    else fetchData();
  };

  const updateIncomeRecord = async (updated: IncomeRecord) => {
    const { error } = await supabase.from('income_records').update({
      amount: updated.amount,
      income_type: updated.income_type,
      income_date: updated.income_date,
      note: updated.note,
      category: updated.category
    }).eq('id', updated.id);
    if (error) alert(`Failed to update income: ${error.message}`);
    else fetchData();
  };

  const deleteIncomeRecord = async (id: string) => {
    const { error } = await supabase.from('income_records').delete().eq('id', id);
    if (error) alert(`Failed to delete income: ${error.message}`);
    else fetchData();
  };

  const addComplexExpense = async (d: any) => {
    const { data: exp, error: expErr } = await supabase.from('expenses').insert({
      label: d.label, amount: d.amount, category: d.category, property_id: d.property_id, expense_date: d.expense_date
    }).select().single();

    if (exp && d.room_ids?.length > 0) {
      const splits = d.room_ids.map((rid: string) => ({ expense_id: exp.id, room_id: rid }));
      await supabase.from('expense_room_splits').insert(splits);
    }
    
    if (expErr) {
      alert(`Failed to save: ${expErr.message}`);
    } else {
      const selStart = selectedMonth;
      const dt = new Date(selectedMonth);
      const selEnd = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).toISOString().split('T')[0];
      
      if (d.expense_date >= selStart && d.expense_date <= selEnd) {
        fetchData();
      } else {
        alert(`Expense saved for historical date: ${d.expense_date}`);
      }
    }
    setRoomModal(null);
    setSharedExpModal(null);
  };

  const expByCat = useMemo(() => {
    const m: Partial<Record<ExpenseCategory, ExpenseItem[]>> = {};
    for (const e of expenses) { if (!m[e.category]) m[e.category] = []; m[e.category]!.push(e); }
    return m;
  }, [expenses]);

  const expChartData = useMemo(() => ALL_CATS.map(c => ({
    name: CATEGORY_META[c].label,
    amount: (expByCat[c] || []).reduce((s, i) => s + i.amount, 0),
  })).filter(d => d.amount > 0), [expByCat]);

  const incChartData = useMemo(() => {
    const types: IncomeType[] = ['rent', 'deposit', 'setup_cost', 'custom'];
    return types.map(t => ({
      name: t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' '),
      amount: rentRecords.filter(r => r.income_type === t).reduce((s, v) => s + (v.amount||0), 0)
    })).filter(d => d.amount > 0);
  }, [rentRecords]);

  const COLORS = ['#D67D61', '#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#6366f1', '#ec4899', '#f43f5e', '#14b8a6'];

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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest border border-secondary/20">
              <Leaf className="w-2.5 h-2.5" /> Fiscal Intelligence
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tighter">Aaram <span className="text-primary italic">Financials</span></h1>
            <p className="text-foreground/40 text-sm">Historical rent tracking · Business expenses</p>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-3 soft-well border border-white p-2 bg-white/40">
            <button 
              onClick={() => {
                const d = new Date(selectedMonth);
                d.setMonth(d.getMonth() - 1);
                setSelectedMonth(getFirstDayOfMonth(d));
              }}
              className="w-10 h-10 rounded-xl soft-button border border-white bg-white/60 text-secondary hover:text-white hover:bg-secondary">
              <ArrowDownRight className="w-4 h-4 rotate-45" />
            </button>
            <div className="px-6 text-center">
              <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em] mb-0.5">Operating Month</p>
              <p className="text-sm font-black text-foreground uppercase tracking-tighter">{formatMonthName(selectedMonth)}</p>
            </div>
            <button 
              onClick={() => {
                const d = new Date(selectedMonth);
                d.setMonth(d.getMonth() + 1);
                setSelectedMonth(getFirstDayOfMonth(d));
              }}
              className="w-10 h-10 rounded-xl soft-button border border-white bg-white/60 text-secondary hover:text-white hover:bg-secondary">
              <ArrowUpRight className="w-4 h-4 -rotate-45" />
            </button>
          </div>
        </div>

        {/* Lifetime Performance (Interactive) */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 rounded-full bg-secondary rotate-12" />
            <h2 className="text-xl font-bold uppercase tracking-tight">Lifetime Performance</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <SummaryCard title="Lifetime Income" value={fmt(lifeRent + lifeOther)} icon={IndianRupee} isPositive trend="All Time" sub="Click for sources" onClick={() => setSourceDetail({ title: 'Lifetime Income', type: 'income', isLifetime: true })} />
            <SummaryCard title="Lifetime Expenses" value={fmt(lifeExp)} icon={Activity} isPositive={false} trend="All Time" sub="Click for sources" onClick={() => setSourceDetail({ title: 'Lifetime Expenses', type: 'expense', isLifetime: true })} />
            <SummaryCard title="Lifetime P&L" value={fmt(lifeNet)} icon={TrendingUp} isPositive={lifeNet >= 0} trend={lifeNet >= 0 ? 'Surplus' : 'Deficit'} sub="Total Business" onClick={() => setSourceDetail({ title: 'Lifetime P&L', type: 'income', isLifetime: true })} />
          </div>
        </div>

        {/* Operating Month Summary Metrics */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 rounded-full bg-primary -rotate-12" />
            <h2 className="text-xl font-bold uppercase tracking-tight">Operating Month: {formatMonthName(selectedMonth)}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <SummaryCard 
              title="Monthly Income" 
              value={fmt(totalRent + otherInc)} 
              icon={IndianRupee} 
              isPositive={true} 
              trend={`from ${rentRecords.length} records`} 
              sub="Total revenue this month" 
              onClick={() => setSourceDetail({ title: 'Monthly Income', type: 'income', isLifetime: false })}
            />
            <SummaryCard 
              title="Monthly Expenses" 
              value={fmt(totalExp)} 
              icon={Activity} 
              isPositive={false} 
              trend={`${expenses.length} items`} 
              sub="Total spend this month" 
              onClick={() => setSourceDetail({ title: 'Monthly Expenses', type: 'expense', isLifetime: false })}
            />
            <SummaryCard 
              title="Monthly Profit / Loss" 
              value={fmt(netIncome)} 
              icon={TrendingUp} 
              isPositive={netIncome >= 0} 
              trend={netIncome >= 0 ? 'Surplus' : 'Deficit'} 
              sub="Performance this month" 
              onClick={() => setSourceDetail({ title: 'Monthly P&L', type: 'income', isLifetime: false })}
            />
          </div>
        </div>

        {/* Financial Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Analytics */}
          <div className="soft-card border border-white p-6 bg-white/30 flex flex-col min-h-[340px]">
            <h3 className="font-bold text-sm flex items-center gap-3 mb-4"><div className="w-1.5 h-5 rounded-full bg-secondary" /> Income Analytics</h3>
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={incChartData} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} stroke="none">
                    {incChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#FDFBF7', border: '1px solid #fff', borderRadius: '14px', fontSize: '10px' }} formatter={(v: any) => fmt(v)} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Analytics */}
          <div className="soft-card border border-white p-6 bg-white/30 flex flex-col min-h-[340px]">
            <h3 className="font-bold text-sm flex items-center gap-3 mb-4"><div className="w-1.5 h-5 rounded-full bg-primary" /> Expense Analytics</h3>
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expChartData} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} stroke="none">
                    {expChartData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#FDFBF7', border: '1px solid #fff', borderRadius: '14px', fontSize: '10px' }} formatter={(v: any) => fmt(v)} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ══ RENT SECTION ══ */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 rounded-full bg-secondary" />
            <div><h2 className="text-xl font-bold uppercase tracking-tight">Rent Management</h2>
              <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Editing records for {formatMonthName(selectedMonth)}</p>
            </div>
          </div>
          {properties.map(property => {
            const pRooms = roomsByProp[property.id] || [];
            return (
              <div key={property.id} id={`property-${property.id}`} className="soft-card border border-white p-6 bg-white/30 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-white/40">
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-tight">{property.name}</h3>
                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{property.location}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Monthly Total</p>
                      <p className="text-xl font-bold text-secondary tracking-tighter">{fmt(propRentTotal(property.id))}</p>
                    </div>
                    <button onClick={() => setSharedExpModal({ propertyId: property.id })}
                      className="w-10 h-10 rounded-2xl soft-button border border-white bg-white/60 text-primary hover:text-white hover:bg-primary flex items-center justify-center transition-all"
                      title="Add shared expense for this property">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {pRooms.length === 0
                  ? <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest italic text-center py-4 bg-white/10 rounded-2xl">No rooms — add in Properties tab</p>
                  : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {pRooms.map(room => (
                        <div key={room.id} 
                          onClick={() => setRoomModal({ roomId: room.id, propertyId: property.id })}
                          className="soft-well px-4 py-4 border border-white flex items-center justify-between gap-3 group cursor-pointer hover:border-secondary/30 hover:bg-white/50 transition-all">
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-foreground truncate group-hover:text-secondary transition-colors">{room.name}</p>
                            <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{room.type} · {room.sqft} sqft</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className={cn('text-sm font-black tracking-tighter', rentMap[room.id] ? 'text-secondary' : 'text-foreground/20')}>
                              {rentMap[room.id] ? fmt(rentMap[room.id]) : '—'}
                            </p>
                            <div className="w-7 h-7 rounded-lg bg-secondary/5 border border-secondary/10 flex items-center justify-center text-secondary/40 group-hover:text-secondary group-hover:bg-secondary/10 transition-all">
                              <ChevronUp className="w-3.5 h-3.5 rotate-90" />
                            </div>
                          </div>
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
                  // Total = Sum(Direct Expenses) + Sum(Split shares of Shared Expenses)
                  const total = items.reduce((s, e) => s + (e.splitAmt ?? e.amount), 0);
                  const rent  = propRentTotal(property.id);
                  const net   = rent - total;
                  const isCollapsed = collapsedProps.has(property.id);

                  return (
                    <div key={property.id} id={`property-exp-${property.id}`} className="soft-card border border-white overflow-hidden bg-white/30">
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
                                    properties={properties} defaultDate={selectedMonth}
                                    onAdd={(label, amount, note, pid, date) => addExpenseItem(label, amount, note, property.id, date, addingInCat!.cat)}
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
                        <button onClick={e => { e.stopPropagation(); setSharedExpModal({ propertyId: null }); }}
                          className="w-10 h-10 rounded-2xl soft-button border border-white bg-white/60 text-primary hover:text-white hover:bg-primary flex items-center justify-center transition-all"
                          title="Add portfolio-wide shared expense">
                          <Plus className="w-5 h-5" />
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
                              <InlineAddRow key="add-shared" properties={properties} defaultDate={selectedMonth}
                                onAdd={(label, amount, note, pid, date) => addExpenseItem(label, amount, note, pid, date, addingInCat!.cat)}
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
                                  <InlineAddRow key="add-cat" properties={properties} defaultDate={selectedMonth}
                                    onAdd={(label, amount, note, pid, date) => addExpenseItem(label, amount, note, pid, date, cat)}
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

      {/* ── Modals ── */}
      <AnimatePresence>
        {roomModal && (
          <ModalOverlay onClose={() => setRoomModal(null)}>
            <RoomFinancialModal 
              room={rooms.find(r => r.id === roomModal.roomId)!}
              incomeRecords={rentRecords}
              expenses={expenses}
              onClose={() => setRoomModal(null)}
              onAddIncome={addIncomeRecord}
              onUpdateIncome={updateIncomeRecord}
              onDeleteIncome={deleteIncomeRecord}
              onAddExpense={addComplexExpense}
              onUpdateExpense={updateExpenseItem}
              onDeleteExpense={deleteExpenseItem}
            />
          </ModalOverlay>
        )}
        
        {sharedExpModal && (
          <ModalOverlay onClose={() => setSharedExpModal(null)}>
            <SharedExpenseModal 
              property={properties.find(p => p.id === sharedExpModal.propertyId)}
              rooms={rooms}
              allProperties={properties}
              onClose={() => setSharedExpModal(null)}
              onAddShared={addComplexExpense}
            />
          </ModalOverlay>
        )}

        {sourceDetail && (
          <ModalOverlay onClose={() => setSourceDetail(null)}>
            <div className="p-8 space-y-8 bg-white/95 backdrop-blur-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold tracking-tighter uppercase text-primary">{sourceDetail.title}</h2>
                  <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em]">Source Breakdown</p>
                </div>
                <button onClick={() => setSourceDetail(null)} className="p-2 soft-button border border-white text-foreground/30 hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {(sourceDetail.type === 'income' ? 
                  (sourceDetail.isLifetime ? allTimeInc : rentRecords) : 
                  (sourceDetail.isLifetime ? allTimeExp : expenses)
                ).length === 0 ? (
                  <p className="text-sm font-bold text-foreground/20 italic uppercase tracking-widest text-center py-10">No records found for this period.</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {(() => {
                      const data = sourceDetail.type === 'income' ? 
                        (sourceDetail.isLifetime ? allTimeInc : rentRecords) : 
                        (sourceDetail.isLifetime ? allTimeExp : expenses);
                      
                      const grouped: Record<string, number> = {};
                      data.forEach(item => {
                        const key = sourceDetail.type === 'income' ? (item as any).income_type : (item as any).category;
                        const label = sourceDetail.type === 'income' ? key : (CATEGORY_META[key as ExpenseCategory]?.label || key);
                        grouped[label] = (grouped[label] || 0) + item.amount;
                      });

                      return Object.entries(grouped).sort((a,b) => b[1] - a[1]).map(([label, amount]) => (
                        <div key={label} className="flex items-center justify-between p-4 soft-well border border-white hover:border-secondary/20 transition-all">
                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-foreground/30">{sourceDetail.type}</p>
                            <p className="text-sm font-bold text-foreground uppercase tracking-tight">{label}</p>
                          </div>
                          <p className={cn('text-lg font-black tracking-tighter', sourceDetail.type === 'income' ? 'text-secondary' : 'text-primary')}>
                            {sourceDetail.type === 'income' ? '' : '-'}{fmt(amount)}
                          </p>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/40">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-black uppercase text-foreground/30 tracking-widest">Total Position</p>
                  <h3 className="text-3xl font-black tracking-tighter text-foreground">
                    {(() => {
                      const data = (sourceDetail.type === 'income' ? 
                        (sourceDetail.isLifetime ? allTimeInc : rentRecords) : 
                        (sourceDetail.isLifetime ? allTimeExp : expenses));
                      return fmt(data.reduce((s,v) => s + v.amount, 0));
                    })()}
                  </h3>
                </div>
              </div>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>
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
