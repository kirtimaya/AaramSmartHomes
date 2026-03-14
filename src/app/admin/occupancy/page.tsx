'use client';

import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Unit } from '@/lib/types';
import { mockUnits, mockProperties } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Info, User, AlertCircle, Clock } from 'lucide-react';

export default function OccupancyPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Occupancy Tracker</h1>
          <p className="text-foreground/50 mt-1">Visual grid of all units across the portfolio.</p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <StatusLegend icon={User} color="bg-green-500" label="Occupied" />
          <StatusLegend icon={Clock} color="bg-blue-500" label="Notice Period" />
          <StatusLegend icon={AlertCircle} color="bg-amber-500" label="Maintenance" />
          <StatusLegend icon={Info} color="bg-slate-200 dark:bg-slate-800" label="Vacant" />
        </div>

        <div className="space-y-12">
          {mockProperties.map((property) => (
            <div key={property.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{property.name}</h2>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    {property.property_type}
                  </span>
                </div>
                <span className="text-xs font-semibold text-foreground/40">{property.location}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
    <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-full border border-border text-xs font-medium">
      <div className={cn("w-2.5 h-2.5 rounded-full", color)}></div>
      {label}
    </div>
  );
}

function UnitCard({ unit }: { unit: Unit }) {
  const statusColors = {
    'Occupied': 'border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400',
    'Notice Period': 'border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400',
    'Maintenance': 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400',
    'Vacant': 'border-border bg-slate-50 dark:bg-slate-900/50 text-foreground/40',
  };

  const statusIcons = {
    'Occupied': <User className="w-4 h-4" />,
    'Notice Period': <Clock className="w-4 h-4" />,
    'Maintenance': <AlertCircle className="w-4 h-4" />,
    'Vacant': <Info className="w-4 h-4" />,
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={cn(
        "relative p-6 rounded-2xl border transition-all duration-300 group overflow-hidden",
        statusColors[unit.status as keyof typeof statusColors]
      )}
    >
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Unit</p>
          <h4 className="text-2xl font-bold">{unit.unit_number}</h4>
        </div>
        <div className="p-2 rounded-lg bg-white/10 border border-current opacity-20 group-hover:opacity-100 transition-opacity">
          {statusIcons[unit.status as keyof typeof statusIcons]}
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-tighter">{unit.status}</span>
          {unit.status === 'Occupied' && (
            <button className="text-[10px] font-bold hover:underline">Details</button>
          )}
        </div>
        
        {/* Progress bar / health indicator */}
        <div className="h-1 w-full bg-current/10 rounded-full overflow-hidden">
          <div className="h-full w-full bg-current rounded-full" />
        </div>
      </div>

      {/* Decorative accent */}
      <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-current opacity-5 rounded-full" />
    </motion.div>
  );
}

