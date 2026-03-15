'use client';

import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Unit } from '@/lib/types';
import { mockUnits, mockProperties } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Info, User, AlertCircle, Clock, Leaf } from 'lucide-react';

export default function OccupancyPage() {
  return (
    <AdminLayout>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
             <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest border border-secondary/20">
                <Leaf className="w-2.5 h-2.5" /> Live Inventory
              </div>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tighter text-foreground text-balance">Unit <span className="text-primary italic">Status</span></h1>
            <p className="text-foreground/40 text-sm">Visual grid of all units across the portfolio.</p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <StatusLegend icon={User} color="bg-secondary" label="Occupied" />
            <StatusLegend icon={Clock} color="bg-blue-400" label="Notice" />
            <StatusLegend icon={AlertCircle} color="bg-primary" label="Service" />
            <StatusLegend icon={Info} color="bg-foreground/10" label="Vacant" />
          </div>
        </div>

        <div className="space-y-16">
          {mockProperties.map((property) => (
            <div key={property.id} className="space-y-6">
              <div className="flex items-center justify-between border-b border-white pb-4">
                <div className="flex items-center gap-4">
                   <div className="w-1.5 h-8 rounded-full bg-secondary" />
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">{property.name}</h2>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                    {property.property_type}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{property.location}</span>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                {mockUnits
                  .filter((unit) => unit.property_id === property.id)
                  .map((unit) => (
                    <UnitCard key={unit.id} unit={unit} />
                  ))}
              </div>
            </div>
          ))}
        </div>
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

function UnitCard({ unit }: { unit: Unit }) {
  const statusColors = {
    'Occupied': 'border-white text-secondary bg-white/40',
    'Notice Period': 'border-white text-blue-500 bg-white/40',
    'Maintenance': 'border-white text-primary bg-white/40',
    'Vacant': 'border-white text-foreground/20 bg-white/20',
  };

  const statusIcons = {
    'Occupied': <User className="w-5 h-5" />,
    'Notice Period': <Clock className="w-5 h-5" />,
    'Maintenance': <AlertCircle className="w-5 h-5" />,
    'Vacant': <Info className="w-5 h-5" />,
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn(
        "relative p-6 rounded-[32px] border transition-all duration-500 group overflow-hidden soft-card flex flex-col justify-between aspect-square md:aspect-auto md:min-h-[160px]",
        statusColors[unit.status as keyof typeof statusColors]
      )}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Unit</p>
          <h4 className="text-3xl font-bold tracking-tighter">{unit.unit_number}</h4>
        </div>
        <div className="w-10 h-10 rounded-xl soft-ui-in flex items-center justify-center border border-current opacity-20 group-hover:opacity-100 transition-opacity">
          {statusIcons[unit.status as keyof typeof statusIcons]}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.2em]">{unit.status}</span>
        </div>
        
        {/* Progress bar / health indicator */}
        <div className="h-1.5 w-full soft-ui-in bg-white/50 rounded-full overflow-hidden border border-white/20">
          <div className="h-full w-full bg-current rounded-full shadow-inner opacity-60" />
        </div>
      </div>

      {/* Decorative accent */}
      <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-current opacity-[0.03] rounded-full blur-xl" />
    </motion.div>
  );
}

