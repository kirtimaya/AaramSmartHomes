'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  Users, TrendingUp, ClipboardList, Droplets,
  ArrowUpRight, ChevronRight, Leaf, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAaraCommands } from '@/hooks/useAaraCommands';

type Ticket = {
  id: string;
  category: string;
  priority: string;
  status: string;
  requester_id: string;
  created_at: string;
};

type WaterLog = {
  id: string;
  property_id: string;
  level_percentage: number;
  timestamp: string;
};

type DashboardData = {
  properties: { id: string; name: string; location: string }[];
  rooms: { id: string; property_id: string; occupancy_status: string }[];
  tickets: Ticket[];
  waterLogs: WaterLog[];
  tenantMap: Record<string, string>;
  monthlyRevenue: number;
  noticeTenants: number;
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({
    properties: [], rooms: [], tickets: [], waterLogs: [],
    tenantMap: {}, monthlyRevenue: 0, noticeTenants: 0,
  });
  const [loading, setLoading] = useState(true);

  useAaraCommands({
    SHOW_METRIC: (payload) => {
      const label = (payload as { label?: string }).label ?? '';
      const el = document.getElementById(`stat-${label.toLowerCase().replace(/\s+/g, '-')}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  });

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);

    const [propsRes, roomsRes, ticketsRes, waterRes, revenueRes] = await Promise.all([
      supabase.from('properties').select('id, name, location'),
      supabase.from('rooms').select('id, property_id, occupancy_status'),
      supabase.from('tickets')
        .select('id, category, priority, status, requester_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('water_logs')
        .select('id, property_id, level_percentage, timestamp')
        .order('timestamp', { ascending: false }),
      supabase.from('income_records')
        .select('amount')
        .eq('income_type', 'rent')
        .gte('income_date', monthStart)
        .lt('income_date', monthEnd),
    ]);

    // Tenant names for tickets
    const ids = [...new Set((ticketsRes.data ?? []).map(t => t.requester_id))].filter(Boolean);
    const { data: tNames } = ids.length
      ? await supabase.from('tenants').select('id, name').in('id', ids)
      : { data: [] };

    // Latest water log per property (already sorted desc by timestamp)
    const seen = new Set<string>();
    const latestLogs = (waterRes.data ?? []).filter(l => {
      if (seen.has(l.property_id)) return false;
      seen.add(l.property_id);
      return true;
    });

    // Count tenants on notice
    const { count: noticeCount } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'notice');

    const totalRevenue = (revenueRes.data ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);

    setData({
      properties:      propsRes.data ?? [],
      rooms:           (roomsRes.data ?? []) as { id: string; property_id: string; occupancy_status: string }[],
      tickets:         ticketsRes.data ?? [],
      waterLogs:       latestLogs,
      tenantMap:       Object.fromEntries((tNames ?? []).map(t => [t.id, t.name])),
      monthlyRevenue:  totalRevenue,
      noticeTenants:   noticeCount ?? 0,
    });
    setLoading(false);
  };

  const totalRooms     = data.rooms.length;
  const occupiedRooms  = data.rooms.filter(r => r.occupancy_status === 'Occupied' || r.occupancy_status === 'Notice Period').length;
  const occupancyRate  = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const openTickets    = data.tickets.filter(t => t.status !== 'Resolved').length;
  const avgWater       = data.waterLogs.length
    ? Math.round(data.waterLogs.reduce((s, l) => s + l.level_percentage, 0) / data.waterLogs.length)
    : 0;

  const fmtRevenue = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(2)}L`
      : n >= 1000
      ? `₹${(n / 1000).toFixed(0)}K`
      : `₹${n}`;

  const stats = [
    { label: 'Portfolio Occupancy', value: `${occupancyRate}%`, icon: Users,        trend: `${data.noticeTenants} on notice`, color: 'blue',  href: '/admin/occupancy' },
    { label: 'Monthly Revenue',     value: data.monthlyRevenue > 0 ? fmtRevenue(data.monthlyRevenue) : '—', icon: TrendingUp,  trend: 'Rent',  color: 'green', href: '/admin/financials' },
    { label: 'Open Tickets',        value: String(openTickets),                      icon: ClipboardList, trend: `${data.tickets.length} total`, color: 'amber', href: '/admin/tickets' },
    { label: 'Avg. Water Level',    value: `${avgWater}%`,                           icon: Droplets,      trend: avgWater < 30 ? 'Low — check' : 'Stable', color: 'cyan',  href: '/admin/iot' },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest border border-secondary/20">
              <Leaf className="w-2.5 h-2.5" /> Live Dashboard
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tighter text-foreground">
              Aaram <span className="text-primary italic">Portfolio</span>
            </h1>
            <p className="text-foreground/40 text-sm">Real-time status across all managed properties.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/properties/manage"
              className="soft-button px-6 py-3 text-xs font-bold border border-white hover:bg-white/40 transition-all uppercase tracking-widest">
              Manage Portfolio
            </Link>
            <Link href="/admin/financials"
              className="btn-terracotta px-6 py-3 text-xs font-bold hover:translate-y-[-1px] transition-all flex items-center gap-2 group shadow-lg uppercase tracking-widest">
              Financials
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <Link key={stat.label} href={stat.href}>
              <motion.div
                id={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="soft-card p-6 border border-white flex flex-col justify-between hover:scale-[1.02] hover:shadow-xl transition-all h-full group relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center shadow-inner bg-white/50',
                    stat.color === 'blue'  && 'text-blue-500',
                    stat.color === 'green' && 'text-secondary',
                    stat.color === 'amber' && 'text-primary',
                    stat.color === 'cyan'  && 'text-cyan-500',
                  )}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    'text-[10px] font-extrabold px-2 py-0.5 rounded-lg border border-white',
                    stat.trend.startsWith('+') || stat.trend === 'Stable'
                      ? 'bg-secondary/10 text-secondary'
                      : 'bg-primary/10 text-primary',
                  )}>
                    {stat.trend}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.15em]">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground tracking-tight">{stat.value}</h3>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Middle Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Tickets Table */}
          <div className="lg:col-span-8 soft-card border border-white overflow-hidden bg-white/30">
            <div className="p-6 border-b border-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full bg-primary" />
                <h3 className="font-bold text-lg text-foreground">Resident Support</h3>
              </div>
              <Link href="/admin/tickets"
                className="text-primary text-[10px] font-extrabold uppercase tracking-widest hover:translate-x-1 transition-transform flex items-center gap-1">
                Full Inbox <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {data.tickets.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-widest">No open tickets</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/40 text-foreground/30 text-[9px] uppercase tracking-[0.2em]">
                      <th className="px-6 py-4 font-extrabold">Category</th>
                      <th className="px-6 py-4 font-extrabold">Priority</th>
                      <th className="px-6 py-4 font-extrabold">Resident</th>
                      <th className="px-6 py-4 font-extrabold">Status</th>
                      <th className="px-6 py-4 font-extrabold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/40 text-xs">
                    {data.tickets.map(ticket => (
                      <tr key={ticket.id} className="hover:bg-white/40 transition-colors group">
                        <td className="px-6 py-5 font-bold text-foreground">{ticket.category}</td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            'px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest border border-white',
                            ticket.priority === 'High' || ticket.priority === 'Urgent'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-secondary/10 text-secondary',
                          )}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-foreground/50 font-medium">
                          {data.tenantMap[ticket.requester_id]
                            ?? ticket.requester_id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 font-bold text-foreground/60 uppercase text-[9px] tracking-widest">
                            <div className={cn(
                              'w-1.5 h-1.5 rounded-full shadow-sm',
                              ticket.status === 'Pending'     ? 'bg-amber-400'
                              : ticket.status === 'In-Progress' ? 'bg-blue-400'
                              : 'bg-secondary',
                            )} />
                            {ticket.status}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <Link href="/admin/tickets"
                            className="text-[10px] font-extrabold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest group-hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Water Levels */}
          <div className="lg:col-span-4 soft-card border border-white p-6 flex flex-col bg-white/30">
            <div className="space-y-1 mb-8">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full bg-secondary" />
                Smart Resources
              </h3>
              <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Water Telemetry</p>
            </div>

            {data.waterLogs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[11px] font-bold text-foreground/20 uppercase tracking-widest">No sensor data</p>
              </div>
            ) : (
              <div className="space-y-8 flex-1">
                {data.waterLogs.map(log => {
                  const property = data.properties.find(p => p.id === log.property_id);
                  return (
                    <div key={log.id} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="font-bold text-xs text-foreground uppercase tracking-tight">{property?.name ?? 'Property'}</p>
                          <p className="text-[9px] text-foreground/40 font-bold uppercase tracking-widest mt-0.5">{property?.location ?? ''}</p>
                        </div>
                        <p className={cn(
                          'font-bold text-lg tracking-tighter',
                          log.level_percentage < 30 ? 'text-primary' : 'text-secondary',
                        )}>
                          {log.level_percentage}%
                        </p>
                      </div>
                      <div className="h-2 w-full soft-ui-in bg-white/50 rounded-full overflow-hidden border border-white/20">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${log.level_percentage}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={cn(
                            'h-full rounded-full shadow-inner',
                            log.level_percentage < 30 ? 'bg-primary' : 'bg-secondary',
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 p-4 rounded-2xl bg-secondary/5 border border-secondary/10">
              <p className="text-[11px] font-bold text-foreground/60 leading-relaxed italic">
                <span className="text-secondary uppercase tracking-widest mr-1">Insight:</span>
                {avgWater < 30
                  ? 'Water levels are critically low. Arrange refill immediately.'
                  : avgWater < 50
                  ? 'Water levels are moderate. Monitor closely.'
                  : 'Water levels are healthy across all properties.'}
              </p>
            </div>
          </div>
        </div>

        {/* Property Overview Strip */}
        {data.properties.length > 0 && (
          <div className="soft-card border border-white overflow-hidden bg-white/30">
            <div className="p-6 border-b border-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full bg-secondary" />
                <h3 className="font-bold text-lg text-foreground">Properties at a Glance</h3>
              </div>
              <Link href="/admin/occupancy"
                className="text-primary text-[10px] font-extrabold uppercase tracking-widest hover:translate-x-1 transition-transform flex items-center gap-1">
                Full Occupancy <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/40">
              {data.properties.map(prop => {
                const propRooms = data.rooms.filter(r => r.property_id === prop.id);
                const occupied  = propRooms.filter(r => r.occupancy_status === 'Occupied').length;
                const notice    = propRooms.filter(r => r.occupancy_status === 'Notice Period').length;
                const vacant    = propRooms.filter(r => r.occupancy_status === 'Vacant').length;
                const rate      = propRooms.length ? Math.round(((occupied + notice) / propRooms.length) * 100) : 0;
                return (
                  <div key={prop.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/40 transition-colors">
                    <div>
                      <p className="font-bold text-sm text-foreground">{prop.name}</p>
                      <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{prop.location}</p>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-bold">
                      <span className="text-secondary">{occupied} Occupied</span>
                      {notice > 0 && <span className="text-amber-500">{notice} Notice</span>}
                      <span className="text-foreground/30">{vacant} Vacant</span>
                      <div className="w-24 h-1.5 rounded-full bg-white/60 overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="text-foreground/50 w-8 text-right">{rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
