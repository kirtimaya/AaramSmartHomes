'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, Plus, Check, X, ChevronDown, AlertTriangle, Loader2,
  Edit2, Lock, Eye, Upload, RefreshCw, Wind, FileText, Trash2, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Property, ElectricityBill, TenantACSubmission, BillSplit } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

function monthLabel(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  // Try sb-<ref>-auth-token format (Supabase JS v2+)
  const sbEntry = Object.entries(localStorage).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (sbEntry) {
    try {
      const token = JSON.parse(sbEntry[1])?.access_token;
      if (token) return { Authorization: `Bearer ${token}` };
    } catch { /* ignore */ }
  }
  // Fallback: legacy key format
  const key = Object.keys(localStorage).find(k => k.includes('supabase') && k.includes('auth'));
  if (!key) return {};
  try {
    const session = JSON.parse(localStorage.getItem(key) || '{}');
    const token = session?.access_token || session?.currentSession?.access_token;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch { /* ignore */ }
  return {};
}

async function apiCall(path: string, method: string, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAuthHeader() };
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:          { label: 'Pending',           cls: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  validated:        { label: 'Validated',          cls: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  rejected:         { label: 'Rejected',           cls: 'bg-red-500/10 text-red-600 border-red-500/30' },
  split_calculated: { label: 'Split Calculated',   cls: 'bg-purple-500/10 text-purple-700 border-purple-500/30' },
  locked:           { label: 'Locked',             cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  draft:            { label: 'Draft',              cls: 'bg-foreground/5 text-foreground/50 border-foreground/20' },
  published:        { label: 'Published',          cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
};

function StatusBadge({ status, reason }: { status: string; reason?: string }) {
  const meta = STATUS_META[status] || { label: status, cls: 'bg-foreground/5 text-foreground/50 border-foreground/20' };
  return (
    <span title={reason} className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border', meta.cls)}>
      {meta.label}
      {status === 'rejected' && reason && <AlertTriangle className="w-2.5 h-2.5 ml-1" />}
    </span>
  );
}

// ── Upload Bill Modal ─────────────────────────────────────────────────────────

interface UploadModalProps {
  properties: Property[];
  onClose: () => void;
  onUploaded: () => void;
}

function UploadBillModal({ properties, onClose, onUploaded }: UploadModalProps) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [billMonth, setBillMonth] = useState(new Date().toISOString().slice(0, 7));
  const [uscNo, setUscNo] = useState('');
  const [presentReading, setPresentReading] = useState('');
  const [previousReading, setPreviousReading] = useState('');
  const [presentDate, setPresentDate] = useState('');
  const [previousDate, setPreviousDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status?: string; rejection_reason?: string } | null>(null);
  const [error, setError] = useState('');

  const totalUnits = presentReading && previousReading
    ? Number(presentReading) - Number(previousReading)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('property_id', propertyId);
      fd.append('bill_month', billMonth);
      fd.append('usc_no', uscNo);
      fd.append('present_reading', presentReading);
      fd.append('previous_reading', previousReading);
      fd.append('present_date', presentDate);
      fd.append('previous_date', previousDate);
      fd.append('total_amount', totalAmount);
      fd.append('total_units', String(totalUnits));
      if (imageFile) fd.append('image', imageFile);
      else if (imageUrl) fd.append('image_url', imageUrl);

      const authHdr = getAuthHeader();
      const res = await fetch('/api/bills/upload', {
        method: 'POST',
        headers: authHdr as Record<string, string>,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed'); return; }

      // Auto-validate after upload
      try {
        const validateRes = await apiCall(`/api/admin/bills/${data.id}/validate`, 'POST');
        setResult({ status: validateRes.status, rejection_reason: validateRes.rejection_reason });
      } catch { setResult({ status: 'pending' }); }

      onUploaded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="soft-card border border-white max-w-xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-500" /> Upload Electricity Bill
            </h2>
            <button onClick={onClose} className="soft-button w-8 h-8 border border-white"><X className="w-4 h-4" /></button>
          </div>

          {result ? (
            <div className={cn('p-4 rounded-2xl border text-sm font-bold',
              result.status === 'validated' ? 'bg-blue-500/10 border-blue-500/20 text-blue-700' :
              result.status === 'rejected'  ? 'bg-red-500/10 border-red-500/20 text-red-600' :
              'bg-yellow-500/10 border-yellow-500/20 text-yellow-700')}>
              <p>Status: <StatusBadge status={result.status || 'pending'} /></p>
              {result.rejection_reason && <p className="mt-1 text-xs">{result.rejection_reason}</p>}
              <button onClick={onClose} className="mt-3 soft-button px-4 py-2 border border-white text-[10px] font-extrabold uppercase tracking-widest">Close</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Property</label>
                  <select value={propertyId} onChange={e => setPropertyId(e.target.value)}
                    className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl">
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Bill Month</label>
                  <input type="month" value={billMonth} onChange={e => setBillMonth(e.target.value)}
                    className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">USC No.</label>
                  <input value={uscNo} onChange={e => setUscNo(e.target.value)} placeholder="e.g. USC123456"
                    className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Present Reading</label>
                  <input type="number" value={presentReading} onChange={e => setPresentReading(e.target.value)}
                    className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Previous Reading</label>
                  <input type="number" value={previousReading} onChange={e => setPreviousReading(e.target.value)}
                    className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Present Date</label>
                  <input type="date" value={presentDate} onChange={e => setPresentDate(e.target.value)}
                    className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Previous Date</label>
                  <input type="date" value={previousDate} onChange={e => setPreviousDate(e.target.value)}
                    className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Total Amount (₹)</label>
                  <input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} required
                    className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Total Units</label>
                  <input readOnly value={totalUnits || ''} placeholder="Auto-computed"
                    className="soft-ui-in w-full bg-white/20 border border-white px-3 py-2 text-xs outline-none rounded-xl text-foreground/50" />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Bill Image</label>
                  <input type="file" accept="image/*,application/pdf"
                    onChange={e => setImageFile(e.target.files?.[0] || null)}
                    className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
                  <p className="text-[8px] text-foreground/30 font-bold">or paste URL:</p>
                  <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..."
                    className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
                </div>
              </div>

              {error && <p className="text-xs text-red-600 font-bold">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="flex-1 soft-button py-2.5 border border-white text-[10px] font-extrabold uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload & Validate
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Split Summary Drawer ──────────────────────────────────────────────────────

interface SplitSummaryProps {
  billId: string;
  onClose: () => void;
  onRefresh: () => void;
}

function SplitSummaryDrawer({ billId, onClose, onRefresh }: SplitSummaryProps) {
  const [data, setData] = useState<{ bill: ElectricityBill; summary: any[]; unattributed_units: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/api/admin/bills/${billId}/split-summary`, 'GET');
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleOverride = async (tenantId: string) => {
    const units = Number(overrides[tenantId]);
    if (isNaN(units) || units < 0) return;
    setSaving(true);
    try {
      await apiCall(`/api/admin/bills/${billId}/ac-override`, 'PATCH', { tenant_id: tenantId, ac_units: units });
      setEditingRow(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Override failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    setCalculating(true);
    setError('');
    try {
      await apiCall(`/api/admin/bills/${billId}/calculate-split`, 'POST');
      await fetchSummary();
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Recalculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handleLock = async () => {
    if (!confirm('Lock this bill? This cannot be undone and will notify all tenants.')) return;
    setLocking(true);
    try {
      await apiCall(`/api/admin/bills/${billId}/lock`, 'POST');
      onRefresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lock failed');
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        className="soft-card border border-white w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="p-5 flex items-center justify-between border-b border-foreground/5">
          <h2 className="text-base font-bold uppercase tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" /> Split Summary
          </h2>
          <button onClick={onClose} className="soft-button w-8 h-8 border border-white"><X className="w-4 h-4" /></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-10">
            <Loader2 className="w-8 h-8 text-foreground/20 animate-spin" />
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-4">
              {error && <p className="text-xs text-red-600 font-bold">{error}</p>}

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 border-b border-foreground/5">
                      <th className="text-left pb-2 pr-4">Tenant</th>
                      <th className="text-left pb-2 pr-4">Room</th>
                      <th className="text-right pb-2 pr-4">AC Units</th>
                      <th className="text-right pb-2 pr-4">AC Charge</th>
                      <th className="text-right pb-2 pr-4">Common Share</th>
                      <th className="text-right pb-2">Total Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.summary.map((row: any) => (
                      <tr key={row.id} className="border-b border-foreground/5">
                        <td className="py-2.5 pr-4 font-bold">{row.tenant_name}</td>
                        <td className="py-2.5 pr-4 text-foreground/50">{row.room}</td>
                        <td className="py-2.5 pr-4 text-right">
                          {editingRow === (row.submission?.tenant_id || row.id) ? (
                            <div className="flex items-center justify-end gap-1">
                              <input type="number" min="0"
                                value={overrides[row.submission?.tenant_id || row.id] ?? row.ac_units}
                                onChange={e => setOverrides(prev => ({ ...prev, [row.submission?.tenant_id || row.id]: e.target.value }))}
                                className="w-16 soft-ui-in border border-white px-1.5 py-0.5 text-xs text-right outline-none rounded-lg" />
                              <button onClick={() => handleOverride(row.submission?.tenant_id || row.id)} disabled={saving}
                                className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center text-white">
                                <Check className="w-3 h-3" />
                              </button>
                              <button onClick={() => setEditingRow(null)}
                                className="w-5 h-5 rounded-md bg-foreground/10 flex items-center justify-center">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <span>{row.ac_units}</span>
                              {data.bill.status !== 'locked' && (
                                <button
                                  onClick={() => { setEditingRow(row.submission?.tenant_id || row.id); setOverrides(prev => ({ ...prev, [row.submission?.tenant_id || row.id]: String(row.ac_units) })); }}
                                  className="w-4 h-4 rounded soft-button border border-white text-foreground/40 hover:text-secondary flex items-center justify-center">
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-right text-blue-600 font-bold">{fmt(row.ac_charge)}</td>
                        <td className="py-2.5 pr-4 text-right text-amber-600 font-bold">{fmt(row.common_share)}</td>
                        <td className="py-2.5 text-right font-black text-primary">{fmt(row.total_payable)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.unattributed_units > 0 && (
                <div className="soft-well border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-2 text-xs text-amber-700 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {data.unattributed_units} units not attributed to any room — absorbed into common pool
                </div>
              )}
            </div>
          </div>
        ) : null}

        {data?.bill.status !== 'locked' && (
          <div className="p-5 border-t border-foreground/5 flex gap-3">
            <button onClick={handleRecalculate} disabled={calculating}
              className="flex-1 soft-button py-2.5 border border-purple-500/30 text-purple-600 text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-2">
              {calculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Recalculate
            </button>
            <button onClick={handleLock} disabled={locking || !data?.summary.length}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40">
              {locking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              Lock Bill
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Reject Dialog ─────────────────────────────────────────────────────────────

function RejectDialog({ billId, onClose, onRejected }: { billId: string; onClose: () => void; onRejected: () => void }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await apiCall(`/api/admin/bills/${billId}/reject`, 'POST', { reason });
      onRejected();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="soft-card border border-white max-w-sm w-full p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-tight">Reject Bill</h3>
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Reason for rejection..."
          className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl min-h-[80px]" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 soft-button py-2 border border-white text-[10px] font-extrabold uppercase tracking-widest">Cancel</button>
          <button onClick={handleReject} disabled={loading || !reason.trim()}
            className="flex-1 py-2 rounded-xl bg-red-500 text-white text-[10px] font-extrabold uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-1">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Reject
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Shared type ───────────────────────────────────────────────────────────────

type BillRow = ElectricityBill & { properties?: { name: string } };

// ── Edit Bill Modal ───────────────────────────────────────────────────────────

interface EditBillModalProps {
  bill: BillRow;
  onClose: () => void;
  onSaved: () => void;
}

function EditBillModal({ bill, onClose, onSaved }: EditBillModalProps) {
  const [billMonth,       setBillMonth]       = useState(bill.bill_month?.slice(0, 7) || '');
  const [uscNo,           setUscNo]           = useState(bill.usc_no || '');
  const [totalAmount,     setTotalAmount]     = useState(String(bill.total_amount || ''));
  const [totalUnits,      setTotalUnits]      = useState(String(bill.total_units || ''));
  const [presentReading,  setPresentReading]  = useState(String(bill.present_reading || ''));
  const [previousReading, setPreviousReading] = useState(String(bill.previous_reading || ''));
  const [presentDate,     setPresentDate]     = useState(bill.present_date || '');
  const [previousDate,    setPreviousDate]    = useState(bill.previous_date || '');
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalAmount) { setError('Total amount is required'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase
      .from('electricity_bills')
      .update({
        bill_month:       billMonth + '-01',
        usc_no:           uscNo || null,
        total_amount:     parseFloat(totalAmount),
        total_units:      totalUnits ? parseFloat(totalUnits) : null,
        present_reading:  presentReading ? parseFloat(presentReading) : null,
        previous_reading: previousReading ? parseFloat(previousReading) : null,
        present_date:     presentDate || null,
        previous_date:    previousDate || null,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', bill.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="soft-card border border-white max-w-xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" /> Edit Bill
            </h2>
            <button onClick={onClose} className="soft-button w-8 h-8 border border-white"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Bill Month</label>
                <input type="month" value={billMonth} onChange={e => setBillMonth(e.target.value)}
                  className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">USC No.</label>
                <input value={uscNo} onChange={e => setUscNo(e.target.value)} placeholder="e.g. USC123456"
                  className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Total Amount (₹) *</label>
                <input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} required
                  className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Total Units</label>
                <input type="number" value={totalUnits} onChange={e => setTotalUnits(e.target.value)}
                  className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Present Reading</label>
                <input type="number" value={presentReading} onChange={e => setPresentReading(e.target.value)}
                  className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Previous Reading</label>
                <input type="number" value={previousReading} onChange={e => setPreviousReading(e.target.value)}
                  className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Present Date</label>
                <input type="date" value={presentDate} onChange={e => setPresentDate(e.target.value)}
                  className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">Previous Date</label>
                <input type="date" value={previousDate} onChange={e => setPreviousDate(e.target.value)}
                  className="soft-ui-in w-full bg-white/40 border border-white px-3 py-2 text-xs outline-none rounded-xl" />
              </div>
            </div>

            {error && <p className="text-xs text-red-600 font-bold">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 soft-button py-2.5 border border-white text-[10px] font-extrabold uppercase tracking-widest">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ElectricityTabProps {
  properties: Property[];
}

export function ElectricityTab({ properties }: ElectricityTabProps) {
  const [bills, setBills] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [filterProperty, setFilterProperty] = useState<string>('');
  const [showUpload, setShowUpload] = useState(false);
  const [splitBillId, setSplitBillId] = useState<string | null>(null);
  const [rejectBillId, setRejectBillId] = useState<string | null>(null);
  const [editBill, setEditBill] = useState<BillRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchBills = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('electricity_bills')
      .select('*, properties(name)')
      .order('bill_month', { ascending: false });
    if (data) setBills(data as BillRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const pendingCount = bills.filter(b => b.status === 'pending').length;

  const filtered = bills.filter(b => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterProperty && b.property_id !== filterProperty) return false;
    return true;
  });

  const handleValidate = async (bill: BillRow) => {
    setActionLoading(bill.id);
    setError('');
    try {
      await apiCall(`/api/admin/bills/${bill.id}/validate`, 'POST');
      await fetchBills();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCalculateSplit = async (bill: BillRow) => {
    setActionLoading(bill.id);
    setError('');
    try {
      const res = await apiCall(`/api/admin/bills/${bill.id}/calculate-split`, 'POST');
      if (res.missing_submissions?.length) {
        alert(`Split calculated. Warning: No AC submissions from: ${res.missing_submissions.join(', ')}`);
      }
      await fetchBills();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Split calculation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (bill: BillRow) => {
    if (!confirm(`Delete bill for ${monthLabel(bill.bill_month)}? This cannot be undone.`)) return;
    setActionLoading(bill.id);
    setError('');
    const { error: err } = await supabase.from('electricity_bills').delete().eq('id', bill.id);
    setActionLoading(null);
    if (err) { setError(err.message); return; }
    await fetchBills();
  };

  const handleViewImage = async (bill: BillRow) => {
    if (!bill.bill_image_url) return;
    if (bill.bill_image_url.startsWith('http')) {
      window.open(bill.bill_image_url, '_blank');
      return;
    }
    const { data } = await supabase.storage.from('electricity-bills').createSignedUrl(bill.bill_image_url, 120);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else window.open(bill.bill_image_url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-amber-500" />
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
              Electricity Bills
              {pendingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-yellow-500 text-white text-[10px] font-extrabold">
                  {pendingCount}
                </span>
              )}
            </h2>
            <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Upload · Validate · Split · Lock</p>
          </div>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="soft-button px-5 py-2.5 border border-amber-500/30 bg-amber-500/5 text-amber-700 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" /> Upload Bill
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 p-1 soft-well rounded-2xl border border-white">
          {['pending', 'validated', 'rejected', 'split_calculated', 'locked', ''].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn('px-3 py-1.5 rounded-xl text-[9px] font-extrabold uppercase tracking-widest transition-all',
                filterStatus === s ? 'bg-white shadow text-foreground' : 'text-foreground/40 hover:text-foreground')}>
              {s || 'All'}
              {s === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1 rounded-full bg-yellow-500 text-white text-[8px]">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
        <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)}
          className="soft-ui-in bg-white/40 border border-white px-3 py-1.5 text-xs outline-none rounded-xl">
          <option value="">All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {error && <p className="text-xs text-red-600 font-bold">{error}</p>}

      {/* ── Bills Table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-foreground/20 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="soft-well border border-white p-10 text-center">
          <Zap className="w-8 h-8 text-foreground/10 mx-auto mb-2" />
          <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">No bills found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 border-b border-foreground/5">
                <th className="text-left pb-3 pr-4">Property</th>
                <th className="text-left pb-3 pr-4">Month</th>
                <th className="text-left pb-3 pr-4">USC No.</th>
                <th className="text-right pb-3 pr-4">Units</th>
                <th className="text-right pb-3 pr-4">Amount</th>
                <th className="text-left pb-3 pr-4">Uploaded By</th>
                <th className="text-left pb-3 pr-4">Source</th>
                <th className="text-left pb-3 pr-4">Status</th>
                <th className="text-left pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(bill => (
                <tr key={bill.id} className="border-b border-foreground/5 hover:bg-white/30 transition-colors">
                  <td className="py-3 pr-4 font-bold">{(bill as any).properties?.name || '—'}</td>
                  <td className="py-3 pr-4 text-foreground/60">{monthLabel(bill.bill_month)}</td>
                  <td className="py-3 pr-4 text-foreground/50 font-mono text-[10px]">{bill.usc_no || '—'}</td>
                  <td className="py-3 pr-4 text-right">{bill.total_units}</td>
                  <td className="py-3 pr-4 text-right font-bold">{fmt(bill.total_amount)}</td>
                  <td className="py-3 pr-4 text-foreground/50">{bill.uploaded_by_name || '—'}</td>
                  <td className="py-3 pr-4">
                    <span className={cn('text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border',
                      bill.upload_source === 'tenant'
                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                        : 'bg-foreground/5 text-foreground/40 border-foreground/10')}>
                      {bill.upload_source || 'admin'}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={bill.status} reason={bill.rejection_reason} />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {bill.status === 'pending' && (
                        <>
                          <button onClick={() => handleValidate(bill)} disabled={actionLoading === bill.id}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 text-[9px] font-extrabold uppercase tracking-widest border border-blue-500/20 flex items-center gap-1 disabled:opacity-50">
                            {actionLoading === bill.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                            Validate
                          </button>
                          <button onClick={() => setRejectBillId(bill.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 text-[9px] font-extrabold uppercase tracking-widest border border-red-500/20 flex items-center gap-1">
                            <X className="w-2.5 h-2.5" /> Reject
                          </button>
                        </>
                      )}
                      {bill.status === 'validated' && (
                        <>
                          <button onClick={() => handleCalculateSplit(bill)} disabled={actionLoading === bill.id}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-700 text-[9px] font-extrabold uppercase tracking-widest border border-purple-500/20 flex items-center gap-1 disabled:opacity-50">
                            {actionLoading === bill.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wind className="w-2.5 h-2.5" />}
                            Calc Split
                          </button>
                          <button onClick={() => setRejectBillId(bill.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 text-[9px] font-extrabold uppercase tracking-widest border border-red-500/20">
                            Reject
                          </button>
                        </>
                      )}
                      {(bill.status === 'split_calculated' || bill.status === 'locked') && (
                        <button onClick={() => setSplitBillId(bill.id)}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-700 text-[9px] font-extrabold uppercase tracking-widest border border-purple-500/20 flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" /> {bill.status === 'locked' ? 'Summary' : 'Edit Split'}
                        </button>
                      )}
                      {bill.bill_image_url && (
                        <button onClick={() => handleViewImage(bill)}
                          className="px-2.5 py-1 rounded-lg bg-foreground/5 text-foreground/50 text-[9px] font-extrabold uppercase tracking-widest border border-foreground/10 flex items-center gap-1 hover:bg-white/60 transition-colors">
                          <ImageIcon className="w-2.5 h-2.5" /> View Bill
                        </button>
                      )}
                      {bill.status !== 'locked' && (
                        <button onClick={() => setEditBill(bill)}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[9px] font-extrabold uppercase tracking-widest border border-primary/20 flex items-center gap-1 hover:bg-primary/20 transition-colors">
                          <Edit2 className="w-2.5 h-2.5" /> Edit
                        </button>
                      )}
                      {bill.status !== 'locked' && (
                        <button onClick={() => handleDelete(bill)} disabled={actionLoading === bill.id}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 text-[9px] font-extrabold uppercase tracking-widest border border-red-500/20 flex items-center gap-1 hover:bg-red-500/20 transition-colors disabled:opacity-40">
                          {actionLoading === bill.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {showUpload && (
          <UploadBillModal
            properties={properties}
            onClose={() => setShowUpload(false)}
            onUploaded={() => { setShowUpload(false); fetchBills(); }}
          />
        )}
        {splitBillId && (
          <SplitSummaryDrawer
            billId={splitBillId}
            onClose={() => setSplitBillId(null)}
            onRefresh={fetchBills}
          />
        )}
        {rejectBillId && (
          <RejectDialog
            billId={rejectBillId}
            onClose={() => setRejectBillId(null)}
            onRejected={fetchBills}
          />
        )}
        {editBill && (
          <EditBillModal
            bill={editBill}
            onClose={() => setEditBill(null)}
            onSaved={fetchBills}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
