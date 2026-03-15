'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Unit, Property, Tenant, UnitStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, User, AlertCircle, Clock, Leaf, Plus, Edit2, Trash2, X, Check, Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function OccupancyPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [addingToPropertyId, setAddingToPropertyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Unit Form State
  const [newUnitData, setNewUnitData] = useState({ room_number: '', status: 'Vacant' as UnitStatus });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [propsRes, unitsRes, tenantsRes] = await Promise.all([
      supabase.from('properties').select('*'),
      supabase.from('units').select('*'),
      supabase.from('tenants').select('*')
    ]);

    if (propsRes.data) setProperties(propsRes.data);
    if (unitsRes.data) setUnits(unitsRes.data);
    if (tenantsRes.data) setTenants(tenantsRes.data);
    setLoading(false);
  };

  const handleUpdateUnit = async (unit: Unit) => {
    const { error } = await supabase
      .from('units')
      .update({
        room_number: unit.room_number,
        status: unit.status,
        current_tenant_id: unit.current_tenant_id || null,
        lease_end_date: unit.lease_end_date || null
      })
      .eq('id', unit.id);

    if (!error) {
      setUnits(prev => prev.map(u => u.id === unit.id ? unit : u));
      setEditingUnit(null);
    }
  };

  const handleAddUnit = async () => {
    if (!addingToPropertyId || !newUnitData.room_number) return;

    const { data, error } = await supabase
      .from('units')
      .insert([{
        property_id: addingToPropertyId,
        room_number: newUnitData.room_number,
        status: newUnitData.status
      }])
      .select();

    if (!error && data) {
      setUnits(prev => [...prev, data[0] as Unit]);
      setAddingToPropertyId(null);
      setNewUnitData({ room_number: '', status: 'Vacant' });
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('Destroy this unit node?')) return;
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (!error) {
      setUnits(prev => prev.filter(u => u.id !== id));
      setEditingUnit(null);
    }
  };

  const filteredUnits = (propertyId: string) => {
    return units
      .filter(u => u.property_id === propertyId)
      .filter(u => {
        if (!searchQuery) return true;
        const tenant = tenants.find(t => t.id === u.current_tenant_id);
        const search = searchQuery.toLowerCase();
        return (
          u.room_number.toLowerCase().includes(search) ||
          u.status.toLowerCase().includes(search) ||
          tenant?.name.toLowerCase().includes(search)
        );
      });
  };

  const activeProperties = properties.filter(p => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const hasMatchingUnit = units.some(u => 
      u.property_id === p.id && 
      (u.room_number.toLowerCase().includes(search) || 
       tenants.find(t => t.id === u.current_tenant_id)?.name.toLowerCase().includes(search))
    );
    return p.name.toLowerCase().includes(search) || p.location.toLowerCase().includes(search) || hasMatchingUnit;
  });

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
      <div className="space-y-10 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
             <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest border border-secondary/20">
                <Leaf className="w-2.5 h-2.5" /> Live Inventory
              </div>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tighter text-foreground text-balance uppercase">Unit <span className="text-primary italic font-light italic">Manifest</span></h1>
            <p className="text-foreground/40 text-sm italic">Synchronized grid of all biological nodes in the network.</p>
          </div>
          
          <div className="flex flex-col gap-4 items-end">
            <div className="flex gap-3 flex-wrap">
              <StatusLegend icon={User} color="bg-red-500" label="Occupied" />
              <StatusLegend icon={Clock} color="bg-amber-500" label="Notice" />
              <StatusLegend icon={AlertCircle} color="bg-slate-400" label="Service" />
              <StatusLegend icon={Info} color="bg-emerald-500" label="Vacant" />
            </div>
            <div className="relative group w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search unit, tenant, property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="soft-ui-in w-full py-3 pl-10 pr-4 text-[10px] font-bold uppercase tracking-widest bg-white/40 border border-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-16">
          {activeProperties.map((property) => (
            <div key={property.id} className="space-y-6">
              <div className="flex flex-wrap items-center justify-between border-b border-white pb-4 gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-1.5 h-8 rounded-full bg-secondary" />
                  <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight uppercase tracking-tighter">{property.name}</h2>
                  <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                    {property.property_type}
                  </span>
                </div>
                <div className="flex items-center gap-4 ml-auto">
                  <span className="text-[9px] md:text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{property.location}</span>
                  <button 
                    onClick={() => {
                        setAddingToPropertyId(property.id);
                        setNewUnitData({ room_number: '', status: 'Vacant' });
                    }}
                    className="soft-button w-8 h-8 border border-white text-secondary hover:bg-secondary hover:text-white transition-all flex items-center justify-center shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {filteredUnits(property.id).map((unit) => (
                    <UnitCard 
                      key={unit.id} 
                      unit={unit} 
                      tenant={tenants.find(t => t.id === unit.current_tenant_id)}
                      onEdit={() => setEditingUnit(unit)}
                    />
                  ))}
                {filteredUnits(property.id).length === 0 && (
                  <div className="col-span-full py-10 text-center">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/20 italic">No matching units found in this sector.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Edit Unit Modal */}
        <AnimatePresence>
          {editingUnit && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setEditingUnit(null)}
                className="absolute inset-0 bg-background/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-background soft-card border border-white w-full max-w-md p-10 shadow-2xl overflow-hidden"
              >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight">Unit Configuration</h2>
                    <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest mt-1">Node: {editingUnit.room_number}</p>
                  </div>
                  <button onClick={() => setEditingUnit(null)} className="soft-button w-8 h-8 border border-white text-foreground/30">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Occupancy Designation</label>
                    <input 
                      type="text" value={editingUnit.room_number}
                      onChange={(e) => setEditingUnit({...editingUnit, room_number: e.target.value})}
                      className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Status Phase</label>
                      <select 
                        value={editingUnit.status}
                        onChange={(e) => setEditingUnit({...editingUnit, status: e.target.value as any})}
                        className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none appearance-none"
                      >
                        <option value="Vacant">Vacant</option>
                        <option value="Occupied">Occupied</option>
                        <option value="Notice Period">Notice Period</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Lease End Date</label>
                      <input 
                        type="date" 
                        value={editingUnit.lease_end_date || ''}
                        onChange={(e) => setEditingUnit({...editingUnit, lease_end_date: e.target.value})}
                        className="soft-ui-in w-full py-4 px-4 text-xs bg-white/60 border border-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Active Proximity (Tenant)</label>
                    <select 
                      value={editingUnit.current_tenant_id || ''}
                      onChange={(e) => setEditingUnit({...editingUnit, current_tenant_id: e.target.value || undefined})}
                      className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none appearance-none"
                    >
                      <option value="">No Tenant Assigned</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button 
                      onClick={() => handleDeleteUnit(editingUnit.id)}
                      className="soft-button px-4 border border-primary text-primary hover:bg-primary hover:text-white transition-all group"
                      title="Decommission Unit"
                    >
                      <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={() => handleUpdateUnit(editingUnit)}
                      className="flex-1 btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" /> Sync Allocation
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Unit Modal */}
        <AnimatePresence>
          {addingToPropertyId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setAddingToPropertyId(null)}
                className="absolute inset-0 bg-background/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-background soft-card border border-white w-full max-w-sm p-10 shadow-2xl overflow-hidden"
              >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight">New Unit Node</h2>
                    <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest mt-1">
                        Adding to: {properties.find(p => p.id === addingToPropertyId)?.name}
                    </p>
                  </div>
                  <button onClick={() => setAddingToPropertyId(null)} className="soft-button w-8 h-8 border border-white text-foreground/30">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Unit / Room Number</label>
                    <input 
                      type="text" autoFocus
                      value={newUnitData.room_number}
                      onChange={(e) => setNewUnitData({...newUnitData, room_number: e.target.value})}
                      className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none"
                      placeholder="e.g. 305B"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Initial Status</label>
                    <select 
                      value={newUnitData.status}
                      onChange={(e) => setNewUnitData({...newUnitData, status: e.target.value as any})}
                      className="soft-ui-in w-full py-4 px-6 text-xs bg-white/60 border border-white outline-none appearance-none"
                    >
                      <option value="Vacant">Vacant</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Occupied">Occupied</option>
                    </select>
                  </div>
                  <button 
                    onClick={handleAddUnit}
                    disabled={!newUnitData.room_number}
                    className="w-full btn-terracotta py-4 text-[11px] font-extrabold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" /> Initialize Unit
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

function StatusLegend({ icon: Icon, color, label }: { icon: any, color: string, label: string }) {
  return (
    <div className="flex items-center gap-2.5 soft-button bg-white/40 border border-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-foreground/60">
      <div className={cn("w-2 h-2 rounded-full shadow-sm", color)}></div>
      {label}
    </div>
  );
}

function UnitCard({ unit, tenant, onEdit }: { unit: Unit, tenant?: Tenant, onEdit: () => void }) {
  const statusColors = {
    'Vacant': 'border-emerald-500/20 text-emerald-600 bg-emerald-500/5',
    'Occupied': 'border-red-500/20 text-red-500 bg-red-500/5',
    'Notice Period': 'border-amber-500/20 text-amber-500 bg-amber-500/5',
    'Maintenance': 'border-slate-300 text-slate-400 bg-slate-50',
  };

  const statusIcons = {
    'Occupied': <User className="w-5 h-5" />,
    'Notice Period': <Clock className="w-5 h-5" />,
    'Maintenance': <AlertCircle className="w-5 h-5" />,
    'Vacant': <Check className="w-5 h-5" />,
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={onEdit}
      className={cn(
        "relative p-6 rounded-[32px] border transition-all duration-500 group overflow-hidden soft-card flex flex-col justify-between aspect-square md:aspect-auto md:min-h-[170px] cursor-pointer",
        statusColors[unit.status]
      )}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Unit</p>
          <h4 className="text-3xl font-bold tracking-tighter">{unit.room_number}</h4>
        </div>
        <div className="w-10 h-10 rounded-xl soft-ui-in flex items-center justify-center border border-current opacity-20 group-hover:opacity-100 transition-opacity">
          {statusIcons[unit.status]}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.2em]">{unit.status}</span>
        </div>
        {tenant && (
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-foreground truncate">{tenant.name}</p>
            {unit.lease_end_date && (
                <p className="text-[8px] font-extrabold uppercase tracking-widest text-foreground/40">Ends: {new Date(unit.lease_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
            )}
          </div>
        )}
        
        {/* Progress bar / health indicator */}
        <div className="h-1.5 w-full soft-ui-in bg-white/50 rounded-full overflow-hidden border border-white/20">
          <div className="h-full w-full bg-current rounded-full shadow-inner opacity-40 group-hover:opacity-60 transition-opacity" />
        </div>
      </div>

      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <Edit2 className="w-3 h-3 text-foreground/20" />
      </div>

      {/* Decorative accent */}
      <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-current opacity-[0.03] rounded-full blur-xl" />
    </motion.div>
  );
}

