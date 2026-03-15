'use client';

import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { 
  Users, 
  TrendingUp, 
  ClipboardList, 
  Droplets,
  ArrowUpRight,
  ChevronRight,
  Leaf
} from 'lucide-react';
import { Unit, Property, Tenant, Ticket, WaterLog } from '@/lib/types';
import { mockUnits, mockProperties, mockTickets, mockWaterLogs } from '@/lib/mockData';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const totalRooms = mockUnits.length;
  const occupiedRooms = mockUnits.filter(u => u.status === 'Occupied' || u.status === 'Notice Period').length;
  const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);
  const activeTickets = mockTickets.filter(t => t.status !== 'Resolved').length;

  const stats = [
    { label: 'Portfolio Occupancy', value: `${occupancyRate}%`, icon: Users, trend: '+5%', color: 'blue' },
    { label: 'Monthly Revenue', value: '₹4,25,000', icon: TrendingUp, trend: '+12%', color: 'green' },
    { label: 'Open Tickets', value: activeTickets, icon: ClipboardList, trend: '-2', color: 'amber' },
    { label: 'Avg. Water Level', value: '47%', icon: Droplets, trend: 'Watch', color: 'cyan' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-10">
        {/* Header Section - Tighter */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
             <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest border border-secondary/20">
                <Leaf className="w-2.5 h-2.5" /> High-Density View
              </div>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tighter text-foreground">Aaram <span className="text-primary italic">Portfolio</span></h1>
            <p className="text-foreground/40 text-sm">Real-time status of all managed properties.</p>
          </div>
          <button className="btn-terracotta px-6 py-3 text-xs font-bold hover:translate-y-[-1px] transition-all flex items-center gap-2 group shadow-lg">
            Generate Insights
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

        {/* Stats Grid - Denser */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="soft-card p-6 border border-white flex flex-col justify-between hover:scale-[1.01] transition-transform"
            >
              <div className="flex justify-between items-start">
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shadow-inner bg-white/50",
                  stat.color === 'blue' && "text-blue-500",
                  stat.color === 'green' && "text-secondary",
                  stat.color === 'amber' && "text-primary",
                  stat.color === 'cyan' && "text-cyan-500"
                )}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  "text-[10px] font-extrabold px-2 py-0.5 rounded-lg border border-white",
                  stat.trend.startsWith('+') ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                )}>
                  {stat.trend}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.15em]">{stat.label}</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground tracking-tight">{stat.value}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Middle Section - Tighter Gaps */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Recent Tickets - Higher Density */}
          <div className="lg:col-span-8 soft-card border border-white overflow-hidden bg-white/30">
            <div className="p-6 border-b border-white flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full bg-primary" />
                  <h3 className="font-bold text-lg text-foreground">Resident Support</h3>
               </div>
              <Link href="/admin/tickets" className="text-primary text-[10px] font-extrabold uppercase tracking-widest hover:translate-x-1 transition-transform flex items-center gap-1">
                Full Inbox <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/40 text-foreground/30 text-[9px] uppercase tracking-[0.2em]">
                    <th className="px-6 py-4 font-extrabold">Domain</th>
                    <th className="px-6 py-4 font-extrabold">Urgency</th>
                    <th className="px-6 py-4 font-extrabold">Resident</th>
                    <th className="px-6 py-4 font-extrabold">State</th>
                    <th className="px-6 py-4 font-extrabold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40 text-xs">
                  {mockTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-white/40 transition-colors group">
                      <td className="px-6 py-5 font-bold text-foreground">{ticket.category}</td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest border border-white",
                          ticket.priority === 'High' ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                        )}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-foreground/50 font-medium">#TRS-{ticket.tenant_id}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 font-bold text-foreground/60 uppercase text-[9px] tracking-widest">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full shadow-sm",
                            ticket.status === 'Pending' ? "bg-amber-400" : "bg-secondary"
                          )}></div>
                          {ticket.status}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <button className="text-[10px] font-extrabold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest group-hover:underline">Engage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Water Levels Card - Modular Dashboard Look */}
          <div className="lg:col-span-4 soft-card border border-white p-6 flex flex-col bg-white/30">
            <div className="space-y-1 mb-8">
               <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full bg-secondary" />
                  Smart Resources
               </h3>
               <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Real-time Telemetry</p>
            </div>
            
            <div className="space-y-8 flex-1">
              {mockWaterLogs.map((log) => {
                const property = mockProperties.find(p => p.id === log.villa_id);
                return (
                  <div key={log.id} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="font-bold text-xs text-foreground uppercase tracking-tight">{property?.name}</p>
                        <p className="text-[9px] text-foreground/40 font-bold uppercase tracking-widest mt-0.5">{property?.location}</p>
                      </div>
                      <p className={cn(
                        "font-bold text-lg tracking-tighter",
                        log.level_percentage < 30 ? "text-primary" : "text-secondary"
                      )}>
                        {log.level_percentage}%
                      </p>
                    </div>
                    <div className="h-2 w-full soft-ui-in bg-white/50 rounded-full overflow-hidden border border-white/20">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${log.level_percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full shadow-inner transition-colors duration-1000",
                          log.level_percentage < 30 ? "bg-primary" : "bg-secondary"
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-secondary/5 border border-secondary/10">
              <p className="text-[11px] font-bold text-foreground/60 leading-relaxed italic">
                <span className="text-secondary uppercase tracking-widest mr-1">Insight:</span> Consumption is 12% higher than average. Recommend leak check.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
