'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
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

export default function PropertyManagementPage() {
  const [properties, setProperties] = useState<Property[]>(initialMockProperties);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingDetails, setViewingDetails] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Property>>({
    name: '',
    location: '',
    total_rooms: 0,
    property_type: 'Villa',
    image_url: '/images/realistic_villa_exterior_1773522363119.png'
  });

  // Auto-save simulation
  const autoSave = (updatedProperty: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
    console.log('Auto-saved property:', updatedProperty.name);
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
        image_url: '/images/realistic_villa_exterior_1773522363119.png'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editingProperty) {
      const updated = { ...editingProperty, ...formData } as Property;
      setProperties(properties.map(p => p.id === updated.id ? updated : p));
    } else {
      const newProperty: Property = {
        ...formData,
        id: `prop-${Date.now()}`,
        rooms: [],
        benefits: [],
        automation: []
      } as Property;
      setProperties([...properties, newProperty]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      setProperties(properties.filter(p => p.id !== id));
      if (viewingDetails?.id === id) setViewingDetails(null);
    }
  };

  const filteredProperties = properties.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (viewingDetails) {
    return (
      <AdminLayout>
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
          {/* Back Header */}
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
                   <button className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-all">
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
                          {room.features.map(f => (
                            <span key={f} className="text-[8px] px-1.5 py-0.5 rounded-md bg-white/60 border border-white/50 text-foreground/60 text-[8px] font-bold upper">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 soft-button w-8 h-8 border border-white text-primary transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Benefits Section */}
              <section className="space-y-6">
                <div className="flex justify-between items-center">
                   <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                       <Sun className="w-5 h-5 text-secondary" /> Premium Benefits
                   </h2>
                   <button className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-all">
                       Configure <Settings className="w-3 h-3" />
                   </button>
                </div>
                <div className="flex flex-wrap gap-4">
                  {(viewingDetails.benefits || []).map(benefit => (
                    <div key={benefit.id} className="soft-well px-6 py-4 border border-white bg-white/60 flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                          <Sun className="w-4 h-4" />
                       </div>
                       <span className="text-[11px] font-bold text-foreground uppercase tracking-widest">{benefit.name}</span>
                    </div>
                  ))}
                  <button className="soft-well px-8 py-4 border border-white border-dashed bg-transparent text-foreground/20 text-[11px] font-bold uppercase tracking-widest hover:bg-white/40 transition-all">
                    + Add New
                  </button>
                </div>
              </section>

              {/* Automation Section */}
              <section className="space-y-6">
                 <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                     <Zap className="w-5 h-5 text-cyan-500" /> Smart Automation
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(viewingDetails.automation || []).map(node => (
                    <div key={node.id} className="soft-card p-5 border border-white flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                            node.status === 'Active' ? "bg-cyan-500/10 text-cyan-500" : "bg-foreground/5 text-foreground/20"
                          )}>
                             <Zap className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-xs font-bold text-foreground">{node.name}</p>
                             <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">{node.type}</p>
                          </div>
                       </div>
                       <div className={cn(
                         "px-3 py-1 rounded-full text-[8px] font-extrabold uppercase tracking-widest border",
                         node.status === 'Active' ? "bg-emerald-50 text-emerald-500 border-emerald-100" : "bg-foreground/5 text-foreground/40 border-foreground/10"
                       )}>
                         {node.status}
                       </div>
                    </div>
                  ))}
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
                    <img 
                        src={property.image_url} 
                        alt={property.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
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
                       <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 ml-1">Room Count</label>
                       <input 
                         type="number" required value={formData.total_rooms}
                         onChange={(e) => setFormData({...formData, total_rooms: parseInt(e.target.value)})}
                         className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none"
                       />
                    </div>
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
      </div>
    </AdminLayout>
  );
}
