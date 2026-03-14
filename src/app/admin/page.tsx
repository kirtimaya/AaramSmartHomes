'use client';

import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { 
  Users, 
  TrendingUp, 
  ClipboardList, 
  Droplets,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import { Unit, Property, Tenant, Ticket, WaterLog } from '@/lib/types';
import { mockUnits, mockProperties, mockTickets, mockWaterLogs } from '@/lib/mockData';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const totalUnits = mockUnits.length;
  const occupiedUnits = mockUnits.filter(u => u.status === 'Occupied' || u.status === 'Notice Period').length;
  const occupancyRate = Math.round((occupiedUnits / totalUnits) * 100);
  const activeTickets = mockTickets.filter(t => t.status !== 'Resolved').length;

  const stats = [
    { label: 'Portfolio Occupancy', value: `${occupancyRate}%`, icon: Users, trend: '+5%', color: 'blue' },
    { label: 'Monthly Revenue', value: '₹4,25,000', icon: TrendingUp, trend: '+12%', color: 'green' },
    { label: 'Open Tickets', value: activeTickets, icon: ClipboardList, trend: '-2', color: 'amber' },
    { label: 'Avg. Water Level', value: '47%', icon: Droplets, trend: 'Watch', color: 'cyan' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Overview</h1>
            <p className="text-foreground/50 mt-1">Real-time status of all properties.</p>
          </div>
          <button className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 group shadow-lg shadow-primary/20">
            Generate Report
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass p-6 rounded-2xl border border-border flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center border",
                  stat.color === 'blue' && "bg-blue-500/10 border-blue-500/20 text-blue-500",
                  stat.color === 'green' && "bg-green-500/10 border-green-500/20 text-green-500",
                  stat.color === 'amber' && "bg-amber-500/10 border-amber-500/20 text-amber-500",
                  stat.color === 'cyan' && "bg-cyan-500/10 border-cyan-500/20 text-cyan-500"
                )}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <span className={cn(
                  "text-xs font-bold px-2 py-1 rounded-full",
                  stat.trend.startsWith('+') ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                )}>
                  {stat.trend}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-foreground/40 text-sm font-medium">{stat.label}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Middle Section: Occupancy Grid & Water Levels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Tickets Table */}
          <div className="lg:col-span-2 glass rounded-3xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">Centralized Ticketing</h3>
              <button className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-foreground/40 text-[10px] uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold">Category</th>
                    <th className="px-6 py-4 font-bold">Priority</th>
                    <th className="px-6 py-4 font-bold">Resident</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mockTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">{ticket.category}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold",
                          ticket.priority === 'High' ? "bg-red-100 text-red-600 dark:bg-red-500/10" : "bg-blue-100 text-blue-600 dark:bg-blue-500/10"
                        )}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground/60">Tenant #{ticket.tenant_id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            ticket.status === 'Pending' ? "bg-amber-500" : "bg-blue-500"
                          )}></div>
                          {ticket.status}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-xs font-bold text-primary hover:opacity-80 transition-opacity underline">Assign</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Water Levels Card */}
          <div className="glass rounded-3xl border border-border p-6 flex flex-col">
            <h3 className="font-bold text-lg mb-6">Property Water Levels</h3>
            <div className="space-y-8 flex-1">
              {mockWaterLogs.map((log) => {
                const property = mockProperties.find(p => p.id === log.villa_id);
                return (
                  <div key={log.id} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="font-bold text-sm">{property?.name}</p>
                        <p className="text-[10px] text-foreground/40">{property?.property_type} • {property?.location}</p>
                      </div>
                      <p className={cn(
                        "font-bold text-lg",
                        log.level_percentage < 30 ? "text-red-500" : "text-primary"
                      )}>
                        {log.level_percentage}%
                      </p>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${log.level_percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full",
                          log.level_percentage < 30 ? "bg-red-500" : "bg-primary"
                        )}
                      />
                    </div>
                    {log.level_percentage < 30 && (
                      <div className="bg-red-500/10 text-red-600 text-[10px] font-bold p-2 rounded-lg border border-red-500/20 animate-pulse">
                        CRITICAL: Low water level reported.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-medium text-foreground/60 leading-relaxed">
                <span className="text-primary font-bold">AI Insight:</span> Villa Azure consumption is 12% higher than average this week. Recommend leak inspection.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
