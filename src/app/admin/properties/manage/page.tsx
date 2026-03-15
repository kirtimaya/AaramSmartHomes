'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import NextImage from 'next/image';
import { mockProperties as initialMockProperties } from '@/lib/mockData';
import { Property, PropertyType, Room, Benefit, AutomationSystem } from '@/lib/types';
import { 
  Plus, 
  MapPin, 
  Home, 
  Edit2, 
  Trash2, 
  X, 
  Check,
  Building2,
  Image as ImageIcon,
  Loader2,
  Search,
  Filter,
  ArrowLeft,
  ChevronRight,
  Wifi,
  Waves,
  Sun,
  Zap,
  ShieldCheck,
  Upload,
  Settings
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
  
  // Form State
  const [formData, setFormData] = useState<Partial<Property>>({
    name: '',
    location: '',
    total_rooms: 0,
    property_type: 'Villa',
    image_url: '/images/realistic_villa_exterior_1773522363119.png',
    description: ''
  });

  const searchParams = useSearchParams();
  const propertyIdParam = searchParams.get('id');
  const roomIdParam = searchParams.get('room');

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (properties.length > 0 && propertyIdParam) {
      const prop = properties.find(p => p.id === propertyIdParam);
      if (prop) {
        setViewingDetails(prop);
        if (roomIdParam && prop.rooms) {
          const room = prop.rooms.find(r => r.id === roomIdParam);
          if (room) setEditingRoom(room);
        }
      }
    }
  }, [properties, propertyIdParam, roomIdParam]);

  const fetchProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*, rooms(*), benefits(*), automation_systems(*)');
    
    if (error) {
      console.error('Error fetching properties:', error);
    } else {
      // Map automation_systems to automation to match frontend type
      const mappedData = data.map((p: any) => ({
        ...p,
        automation: p.automation_systems
      }));
      setProperties(mappedData);
    }
    setLoading(false);
  };

  const autoSave = async (updatedProperty: Property) => {
    const { error } = await supabase
      .from('properties')
      .update({
        name: updatedProperty.name,
        location: updatedProperty.location,
        description: updatedProperty.description,
        total_rooms: updatedProperty.total_rooms,
        image_url: updatedProperty.image_url,
        property_type: updatedProperty.property_type
      })
      .eq('id', updatedProperty.id);

    if (error) {
      console.error('Auto-save error:', error);
    } else {
      setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
    }
  };

  const handleOpenModal = (property?: Property) => {
    if (property) {
      setEditingProperty(property);
      setFormData(property);
    } else {
      setEditingProperty(null);
      setFormData({
        name: '',
        location: '',
        total_rooms: 0,
        property_type: 'Villa',
        image_url: '/images/realistic_villa_exterior_1773522363119.png',
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);

    if (editingProperty) {
      const { error } = await supabase
        .from('properties')
        .update({
          name: formData.name,
          location: formData.location,
          total_rooms: formData.total_rooms,
          property_type: formData.property_type,
          image_url: formData.image_url,
          description: formData.description
        })
        .eq('id', editingProperty.id);

      if (error) console.error('Error updating:', error);
    } else {
      const { error } = await supabase
        .from('properties')
        .insert([{
          name: formData.name,
          location: formData.location,
          total_rooms: formData.total_rooms,
          property_type: formData.property_type,
          image_url: formData.image_url,
          description: formData.description
        }]);

      if (error) console.error('Error inserting:', error);
    }

    await fetchProperties();
    setIsModalOpen(false);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      setLoading(true);
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting:', error);
      } else {
        setProperties(properties.filter(p => p.id !== id));
        if (viewingDetails?.id === id) setViewingDetails(null);
      }
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddRoom = async () => {
    if (!viewingDetails) return;
    const { data, error } = await supabase
      .from('rooms')
      .insert([{
        property_id: viewingDetails.id,
        name: 'New Room',
        type: 'Suite',
        sqft: 250,
        features: ['Smart Lock'],
        image_urls: []
      }])
      .select();

    if (!error && data) {
      const updated = {
        ...viewingDetails,
        rooms: [...(viewingDetails.rooms || []), data[0] as Room]
      };
      setViewingDetails(updated);
      setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
    if (!error && viewingDetails) {
      const updated = {
        ...viewingDetails,
        rooms: (viewingDetails.rooms || []).filter(r => r.id !== roomId)
      };
      setViewingDetails(updated);
      setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleAddBenefit = async () => {
    if (!viewingDetails) return;
    const { data, error } = await supabase
      .from('benefits')
      .insert([{
        property_id: viewingDetails.id,
        name: 'New Benefit',
        icon: 'Sun'
      }])
      .select();

    if (!error && data) {
      const updated = {
        ...viewingDetails,
        benefits: [...(viewingDetails.benefits || []), data[0] as Benefit]
      };
      setViewingDetails(updated);
      setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };
  const handleUpdateRoom = async (updatedRoom: Room) => {
    const { error } = await supabase
      .from('rooms')
      .update({
        name: updatedRoom.name,
        type: updatedRoom.type,
        sqft: updatedRoom.sqft,
        features: updatedRoom.features,
        image_urls: updatedRoom.image_urls
      })
      .eq('id', updatedRoom.id);

    if (!error && viewingDetails) {
      const updated = {
        ...viewingDetails,
        rooms: (viewingDetails.rooms || []).map(r => r.id === updatedRoom.id ? updatedRoom : r)
      };
      setViewingDetails(updated);
      setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleCloneRoom = async (room: Room) => {
    if (!viewingDetails) return;
    const { data, error } = await supabase
      .from('rooms')
      .insert([{
        property_id: viewingDetails.id,
        name: `${room.name} (Copy)`,
        type: room.type,
        sqft: room.sqft || 0,
        features: room.features,
        image_urls: room.image_urls || []
      }])
      .select();

    if (!error && data) {
      const updated = {
        ...viewingDetails,
        rooms: [...(viewingDetails.rooms || []), data[0] as Room]
      };
      setViewingDetails(updated);
      setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleUpdateBenefit = async (updatedBenefit: Benefit) => {
    const { error } = await supabase
      .from('benefits')
      .update({
        name: updatedBenefit.name,
        icon: updatedBenefit.icon,
        description: updatedBenefit.description
      })
      .eq('id', updatedBenefit.id);

    if (!error && viewingDetails) {
      const updated = {
        ...viewingDetails,
        benefits: (viewingDetails.benefits || []).map(b => b.id === updatedBenefit.id ? updatedBenefit : b)
      };
      setViewingDetails(updated);
      setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleDeleteBenefit = async (benefitId: string) => {
    const { error } = await supabase.from('benefits').delete().eq('id', benefitId);
    if (!error && viewingDetails) {
      const updated = {
        ...viewingDetails,
        benefits: (viewingDetails.benefits || []).filter(b => b.id !== benefitId)
      };
      setViewingDetails(updated);
      setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleAddAutomation = async () => {
    if (!viewingDetails) return;
    const { data, error } = await supabase
      .from('automation_systems')
      .insert([{
        property_id: viewingDetails.id,
        name: 'New Layer',
        status: 'Active',
        type: 'Other'
      }])
      .select();

    if (!error && data) {
      const updated = {
        ...viewingDetails,
        automation: [...(viewingDetails.automation || []), data[0]] as AutomationSystem[]
      };
      setViewingDetails(updated);
      setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleToggleAutomation = async (nodeId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const { error } = await supabase
      .from('automation_systems')
      .update({ status: newStatus })
      .eq('id', nodeId);

    if (!error && viewingDetails) {
      const updated = {
        ...viewingDetails,
        automation: (viewingDetails.automation || []).map(n => n.id === nodeId ? {...n, status: newStatus as "Active" | "Inactive"} : n) as AutomationSystem[]
      };
      setViewingDetails(updated);
      setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleDeleteAutomation = async (nodeId: string) => {
    const { error } = await supabase.from('automation_systems').delete().eq('id', nodeId);
    if (!error && viewingDetails) {
      const updated = {
        ...viewingDetails,
        automation: (viewingDetails.automation || []).filter(n => n.id !== nodeId) as AutomationSystem[]
      };
      setViewingDetails(updated);
      setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
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

  if (viewingDetails) {
    return (
      <AdminLayout>
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
          {/* Back Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewingDetails(null)}
                className="soft-button w-12 h-12 border border-white hover:text-primary transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">{viewingDetails.name}</h1>
                <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-[0.2em]">{viewingDetails.location}</p>
              </div>
            </div>
            <button 
              onClick={() => handleOpenModal(viewingDetails)}
              className="soft-button px-6 py-3 border border-white text-secondary text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" /> Edit Attributes
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Stats & Edit */}
            <div className="lg:col-span-4 space-y-8">
              <div className="soft-card p-0 overflow-hidden border border-white">
                <img src={viewingDetails.image_url} className="w-full h-56 object-cover" />
                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">Description</label>
                    <textarea 
                      className="soft-ui-in w-full bg-white/40 border border-white p-4 text-xs min-h-[100px] outline-none"
                      value={viewingDetails.description}
                      onChange={(e) => {
                        const updated = {...viewingDetails, description: e.target.value};
                        setViewingDetails(updated);
                        autoSave(updated);
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

            {/* Right Column: Manage rooms/benefits */}
            <div className="lg:col-span-8 space-y-10">
              {/* Rooms Section */}
              <section className="space-y-6">
                <div className="flex justify-between items-center">
                   <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                       <Building2 className="w-5 h-5 text-primary" /> Room Distribution
                   </h2>
                   <button 
                     onClick={handleAddRoom}
                     className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-all"
                   >
                       Add Room <Plus className="w-3 h-3" />
                   </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(viewingDetails.rooms || []).map((room, idx) => (
                    <div key={room.id} className="soft-card p-5 border border-white bg-white/40 flex justify-between items-start group">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">{room.name}</p>
                        <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">{room.type} • {room.sqft} sqft</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {room.features.slice(0, 3).map(f => (
                            <span key={f} className="text-[8px] px-1.5 py-0.5 rounded-md bg-white/60 border border-white/50 text-foreground/60 text-[8px] font-bold upper">
                              {f}
                            </span>
                          ))}
                          {room.image_urls && room.image_urls.length > 0 && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-secondary/10 border border-secondary/20 text-secondary font-bold flex items-center gap-1">
                              <ImageIcon className="w-2.5 h-2.5" /> {room.image_urls.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleCloneRoom(room)}
                          className="soft-button w-8 h-8 border border-white text-primary/40 hover:text-primary transition-all"
                          title="Clone Room"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setEditingRoom(room)}
                          className="soft-button w-10 h-10 border border-white text-secondary hover:bg-secondary hover:text-white transition-all shadow-md flex items-center justify-center gap-2 px-3"
                          title="Edit Room Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRoom(room.id)}
                          className="soft-button w-8 h-8 border border-white text-primary transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Benefits Section */}
              <section className="space-y-6">
                <div className="flex justify-between items-center">
                   <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                       <Waves className="w-5 h-5 text-secondary" /> Common Area Amenities
                   </h2>
                   <button className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-all">
                       Configure <Settings className="w-3 h-3" />
                   </button>
                </div>
                <div className="flex flex-wrap gap-4">
                  {(viewingDetails.benefits || []).map(benefit => (
                    <div key={benefit.id} className="soft-well px-6 py-4 border border-white bg-white/60 flex items-center justify-between gap-3 group">
                       <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                            <Sun className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold text-foreground uppercase tracking-widest">{benefit.name}</span>
                       </div>
                       <div className="flex gap-2">
                         <button 
                          onClick={() => {
                            const newName = prompt('New Benefit Name:', benefit.name);
                            if (newName) handleUpdateBenefit({...benefit, name: newName});
                          }}
                          className="opacity-0 group-hover:opacity-100 text-secondary hover:text-secondary/70 transition-all"
                         >
                           <Edit2 className="w-3 h-3" />
                         </button>
                         <button 
                          onClick={() => handleDeleteBenefit(benefit.id)}
                          className="opacity-0 group-hover:opacity-100 text-primary hover:text-primary/70 transition-all"
                         >
                           <Trash2 className="w-3 h-3" />
                         </button>
                       </div>
                    </div>
                  ))}
                  <button 
                    onClick={handleAddBenefit}
                    className="soft-well px-8 py-4 border border-white border-dashed bg-transparent text-foreground/20 text-[11px] font-bold uppercase tracking-widest hover:bg-white/40 transition-all font-bold"
                  >
                    + Add New
                  </button>
                </div>
              </section>

              {/* Automation Section */}
              <section className="space-y-6">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest leading-tight">Energy Efficiency Engine</h4>
                      <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest uppercase">Actively optimizing common area energy consumption</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {(viewingDetails.automation || []).map(node => (
                     <div key={node.id} className="soft-card p-5 border border-white flex items-center justify-between group overflow-hidden relative">
                       <div className="flex items-center gap-4 relative z-10">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors duration-500",
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
                            )}>
                              {node.status}
                           </button>
                           <button 
                            onClick={() => handleDeleteAutomation(node.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-primary/30 hover:text-primary transition-colors"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                        {node.status === 'Active' && (
                          <div className="absolute inset-0 bg-emerald-500/5 opacity-20 pointer-events-none" />
                        )}
                     </div>
                   ))}
                  <button 
                    onClick={handleAddAutomation}
                    className="soft-card p-5 border border-white border-dashed bg-transparent text-foreground/20 text-[11px] font-extrabold uppercase tracking-widest hover:bg-white/40 transition-all flex items-center justify-center gap-2 group"
                  >
                     <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Automation Layer
                  </button>
                 </div>
              </section>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">Estate Portfolio</h1>
            <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-[0.2em]">Manage your premium properties</p>
          </div>
          
          <button 
            onClick={() => handleOpenModal()}
            className="btn-terracotta px-6 py-3.5 text-[11px] font-extrabold flex items-center gap-2 group shadow-xl hover:translate-y-[-2px] transition-all uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            Initialize Asset
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
            <input 
                type="text" 
                placeholder="Search by name or location..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="soft-ui-in w-full py-5 pl-12 pr-6 text-sm bg-white/40 border border-white/50 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-foreground"
            />
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProperties.map((property, idx) => (
              <motion.div
                key={property.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="soft-card p-0 overflow-hidden border border-white group"
              >
                {/* Image Section */}
                <div className="relative h-56 w-full overflow-hidden bg-white/10">
                    <div className="absolute inset-x-0 bottom-0 aspect-video group-hover:scale-110 transition-transform duration-700">
                      <NextImage 
                          src={property.image_url || "/images/realistic_villa_exterior_1773522363119.png"} 
                          alt={property.name}
                          fill
                          className="object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                        <button 
                            onClick={() => handleOpenModal(property)}
                            className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md flex items-center justify-center text-secondary hover:bg-secondary hover:text-white transition-all shadow-lg"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handleDelete(property.id)}
                            className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-lg"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="absolute bottom-4 left-4">
                         <span className="sage-badge px-3 py-1 text-[9px]">
                             {property.property_type}
                         </span>
                    </div>
                </div>

                {/* Info Section */}
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
                    <button 
                      onClick={() => setViewingDetails(property)}
                      className="soft-button px-5 py-2.5 text-[10px] font-extrabold uppercase bg-white/60 border border-white hover:shadow-lg transition-all flex items-center gap-2 group"
                    >
                      Infrastructure
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Form Modal */}
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
                className="relative bg-background soft-card border border-white w-full max-w-xl p-10 shadow-2xl overflow-hidden"
              >
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tighter text-foreground uppercase">
                      {editingProperty ? 'Modify Infrastructure' : 'New Property Node'}
                    </h2>
                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em] mt-1">Initialize or update core parameters</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="soft-button w-10 h-10 border border-white text-foreground/30">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Estate Designation</label>
                      <input 
                        type="text" required value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none"
                        placeholder="e.g. Zenith Villa"
                      />
                    </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Total Rooms / Room Count</label>
                       <input 
                         type="number" required value={formData.total_rooms}
                         onChange={(e) => setFormData({...formData, total_rooms: parseInt(e.target.value)})}
                         className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none"
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Asset Location</label>
                       <input 
                         type="text" required value={formData.location}
                         onChange={(e) => setFormData({...formData, location: e.target.value})}
                         className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none"
                         placeholder="e.g. Whitefield, Bangalore"
                       />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Asset Imagery</label>
                      <div className="flex gap-3">
                           <div className="relative flex-1">
                               <input 
                                   type="text" value={formData.image_url}
                                   onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                                   className="soft-ui-in w-full py-4 pl-12 pr-6 text-[10px] bg-white/60 border border-white outline-none font-mono"
                               />
                               <ImageIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                           </div>
                           <div className="flex shrink-0">
                              <input 
                                type="file" 
                                id="property-image-upload" 
                                className="hidden" 
                                onChange={() => setFormData({...formData, image_url: '/images/modern_apartment_exterior_1773521983114.png'})} 
                              />
                              <label 
                                htmlFor="property-image-upload"
                                className="soft-button px-6 border border-white bg-white/40 group flex items-center justify-center cursor-pointer"
                              >
                                 <Upload className="w-5 h-5 text-foreground/30 group-hover:text-primary transition-colors" />
                              </label>
                           </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                        type="button" onClick={() => setIsModalOpen(false)}
                        className="flex-1 py-4 text-[11px] font-extrabold uppercase tracking-widest text-foreground/30 hover:bg-white/40 rounded-xl border border-white transition-all"
                    >
                        Abort
                    </button>
                    <button 
                        type="submit" 
                        className="flex-1 btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 group"
                    >
                        <Check className="w-5 h-5" />
                        {editingProperty ? 'Sync Changes' : 'Deploy Asset'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Room Editor Modal */}
        <AnimatePresence>
          {editingRoom && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setEditingRoom(null)}
                className="absolute inset-0 bg-background/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-background soft-card border border-white w-full max-w-lg p-10 shadow-2xl overflow-hidden"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold uppercase tracking-tight">Modify Room Node</h2>
                  <button onClick={() => setEditingRoom(null)} className="soft-button w-8 h-8 border border-white text-foreground/30">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Room Alias</label>
                    <input 
                      type="text" value={editingRoom.name}
                      onChange={(e) => setEditingRoom({...editingRoom, name: e.target.value})}
                      className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Type</label>
                      <select 
                        value={editingRoom.type}
                        onChange={(e) => setEditingRoom({...editingRoom, type: e.target.value})}
                        className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none appearance-none"
                      >
                        <option value="Studio">Studio</option>
                        <option value="1BHK">1BHK</option>
                        <option value="2BHK">2BHK</option>
                        <option value="Master Suite">Master Suite</option>
                        <option value="Private Office">Private Office</option>
                        <option value="Living Area">Living Area</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">SQFT</label>
                      <input 
                        type="number" value={editingRoom.sqft}
                        onChange={(e) => setEditingRoom({...editingRoom, sqft: parseInt(e.target.value) || 0})}
                        className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Features (Architecture)</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {editingRoom.features.map((f, i) => (
                        <div key={i} className="soft-well px-3 py-1.5 border border-white flex items-center gap-2 group">
                          <span className="text-[10px] font-bold text-foreground/60">{f}</span>
                          <X 
                            className="w-3 h-3 cursor-pointer text-primary/40 hover:text-primary transition-colors" 
                            onClick={() => {
                              const newFeatures = [...editingRoom.features];
                              newFeatures.splice(i, 1);
                              setEditingRoom({...editingRoom, features: newFeatures});
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        id="new-feature-input"
                        placeholder="Add feature..."
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
                      <button 
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('new-feature-input') as HTMLInputElement;
                          const val = input.value.trim();
                          if (val && !editingRoom.features.includes(val)) {
                            setEditingRoom({...editingRoom, features: [...editingRoom.features, val]});
                            input.value = '';
                          }
                        }}
                        className="soft-button px-4 border border-white text-secondary"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Image Gallery Editing */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Room Gallery (Unit Pictures)</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(editingRoom.image_urls || []).map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white group">
                          <img src={url} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => {
                              const newUrls = [...(editingRoom.image_urls || [])];
                              newUrls.splice(i, 1);
                              setEditingRoom({...editingRoom, image_urls: newUrls});
                            }}
                            className="absolute inset-0 bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-square rounded-xl border-2 border-dashed border-white/40 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-white/40 transition-all">
                        <Upload className="w-4 h-4 text-foreground/20" />
                        <span className="text-[8px] font-bold text-foreground/30 uppercase">Upload</span>
                        <input 
                          type="file" className="hidden" 
                          onChange={(e) => {
                            // Mocking upload for now
                            const newUrl = "/images/realistic_villa_interior_1773522375112.png";
                            setEditingRoom({...editingRoom, image_urls: [...(editingRoom.image_urls || []), newUrl]});
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                       <input 
                        type="text" 
                        placeholder="Or paste image URL..."
                        id="new-room-image-url"
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
                      <button 
                        onClick={() => {
                          const input = document.getElementById('new-room-image-url') as HTMLInputElement;
                          const val = input.value.trim();
                          if (val) {
                            setEditingRoom({...editingRoom, image_urls: [...(editingRoom.image_urls || []), val]});
                            input.value = '';
                          }
                        }}
                        className="soft-button px-4 border border-white text-secondary"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      handleUpdateRoom(editingRoom);
                      setEditingRoom(null);
                    }}
                    className="w-full btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl"
                  >
                    Commit Node Updates
                  </button>
                </div>
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
