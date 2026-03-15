'use client';

import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { mockTenants, mockProperties, mockUnits } from '@/lib/mockData';
import { 
  Calendar as CalendarIcon, 
  UserMinus, 
  MapPin, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  ClipboardCheck,
  Truck,
  Key,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function MoveOutsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const moveOutTenants = mockTenants.filter(t => t.move_out_date || t.status === 'notice');

  return (
    <AdminLayout>
      <div className="space-y-10 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">Transition management</h1>
            <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-[0.2em]">Tenant Move-Outs & Unit Prep</p>
          </div>
          
          <div className="flex items-center gap-4 soft-well p-1.5 border border-white bg-white/40">
            <button className="soft-button w-10 h-10 border border-white"><ChevronLeft className="w-4 h-4" /></button>
            <div className="px-6 text-xs font-extrabold uppercase tracking-[0.2em] text-foreground">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            <button className="soft-button w-10 h-10 border border-white"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Dashboard Metrics for Move-outs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <SummaryCard 
            icon={UserMinus} 
            label="Pending Vacancies" 
            value={moveOutTenants.length.toString()} 
            sub="Next 30 Days"
          />
          <SummaryCard 
            icon={ClipboardCheck} 
            label="Inspections Due" 
            value="3" 
            sub="Action Required"
          />
          <SummaryCard 
            icon={Key} 
            label="Key handovers" 
            value="2" 
            sub="Scheduled this week"
          />
        </div>

        {/* Move-Out List */}
        <div className="space-y-6">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-foreground/40 px-2 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Upcoming Transitions
          </h2>
          
          <div className="grid grid-cols-1 gap-6">
            {moveOutTenants.map((tenant, idx) => {
              const unit = mockUnits.find(u => u.current_tenant_id === tenant.id);
              const property = mockProperties.find(p => p.id === unit?.property_id);
              
              return (
                <motion.div
                  key={tenant.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="soft-card p-0 overflow-hidden border border-white flex flex-col lg:flex-row"
                >
                  {/* Date Badge */}
                  <div className="bg-primary/5 p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/40 min-w-[160px]">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary/60">Departure</span>
                    <span className="text-4xl font-bold tracking-tighter text-primary">
                      {tenant.move_out_date ? new Date(tenant.move_out_date).getDate() : '--'}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary/60">
                      {tenant.move_out_date ? new Date(tenant.move_out_date).toLocaleString('default', { month: 'short' }) : 'N/A'}
                    </span>
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-3">
                         <div className="w-12 h-12 rounded-2xl bg-white soft-ui-out border border-white flex items-center justify-center text-foreground/60 font-bold shadow-sm">
                            {tenant.name.split(' ').map(n => n[0]).join('')}
                         </div>
                         <div>
                            <h3 className="text-xl font-bold text-foreground leading-tight">{tenant.name}</h3>
                            <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-widest leading-none mt-1">
                               Tenant ID: #{tenant.id.slice(1, 4).toUpperCase()}
                            </p>
                         </div>
                      </div>
                      <div className="flex flex-col gap-2">
                         <div className="flex items-center justify-center md:justify-start gap-2 text-[11px] font-bold text-foreground/50">
                            <Home className="w-3.5 h-3.5 text-primary" /> {property?.name} • Room {unit?.room_number}
                         </div>
                         <div className="flex items-center justify-center md:justify-start gap-2 text-[11px] font-bold text-foreground/50">
                            <MapPin className="w-3.5 h-3.5 text-primary" /> {property?.location}
                         </div>
                      </div>
                    </div>

                    {/* Progress / Steps */}
                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">
                        <span>Preparation Status</span>
                        <span className="text-secondary">75% Complete</span>
                      </div>
                      <div className="h-2 w-full bg-white rounded-full soft-ui-in shadow-inner overflow-hidden">
                        <div className="h-full bg-secondary w-3/4 shadow-sm" />
                      </div>
                      <div className="flex justify-center md:justify-start gap-4">
                        <StatusIcon icon={ClipboardCheck} active label="Inspect" />
                        <StatusIcon icon={Truck} active label="Move" />
                        <StatusIcon icon={Key} label="Return" />
                      </div>
                    </div>
                  </div>

                  {/* Sidebar/Actions */}
                  <div className="p-8 bg-white/20 border-t lg:border-t-0 lg:border-l border-white/40 flex flex-row lg:flex-col justify-center gap-4">
                    <button className="soft-button flex-1 py-3 px-6 text-[11px] font-extrabold uppercase tracking-widest border border-white hover:btn-terracotta transition-all whitespace-nowrap">
                      Contact
                    </button>
                    <button className="soft-button flex-1 py-3 px-6 text-[11px] font-extrabold uppercase tracking-widest border border-white bg-white/60 hover:shadow-lg transition-all whitespace-nowrap">
                      Log Details
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, sub }: any) {
  return (
    <div className="soft-card p-6 border border-white space-y-4 bg-white/40">
      <div className="flex justify-between items-start">
        <div className="w-12 h-12 rounded-2xl bg-white soft-ui-out border border-white flex items-center justify-center shadow-lg shadow-black/5">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-foreground/30">{label}</p>
          <h4 className="text-3xl font-bold tracking-tighter text-foreground">{value}</h4>
        </div>
      </div>
      <div className="pt-2 border-t border-white/40">
        <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest">{sub}</p>
      </div>
    </div>
  );
}

function StatusIcon({ icon: Icon, active, label }: { icon: any, active?: boolean, label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 opacity-80">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center border",
        active 
          ? "bg-secondary text-white border-secondary shadow-md scale-110" 
          : "bg-white text-foreground/20 border-white soft-ui-out"
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <span className={cn(
        "text-[8px] font-extrabold uppercase tracking-widest",
        active ? "text-secondary" : "text-foreground/20"
      )}>{label}</span>
    </div>
  );
}
