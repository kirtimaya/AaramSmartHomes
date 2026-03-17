'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Property, Room, Tenant, UnitStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, AlertCircle, Clock, Leaf, Plus, Edit2, Trash2, X, Check,
  Loader2, Search, MapPin, Home, TrendingUp, BarChart2, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAaraCommands } from '@/hooks/useAaraCommands';

// ─── Types ────────────────────────────────────────────────────────────────────
type RoomWithOccupancy = Room & {
  property_id: string;
  occupancy_status: UnitStatus;
  tenant_id?: string;
  lease_end_date?: string;
};

// ─── Status helpers ──────────────────────────────────────────────────────────
const STATUS_COLOR: Record<UnitStatus, string> = {
  Vacant:         'border-emerald-500/25 bg-emerald-500/5 text-emerald-600',
  Occupied:       'border-red-500/25 bg-red-500/5 text-red-500',
  'Notice Period':'border-amber-500/25 bg-amber-500/5 text-amber-500',
  Maintenance:    'border-slate-300/60 bg-slate-50 text-slate-400',
};
const STATUS_DOT: Record<UnitStatus, string> = {
  Vacant:         'bg-emerald-500',
  Occupied:       'bg-red-500',
  'Notice Period':'bg-amber-500',
  Maintenance:    'bg-slate-400',
};

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="soft-well px-4 py-2 border border-white flex items-center gap-2.5">
      <div className={cn('w-2 h-2 rounded-full', color)} />
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/50">{label}</span>
      <span className="text-[14px] font-bold text-foreground ml-1">{value}</span>
    </div>
  );
}

function RoomCard({ room, tenant, onEdit }: { room: RoomWithOccupancy; tenant?: Tenant; onEdit: () => void }) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = room.image_urls?.length ? room.image_urls : null;

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      onClick={onEdit}
      id={`room-${room.id}`}
      className={cn(
        'relative rounded-3xl border overflow-hidden cursor-pointer group transition-all duration-300 soft-card',
        STATUS_COLOR[room.occupancy_status]
      )}
    >
      {/* Image area */}
      {imgs ? (
        <div className="relative h-28 overflow-hidden">
          <img src={imgs[imgIdx]} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {imgs.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {imgs.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                  className={cn('w-1 h-1 rounded-full transition-all', i === imgIdx ? 'bg-white scale-125' : 'bg-white/50')} />
              ))}
            </div>
          )}
          {/* Status dot on image */}
          <div className={cn('absolute top-2.5 left-2.5 w-2 h-2 rounded-full shadow-lg', STATUS_DOT[room.occupancy_status])} />
        </div>
      ) : (
        <div className="h-3 w-full">
          <div className={cn('h-full w-full opacity-60', STATUS_DOT[room.occupancy_status])} />
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-2">
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <p className="text-[9px] font-extrabold uppercase tracking-widest opacity-40">Room</p>
            <h4 className="text-lg font-bold tracking-tighter truncate">{room.name}</h4>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-50">{room.type} · {room.sqft} sqft</p>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
            <Edit2 className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="space-y-1">
          <span className={cn('text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border', STATUS_COLOR[room.occupancy_status])}>
            {room.occupancy_status}
          </span>
          {tenant && (
            <div className="flex items-center gap-1.5 pt-1">
              <User className="w-3 h-3 shrink-0 opacity-50" />
              <p className="text-[10px] font-bold truncate">{tenant.name}</p>
            </div>
          )}
          {room.lease_end_date && (
            <p className="text-[8px] font-extrabold uppercase tracking-widest opacity-40">
              Lease ends: {new Date(room.lease_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* Decorative glow */}
      <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-current opacity-[0.04] rounded-full blur-xl pointer-events-none" />
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OccupancyPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<RoomWithOccupancy[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRoom, setEditingRoom] = useState<RoomWithOccupancy | null>(null);
  const [addingToPropertyId, setAddingToPropertyId] = useState<string | null>(null);
  const [newRoomData, setNewRoomData] = useState({ name: '', type: 'Suite', sqft: 250, occupancy_status: 'Vacant' as UnitStatus });
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());

  useEffect(() => { fetchData(); }, []);

  // ─── AARA Command Integration ───
  useAaraCommands({
    SELECT_PROPERTY: (data) => {
      const el = document.getElementById(`property-${data.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setExpandedProperties(prev => new Set(prev).add(data.id));
      }
    },
    SELECT_ROOM: (data) => {
      const room = rooms.find(r => r.id === data.id);
      if (room) {
        setExpandedProperties(prev => new Set(prev).add(room.property_id));
        setTimeout(() => {
          setEditingRoom(room);
          const el = document.getElementById(`room-${room.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  });

  const fetchData = async () => {
    setLoading(true);
    const [propsRes, roomsRes, tenantsRes] = await Promise.all([
      supabase.from('properties').select('*').order('name'),
      supabase.from('rooms').select('*'),
      supabase.from('tenants').select('*'),
    ]);

    if (propsRes.data) {
      setProperties(propsRes.data);
      // Auto-expand all properties
      setExpandedProperties(new Set(propsRes.data.map((p: Property) => p.id)));
    }
    if (roomsRes.data) {
      // Map rooms — use occupancy_status if it exists, otherwise default to Vacant
      setRooms((roomsRes.data as any[]).map(r => ({
        ...r,
        occupancy_status: r.occupancy_status || 'Vacant',
        features: r.features || [],
        image_urls: r.image_urls || [],
      })));
    }
    if (tenantsRes.data) setTenants(tenantsRes.data);
    setLoading(false);
  };

  const handleUpdateRoom = async (room: RoomWithOccupancy) => {
    const { error } = await supabase.from('rooms').update({
      name: room.name,
      type: room.type,
      sqft: room.sqft,
      occupancy_status: room.occupancy_status,
      tenant_id: room.tenant_id || null,
      lease_end_date: room.lease_end_date || null,
    }).eq('id', room.id);

    if (!error) {
      setRooms(prev => prev.map(r => r.id === room.id ? room : r));
      setEditingRoom(null);
    }
  };

  const handleAddRoom = async () => {
    if (!addingToPropertyId || !newRoomData.name) return;
    const { data, error } = await supabase.from('rooms').insert([{
      property_id: addingToPropertyId,
      name: newRoomData.name,
      type: newRoomData.type,
      sqft: newRoomData.sqft,
      features: [],
      image_urls: [],
      occupancy_status: newRoomData.occupancy_status,
    }]).select();

    if (!error && data) {
      setRooms(prev => [...prev, { ...data[0], features: [], image_urls: [], occupancy_status: newRoomData.occupancy_status }]);
      setAddingToPropertyId(null);
      setNewRoomData({ name: '', type: 'Suite', sqft: 250, occupancy_status: 'Vacant' });
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Remove this room from occupancy?')) return;
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (!error) { setRooms(prev => prev.filter(r => r.id !== id)); setEditingRoom(null); }
  };

  // ─── Derived stats ───────────────────────────────────────────────────────
  const overallStats = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter(r => r.occupancy_status === 'Occupied').length;
    const vacant = rooms.filter(r => r.occupancy_status === 'Vacant').length;
    const notice = rooms.filter(r => r.occupancy_status === 'Notice Period').length;
    const maintenance = rooms.filter(r => r.occupancy_status === 'Maintenance').length;
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, vacant, notice, maintenance, rate };
  }, [rooms]);

  const roomsForProperty = (propertyId: string) => {
    return rooms
      .filter(r => r.property_id === propertyId)
      .filter(r => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const tenant = tenants.find(t => t.id === r.tenant_id);
        return (
          r.name.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.occupancy_status.toLowerCase().includes(q) ||
          tenant?.name.toLowerCase().includes(q)
        );
      });
  };

  const visibleProperties = properties.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const hasMatch = rooms.some(r =>
      r.property_id === p.id && (
        r.name.toLowerCase().includes(q) ||
        r.occupancy_status.toLowerCase().includes(q) ||
        tenants.find(t => t.id === r.tenant_id)?.name.toLowerCase().includes(q)
      )
    );
    return p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q) || hasMatch;
  });

  const toggleProperty = (id: string) => {
    setExpandedProperties(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">Mapping Occupancy Matrix</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-10 pb-20 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest border border-secondary/20">
              <Leaf className="w-2.5 h-2.5" /> Live Inventory
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tighter text-foreground uppercase">
              Unit <span className="text-primary italic font-light">Manifest</span>
            </h1>
            <p className="text-foreground/40 text-sm italic">Live occupancy matrix — synced from property rooms.</p>
          </div>

          <div className="flex flex-col gap-3 items-end">
            <div className="relative group w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30 group-focus-within:text-primary transition-colors" />
              <input
                type="text" placeholder="Search room, tenant, property..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="soft-ui-in w-full py-3 pl-10 pr-4 text-[10px] font-bold uppercase tracking-widest bg-white/40 border border-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── Global Stats Bar ── */}
        <div className="soft-card p-6 border border-white bg-white/40">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap gap-3">
              <StatPill label="Total Rooms" value={overallStats.total} color="bg-foreground/20" />
              <StatPill label="Occupied" value={overallStats.occupied} color="bg-red-500" />
              <StatPill label="Vacant" value={overallStats.vacant} color="bg-emerald-500" />
              <StatPill label="Notice" value={overallStats.notice} color="bg-amber-500" />
              <StatPill label="Maintenance" value={overallStats.maintenance} color="bg-slate-400" />
            </div>
            {/* Occupancy Rate Dial */}
            <div className="flex items-center gap-4">
              <div className="space-y-1 text-right">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Occupancy Rate</p>
                <p className="text-4xl font-bold tracking-tighter text-foreground">{overallStats.rate}<span className="text-xl text-foreground/30">%</span></p>
              </div>
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="6" className="text-foreground/10" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - overallStats.rate / 100)}`}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-2 rounded-full bg-foreground/5 overflow-hidden">
            <div className="h-full flex gap-0.5">
              <div className="bg-red-500 h-full transition-all duration-700 rounded-l-full" style={{ width: `${overallStats.total ? (overallStats.occupied / overallStats.total) * 100 : 0}%` }} />
              <div className="bg-amber-500 h-full transition-all duration-700" style={{ width: `${overallStats.total ? (overallStats.notice / overallStats.total) * 100 : 0}%` }} />
              <div className="bg-slate-400 h-full transition-all duration-700" style={{ width: `${overallStats.total ? (overallStats.maintenance / overallStats.total) * 100 : 0}%` }} />
              <div className="bg-emerald-500 h-full transition-all duration-700 rounded-r-full flex-1" />
            </div>
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap gap-3">
          {(['Occupied', 'Notice Period', 'Maintenance', 'Vacant'] as UnitStatus[]).map(s => (
            <div key={s} className="flex items-center gap-2 soft-button bg-white/40 border border-white px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-foreground/50">
              <div className={cn('w-2 h-2 rounded-full', STATUS_DOT[s])} /> {s}
            </div>
          ))}
        </div>

        {/* ── Properties ── */}
        <div className="space-y-12">
          {visibleProperties.length === 0 ? (
            <div className="py-20 text-center">
              <Home className="w-12 h-12 text-foreground/10 mx-auto mb-4" />
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-foreground/20">No properties found</p>
            </div>
          ) : (
            visibleProperties.map(property => {
              const propRooms = roomsForProperty(property.id);
              const propTotal = rooms.filter(r => r.property_id === property.id).length;
              const propOccupied = rooms.filter(r => r.property_id === property.id && r.occupancy_status === 'Occupied').length;
              const propRate = propTotal > 0 ? Math.round((propOccupied / propTotal) * 100) : 0;
              const isExpanded = expandedProperties.has(property.id);

              return (
                <div key={property.id} id={`property-${property.id}`} className="space-y-5">
                  {/* Property Header */}
                  <div
                    onClick={() => toggleProperty(property.id)}
                    className="flex flex-wrap items-center justify-between border-b border-white pb-4 gap-4 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-1.5 h-8 rounded-full bg-secondary" />
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tighter uppercase">{property.name}</h2>
                        <p className="text-[10px] font-bold text-foreground/30 flex items-center gap-1 uppercase tracking-widest">
                          <MapPin className="w-3 h-3" />{property.location}
                        </p>
                      </div>
                      <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                        {property.property_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                      <div className="flex gap-2">
                        <StatPill label="Rooms" value={propTotal} color="bg-foreground/20" />
                        <StatPill label="Occupied" value={propOccupied} color="bg-red-500" />
                        <div className="soft-well px-3 py-2 border border-white">
                          <span className="text-[10px] font-extrabold text-foreground/50 uppercase tracking-widest">{propRate}% full</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setAddingToPropertyId(property.id); setNewRoomData({ name: '', type: 'Suite', sqft: 250, occupancy_status: 'Vacant' }); }}
                        className="soft-button w-8 h-8 border border-white text-secondary hover:bg-secondary hover:text-white transition-all flex items-center justify-center shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <ChevronRight className={cn("w-4 h-4 text-foreground/30 transition-transform", isExpanded ? "rotate-90" : "")} />
                    </div>
                  </div>

                  {/* Rooms Grid */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-hidden"
                      >
                        {propRooms.map(room => (
                          <RoomCard
                            key={room.id}
                            room={room}
                            tenant={tenants.find(t => t.id === room.tenant_id)}
                            onEdit={() => setEditingRoom(room)}
                          />
                        ))}
                        {propRooms.length === 0 && (
                          <div className="col-span-full py-10 text-center">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/20 italic">
                              {searchQuery ? 'No matching rooms found.' : 'No rooms added yet. Click + to add.'}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ════ EDIT ROOM OCCUPANCY MODAL ════ */}
      <AnimatePresence>
        {editingRoom && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingRoom(null)} className="absolute inset-0 bg-background/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-background soft-card border border-white w-full max-w-md p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-tight">Room Occupancy</h2>
                  <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest mt-1">{editingRoom.name} · {editingRoom.type}</p>
                </div>
                <button onClick={() => setEditingRoom(null)} className="soft-button w-9 h-9 border border-white text-foreground/30"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-5">
                {/* Room preview */}
                {editingRoom.image_urls && editingRoom.image_urls.length > 0 && (
                  <div className="relative h-32 rounded-2xl overflow-hidden border border-white">
                    <img src={editingRoom.image_urls[0]} alt={editingRoom.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <p className="absolute bottom-2 left-3 text-[10px] font-extrabold text-white uppercase tracking-widest">{editingRoom.name}</p>
                    <span className={cn('absolute top-2 right-2 text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border', STATUS_COLOR[editingRoom.occupancy_status])}>
                      {editingRoom.occupancy_status}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Occupancy Status</label>
                  <select value={editingRoom.occupancy_status}
                    onChange={(e) => setEditingRoom({...editingRoom, occupancy_status: e.target.value as UnitStatus})}
                    className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none appearance-none">
                    <option value="Vacant">Vacant</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Notice Period">Notice Period</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Room Name</label>
                    <input type="text" value={editingRoom.name}
                      onChange={(e) => setEditingRoom({...editingRoom, name: e.target.value})}
                      className="soft-ui-in w-full py-4 px-5 text-xs bg-white/60 border border-white outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Lease End Date</label>
                    <input type="date" value={editingRoom.lease_end_date || ''}
                      onChange={(e) => setEditingRoom({...editingRoom, lease_end_date: e.target.value})}
                      className="soft-ui-in w-full py-4 px-4 text-xs bg-white/60 border border-white outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Assigned Tenant</label>
                  <select value={editingRoom.tenant_id || ''}
                    onChange={(e) => setEditingRoom({...editingRoom, tenant_id: e.target.value || undefined})}
                    className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none appearance-none">
                    <option value="">— No Tenant —</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex gap-4">
                  <button onClick={() => handleDeleteRoom(editingRoom.id)}
                    className="soft-button px-4 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all" title="Remove Room">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleUpdateRoom(editingRoom)}
                    className="flex-1 btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" /> Save Occupancy
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════ ADD ROOM MODAL ════ */}
      <AnimatePresence>
        {addingToPropertyId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAddingToPropertyId(null)} className="absolute inset-0 bg-background/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-background soft-card border border-white w-full max-w-sm p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-tight">Add Room</h2>
                  <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest mt-1">
                    {properties.find(p => p.id === addingToPropertyId)?.name}
                  </p>
                </div>
                <button onClick={() => setAddingToPropertyId(null)} className="soft-button w-8 h-8 border border-white text-foreground/30"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Room Name</label>
                  <input type="text" autoFocus value={newRoomData.name}
                    onChange={(e) => setNewRoomData({...newRoomData, name: e.target.value})}
                    className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none"
                    placeholder="e.g. Master Suite 3A" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Type</label>
                    <select value={newRoomData.type} onChange={(e) => setNewRoomData({...newRoomData, type: e.target.value})}
                      className="soft-ui-in w-full py-4 px-4 text-xs bg-white/60 border border-white outline-none appearance-none">
                      <option>Studio</option><option>1BHK</option><option>2BHK</option>
                      <option>Suite</option><option>Master Suite</option><option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">SQFT</label>
                    <input type="number" value={newRoomData.sqft}
                      onChange={(e) => setNewRoomData({...newRoomData, sqft: parseInt(e.target.value) || 0})}
                      className="soft-ui-in w-full py-4 px-4 text-xs bg-white/60 border border-white outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Initial Status</label>
                  <select value={newRoomData.occupancy_status}
                    onChange={(e) => setNewRoomData({...newRoomData, occupancy_status: e.target.value as UnitStatus})}
                    className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none appearance-none">
                    <option value="Vacant">Vacant</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <button onClick={handleAddRoom} disabled={!newRoomData.name}
                  className="w-full btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-40">
                  <Plus className="w-5 h-5" /> Add Room
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
