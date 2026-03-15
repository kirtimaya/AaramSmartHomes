'use client';

import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { mockProperties as initialMockProperties } from '@/lib/mockData';
import { Property, PropertyType } from '@/lib/types';
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
  Search,
  ArrowLeft,
  ChevronRight,
  Sun,
  Zap,
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
  
  const [formData, setFormData] = useState<Partial<Property>>({
    name: '',
    location: '',
    total_rooms: 0,
    property_type: 'Villa',
    image_url: '/images/realistic_villa_exterior_1773522363119.png'
  });

  const autoSave = (updatedProperty: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
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
    if (confirm('Are you sure?')) {
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
          <div className="flex items-center gap-4">
            <button onClick={() => setViewingDetails(null)} className="soft-button w-12 h-12 border border-white"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">{viewingDetails.name}</h1>
              <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-[0.2em]">{viewingDetails.location}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-8">
              <div className="soft-card p-0 overflow-hidden border border-white">
                <img src={viewingDetails.image_url} className="w-full h-56 object-cover" />
                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">Infrastructure Summary</label>
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
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-10">
              <section className="space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Rooms</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(viewingDetails.rooms || []).map((room) => (
                    <div key={room.id} className="soft-card p-5 border border-white bg-white/40 flex justify-between items-start group">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">{room.name}</p>
                        <p className="text-[9px] text-foreground/40 font-bold uppercase tracking-widest">{room.type} • {room.sqft} sqft</p>
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
        <div className="flex justify-between items-end gap-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">Estate Portfolio</h1>
            <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-[0.2em]">Asset Control Center</p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-terracotta px-6 py-3.5 text-[11px] font-extrabold flex items-center gap-2 group shadow-xl uppercase tracking-widest"><Plus className="w-4 h-4" /> Initialize Asset</button>
        </div>

        <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="soft-ui-in w-full py-5 pl-12 pr-6 text-sm bg-white/40 border border-white focus:outline-none" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProperties.map((property, idx) => (
              <motion.div key={property.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="soft-card p-0 overflow-hidden border border-white group">
                <div className="relative h-56 w-full overflow-hidden bg-white/10">
                    <img src={property.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleOpenModal(property)} className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md flex items-center justify-center text-secondary shadow-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(property.id)} className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md flex items-center justify-center text-primary shadow-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="p-8 space-y-6 bg-white/30">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-foreground tracking-tighter uppercase">{property.name}</h3>
                    <p className="text-[11px] font-bold text-foreground/40 flex items-center gap-1.5 uppercase tracking-widest"><MapPin className="w-3.5 h-3.5 text-primary" /> {property.location}</p>
                  </div>
                  <div className="flex justify-between items-center pt-6 border-t border-white/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl soft-ui-in flex items-center justify-center text-primary bg-white/40"><Home className="w-5 h-5" /></div>
                        <div>
                            <p className="text-[16px] font-bold text-foreground">{property.total_rooms}</p>
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Rooms</p>
                        </div>
                    </div>
                    <button onClick={() => setViewingDetails(property)} className="soft-button px-5 py-2.5 text-[10px] font-extrabold uppercase border border-white flex items-center gap-2 group">Infrastructure <ChevronRight className="w-3 h-3 group-hover:translate-x-1" /></button>
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-background/60 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-background soft-card border border-white w-full max-w-xl p-10 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-2xl font-bold tracking-tighter uppercase">{editingProperty ? 'Modify Node' : 'Deploy Asset'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="soft-button w-10 h-10 border border-white text-foreground/30"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none" placeholder="Designation" />
                    <input type="number" required value={formData.total_rooms} onChange={(e) => setFormData({...formData, total_rooms: parseInt(e.target.value)})} className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none" placeholder="Room Count" />
                  </div>
                  <div className="flex gap-3">
                     <input type="text" value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} className="soft-ui-in w-full py-4 pl-12 pr-6 text-[10px] bg-white/60 border border-white outline-none font-mono" />
                     <div className="flex shrink-0">
                        <input type="file" id="p-upload" className="hidden" onChange={() => setFormData({...formData, image_url: '/images/modern_apartment_exterior_1773521983114.png'})} />
                        <label htmlFor="p-upload" className="soft-button px-6 border border-white bg-white/40 group flex items-center justify-center cursor-pointer"><Upload className="w-5 h-5 group-hover:text-primary" /></label>
                     </div>
                  </div>
                  <button type="submit" className="w-full btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 group"><Check className="w-5 h-5" /> {editingProperty ? 'Sync Changes' : 'Initialize Asset'}</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
