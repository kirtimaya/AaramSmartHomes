'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import NextImage from 'next/image';
import { Property, PropertyType, Room, Benefit, AutomationSystem } from '@/lib/types';
import { 
  Plus, MapPin, Home, Edit2, Trash2, X, Check,
  Building2, Image as ImageIcon, Loader2, Search,
  ArrowLeft, ChevronRight, Waves, Zap, ShieldCheck,
  Upload, Settings, Leaf
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

function PropertyManagementContent() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingDetails, setViewingDetails] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState<Partial<Property>>({
    name: '', location: '', total_rooms: 0,
    property_type: 'Villa',
    image_url: '/images/realistic_villa_exterior_1773522363119.png',
    description: ''
  });

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
    const { data, error } = await supabase
      .from('properties')
      .select('*, rooms(*), benefits(*), automation_systems(*)');
    if (!error && data) {
      setProperties(data.map((p: any) => ({ ...p, automation: p.automation_systems })));
    }
    setLoading(false);
  };

  const autoSave = async (updatedProperty: Property) => {
    const { error } = await supabase.from('properties').update({
      name: updatedProperty.name, location: updatedProperty.location,
      description: updatedProperty.description, total_rooms: updatedProperty.total_rooms,
      image_url: updatedProperty.image_url, property_type: updatedProperty.property_type
    }).eq('id', updatedProperty.id);
    if (!error) setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
  };

  const handleOpenModal = (property?: Property) => {
    if (property) { setEditingProperty(property); setFormData(property); }
    else {
      setEditingProperty(null);
      setFormData({ name: '', location: '', total_rooms: 0, property_type: 'Villa',
        image_url: '/images/realistic_villa_exterior_1773522363119.png', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault(); setLoading(true);
    if (editingProperty) {
      await supabase.from('properties').update({
        name: formData.name, location: formData.location, total_rooms: formData.total_rooms,
        property_type: formData.property_type, image_url: formData.image_url, description: formData.description
      }).eq('id', editingProperty.id);
    } else {
      await supabase.from('properties').insert([{
        name: formData.name, location: formData.location, total_rooms: formData.total_rooms,
        property_type: formData.property_type, image_url: formData.image_url, description: formData.description
      }]);
    }
    await fetchProperties(); setIsModalOpen(false); setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      setLoading(true);
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (!error) { setProperties(properties.filter(p => p.id !== id)); if (viewingDetails?.id === id) setViewingDetails(null); }
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddRoom = async () => {
    if (!viewingDetails) return;
    const { data, error } = await supabase.from('rooms').insert([{
      property_id: viewingDetails.id, name: 'New Room', type: 'Suite', sqft: 250,
      features: ['Smart Lock'], image_urls: []
    }]).select();
    if (!error && data) {
      const updated = { ...viewingDetails, rooms: [...(viewingDetails.rooms || []), data[0] as Room] };
      setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleUpdateRoom = async (updatedRoom: Room) => {
    const { error } = await supabase.from('rooms').update({
      name: updatedRoom.name, type: updatedRoom.type, sqft: updatedRoom.sqft,
      features: updatedRoom.features, image_urls: updatedRoom.image_urls
    }).eq('id', updatedRoom.id);
    if (!error && viewingDetails) {
      const updated = { ...viewingDetails, rooms: (viewingDetails.rooms || []).map(r => r.id === updatedRoom.id ? updatedRoom : r) };
      setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
    if (!error && viewingDetails) {
      const updated = { ...viewingDetails, rooms: (viewingDetails.rooms || []).filter(r => r.id !== roomId) };
      setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleCloneRoom = async (room: Room) => {
    if (!viewingDetails) return;
    const { data, error } = await supabase.from('rooms').insert([{
      property_id: viewingDetails.id, name: `${room.name} (Copy)`,
      type: room.type, sqft: room.sqft || 0, features: room.features, image_urls: room.image_urls || []
    }]).select();
    if (!error && data) {
      const updated = { ...viewingDetails, rooms: [...(viewingDetails.rooms || []), data[0] as Room] };
      setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleAddBenefit = async () => {
    if (!viewingDetails) return;
    const { data, error } = await supabase.from('benefits').insert([{
      property_id: viewingDetails.id, name: 'New Amenity', icon: 'Leaf'
    }]).select();
    if (!error && data) {
      const updated = { ...viewingDetails, benefits: [...(viewingDetails.benefits || []), data[0] as Benefit] };
      setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleUpdateBenefit = async (updatedBenefit: Benefit) => {
    const { error } = await supabase.from('benefits').update({
      name: updatedBenefit.name, icon: updatedBenefit.icon, description: updatedBenefit.description
    }).eq('id', updatedBenefit.id);
    if (!error && viewingDetails) {
      const updated = { ...viewingDetails, benefits: (viewingDetails.benefits || []).map(b => b.id === updatedBenefit.id ? updatedBenefit : b) };
      setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleDeleteBenefit = async (benefitId: string) => {
    const { error } = await supabase.from('benefits').delete().eq('id', benefitId);
    if (!error && viewingDetails) {
      const updated = { ...viewingDetails, benefits: (viewingDetails.benefits || []).filter(b => b.id !== benefitId) };
      setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleAddAutomation = async () => {
    if (!viewingDetails) return;
    const { data, error } = await supabase.from('automation_systems').insert([{
      property_id: viewingDetails.id, name: 'New Layer', status: 'Active', type: 'Lighting'
    }]).select();
    if (!error && data) {
      const updated = { ...viewingDetails, automation: [...(viewingDetails.automation || []), data[0]] as AutomationSystem[] };
      setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleToggleAutomation = async (nodeId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const { error } = await supabase.from('automation_systems').update({ status: newStatus }).eq('id', nodeId);
    if (!error && viewingDetails) {
      const updated = { ...viewingDetails, automation: (viewingDetails.automation || []).map(n => n.id === nodeId ? {...n, status: newStatus as 'Active' | 'Inactive'} : n) as AutomationSystem[] };
      setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleDeleteAutomation = async (nodeId: string) => {
    const { error } = await supabase.from('automation_systems').delete().eq('id', nodeId);
    if (!error && viewingDetails) {
      const updated = { ...viewingDetails, automation: (viewingDetails.automation || []).filter(n => n.id !== nodeId) as AutomationSystem[] };
      setViewingDetails(updated); setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  if (loading && properties.length === 0) {
    return (
      <AdminLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Accessing Secure Node</p>
        </div>
      </AdminLayout>
    );
  }

  // ─── PROPERTY DETAIL VIEW ────────────────────────────────────────────────
  if (viewingDetails) {
    return (
      <AdminLayout>
        <div className="max-w-6xl mx-auto space-y-8 pb-20">

          {/* Back Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewingDetails(null)} className="soft-button w-12 h-12 border border-white hover:text-primary transition-all">
                <ArrowLeft className="w-5 h-5" />
              </button>
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

            {/* Left: Property info */}
            <div className="lg:col-span-4 space-y-8">
              <div className="soft-card p-0 overflow-hidden border border-white">
                <img src={viewingDetails.image_url} className="w-full h-56 object-cover" alt={viewingDetails.name} />
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">Description</label>
                    <textarea
                      className="soft-ui-in w-full bg-white/40 border border-white p-4 text-xs min-h-[100px] outline-none"
                      value={viewingDetails.description}
                      onChange={(e) => {
                        const updated = {...viewingDetails, description: e.target.value};
                        setViewingDetails(updated); autoSave(updated);
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="soft-well p-4 border border-white space-y-1">
                      <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Rooms</p>
                      <p className="text-2xl font-bold text-foreground">{viewingDetails.total_rooms}</p>
                    </div>
                    <div className="soft-well p-4 border border-white space-y-1">
                      <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Type</p>
                      <p className="text-[12px] font-bold text-foreground uppercase pt-1">{viewingDetails.property_type}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Rooms / Amenities / Automation */}
            <div className="lg:col-span-8 space-y-10">

              {/* ── ROOM DISTRIBUTION ── */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" /> Room Distribution
                  </h2>
                  <button onClick={handleAddRoom} className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-all">
                    Add Room <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(viewingDetails.rooms || []).map((room) => (
                    <div key={room.id} className="soft-card p-5 border border-white bg-white/40 flex justify-between items-start">
                      <div className="space-y-1 flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{room.name}</p>
                        <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">{room.type} · {room.sqft} sqft</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {room.features.slice(0, 3).map(f => (
                            <span key={f} className="text-[8px] px-1.5 py-0.5 rounded-md bg-white/60 border border-white/50 text-foreground/60 font-bold">{f}</span>
                          ))}
                          {room.image_urls && room.image_urls.length > 0 && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-secondary/10 border border-secondary/20 text-secondary font-bold flex items-center gap-1">
                              <ImageIcon className="w-2.5 h-2.5" /> {room.image_urls.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-3 shrink-0">
                        <button onClick={() => handleCloneRoom(room)} className="soft-button w-8 h-8 border border-white text-primary/40 hover:text-primary transition-all" title="Clone">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setEditingRoom(room)}
                          className="soft-button w-9 h-9 border border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary hover:text-white transition-all shadow-sm"
                          title="Edit Room"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteRoom(room.id)} className="soft-button w-8 h-8 border border-white text-primary/40 hover:text-primary transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── COMMON AREA AMENITIES ── */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                    <Waves className="w-5 h-5 text-secondary" /> Common Area Amenities
                  </h2>
                  <button onClick={handleAddBenefit} className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-all">
                    Add <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(viewingDetails.benefits || []).map(benefit => (
                    <div key={benefit.id} className="soft-well px-5 py-3 border border-white bg-white/60 flex items-center gap-3 group">
                      <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                        <Leaf className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-bold text-foreground uppercase tracking-widest">{benefit.name}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all ml-1">
                        <button onClick={() => {
                          const newName = prompt('Rename amenity:', benefit.name);
                          if (newName) handleUpdateBenefit({...benefit, name: newName});
                        }} className="text-secondary hover:text-secondary/70 transition-all">
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDeleteBenefit(benefit.id)} className="text-primary hover:text-primary/70 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddBenefit} className="soft-well px-6 py-3 border border-white border-dashed bg-transparent text-foreground/20 text-[11px] font-bold uppercase tracking-widest hover:bg-white/40 transition-all">
                    + Add Amenity
                  </button>
                </div>
              </section>

              {/* ── SMART AUTOMATION ── */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-500" /> Smart Automation
                </h2>

                {/* Sustainability banner */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest">Energy Efficiency Engine</h4>
                    <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest">Actively optimizing common area energy consumption</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(viewingDetails.automation || []).map(node => (
                    <div key={node.id} className="soft-card p-5 border border-white flex items-center justify-between relative overflow-hidden group">
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-all duration-500",
                          node.status === 'Active' ? "bg-emerald-500/10 text-emerald-500" : "bg-foreground/5 text-foreground/20"
                        )}>
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{node.name}</p>
                          <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">{node.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 relative z-10">
                        <button
                          onClick={() => handleToggleAutomation(node.id, node.status)}
                          className={cn(
                            "text-[9px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all",
                            node.status === 'Active' ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" : "border-white text-foreground/20 bg-white/40"
                          )}
                        >
                          {node.status}
                        </button>
                        <button onClick={() => handleDeleteAutomation(node.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-primary/30 hover:text-primary transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {node.status === 'Active' && <div className="absolute inset-0 bg-emerald-500/3 pointer-events-none" />}
                    </div>
                  ))}
                  <button onClick={handleAddAutomation} className="soft-card p-5 border border-dashed border-emerald-500/20 bg-emerald-500/3 text-foreground/20 text-[11px] font-extrabold uppercase tracking-widest hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2 group">
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform text-emerald-500/40" /> Add Automation Layer
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
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setEditingRoom(null)}
                className="absolute inset-0 bg-background/70 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="relative bg-background soft-card border border-white w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center p-8 pb-4 border-b border-white/40 shrink-0">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight">Edit Room</h2>
                    <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest mt-0.5">
                      {editingRoom.name} · {editingRoom.type} · {editingRoom.sqft} sqft
                    </p>
                  </div>
                  <button onClick={() => setEditingRoom(null)} className="soft-button w-9 h-9 border border-white text-foreground/30">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Scrollable Body */}
                <div className="p-8 space-y-6 overflow-y-auto flex-1">

                  {/* Room Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Room Name</label>
                    <input
                      type="text" value={editingRoom.name}
                      onChange={(e) => setEditingRoom({...editingRoom, name: e.target.value})}
                      className="soft-ui-in w-full py-4 px-5 text-sm bg-white/60 border border-white outline-none font-semibold"
                    />
                  </div>

                  {/* Type + SQFT */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Room Type</label>
                      <select
                        value={editingRoom.type}
                        onChange={(e) => setEditingRoom({...editingRoom, type: e.target.value})}
                        className="soft-ui-in w-full py-4 px-5 text-xs bg-white/60 border border-white outline-none appearance-none"
                      >
                        <option>Studio</option><option>1BHK</option><option>2BHK</option>
                        <option>Suite</option><option>Master Suite</option>
                        <option>Private Office</option><option>Living Area</option>
                        <option>Kitchen</option><option>Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Size (SQFT)</label>
                      <input
                        type="number" value={editingRoom.sqft || ''}
                        onChange={(e) => setEditingRoom({...editingRoom, sqft: parseInt(e.target.value) || 0})}
                        className="soft-ui-in w-full py-4 px-5 text-xs bg-white/60 border border-white outline-none"
                        placeholder="e.g. 250"
                      />
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Room Features</label>
                    <div className="flex flex-wrap gap-2">
                      {editingRoom.features.map((f, i) => (
                        <div key={i} className="soft-well px-3 py-1.5 border border-white flex items-center gap-2">
                          <span className="text-[10px] font-bold text-foreground/60">{f}</span>
                          <button onClick={() => {
                            const nf = [...editingRoom.features]; nf.splice(i, 1);
                            setEditingRoom({...editingRoom, features: nf});
                          }}>
                            <X className="w-3 h-3 text-primary/40 hover:text-primary transition-colors" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text" id="edit-room-feat"
                        placeholder="Add feature, press Enter..."
                        className="soft-ui-in flex-1 py-3 px-4 text-[10px] bg-white/40 border border-white outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.currentTarget as HTMLInputElement).value.trim();
                            if (val && !editingRoom.features.includes(val)) {
                              setEditingRoom({...editingRoom, features: [...editingRoom.features, val]});
                              (e.currentTarget as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <button onClick={() => {
                        const inp = document.getElementById('edit-room-feat') as HTMLInputElement;
                        const val = inp?.value.trim();
                        if (val && !editingRoom.features.includes(val)) {
                          setEditingRoom({...editingRoom, features: [...editingRoom.features, val]});
                          inp.value = '';
                        }
                      }} className="soft-button px-4 border border-white text-secondary">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Image Gallery */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Room Pictures / Gallery</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(editingRoom.image_urls || []).map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white group">
                          <img src={url} alt={`Room ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => {
                              const nu = [...(editingRoom.image_urls || [])]; nu.splice(i, 1);
                              setEditingRoom({...editingRoom, image_urls: nu});
                            }}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-square rounded-xl border-2 border-dashed border-secondary/30 bg-secondary/5 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-secondary/10 transition-all">
                        <Upload className="w-5 h-5 text-secondary/40" />
                        <span className="text-[8px] font-bold text-secondary/40 uppercase tracking-wider">Add Photo</span>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={() => alert('File upload needs Supabase Storage. Use URL below for now.')}
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url" id="edit-room-img"
                        placeholder="Paste image URL..."
                        className="soft-ui-in flex-1 py-3 px-4 text-[10px] bg-white/40 border border-white outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.currentTarget as HTMLInputElement).value.trim();
                            if (val) {
                              setEditingRoom({...editingRoom, image_urls: [...(editingRoom.image_urls || []), val]});
                              (e.currentTarget as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <button onClick={() => {
                        const inp = document.getElementById('edit-room-img') as HTMLInputElement;
                        const val = inp?.value.trim();
                        if (val) {
                          setEditingRoom({...editingRoom, image_urls: [...(editingRoom.image_urls || []), val]});
                          inp.value = '';
                        }
                      }} className="soft-button px-4 border border-white text-secondary">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Save */}
                  <button
                    onClick={() => { handleUpdateRoom(editingRoom); setEditingRoom(null); }}
                    className="w-full btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Save Room Changes
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
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-background/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-background soft-card border border-white w-full max-w-xl p-10 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tighter text-foreground uppercase">
                      {editingProperty ? 'Edit Property' : 'New Property'}
                    </h2>
                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em] mt-1">Update core parameters</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="soft-button w-10 h-10 border border-white text-foreground/30">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Name</label>
                      <input type="text" required value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none"
                        placeholder="e.g. Zenith Villa" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Total Rooms</label>
                      <input type="number" required value={formData.total_rooms}
                        onChange={(e) => setFormData({...formData, total_rooms: parseInt(e.target.value)})}
                        className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Location</label>
                    <input type="text" required value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none"
                      placeholder="e.g. Whitefield, Bangalore" />
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 text-[11px] font-extrabold uppercase tracking-widest text-foreground/30 hover:bg-white/40 rounded-xl border border-white transition-all">
                      Cancel
                    </button>
                    <button type="submit"
                      className="flex-1 btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />
                      {editingProperty ? 'Save Changes' : 'Create Property'}
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
          <button onClick={() => handleOpenModal()}
            className="btn-terracotta px-6 py-3.5 text-[11px] font-extrabold flex items-center gap-2 shadow-xl hover:translate-y-[-2px] transition-all uppercase tracking-widest">
            <Plus className="w-4 h-4" /> Initialize Asset
          </button>
        </div>

        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
          <input
            type="text" placeholder="Search by name or location..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="soft-ui-in w-full py-5 pl-12 pr-6 text-sm bg-white/40 border border-white/50 focus:outline-none transition-all text-foreground"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProperties.map((property, idx) => (
              <motion.div key={property.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }}
                className="soft-card p-0 overflow-hidden border border-white group">
                <div className="relative h-56 w-full overflow-hidden bg-white/10">
                  <NextImage src={property.image_url || '/images/realistic_villa_exterior_1773522363119.png'} alt={property.name}
                    fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleOpenModal(property)} className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md flex items-center justify-center text-secondary hover:bg-secondary hover:text-white transition-all shadow-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(property.id)} className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="sage-badge px-3 py-1 text-[9px]">{property.property_type}</span>
                  </div>
                </div>
                <div className="p-8 space-y-6 bg-white/30">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-foreground tracking-tighter uppercase">{property.name}</h3>
                    <p className="text-[11px] font-bold text-foreground/40 flex items-center gap-1.5 uppercase tracking-widest">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {property.location}
                    </p>
                  </div>
                  <div className="flex justify-between items-center pt-6 border-t border-white/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl soft-ui-in flex items-center justify-center text-primary bg-white/40">
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[16px] font-bold text-foreground leading-none">{property.total_rooms}</p>
                        <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Total Rooms</p>
                      </div>
                    </div>
                    <button onClick={() => setViewingDetails(property)}
                      className="soft-button px-5 py-2.5 text-[10px] font-extrabold uppercase bg-white/60 border border-white hover:shadow-lg transition-all flex items-center gap-2 group">
                      Infrastructure <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Property Add/Edit Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-background/60 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-background soft-card border border-white w-full max-w-xl p-10 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tighter uppercase">{editingProperty ? 'Edit Property' : 'New Property'}</h2>
                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em] mt-1">Update core parameters</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="soft-button w-10 h-10 border border-white text-foreground/30">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Name</label>
                      <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none" placeholder="Estate name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Total Rooms</label>
                      <input type="number" required value={formData.total_rooms} onChange={(e) => setFormData({...formData, total_rooms: parseInt(e.target.value)})}
                        className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Location</label>
                    <input type="text" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none" placeholder="City, Area" />
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 text-[11px] font-extrabold uppercase tracking-widest text-foreground/30 hover:bg-white/40 rounded-xl border border-white transition-all">Cancel</button>
                    <button type="submit"
                      className="flex-1 btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />{editingProperty ? 'Save Changes' : 'Create Property'}
                    </button>
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
    <Suspense fallback={
      <AdminLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Initialising Node</p>
        </div>
      </AdminLayout>
    }>
      <PropertyManagementContent />
    </Suspense>
  );
}
