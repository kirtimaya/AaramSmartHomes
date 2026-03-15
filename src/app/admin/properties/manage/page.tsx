'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import NextImage from 'next/image';
import { Property, Room, Benefit, AutomationSystem } from '@/lib/types';
import { Plus, MapPin, Home, Edit2, Trash2, X, Check, Building2, Image as ImageIcon, Loader2, Search, ArrowLeft, ChevronRight, Waves, Zap, Upload, Leaf, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// ── Image Slider for Room cards ──────────────────────────────────────────────
function RoomImageSlider({ images, roomName }: { images: string[]; roomName: string }) {
  const [idx, setIdx] = useState(0);
  const imgs = images.length > 0 ? images : ['/images/luxury_interior_room_1773522014016.png'];
  return (
    <div className="relative w-full h-40 bg-foreground/5 overflow-hidden rounded-t-2xl group">
      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={imgs[idx]}
          alt={`${roomName} ${idx + 1}`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full h-full object-cover"
        />
      </AnimatePresence>
      {imgs.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setIdx((idx - 1 + imgs.length) % imgs.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % imgs.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {imgs.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className={cn("w-1.5 h-1.5 rounded-full transition-all", i === idx ? "bg-white scale-125" : "bg-white/50")} />
            ))}
          </div>
        </>
      )}
      {imgs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-foreground/20" />
        </div>
      )}
    </div>
  );
}

// ── Amenity image card ───────────────────────────────────────────────────────
function AmenityCard({ benefit, onEdit, onDelete }: { benefit: Benefit; onEdit: () => void; onDelete: () => void }) {
  const fallback = '/images/amenity_pool.png';
  return (
    <div className="soft-card border border-white overflow-hidden group relative w-44 shrink-0">
      <div className="relative h-32 bg-foreground/5">
        <img src={benefit.image_url || fallback} alt={benefit.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-extrabold text-white uppercase tracking-widest px-2 truncate">{benefit.name}</p>
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={onEdit} className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-secondary hover:bg-secondary hover:text-white transition-all shadow-md">
          <Edit2 className="w-3 h-3" />
        </button>
        <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-md">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Automation image card ────────────────────────────────────────────────────
function AutomationCard({ node, onEdit, onToggle, onDelete }: { node: AutomationSystem; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const fallback = '/images/automation_parking.png';
  return (
    <div className="soft-card border border-white overflow-hidden group relative">
      <div className="relative h-36 bg-foreground/5">
        <img src={node.image_url || fallback} alt={node.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-[11px] font-extrabold text-white uppercase tracking-widest">{node.name}</p>
          <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{node.type}</p>
        </div>
        {/* Status glow */}
        {node.status === 'Active' && <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse" />}
      </div>
      <div className="p-3 flex items-center justify-between gap-2 bg-white/30">
        <button onClick={onToggle}
          className={cn("text-[8px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all",
            node.status === 'Active' ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5" : "border-white text-foreground/30 bg-white/40")}>
          {node.status}
        </button>
        <div className="flex gap-1.5">
          <button onClick={onEdit} className="w-7 h-7 rounded-lg soft-button border border-white text-secondary hover:bg-secondary hover:text-white transition-all">
            <Edit2 className="w-3 h-3" />
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg soft-button border border-white text-primary/40 hover:text-primary transition-all">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PropertyManagementContent() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingDetails, setViewingDetails] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [editingAutomation, setEditingAutomation] = useState<AutomationSystem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<Property>>({ name: '', location: '', total_rooms: 0, property_type: 'Villa', image_url: '/images/realistic_villa_exterior_1773522363119.png', description: '' });

  const searchParams = useSearchParams();
  const propertyIdParam = searchParams.get('id');

  useEffect(() => { fetchProperties(); }, []);
  useEffect(() => {
    if (properties.length > 0 && propertyIdParam) {
      const prop = properties.find(p => p.id === propertyIdParam);
      if (prop) setViewingDetails(prop);
    }
  }, [properties, propertyIdParam]);

  const fetchProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('properties').select('*, rooms(*), benefits(*), automation_systems(*)');
    if (!error && data) setProperties(data.map((p: any) => ({ ...p, automation: p.automation_systems })));
    setLoading(false);
  };

  const autoSave = async (updatedProperty: Property) => {
    await supabase.from('properties').update({ name: updatedProperty.name, location: updatedProperty.location, description: updatedProperty.description, total_rooms: updatedProperty.total_rooms, image_url: updatedProperty.image_url, property_type: updatedProperty.property_type }).eq('id', updatedProperty.id);
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
  };

  const handleOpenModal = (property?: Property) => {
    if (property) { setEditingProperty(property); setFormData(property); }
    else { setEditingProperty(null); setFormData({ name: '', location: '', total_rooms: 0, property_type: 'Villa', image_url: '/images/realistic_villa_exterior_1773522363119.png', description: '' }); }
    setIsModalOpen(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault(); setLoading(true);
    if (editingProperty) { await supabase.from('properties').update({ name: formData.name, location: formData.location, total_rooms: formData.total_rooms, property_type: formData.property_type, image_url: formData.image_url, description: formData.description }).eq('id', editingProperty.id); }
    else { await supabase.from('properties').insert([{ name: formData.name, location: formData.location, total_rooms: formData.total_rooms, property_type: formData.property_type, image_url: formData.image_url, description: formData.description }]); }
    await fetchProperties(); setIsModalOpen(false); setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this property?')) {
      await supabase.from('properties').delete().eq('id', id);
      setProperties(properties.filter(p => p.id !== id));
      if (viewingDetails?.id === id) setViewingDetails(null);
    }
  };

  const filteredProperties = properties.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.location?.toLowerCase().includes(searchQuery.toLowerCase()));

  // Room CRUD
  const handleAddRoom = async () => {
    if (!viewingDetails) return;
    const { data } = await supabase.from('rooms').insert([{ property_id: viewingDetails.id, name: 'New Room', type: 'Suite', sqft: 250, features: ['Smart Lock'], image_urls: [] }]).select();
    if (data) { const updated = { ...viewingDetails, rooms: [...(viewingDetails.rooms || []), data[0] as Room] }; setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p)); }
  };
  const handleUpdateRoom = async (r: Room) => {
    await supabase.from('rooms').update({ name: r.name, type: r.type, sqft: r.sqft, features: r.features, image_urls: r.image_urls }).eq('id', r.id);
    if (viewingDetails) { const updated = { ...viewingDetails, rooms: (viewingDetails.rooms || []).map(x => x.id === r.id ? r : x) }; setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p)); }
  };
  const handleDeleteRoom = async (id: string) => {
    await supabase.from('rooms').delete().eq('id', id);
    if (viewingDetails) { const updated = { ...viewingDetails, rooms: (viewingDetails.rooms || []).filter(r => r.id !== id) }; setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p)); }
  };
  const handleCloneRoom = async (room: Room) => {
    if (!viewingDetails) return;
    const { data } = await supabase.from('rooms').insert([{ property_id: viewingDetails.id, name: `${room.name} (Copy)`, type: room.type, sqft: room.sqft || 0, features: room.features, image_urls: room.image_urls || [] }]).select();
    if (data) { const updated = { ...viewingDetails, rooms: [...(viewingDetails.rooms || []), data[0] as Room] }; setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p)); }
  };

  // Benefit CRUD
  const handleAddBenefit = async () => {
    if (!viewingDetails) return;
    const { data } = await supabase.from('benefits').insert([{ property_id: viewingDetails.id, name: 'New Amenity', icon: 'Leaf', image_url: '/images/amenity_pool.png' }]).select();
    if (data) { const updated = { ...viewingDetails, benefits: [...(viewingDetails.benefits || []), data[0] as Benefit] }; setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p)); }
  };
  const handleUpdateBenefit = async (b: Benefit) => {
    await supabase.from('benefits').update({ name: b.name, icon: b.icon, description: b.description, image_url: b.image_url }).eq('id', b.id);
    if (viewingDetails) { const updated = { ...viewingDetails, benefits: (viewingDetails.benefits || []).map(x => x.id === b.id ? b : x) }; setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p)); }
  };
  const handleDeleteBenefit = async (id: string) => {
    await supabase.from('benefits').delete().eq('id', id);
    if (viewingDetails) { const updated = { ...viewingDetails, benefits: (viewingDetails.benefits || []).filter(b => b.id !== id) }; setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p)); }
  };

  // Automation CRUD
  const handleAddAutomation = async () => {
    if (!viewingDetails) return;
    const { data } = await supabase.from('automation_systems').insert([{ property_id: viewingDetails.id, name: 'New Layer', status: 'Active', type: 'Lighting', image_url: '/images/automation_parking.png' }]).select();
    if (data) { const updated = { ...viewingDetails, automation: [...(viewingDetails.automation || []), data[0]] as AutomationSystem[] }; setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p)); }
  };
  const handleUpdateAutomation = async (n: AutomationSystem) => {
    await supabase.from('automation_systems').update({ name: n.name, type: n.type, status: n.status, description: n.description, image_url: n.image_url }).eq('id', n.id);
    if (viewingDetails) { const updated = { ...viewingDetails, automation: (viewingDetails.automation || []).map(x => x.id === n.id ? n : x) as AutomationSystem[] }; setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p)); }
  };
  const handleToggleAutomation = async (nodeId: string, current: string) => {
    const newStatus = current === 'Active' ? 'Inactive' : 'Active';
    await supabase.from('automation_systems').update({ status: newStatus }).eq('id', nodeId);
    if (viewingDetails) { const updated = { ...viewingDetails, automation: (viewingDetails.automation || []).map(n => n.id === nodeId ? {...n, status: newStatus as 'Active' | 'Inactive'} : n) as AutomationSystem[] }; setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p)); }
  };
  const handleDeleteAutomation = async (id: string) => {
    await supabase.from('automation_systems').delete().eq('id', id);
    if (viewingDetails) { const updated = { ...viewingDetails, automation: (viewingDetails.automation || []).filter(n => n.id !== id) as AutomationSystem[] }; setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p)); }
  };

  if (loading && properties.length === 0) {
    return <AdminLayout><div className="min-h-[60vh] flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin mb-4" /><p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Loading</p></div></AdminLayout>;
  }

  // ─── PROPERTY DETAIL VIEW ────────────────────────────────────────────────
  if (viewingDetails) {
    return (
      <AdminLayout>
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewingDetails(null)} className="soft-button w-12 h-12 border border-white hover:text-primary transition-all"><ArrowLeft className="w-5 h-5" /></button>
              <div>
                <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">{viewingDetails.name}</h1>
                <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-[0.2em]">{viewingDetails.location}</p>
              </div>
            </div>
            <button onClick={() => handleOpenModal(viewingDetails)} className="soft-button px-6 py-3 border border-white text-secondary text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2">
              <Edit2 className="w-4 h-4" /> Edit Attributes
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-8">
              <div className="soft-card p-0 overflow-hidden border border-white">
                <img src={viewingDetails.image_url} className="w-full h-56 object-cover" alt={viewingDetails.name} />
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">Description</label>
                    <textarea className="soft-ui-in w-full bg-white/40 border border-white p-4 text-xs min-h-[100px] outline-none" value={viewingDetails.description}
                      onChange={(e) => { const u = {...viewingDetails, description: e.target.value}; setViewingDetails(u); autoSave(u); }} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="soft-well p-4 border border-white space-y-1"><p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Rooms</p><p className="text-2xl font-bold">{viewingDetails.total_rooms}</p></div>
                    <div className="soft-well p-4 border border-white space-y-1"><p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Type</p><p className="text-[12px] font-bold uppercase pt-1">{viewingDetails.property_type}</p></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-10">

              {/* ── ROOM DISTRIBUTION — Image cards with slider ── */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Room Distribution</h2>
                  <button onClick={handleAddRoom} className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-all">Add Room <Plus className="w-3 h-3" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(viewingDetails.rooms || []).map(room => (
                    <div key={room.id} className="soft-card border border-white overflow-hidden group">
                      <RoomImageSlider images={room.image_urls || []} roomName={room.name} />
                      <div className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold text-foreground">{room.name}</p>
                            <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">{room.type} · {room.sqft} sqft</p>
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleCloneRoom(room)} className="soft-button w-7 h-7 border border-white text-primary/40 hover:text-primary" title="Clone"><Plus className="w-3 h-3" /></button>
                            <button onClick={() => setEditingRoom(room)} className="soft-button w-7 h-7 border border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary hover:text-white" title="Edit"><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => handleDeleteRoom(room.id)} className="soft-button w-7 h-7 border border-white text-primary/40 hover:text-primary"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {room.features.slice(0, 3).map(f => (
                            <span key={f} className="text-[8px] px-1.5 py-0.5 rounded-md bg-white/60 border border-white/50 text-foreground/60 font-bold">{f}</span>
                          ))}
                          {(room.image_urls?.length ?? 0) > 0 && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-secondary/10 border border-secondary/20 text-secondary font-bold flex items-center gap-1">
                              <ImageIcon className="w-2.5 h-2.5" />{room.image_urls!.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── COMMON AREA AMENITIES — Image cards ── */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2"><Waves className="w-5 h-5 text-secondary" /> Common Area Amenities</h2>
                  <button onClick={handleAddBenefit} className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-all">Add <Plus className="w-3 h-3" /></button>
                </div>
                <div className="flex flex-wrap gap-4">
                  {(viewingDetails.benefits || []).map(benefit => (
                    <AmenityCard key={benefit.id} benefit={benefit}
                      onEdit={() => setEditingBenefit(benefit)}
                      onDelete={() => handleDeleteBenefit(benefit.id)} />
                  ))}
                  <button onClick={handleAddBenefit}
                    className="w-44 h-32 rounded-2xl border-2 border-dashed border-secondary/20 bg-secondary/3 text-foreground/20 text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/5 transition-all flex flex-col items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Add Amenity
                  </button>
                </div>
              </section>

              {/* ── SMART AUTOMATION — Image cards ── */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2"><Zap className="w-5 h-5 text-emerald-500" /> Smart Automation</h2>
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0"><Zap className="w-5 h-5" /></div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest">Energy Efficiency Engine</h4>
                    <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest">Actively optimizing common area energy consumption</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(viewingDetails.automation || []).map(node => (
                    <AutomationCard key={node.id} node={node}
                      onEdit={() => setEditingAutomation(node)}
                      onToggle={() => handleToggleAutomation(node.id, node.status)}
                      onDelete={() => handleDeleteAutomation(node.id)} />
                  ))}
                  <button onClick={handleAddAutomation}
                    className="soft-card h-full min-h-[172px] border border-dashed border-emerald-500/20 bg-emerald-500/3 text-foreground/20 text-[11px] font-extrabold uppercase tracking-widest hover:bg-emerald-500/5 transition-all flex flex-col items-center justify-center gap-2 group">
                    <Plus className="w-5 h-5 text-emerald-500/30 group-hover:scale-110 transition-transform" /> Add Layer
                  </button>
                </div>
              </section>

            </div>
          </div>
        </div>

        {/* ════ ROOM EDITOR MODAL ════ */}
        <AnimatePresence>
          {editingRoom && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingRoom(null)} className="absolute inset-0 bg-background/70 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} className="relative bg-background soft-card border border-white w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-8 pb-4 border-b border-white/40 shrink-0">
                  <div><h2 className="text-xl font-bold uppercase tracking-tight">Edit Room</h2><p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest mt-0.5">{editingRoom.name} · {editingRoom.type} · {editingRoom.sqft} sqft</p></div>
                  <button onClick={() => setEditingRoom(null)} className="soft-button w-9 h-9 border border-white text-foreground/30"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-8 space-y-5 overflow-y-auto flex-1">
                  <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Room Name</label>
                    <input type="text" value={editingRoom.name} onChange={(e) => setEditingRoom({...editingRoom, name: e.target.value})} className="soft-ui-in w-full py-4 px-5 text-sm bg-white/60 border border-white outline-none font-semibold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Type</label>
                      <select value={editingRoom.type} onChange={(e) => setEditingRoom({...editingRoom, type: e.target.value})} className="soft-ui-in w-full py-4 px-5 text-xs bg-white/60 border border-white outline-none appearance-none">
                        <option>Studio</option><option>1BHK</option><option>2BHK</option><option>Suite</option><option>Master Suite</option><option>Private Office</option><option>Living Area</option><option>Kitchen</option><option>Other</option>
                      </select>
                    </div>
                    <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">SQFT</label>
                      <input type="number" value={editingRoom.sqft || ''} onChange={(e) => setEditingRoom({...editingRoom, sqft: parseInt(e.target.value) || 0})} className="soft-ui-in w-full py-4 px-5 text-xs bg-white/60 border border-white outline-none" placeholder="e.g. 250" />
                    </div>
                  </div>
                  <div className="space-y-3"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Room Features</label>
                    <div className="flex flex-wrap gap-2">
                      {editingRoom.features.map((f, i) => (
                        <div key={i} className="soft-well px-3 py-1.5 border border-white flex items-center gap-2">
                          <span className="text-[10px] font-bold text-foreground/60">{f}</span>
                          <button onClick={() => { const nf = [...editingRoom.features]; nf.splice(i, 1); setEditingRoom({...editingRoom, features: nf}); }}><X className="w-3 h-3 text-primary/40 hover:text-primary" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" id="rf-in" placeholder="Add feature..." className="soft-ui-in flex-1 py-3 px-4 text-[10px] bg-white/40 border border-white outline-none"
                        onKeyDown={(e) => { if (e.key==='Enter'){const v=(e.currentTarget as HTMLInputElement).value.trim();if(v&&!editingRoom.features.includes(v)){setEditingRoom({...editingRoom,features:[...editingRoom.features,v]});(e.currentTarget as HTMLInputElement).value='';}}} } />
                      <button onClick={() => {const i=document.getElementById('rf-in') as HTMLInputElement;const v=i?.value.trim();if(v&&!editingRoom.features.includes(v)){setEditingRoom({...editingRoom,features:[...editingRoom.features,v]});i.value='';}}} className="soft-button px-4 border border-white text-secondary"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="space-y-3"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Room Pictures</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(editingRoom.image_urls || []).map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => { const nu=[...(editingRoom.image_urls||[])];nu.splice(i,1);setEditingRoom({...editingRoom,image_urls:nu}); }} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-5 h-5 text-white" /></button>
                        </div>
                      ))}
                      <label className="aspect-square rounded-xl border-2 border-dashed border-secondary/30 bg-secondary/5 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-secondary/10 transition-all">
                        <Upload className="w-5 h-5 text-secondary/40" /><span className="text-[8px] font-bold text-secondary/40 uppercase">Add</span>
                        <input type="file" accept="image/*" className="hidden" onChange={() => alert('Paste URL below for now.')} />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input type="url" id="ri-in" placeholder="Paste image URL..." className="soft-ui-in flex-1 py-3 px-4 text-[10px] bg-white/40 border border-white outline-none"
                        onKeyDown={(e) => { if (e.key==='Enter'){const v=(e.currentTarget as HTMLInputElement).value.trim();if(v){setEditingRoom({...editingRoom,image_urls:[...(editingRoom.image_urls||[]),v]});(e.currentTarget as HTMLInputElement).value='';}}} } />
                      <button onClick={() => {const i=document.getElementById('ri-in') as HTMLInputElement;const v=i?.value.trim();if(v){setEditingRoom({...editingRoom,image_urls:[...(editingRoom.image_urls||[]),v]});i.value='';}}} className="soft-button px-4 border border-white text-secondary"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <button onClick={() => { handleUpdateRoom(editingRoom); setEditingRoom(null); }} className="w-full btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Save Room Changes
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ════ AMENITY EDITOR MODAL ════ */}
        <AnimatePresence>
          {editingBenefit && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingBenefit(null)} className="absolute inset-0 bg-background/70 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} className="relative bg-background soft-card border border-white w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center p-8 pb-4 border-b border-white/40">
                  <h2 className="text-xl font-bold uppercase tracking-tight">Edit Amenity</h2>
                  <button onClick={() => setEditingBenefit(null)} className="soft-button w-9 h-9 border border-white text-foreground/30"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-8 space-y-5">
                  {/* Preview */}
                  {editingBenefit.image_url && (
                    <div className="relative h-36 rounded-2xl overflow-hidden border border-white">
                      <img src={editingBenefit.image_url} className="w-full h-full object-cover" alt="preview" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] font-extrabold text-white uppercase tracking-widest">{editingBenefit.name}</p>
                    </div>
                  )}
                  <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Amenity Name</label>
                    <input type="text" value={editingBenefit.name} onChange={(e) => setEditingBenefit({...editingBenefit, name: e.target.value})} className="soft-ui-in w-full py-4 px-5 text-sm bg-white/60 border border-white outline-none font-semibold" />
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Photo URL</label>
                    <input type="url" value={editingBenefit.image_url || ''} onChange={(e) => setEditingBenefit({...editingBenefit, image_url: e.target.value})} className="soft-ui-in w-full py-4 px-5 text-xs bg-white/60 border border-white outline-none" placeholder="https://..." />
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Description (optional)</label>
                    <input type="text" value={editingBenefit.description || ''} onChange={(e) => setEditingBenefit({...editingBenefit, description: e.target.value})} className="soft-ui-in w-full py-4 px-5 text-xs bg-white/60 border border-white outline-none" placeholder="Short description..." />
                  </div>
                  <button onClick={() => { handleUpdateBenefit(editingBenefit); setEditingBenefit(null); }} className="w-full btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Save Amenity
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ════ AUTOMATION EDITOR MODAL ════ */}
        <AnimatePresence>
          {editingAutomation && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingAutomation(null)} className="absolute inset-0 bg-background/70 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} className="relative bg-background soft-card border border-white w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center p-8 pb-4 border-b border-white/40">
                  <h2 className="text-xl font-bold uppercase tracking-tight">Edit Automation</h2>
                  <button onClick={() => setEditingAutomation(null)} className="soft-button w-9 h-9 border border-white text-foreground/30"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-8 space-y-5">
                  {editingAutomation.image_url && (
                    <div className="relative h-36 rounded-2xl overflow-hidden border border-white">
                      <img src={editingAutomation.image_url} className="w-full h-full object-cover" alt="preview" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <p className="absolute bottom-3 left-3 text-[11px] font-extrabold text-white uppercase tracking-widest">{editingAutomation.name}</p>
                      {editingAutomation.status === 'Active' && <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/><span className="text-[9px] font-bold text-emerald-400 uppercase">Active</span></div>}
                    </div>
                  )}
                  <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Feature Name</label>
                    <input type="text" value={editingAutomation.name} onChange={(e) => setEditingAutomation({...editingAutomation, name: e.target.value})} className="soft-ui-in w-full py-4 px-5 text-sm bg-white/60 border border-white outline-none font-semibold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Type</label>
                      <select value={editingAutomation.type} onChange={(e) => setEditingAutomation({...editingAutomation, type: e.target.value as any})} className="soft-ui-in w-full py-4 px-5 text-xs bg-white/60 border border-white outline-none appearance-none">
                        <option>Lighting</option><option>Security</option><option>Climate</option><option>Other</option>
                      </select>
                    </div>
                    <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Status</label>
                      <select value={editingAutomation.status} onChange={(e) => setEditingAutomation({...editingAutomation, status: e.target.value as any})} className="soft-ui-in w-full py-4 px-5 text-xs bg-white/60 border border-white outline-none appearance-none">
                        <option>Active</option><option>Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Photo URL</label>
                    <input type="url" value={editingAutomation.image_url || ''} onChange={(e) => setEditingAutomation({...editingAutomation, image_url: e.target.value})} className="soft-ui-in w-full py-4 px-5 text-xs bg-white/60 border border-white outline-none" placeholder="https://..." />
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Description</label>
                    <input type="text" value={editingAutomation.description || ''} onChange={(e) => setEditingAutomation({...editingAutomation, description: e.target.value})} className="soft-ui-in w-full py-4 px-5 text-xs bg-white/60 border border-white outline-none" placeholder="e.g. Automatically turns off when area is empty" />
                  </div>
                  <button onClick={() => { handleUpdateAutomation(editingAutomation); setEditingAutomation(null); }} className="w-full btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Save Automation
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Property Edit Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-background/60 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-background soft-card border border-white w-full max-w-xl p-10 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <div><h2 className="text-2xl font-bold tracking-tighter uppercase">{editingProperty ? 'Edit Property' : 'New Property'}</h2></div>
                  <button onClick={() => setIsModalOpen(false)} className="soft-button w-10 h-10 border border-white text-foreground/30"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Name</label>
                      <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none" />
                    </div>
                    <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Total Rooms</label>
                      <input type="number" required value={formData.total_rooms} onChange={(e) => setFormData({...formData, total_rooms: parseInt(e.target.value)})} className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Location</label>
                    <input type="text" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none" />
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[11px] font-extrabold uppercase tracking-widest text-foreground/30 hover:bg-white/40 rounded-xl border border-white transition-all">Cancel</button>
                    <button type="submit" className="flex-1 btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />{editingProperty ? 'Save Changes' : 'Create Property'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </AdminLayout>
    );
  }

  // ─── PROPERTY LIST VIEW ─────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">Estate Portfolio</h1>
            <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-[0.2em]">Manage your premium properties</p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-terracotta px-6 py-3.5 text-[11px] font-extrabold flex items-center gap-2 shadow-xl hover:translate-y-[-2px] transition-all uppercase tracking-widest">
            <Plus className="w-4 h-4" /> Initialize Asset
          </button>
        </div>
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
          <input type="text" placeholder="Search by name or location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="soft-ui-in w-full py-5 pl-12 pr-6 text-sm bg-white/40 border border-white/50 focus:outline-none transition-all text-foreground" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProperties.map((property, idx) => (
              <motion.div key={property.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }} className="soft-card p-0 overflow-hidden border border-white group">
                <div className="relative h-56 w-full overflow-hidden bg-white/10">
                  <NextImage src={property.image_url || '/images/realistic_villa_exterior_1773522363119.png'} alt={property.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleOpenModal(property)} className="w-10 h-10 rounded-xl bg-white/95 flex items-center justify-center text-secondary hover:bg-secondary hover:text-white transition-all shadow-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(property.id)} className="w-10 h-10 rounded-xl bg-white/95 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="absolute bottom-4 left-4"><span className="sage-badge px-3 py-1 text-[9px]">{property.property_type}</span></div>
                </div>
                <div className="p-8 space-y-6 bg-white/30">
                  <div><h3 className="text-2xl font-bold tracking-tighter uppercase">{property.name}</h3>
                    <p className="text-[11px] font-bold text-foreground/40 flex items-center gap-1.5 uppercase tracking-widest mt-1"><MapPin className="w-3.5 h-3.5 text-primary" />{property.location}</p>
                  </div>
                  <div className="flex justify-between items-center pt-6 border-t border-white/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl soft-ui-in flex items-center justify-center text-primary bg-white/40"><Home className="w-5 h-5" /></div>
                      <div><p className="text-[16px] font-bold leading-none">{property.total_rooms}</p><p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Total Rooms</p></div>
                    </div>
                    <button onClick={() => setViewingDetails(property)} className="soft-button px-5 py-2.5 text-[10px] font-extrabold uppercase bg-white/60 border border-white hover:shadow-lg transition-all flex items-center gap-2 group">
                      Infrastructure <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-background/60 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-background soft-card border border-white w-full max-w-xl p-10 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold tracking-tighter uppercase">{editingProperty ? 'Edit Property' : 'New Property'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="soft-button w-10 h-10 border border-white text-foreground/30"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Name</label><input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Total Rooms</label><input type="number" required value={formData.total_rooms} onChange={(e) => setFormData({...formData, total_rooms: parseInt(e.target.value)})} className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none" /></div>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Location</label><input type="text" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none" /></div>
                  <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[11px] font-extrabold uppercase tracking-widest text-foreground/30 hover:bg-white/40 rounded-xl border border-white transition-all">Cancel</button>
                    <button type="submit" className="flex-1 btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"><Check className="w-5 h-5" />{editingProperty ? 'Save Changes' : 'Create'}</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}

export default function PropertyManagementPage() {
  return (
    <Suspense fallback={<AdminLayout><div className="min-h-[60vh] flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin mb-4" /></div></AdminLayout>}>
      <PropertyManagementContent />
    </Suspense>
  );
}
