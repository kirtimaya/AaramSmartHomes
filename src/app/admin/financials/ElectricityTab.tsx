'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, ChevronDown, ChevronUp, Check, X, Loader2, Plus,
  Building2, ToggleLeft, ToggleRight, Wind, Users, FileText,
  CheckCircle2, AlertCircle, IndianRupee, Eye, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Property, Unit, ElectricityBill, RoomElectricityBill } from '@/lib/types';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtUnits = (n: number) => `${Number(n.toFixed(2))} u`;

// ── Types ────────────────────────────────────────────────────────────────────
type UnitWithConfig = Unit & {
  has_ac: boolean;
  ac_units_used: number;
  is_occupied: boolean;
};

type BillWithRooms = ElectricityBill & {
  room_electricity_bills: RoomElectricityBill[];
};

type SplitPreview = {
  unit_id: string;
  room_number: string;
  is_occupied: boolean;
  has_ac: boolean;
  ac_units: number;
  ac_amount: number;
  common_share_units: number;
  common_share_amount: number;
  total_amount: number;
};

// ── Helper ───────────────────────────────────────────────────────────────────
function computeSplit(
  units: UnitWithConfig[],
  totalUnits: number,
  totalAmount: number,
  acRatePerUnit: number
): SplitPreview[] {
  const totalAcUnits = units.reduce((s, u) => s + (u.has_ac ? u.ac_units_used : 0), 0);
  const totalAcAmount = totalAcUnits * acRatePerUnit;
  const commonUnits = Math.max(0, totalUnits - totalAcUnits);
  const commonAmount = Math.max(0, totalAmount - totalAcAmount);
  const occupiedUnits = units.filter(u => u.is_occupied);
  const occupiedCount = occupiedUnits.length;
  const commonShareUnits = occupiedCount > 0 ? commonUnits / occupiedCount : 0;
  const commonShareAmount = occupiedCount > 0 ? commonAmount / occupiedCount : 0;

  return units.map(u => {
    const acUnits = u.has_ac ? u.ac_units_used : 0;
    const acAmount = acUnits * acRatePerUnit;
    const shareUnits = u.is_occupied ? commonShareUnits : 0;
    const shareAmount = u.is_occupied ? commonShareAmount : 0;
    return {
      unit_id: u.id,
      room_number: u.room_number,
      is_occupied: u.is_occupied,
      has_ac: u.has_ac,
      ac_units: acUnits,
      ac_amount: acAmount,
      common_share_units: shareUnits,
      common_share_amount: shareAmount,
      total_amount: acAmount + shareAmount,
    };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RoomConfigCard({
  unit,
  onChange,
}: {
  unit: UnitWithConfig;
  onChange: (id: string, field: keyof UnitWithConfig, value: boolean | number) => void;
}) {
  return (
    <div className={cn(
      'soft-well border p-4 space-y-3 transition-all',
      unit.is_occupied ? 'border-secondary/30 bg-secondary/5' : 'border-white/60 bg-white/20'
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-foreground/40">Room</p>
          <p className="text-sm font-black text-foreground uppercase tracking-tight">{unit.room_number}</p>
        </div>
        <button
          onClick={() => onChange(unit.id, 'is_occupied', !unit.is_occupied)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border transition-all',
            unit.is_occupied
              ? 'bg-secondary/10 text-secondary border-secondary/30'
              : 'bg-white/60 text-foreground/30 border-white/60'
          )}
        >
          {unit.is_occupied ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
          {unit.is_occupied ? 'Occupied' : 'Vacant'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wind className={cn('w-3.5 h-3.5', unit.has_ac ? 'text-blue-500' : 'text-foreground/20')} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">AC Installed</span>
        </div>
        <button
          onClick={() => onChange(unit.id, 'has_ac', !unit.has_ac)}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border transition-all',
            unit.has_ac
              ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
              : 'bg-white/60 text-foreground/30 border-white/60'
          )}
        >
          {unit.has_ac ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {unit.has_ac ? 'Yes' : 'No'}
        </button>
      </div>

      {unit.has_ac && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 whitespace-nowrap">
              AC Units Used
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={unit.ac_units_used || ''}
              onChange={e => onChange(unit.id, 'ac_units_used', parseFloat(e.target.value) || 0)}
              className="flex-1 soft-ui-in py-2 px-3 text-xs bg-white/60 border border-white outline-none text-right font-bold"
              placeholder="0"
            />
            <span className="text-[10px] font-bold text-foreground/30">units</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SplitBreakupCard({ row }: { row: SplitPreview | RoomElectricityBill }) {
  const isPreview = 'is_occupied' in row;
  const roomNum = 'room_number' in row ? row.room_number : '';
  const occupied = isPreview ? (row as SplitPreview).is_occupied : (row as RoomElectricityBill).status !== 'unpaid';

  return (
    <div className={cn(
      'soft-well border p-4 space-y-3',
      row.total_amount > 0 ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/60 bg-white/20'
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-foreground/40">Room</p>
          <p className="text-sm font-black text-foreground uppercase">{roomNum}</p>
        </div>
        <p className="text-xl font-black text-primary tracking-tighter">{fmt(row.total_amount)}</p>
      </div>
      <div className="space-y-1 pt-1 border-t border-white/60">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-blue-500 flex items-center gap-1"><Wind className="w-3 h-3" /> AC ({fmtUnits(row.ac_units)} × ₹{isPreview ? 10 : 10})</span>
          <span className="text-blue-600">{fmt(row.ac_amount)}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-amber-600 flex items-center gap-1"><Users className="w-3 h-3" /> Common Share ({fmtUnits(row.common_share_units)})</span>
          <span className="text-amber-700">{fmt(row.common_share_amount)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ElectricityTab({ properties }: { properties: Property[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [units, setUnits] = useState<UnitWithConfig[]>([]);
  const [bills, setBills] = useState<BillWithRooms[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingBill, setSavingBill] = useState(false);

  // Bill form
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [billMonth, setBillMonth] = useState(currentMonth);
  const [totalUnits, setTotalUnits] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [acRate, setAcRate] = useState(10);
  const [preview, setPreview] = useState<SplitPreview[] | null>(null);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUnits = useCallback(async (propertyId: string) => {
    setLoadingUnits(true);
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('property_id', propertyId)
      .order('room_number');
    if (!error && data) {
      setUnits(data.map(u => ({
        ...u,
        has_ac: u.has_ac ?? false,
        ac_units_used: u.ac_units_used ?? 0,
        is_occupied: u.is_occupied ?? (u.status === 'Occupied' || u.status === 'Notice Period'),
      })));
    }
    setLoadingUnits(false);
  }, []);

  const fetchBills = useCallback(async (propertyId: string) => {
    setLoadingBills(true);
    const { data, error } = await supabase
      .from('electricity_bills')
      .select('*, room_electricity_bills(*)')
      .eq('property_id', propertyId)
      .order('bill_month', { ascending: false });
    if (!error && data) setBills(data as BillWithRooms[]);
    setLoadingBills(false);
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchUnits(selectedPropertyId);
      fetchBills(selectedPropertyId);
      setPreview(null);
    }
  }, [selectedPropertyId, fetchUnits, fetchBills]);

  const handleUnitChange = (id: string, field: keyof UnitWithConfig, value: boolean | number) => {
    setUnits(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u));
    setPreview(null);
  };

  const saveRoomConfig = async () => {
    setSavingConfig(true);
    const updates = units.map(u =>
      supabase.from('units').update({
        has_ac: u.has_ac,
        ac_units_used: u.ac_units_used,
        is_occupied: u.is_occupied,
      }).eq('id', u.id)
    );
    const results = await Promise.all(updates);
    const failed = results.filter(r => r.error);
    if (failed.length > 0) showToast('Some rooms failed to save', false);
    else showToast('Room configuration saved');
    setSavingConfig(false);
  };

  const handlePreview = () => {
    const tu = parseFloat(totalUnits);
    const ta = parseFloat(totalAmount);
    if (!tu || !ta || tu <= 0 || ta <= 0) {
      showToast('Enter valid total units and amount', false);
      return;
    }
    setPreview(computeSplit(units, tu, ta, acRate));
  };

  const saveBill = async () => {
    if (!preview) return;
    setSavingBill(true);
    const tu = parseFloat(totalUnits);
    const ta = parseFloat(totalAmount);

    // Check if bill for this month already exists
    const { data: existing } = await supabase
      .from('electricity_bills')
      .select('id')
      .eq('property_id', selectedPropertyId)
      .eq('bill_month', billMonth)
      .single();

    let billId: string;

    if (existing) {
      // Update existing draft
      const { error } = await supabase.from('electricity_bills').update({
        total_units: tu, total_amount: ta, ac_rate_per_unit: acRate, status: 'draft'
      }).eq('id', existing.id);
      if (error) { showToast('Failed to update bill: ' + error.message, false); setSavingBill(false); return; }
      billId = existing.id;
      // Delete old room bills
      await supabase.from('room_electricity_bills').delete().eq('bill_id', billId);
    } else {
      const { data: bill, error } = await supabase.from('electricity_bills').insert({
        property_id: selectedPropertyId,
        bill_month: billMonth,
        total_units: tu,
        total_amount: ta,
        ac_rate_per_unit: acRate,
        status: 'draft',
      }).select().single();
      if (error || !bill) { showToast('Failed to create bill: ' + (error?.message || ''), false); setSavingBill(false); return; }
      billId = bill.id;
    }

    const roomBills = preview.map(r => ({
      bill_id: billId,
      unit_id: r.unit_id,
      room_number: r.room_number,
      ac_units: r.ac_units,
      ac_amount: r.ac_amount,
      common_share_units: r.common_share_units,
      common_share_amount: r.common_share_amount,
      total_amount: r.total_amount,
      status: 'unpaid',
    }));

    const { error: roomErr } = await supabase.from('room_electricity_bills').insert(roomBills);
    if (roomErr) { showToast('Failed to save room bills: ' + roomErr.message, false); setSavingBill(false); return; }

    showToast('Bill saved as draft');
    setPreview(null);
    setTotalUnits('');
    setTotalAmount('');
    fetchBills(selectedPropertyId);
    setSavingBill(false);
  };

  const publishBill = async (billId: string) => {
    const { error } = await supabase.from('electricity_bills').update({ status: 'published' }).eq('id', billId);
    if (error) { showToast('Publish failed: ' + error.message, false); return; }
    showToast('Bill published — tenants can now see it');
    fetchBills(selectedPropertyId);
  };

  const deleteBill = async (billId: string) => {
    if (!confirm('Delete this bill and all room sub-bills?')) return;
    await supabase.from('electricity_bills').delete().eq('id', billId);
    fetchBills(selectedPropertyId);
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  return (
    <div className="space-y-10 pb-20 relative">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn(
              'fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold uppercase tracking-widest border',
              toast.ok ? 'bg-secondary/10 text-secondary border-secondary/30' : 'bg-red-500/10 text-red-600 border-red-500/30'
            )}
          >
            {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[9px] font-bold uppercase tracking-widest border border-amber-500/20">
          <Zap className="w-2.5 h-2.5" /> Electricity Bill Splitting
        </div>
        <h2 className="text-2xl font-bold tracking-tighter">Smart Bill Splitter</h2>
        <p className="text-foreground/40 text-sm">Configure rooms · Upload bill · Auto-split by AC usage + occupancy</p>
      </div>

      {/* Property Selector */}
      <div className="soft-card border border-white p-6 bg-white/30 space-y-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-foreground/40">Select Property</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {properties.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPropertyId(p.id)}
              className={cn(
                'flex items-center gap-3 p-4 rounded-2xl border text-left transition-all',
                selectedPropertyId === p.id
                  ? 'border-amber-500/40 bg-amber-500/10 shadow-md'
                  : 'border-white/60 bg-white/40 hover:bg-white/70'
              )}
            >
              <Building2 className={cn('w-5 h-5 flex-shrink-0', selectedPropertyId === p.id ? 'text-amber-600' : 'text-foreground/30')} />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-tight text-foreground">{p.name}</p>
                <p className="text-[10px] text-foreground/40 font-bold">{p.location}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedPropertyId && (
        <>
          {/* ── Room Configuration ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full bg-blue-500" />
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-tight">Room Configuration</h3>
                  <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">
                    {selectedProperty?.name} · {units.length} rooms
                  </p>
                </div>
              </div>
              <button
                onClick={saveRoomConfig}
                disabled={savingConfig || loadingUnits}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-terracotta text-[10px] font-extrabold uppercase tracking-widest disabled:opacity-50"
              >
                {savingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Config
              </button>
            </div>

            {loadingUnits ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {units.map((u: UnitWithConfig) => (
                  <RoomConfigCard key={u.id} unit={u} onChange={handleUnitChange} />
                ))}
              </div>
            )}

            {/* Config summary bar */}
            {units.length > 0 && (
              <div className="soft-well border border-white p-4 flex flex-wrap gap-6">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Occupied</p>
                  <p className="text-lg font-black text-secondary">{units.filter(u => u.is_occupied).length}</p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Vacant</p>
                  <p className="text-lg font-black text-foreground/40">{units.filter(u => !u.is_occupied).length}</p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">AC Rooms</p>
                  <p className="text-lg font-black text-blue-600">{units.filter(u => u.has_ac).length}</p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Total AC Units</p>
                  <p className="text-lg font-black text-blue-600">
                    {units.reduce((s, u) => s + (u.has_ac ? u.ac_units_used : 0), 0)} u
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Bill Upload & Split ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full bg-amber-500 -rotate-12" />
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight">Upload & Split Bill</h3>
                <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">
                  Enter total villa bill → auto-split per room
                </p>
              </div>
            </div>

            <div className="soft-card border border-white p-6 bg-white/30 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Bill Month</label>
                  <input
                    type="month"
                    value={billMonth}
                    onChange={e => { setBillMonth(e.target.value); setPreview(null); }}
                    className="w-full soft-ui-in py-2.5 px-4 text-sm bg-white/60 border border-white outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Total Units Consumed</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={totalUnits}
                    onChange={e => { setTotalUnits(e.target.value); setPreview(null); }}
                    placeholder="e.g. 450"
                    className="w-full soft-ui-in py-2.5 px-4 text-sm bg-white/60 border border-white outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Total Bill Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={totalAmount}
                    onChange={e => { setTotalAmount(e.target.value); setPreview(null); }}
                    placeholder="e.g. 5200"
                    className="w-full soft-ui-in py-2.5 px-4 text-sm bg-white/60 border border-white outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">AC Rate / Unit (₹)</label>
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    value={acRate}
                    onChange={e => { setAcRate(parseFloat(e.target.value) || 10); setPreview(null); }}
                    className="w-full soft-ui-in py-2.5 px-4 text-sm bg-white/60 border border-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePreview}
                  disabled={!totalUnits || !totalAmount}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 text-[10px] font-extrabold uppercase tracking-widest hover:bg-amber-500/20 transition-all disabled:opacity-40"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview Split
                </button>
                {preview && (
                  <button
                    onClick={saveBill}
                    disabled={savingBill}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl btn-terracotta text-[10px] font-extrabold uppercase tracking-widest disabled:opacity-50"
                  >
                    {savingBill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    Save as Draft
                  </button>
                )}
              </div>

              {/* Split Rule reminder */}
              <div className="soft-well border border-white p-4 space-y-1.5">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Split Rules</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold text-foreground/50">
                  <span className="flex items-center gap-1.5"><Wind className="w-3 h-3 text-blue-500" /> AC charge = AC units used × ₹{acRate} per room</span>
                  <span className="flex items-center gap-1.5"><Users className="w-3 h-3 text-amber-500" /> Common = (Total − AC) ÷ occupied rooms</span>
                  <span className="flex items-center gap-1.5"><X className="w-3 h-3 text-foreground/30" /> Vacant rooms pay ₹0 common share</span>
                  <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-500" /> AC charge applies regardless of occupancy</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Split Preview ── */}
          <AnimatePresence>
            {preview && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full bg-primary" />
                  <h3 className="text-lg font-bold uppercase tracking-tight">Bill Preview</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[9px] font-bold uppercase tracking-widest border border-amber-500/20">
                    {billMonth}
                  </span>
                </div>

                {/* Summary totals */}
                <div className="soft-well border border-amber-500/20 bg-amber-500/5 p-5 flex flex-wrap gap-6">
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Total Bill</p>
                    <p className="text-2xl font-black text-primary">{fmt(parseFloat(totalAmount))}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">AC Charges</p>
                    <p className="text-2xl font-black text-blue-600">{fmt(preview.reduce((s, r) => s + r.ac_amount, 0))}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Common Charges</p>
                    <p className="text-2xl font-black text-amber-600">{fmt(preview.reduce((s, r) => s + r.common_share_amount, 0))}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Billed Rooms</p>
                    <p className="text-2xl font-black text-secondary">{preview.filter(r => r.total_amount > 0).length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {preview.map(row => (
                    <SplitBreakupCard key={row.unit_id} row={row} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Past Bills ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full bg-foreground/20" />
              <h3 className="text-lg font-bold uppercase tracking-tight">Past Bills</h3>
            </div>

            {loadingBills ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : bills.length === 0 ? (
              <div className="soft-well border border-white p-10 text-center">
                <Zap className="w-8 h-8 text-foreground/10 mx-auto mb-3" />
                <p className="text-sm font-bold text-foreground/20 uppercase tracking-widest">No bills yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bills.map(bill => (
                  <div key={bill.id} className="soft-card border border-white bg-white/30">
                    {/* Bill header row */}
                    <div className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          bill.status === 'published' ? 'bg-secondary' : 'bg-amber-400'
                        )} />
                        <div>
                          <p className="text-sm font-extrabold uppercase tracking-tight text-foreground">{bill.bill_month}</p>
                          <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                            {bill.total_units} units · {fmt(bill.total_amount)} ·{' '}
                            <span className={bill.status === 'published' ? 'text-secondary' : 'text-amber-600'}>
                              {bill.status}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {bill.status === 'draft' && (
                          <button
                            onClick={() => publishBill(bill.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/10 text-secondary border border-secondary/30 text-[10px] font-extrabold uppercase tracking-widest hover:bg-secondary/20 transition-all"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Publish
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)}
                          className="p-2 rounded-xl soft-button border border-white text-foreground/40 hover:text-foreground"
                        >
                          {expandedBillId === bill.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteBill(bill.id)}
                          className="p-2 rounded-xl soft-button border border-white text-foreground/20 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded room sub-bills */}
                    <AnimatePresence>
                      {expandedBillId === bill.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 border-t border-white/60 pt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {bill.room_electricity_bills.map(rb => (
                                <SplitBreakupCard key={rb.id} row={rb} />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
