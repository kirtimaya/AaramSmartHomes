'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Wrench, Plus, Trash2, Save, Loader2, UserCog } from 'lucide-react';

interface Professional {
  id: string; name: string; phoneE164: string; role: 'professional' | 'cook';
  trade: string | null; active: boolean; notes: string | null;
}

const TRADES = ['plumbing', 'electrical', 'carpentry', 'appliance', 'cleaning', 'pest_control', 'general'];

export default function ProfessionalsPage() {
  const [items, setItems] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', phoneE164: '', role: 'professional' as Professional['role'], trade: 'general' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await apiGet<Professional[]>('/api/admin/professionals'));
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateField = (id: string, field: 'name' | 'phoneE164' | 'trade', value: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const toggleActive = (id: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, active: !i.active } : i));

  const saveItem = async (item: Professional) => {
    setSaving(item.id);
    try {
      await apiPut(`/api/admin/professionals/${item.id}`, {
        name: item.name, phoneE164: item.phoneE164, role: item.role,
        trade: item.trade, active: item.active, notes: item.notes,
      });
      showToast('Saved!');
    } catch {
      showToast('Save failed — check the phone is in E.164 format (+91…).');
    }
    setSaving(null);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Remove this professional from the roster?')) return;
    try {
      await apiDelete(`/api/admin/professionals/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      showToast('Removed.');
    } catch {
      showToast('Delete failed. Please try again.');
    }
  };

  const addItem = async () => {
    if (!newItem.name.trim() || !newItem.phoneE164.trim()) return;
    setAdding(true);
    try {
      const created = await apiPost<Professional>('/api/admin/professionals', {
        name: newItem.name.trim(), phoneE164: newItem.phoneE164.trim(),
        role: newItem.role, trade: newItem.role === 'cook' ? null : newItem.trade, active: true,
      });
      setItems(prev => [...prev, created]);
      setNewItem({ name: '', phoneE164: '', role: 'professional', trade: 'general' });
      showToast('Added to roster!');
    } catch {
      showToast('Add failed — check the phone is in E.164 format (+91…).');
    }
    setAdding(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">Roster</h1>
            <p className="text-xs text-foreground/40 font-bold uppercase tracking-widest mt-1">
              Local professionals &amp; cooks dispatched over WhatsApp
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <UserCog className="w-6 h-6" />
          </div>
        </div>

        <div className="soft-card p-6 border border-white bg-white/40 space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground/50 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-primary" /> Add to Roster
          </h3>
          <div className="flex flex-wrap gap-2">
            <input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
              placeholder="Name" className="soft-ui-in flex-1 min-w-[140px] px-3 py-2.5 text-sm focus:outline-none bg-white/70 border border-white" />
            <input value={newItem.phoneE164} onChange={e => setNewItem(p => ({ ...p, phoneE164: e.target.value }))}
              placeholder="+919876543210" className="soft-ui-in w-44 px-3 py-2.5 text-sm focus:outline-none bg-white/70 border border-white" />
            <select value={newItem.role} onChange={e => setNewItem(p => ({ ...p, role: e.target.value as Professional['role'] }))}
              className="soft-ui-in w-32 px-2 py-2.5 text-xs focus:outline-none bg-white/70 border border-white">
              <option value="professional">Professional</option>
              <option value="cook">Cook</option>
            </select>
            {newItem.role === 'professional' && (
              <select value={newItem.trade} onChange={e => setNewItem(p => ({ ...p, trade: e.target.value }))}
                className="soft-ui-in w-32 px-2 py-2.5 text-xs focus:outline-none bg-white/70 border border-white">
                {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <button onClick={addItem} disabled={adding || !newItem.name.trim() || !newItem.phoneE164.trim()}
              className="btn-terracotta px-5 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center">
              <Wrench className="w-7 h-7 text-foreground/20" />
            </div>
            <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">No one on the roster yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="soft-card p-4 border border-white bg-white/40 flex flex-wrap items-center gap-2">
                <input value={item.name} onChange={e => updateField(item.id, 'name', e.target.value)}
                  className="soft-ui-in flex-1 min-w-[120px] px-3 py-2 text-sm font-bold focus:outline-none bg-white/70 border border-white" />
                <input value={item.phoneE164} onChange={e => updateField(item.id, 'phoneE164', e.target.value)}
                  className="soft-ui-in w-40 px-3 py-2 text-xs focus:outline-none bg-white/70 border border-white" />
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-foreground/5 text-foreground/40">
                  {item.role}
                </span>
                {item.role === 'professional' && (
                  <select value={item.trade ?? 'general'} onChange={e => updateField(item.id, 'trade', e.target.value)}
                    className="soft-ui-in w-32 px-2 py-2 text-xs focus:outline-none bg-white/70 border border-white">
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-foreground/40">
                  <input type="checkbox" checked={item.active} onChange={() => toggleActive(item.id)} /> Active
                </label>
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
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={cn('fixed bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl z-50')}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
