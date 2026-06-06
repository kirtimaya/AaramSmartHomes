'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { Users, Clock, Copy, Check, Trash2, Home, Mail, Phone, MapPin, Search, X, ChevronDown, Link as LinkIcon } from 'lucide-react';
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
  is_active: boolean;
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

function RoomPicker({
  rooms, properties, currentRoomId, onSelect, onClose,
}: {
  rooms: Room[]; properties: Property[]; currentRoomId: string | null;
  onSelect: (roomId: string | null) => void; onClose: () => void;
}) {
  const available = rooms.filter(r => r.occupancy_status !== 'Occupied' || r.id === currentRoomId);
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
                {r.id === currentRoomId && <span className="ml-2 text-[9px] text-primary/60 font-bold uppercase tracking-widest">current</span>}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TenantCard({ tenant, rooms, properties, onRoomChange, toast }: {
  tenant: Tenant; rooms: Room[]; properties: Property[];
  onRoomChange: (tenantId: string, newRoomId: string | null) => Promise<void>;
  toast: (msg: string, ok?: boolean) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const room = rooms.find(r => r.id === tenant.room_id);
  const property = room ? properties.find(p => p.id === room.property_id) : null;

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
        <span className={cn(
          'text-[8px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-full border',
          tenant.is_active !== false ? 'border-secondary/30 text-secondary bg-secondary/5' : 'border-red-300/30 text-red-400 bg-red-50'
        )}>
          {tenant.is_active !== false ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] font-bold text-foreground/50">
        {tenant.email && (
          <div className="flex items-center gap-2"><Mail className="w-3 h-3 shrink-0" /> {tenant.email}</div>
        )}
        {tenant.phone && (
          <div className="flex items-center gap-2"><Phone className="w-3 h-3 shrink-0" /> {tenant.phone}</div>
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
                currentRoomId={tenant.room_id}
                onSelect={handleAssign}
                onClose={() => setPickerOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function InvitationCard({ invitation, rooms, properties, onDelete, toast }: {
  invitation: TenantInvitation; rooms: Room[]; properties: Property[];
  onDelete: (id: string) => void;
  toast: (msg: string, ok?: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      supabase.from('tenants').select('id, name, email, phone, room_id, created_at, is_active').order('name'),
      supabase.from('tenant_invitations').select('id, room_id, name, phone, email, status, token, created_at').eq('status', 'pending').order('created_at', { ascending: false }),
    ]);
    if (propsRes.data) setProperties(propsRes.data);
    if (roomsRes.data) setRooms(roomsRes.data as Room[]);
    if (tenantsRes.data) setTenants(tenantsRes.data as Tenant[]);
    if (invitesRes.data) setInvitations(invitesRes.data as TenantInvitation[]);
    setLoading(false);
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
            <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">Tenants</h1>
            <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-widest mt-0.5">
              {tenants.length} active · {invitations.length} pending invitations
            </p>
          </div>
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
              <p className="text-sm font-bold text-foreground/30">No tenants found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTenants.map(tenant => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  rooms={rooms}
                  properties={properties}
                  onRoomChange={handleRoomChange}
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
                  toast={showToast}
                />
              ))}
            </div>
          )
        )}
      </div>

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
