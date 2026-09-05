'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { Users, Clock, Copy, Check, Trash2, Home, Mail, Phone, MapPin, Search, X, ChevronDown, Link as LinkIcon, Pencil, ToggleLeft, ToggleRight, Save, Loader2, Plus, FileText, Eye, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Property { id: string; name: string; }
interface Room { id: string; name: string; property_id: string; occupancy_status: string; tenant_id: string | null; }
interface Tenant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  room_id: string | null;
  created_at: string;
  status: string;
  move_in_date: string | null;
  move_out_date: string | null;
}
interface TenantInvitation {
  id: string;
  room_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  token: string;
  created_at: string;
}
interface TenantDocument {
  id: string;
  tenant_id: string;
  label: string;
  category: string;
  storage_path: string;
  uploaded_by_name: string | null;
  created_at: string;
}

const DOC_CATEGORIES = [
  { value: 'rental_agreement', label: 'Rental Agreement' },
  { value: 'id_proof',         label: 'ID Proof' },
  { value: 'receipt',          label: 'Receipt' },
  { value: 'other',            label: 'Other' },
] as const;

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const sbEntry = Object.entries(localStorage).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (sbEntry) {
    try {
      const token = JSON.parse(sbEntry[1])?.access_token;
      if (token) return { Authorization: `Bearer ${token}` };
    } catch { /* ignore */ }
  }
  return {};
}

const MAX_ROOM_OCCUPANTS = 2;

function RoomPicker({
  rooms, properties, tenants, currentRoomId, onSelect, onClose,
}: {
  rooms: Room[]; properties: Property[]; tenants: Tenant[]; currentRoomId: string | null;
  onSelect: (roomId: string | null) => void; onClose: () => void;
}) {
  const occupantCount = (roomId: string) => tenants.filter(t => t.room_id === roomId && t.status !== 'moved_out').length;

  const available = rooms.filter(r => occupantCount(r.id) < MAX_ROOM_OCCUPANTS || r.id === currentRoomId);
  return (
    <div className="absolute top-full left-0 right-0 mt-1 z-50 soft-card border border-white bg-background shadow-xl rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
      <button
        onClick={() => { onSelect(null); onClose(); }}
        className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-foreground/40 hover:bg-white/60 transition-colors"
      >
        Unassign Room
      </button>
      {properties.map(p => {
        const propRooms = available.filter(r => r.property_id === p.id);
        if (!propRooms.length) return null;
        return (
          <div key={p.id}>
            <p className="px-4 py-1 text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 bg-accent/30">{p.name}</p>
            {propRooms.map(r => (
              <button
                key={r.id}
                onClick={() => { onSelect(r.id); onClose(); }}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-[12px] font-bold transition-colors',
                  r.id === currentRoomId ? 'text-primary bg-primary/5' : 'text-foreground/70 hover:bg-white/60'
                )}
              >
                {r.name}
                {r.id === currentRoomId
                  ? <span className="ml-2 text-[9px] text-primary/60 font-bold uppercase tracking-widest">current</span>
                  : occupantCount(r.id) > 0 && (
                    <span className="ml-2 text-[9px] text-secondary/60 font-bold uppercase tracking-widest">
                      {occupantCount(r.id)}/{MAX_ROOM_OCCUPANTS} sharing
                    </span>
                  )}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function AddMemberModal({
  rooms, properties, tenants, onClose, onCreated, toast,
}: {
  rooms: Room[]; properties: Property[]; tenants: Tenant[];
  onClose: () => void;
  onCreated: () => void;
  toast: (msg: string, ok?: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().slice(0, 10));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedRoom = rooms.find(r => r.id === roomId);
  const selectedProperty = selectedRoom ? properties.find(p => p.id === selectedRoom.property_id) : null;

  const handleSubmit = async () => {
    if (!name.trim() || !roomId) { setError('Name and room are required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tenants/add', {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          roomId,
          moveInDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to add member'); return; }
      toast(data.emailSent ? 'Member added — invite email sent' : 'Member added — pending activation');
      onCreated();
      onClose();
    } catch {
      setError('Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="soft-card border border-white bg-background w-full max-w-sm rounded-2xl p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Add Member</p>
          <button onClick={onClose} className="text-foreground/30 hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
              className="w-full soft-well border border-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional — sends an invite link"
              className="w-full soft-well border border-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional"
              className="w-full soft-well border border-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60" />
          </div>
          <div className="relative">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Room *</label>
            <button
              onClick={() => setPickerOpen(v => !v)}
              className="w-full mt-1 flex items-center justify-between gap-2 soft-button px-3 py-2.5 text-[12px] font-bold border border-white text-left"
            >
              <span className="flex items-center gap-2">
                <Home className="w-3.5 h-3.5 text-primary/60" />
                {selectedRoom ? <span>{selectedProperty?.name} · {selectedRoom.name}</span> : <span className="text-foreground/30">Select a room</span>}
              </span>
              <ChevronDown className={cn('w-3.5 h-3.5 text-foreground/30 transition-transform', pickerOpen && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {pickerOpen && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                  <RoomPicker
                    rooms={rooms}
                    properties={properties}
                    tenants={tenants}
                    currentRoomId={roomId}
                    onSelect={setRoomId}
                    onClose={() => setPickerOpen(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Move-in Date</label>
            <input type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)}
              className="w-full soft-well border border-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60" />
          </div>
        </div>

        {error && <p className="text-xs text-red-600 font-bold">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 soft-button border border-white py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-foreground/40">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 btn-terracotta py-2.5 text-[11px] font-extrabold uppercase tracking-widest disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {saving ? 'Adding…' : 'Add Member'}
          </button>
        </div>
        <p className="text-[9px] text-foreground/25 font-bold text-center">
          This creates a pending invitation — activate it from the Invitations tab, or the member can self-activate via the join link.
        </p>
      </motion.div>
    </motion.div>
  );
}

function TenantDocumentsModal({
  tenant, onClose, toast,
}: {
  tenant: Tenant; onClose: () => void;
  toast: (msg: string, ok?: boolean) => void;
}) {
  const [docs, setDocs] = useState<TenantDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<typeof DOC_CATEGORIES[number]['value']>('rental_agreement');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tenant_documents')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    if (data) setDocs(data as TenantDocument[]);
    setLoading(false);
  }, [tenant.id]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async () => {
    if (!file || !label.trim()) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const safeLabel = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const path = `${tenant.id}/${Date.now()}-${safeLabel}.${ext}`;

      const { error: upErr } = await supabase.storage.from('tenant-documents').upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from('tenant_documents').insert({
        tenant_id: tenant.id,
        label: label.trim(),
        category,
        storage_path: path,
        uploaded_by: user?.id ?? null,
        uploaded_by_name: (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? 'Admin',
      });
      if (insErr) throw insErr;

      toast('Document uploaded');
      setLabel(''); setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await fetchDocs();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', false);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: TenantDocument) => {
    if (!confirm(`Delete "${doc.label}"?`)) return;
    setDeletingId(doc.id);
    try {
      await supabase.storage.from('tenant-documents').remove([doc.storage_path]);
      const { error } = await supabase.from('tenant_documents').delete().eq('id', doc.id);
      if (error) throw error;
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      toast('Document removed');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete', false);
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = async (doc: TenantDocument) => {
    const { data, error } = await supabase.storage.from('tenant-documents').createSignedUrl(doc.storage_path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast(error?.message ?? 'Could not open document', false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="soft-card border border-white bg-background w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Documents</p>
            <p className="text-sm font-bold text-foreground">{tenant.name}</p>
          </div>
          <button onClick={onClose} className="text-foreground/30 hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-foreground/20 animate-spin" /></div>
          ) : docs.length === 0 ? (
            <p className="text-xs text-foreground/30 italic text-center py-4">No documents uploaded yet.</p>
          ) : docs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between gap-3 p-3 soft-well border border-white rounded-xl">
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{doc.label}</p>
                <p className="text-[9px] text-foreground/30 font-bold uppercase tracking-widest">
                  {DOC_CATEGORIES.find(c => c.value === doc.category)?.label ?? doc.category} · {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => handleView(doc)} className="w-7 h-7 flex items-center justify-center soft-button border border-white text-foreground/40 hover:text-secondary transition-colors rounded-lg">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(doc)} disabled={deletingId === doc.id}
                  className="w-7 h-7 flex items-center justify-center soft-button border border-white text-red-400 hover:text-red-500 transition-colors rounded-lg">
                  {deletingId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-4 border-t border-foreground/10">
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Upload New</p>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Rental Agreement"
            className="w-full soft-well border border-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60" />
          <select value={category} onChange={e => setCategory(e.target.value as typeof category)}
            className="w-full soft-well border border-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60 appearance-none">
            {DOC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input ref={fileRef} type="file" accept="image/*,application/pdf"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="w-full soft-well border border-white rounded-xl px-4 py-2.5 text-xs font-bold bg-white/60" />
          <button onClick={handleUpload} disabled={!file || !label.trim() || uploading}
            className="w-full flex items-center justify-center gap-2 btn-terracotta py-3 text-[11px] font-extrabold uppercase tracking-widest disabled:opacity-50">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EditTenantModal({
  tenant, onClose, onSave, toast,
}: {
  tenant: Tenant;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Tenant>) => Promise<void>;
  toast: (msg: string, ok?: boolean) => void;
}) {
  const [name, setName] = useState(tenant.name);
  const [phone, setPhone] = useState(tenant.phone ?? '');
  const [moveIn, setMoveIn] = useState(tenant.move_in_date?.slice(0, 10) ?? '');
  const [moveOut, setMoveOut] = useState(tenant.move_out_date?.slice(0, 10) ?? '');
  const [status, setStatus] = useState(tenant.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(tenant.id, {
        name,
        phone: phone || null,
        status,
        move_in_date:  moveIn  || null,
        move_out_date: moveOut || null,
      });
      toast('Member updated');
      onClose();
    } catch {
      toast('Failed to update tenant', false);
    } finally {
      setSaving(false);
    }
  };

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
        className="soft-card border border-white bg-background w-full max-w-sm rounded-2xl p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Edit Member</p>
          <button onClick={onClose} className="text-foreground/30 hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full soft-well border border-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full soft-well border border-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Move-in Date</label>
              <input type="date" value={moveIn} onChange={e => setMoveIn(e.target.value)}
                className="w-full soft-well border border-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Move-out Date</label>
              <input type="date" value={moveOut} onChange={e => setMoveOut(e.target.value)}
                className="w-full soft-well border border-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full soft-well border border-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60 appearance-none">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="notice">On Notice</option>
              <option value="moved_out">Moved Out</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 soft-button border border-white py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-foreground/40">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 btn-terracotta py-2.5 text-[11px] font-extrabold uppercase tracking-widest">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TenantCard({ tenant, rooms, properties, allTenants, onRoomChange, onStatusToggle, onEdit, onViewDocuments, toast }: {
  tenant: Tenant; rooms: Room[]; properties: Property[]; allTenants: Tenant[];
  onRoomChange: (tenantId: string, newRoomId: string | null) => Promise<void>;
  onStatusToggle: (tenantId: string, currentStatus: string) => Promise<void>;
  onEdit: (tenant: Tenant) => void;
  onViewDocuments: (tenant: Tenant) => void;
  toast: (msg: string, ok?: boolean) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const room = rooms.find(r => r.id === tenant.room_id);
  const property = room ? properties.find(p => p.id === room.property_id) : null;
  const roommates = tenant.room_id
    ? allTenants.filter(t => t.id !== tenant.id && t.room_id === tenant.room_id && t.status !== 'moved_out')
    : [];

  const handleAssign = async (roomId: string | null) => {
    setSaving(true);
    try {
      await onRoomChange(tenant.id, roomId);
      toast('Room assignment updated');
    } catch {
      toast('Failed to update room', false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setTogglingStatus(true);
    try {
      await onStatusToggle(tenant.id, tenant.status);
    } catch {
      toast('Failed to update status', false);
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="soft-card border border-white bg-white/30 rounded-2xl p-5 space-y-3"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <p className="font-extrabold text-foreground tracking-tight">{tenant.name}</p>
          <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
            Since {new Date(tenant.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[8px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-full border',
            tenant.status === 'active' ? 'border-secondary/30 text-secondary bg-secondary/5' : 'border-red-300/30 text-red-400 bg-red-50'
          )}>
            {tenant.status === 'active' ? 'Active' : tenant.status ?? 'Unknown'}
          </span>
          <button onClick={() => onViewDocuments(tenant)} title="Documents"
            className="w-7 h-7 flex items-center justify-center soft-button border border-white text-foreground/30 hover:text-secondary transition-colors rounded-lg">
            <FileText className="w-3 h-3" />
          </button>
          <button onClick={() => onEdit(tenant)} title="Edit"
            className="w-7 h-7 flex items-center justify-center soft-button border border-white text-foreground/30 hover:text-primary transition-colors rounded-lg">
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 text-[11px] font-bold text-foreground/50">
        {tenant.email && (
          <div className="flex items-center gap-2"><Mail className="w-3 h-3 shrink-0" /> {tenant.email}</div>
        )}
        {tenant.phone && (
          <div className="flex items-center gap-2"><Phone className="w-3 h-3 shrink-0" /> {tenant.phone}</div>
        )}
        {roommates.length > 0 && (
          <div className="flex items-center gap-2 text-secondary">
            <Users className="w-3 h-3 shrink-0" /> Sharing with {roommates.map(r => r.name).join(', ')}
          </div>
        )}
      </div>

      <div className="relative">
        <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 mb-1">Room</p>
        <button
          onClick={() => setPickerOpen(v => !v)}
          disabled={saving}
          className="w-full flex items-center justify-between gap-2 soft-button px-3 py-2 text-[11px] font-bold border border-white text-left"
        >
          <span className="flex items-center gap-2">
            <Home className="w-3 h-3 text-primary/60" />
            {room ? (
              <span>{property?.name} · {room.name}</span>
            ) : (
              <span className="text-foreground/30">Unassigned</span>
            )}
          </span>
          <ChevronDown className={cn('w-3 h-3 text-foreground/30 transition-transform', pickerOpen && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {pickerOpen && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              <RoomPicker
                rooms={rooms}
                properties={properties}
                tenants={allTenants}
                currentRoomId={tenant.room_id}
                onSelect={handleAssign}
                onClose={() => setPickerOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status toggle */}
      <button
        onClick={handleToggle}
        disabled={togglingStatus}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border transition-all',
          tenant.status === 'active'
            ? 'border-red-200/40 text-red-400 hover:bg-red-50 bg-transparent'
            : 'border-secondary/30 text-secondary hover:bg-secondary/5 bg-transparent'
        )}
      >
        {togglingStatus ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : tenant.status === 'active' ? (
          <><ToggleLeft className="w-3.5 h-3.5" /> Deactivate</>
        ) : (
          <><ToggleRight className="w-3.5 h-3.5" /> Activate</>
        )}
      </button>
    </motion.div>
  );
}

function InvitationCard({ invitation, rooms, properties, onDelete, onActivate, toast }: {
  invitation: TenantInvitation; rooms: Room[]; properties: Property[];
  onDelete: (id: string) => void;
  onActivate: (id: string) => Promise<void>;
  toast: (msg: string, ok?: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activating, setActivating] = useState(false);
  const room = rooms.find(r => r.id === invitation.room_id);
  const property = room ? properties.find(p => p.id === room.property_id) : null;
  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?token=${invitation.token}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast('Invite link copied!');
  };

  const handleDelete = async () => {
    if (!confirm(`Remove invitation for ${invitation.name}?`)) return;
    setDeleting(true);
    const { error } = await supabase.from('tenant_invitations').delete().eq('id', invitation.id);
    if (!error) {
      onDelete(invitation.id);
      toast('Invitation removed');
    } else {
      toast('Failed to remove invitation', false);
    }
    setDeleting(false);
  };

  const handleActivate = async () => {
    if (!confirm(`Activate ${invitation.name} as a tenant now? This will create their account and send them a login link.`)) return;
    setActivating(true);
    try {
      await onActivate(invitation.id);
      toast(`${invitation.name} is now active!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Activation failed';
      toast(msg, false);
    } finally {
      setActivating(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="soft-card border border-amber-200/40 bg-amber-50/20 rounded-2xl p-5 space-y-3"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <p className="font-extrabold text-foreground tracking-tight">{invitation.name}</p>
          <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
            Invited {new Date(invitation.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </p>
        </div>
        <span className="text-[8px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-full border border-amber-400/30 text-amber-600 bg-amber-50">
          Pending
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] font-bold text-foreground/50">
        {invitation.email && (
          <div className="flex items-center gap-2"><Mail className="w-3 h-3 shrink-0" /> {invitation.email}</div>
        )}
        {invitation.phone && (
          <div className="flex items-center gap-2"><Phone className="w-3 h-3 shrink-0" /> {invitation.phone}</div>
        )}
        {room && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 shrink-0" />
            {property?.name} · {room.name}
          </div>
        )}
      </div>

      {/* Activate button */}
      <button
        onClick={handleActivate}
        disabled={activating}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border border-secondary/30 text-secondary hover:bg-secondary/5 transition-all"
      >
        {activating
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Activating…</>
          : <><ToggleRight className="w-3.5 h-3.5" /> Make Active</>}
      </button>

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 soft-button py-2 text-[10px] font-extrabold border border-white uppercase tracking-widest transition-all',
            copied ? 'text-secondary' : 'text-foreground/50'
          )}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-10 h-10 flex items-center justify-center soft-button border border-red-200/40 text-red-400 hover:text-red-500 transition-all rounded-xl"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'tenants' | 'invitations'>('tenants');
  const [toast, setToastState] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [docsForTenant, setDocsForTenant] = useState<Tenant | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToastState({ msg, ok });
    setTimeout(() => setToastState(null), 3500);
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [propsRes, roomsRes, tenantsRes, invitesRes] = await Promise.all([
      supabase.from('properties').select('id, name').order('name'),
      supabase.from('rooms').select('id, name, property_id, occupancy_status, tenant_id').order('name'),
      supabase.from('tenants').select('id, name, email, phone, room_id, created_at, status, move_in_date').order('name'),
      supabase.from('tenant_invitations').select('id, room_id, name, phone, email, status, token, created_at').eq('status', 'pending').order('created_at', { ascending: false }),
    ]);
    if (propsRes.data) setProperties(propsRes.data);
    if (roomsRes.data) setRooms(roomsRes.data as Room[]);
    if (tenantsRes.data) setTenants(tenantsRes.data as Tenant[]);
    if (invitesRes.data) setInvitations(invitesRes.data as TenantInvitation[]);
    setLoading(false);
  };

  const handleStatusToggle = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const res = await fetch(`/api/admin/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || 'Status update failed');
    }
    setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: newStatus } : t));
    showToast(`Member marked ${newStatus}`);
  };

  const handleUpdateTenant = async (tenantId: string, updates: Partial<Tenant>) => {
    const res = await fetch(`/api/admin/tenants/${tenantId}`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || 'Update failed');
    }
    setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, ...updates } : t));
  };

  const handleActivateInvitation = async (invitationId: string) => {
    const res = await fetch('/api/admin/tenants/activate-invitation', {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Activation failed');
    // Move from invitations to tenants
    setInvitations(prev => prev.filter(i => i.id !== invitationId));
    setTenants(prev => [...prev, data as Tenant]);
    // Refresh rooms so occupancy reflects the change
    const { data: updatedRooms } = await supabase
      .from('rooms')
      .select('id, name, property_id, occupancy_status, tenant_id')
      .order('name');
    if (updatedRooms) setRooms(updatedRooms as Room[]);
  };

  const handleRoomChange = async (tenantId: string, newRoomId: string | null) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;
    const oldRoomId = tenant.room_id;

    const res = await fetch('/api/admin/tenants/assign-room', {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, roomId: newRoomId }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || 'Assignment failed');
    }

    setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, room_id: newRoomId } : t));
    setRooms(prev => prev.map(r => {
      if (r.id === oldRoomId) return { ...r, tenant_id: null, occupancy_status: 'Vacant' };
      if (r.id === newRoomId) return { ...r, tenant_id: tenantId, occupancy_status: 'Occupied' };
      return r;
    }));
  };

  const q = search.toLowerCase();
  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(q) ||
    (t.email ?? '').toLowerCase().includes(q) ||
    (t.phone ?? '').includes(q)
  );
  const filteredInvitations = invitations.filter(i =>
    i.name.toLowerCase().includes(q) ||
    (i.email ?? '').toLowerCase().includes(q) ||
    (i.phone ?? '').includes(q)
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">Members</h1>
            <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-widest mt-0.5">
              {tenants.length} active · {invitations.length} pending invitations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tenants..."
                className="soft-well pl-9 pr-9 py-2.5 text-[12px] font-bold w-full sm:w-64 bg-transparent border-0 focus:outline-none placeholder:text-foreground/30"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button onClick={() => setShowAddMember(true)}
              className="soft-button px-4 py-2.5 border border-primary/30 bg-primary/5 text-primary text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-2 shrink-0">
              <Plus className="w-3.5 h-3.5" /> Add Member
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['tenants', 'invitations'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-5 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-widest transition-all',
                activeTab === tab ? 'btn-terracotta shadow-md' : 'soft-button border border-white text-foreground/40'
              )}
            >
              {tab === 'tenants' ? (
                <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Active ({tenants.length})</span>
              ) : (
                <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Pending ({invitations.length})</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : activeTab === 'tenants' ? (
          filteredTenants.length === 0 ? (
            <div className="soft-well rounded-2xl p-12 text-center">
              <Users className="w-10 h-10 text-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-bold text-foreground/30">No members found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTenants.map(tenant => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  rooms={rooms}
                  properties={properties}
                  allTenants={tenants}
                  onRoomChange={handleRoomChange}
                  onStatusToggle={handleStatusToggle}
                  onEdit={setEditingTenant}
                  onViewDocuments={setDocsForTenant}
                  toast={showToast}
                />
              ))}
            </div>
          )
        ) : (
          filteredInvitations.length === 0 ? (
            <div className="soft-well rounded-2xl p-12 text-center">
              <Clock className="w-10 h-10 text-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-bold text-foreground/30">No pending invitations</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredInvitations.map(inv => (
                <InvitationCard
                  key={inv.id}
                  invitation={inv}
                  rooms={rooms}
                  properties={properties}
                  onDelete={id => setInvitations(prev => prev.filter(i => i.id !== id))}
                  onActivate={handleActivateInvitation}
                  toast={showToast}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editingTenant && (
          <EditTenantModal
            tenant={editingTenant}
            onClose={() => setEditingTenant(null)}
            onSave={handleUpdateTenant}
            toast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Add Member modal */}
      <AnimatePresence>
        {showAddMember && (
          <AddMemberModal
            rooms={rooms}
            properties={properties}
            tenants={tenants}
            onClose={() => setShowAddMember(false)}
            onCreated={() => { fetchAll(); setActiveTab('invitations'); }}
            toast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Documents modal */}
      <AnimatePresence>
        {docsForTenant && (
          <TenantDocumentsModal
            tenant={docsForTenant}
            onClose={() => setDocsForTenant(null)}
            toast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              'fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl soft-card border text-[12px] font-extrabold uppercase tracking-widest shadow-xl z-50',
              toast.ok ? 'border-secondary/30 text-secondary' : 'border-red-300/40 text-red-500'
            )}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
