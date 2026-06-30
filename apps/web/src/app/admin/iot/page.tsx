'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { mockProperties, mockWaterLogs } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { Droplets, AlertTriangle, Info, RefreshCw, Zap, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Data for historical usage chart
const chartData = [
  { time: '00:00', level: 90 },
  { time: '04:00', level: 85 },
  { time: '08:00', level: 60 },
  { time: '12:00', level: 45 },
  { time: '16:00', level: 30 },
  { time: '20:00', level: 75 },
  { time: '23:59', level: 88 },
];

export default function WaterManagementPage() {
  const [selectedProperty, setSelectedProperty] = useState(mockProperties[0]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(85);

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      // Simulate level change
      setCurrentLevel(prev => Math.max(0, Math.min(100, prev + (Math.random() * 10 - 5))));
    }, 1500);
  };

  const getRecommendation = (level: number) => {
    if (level < 20) return {
      status: 'Critical',
      text: 'Water levels extremely low. Please avoid heavy laundry and pressure washing today.',
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20'
    };
    if (level < 50) return {
      status: 'Warning',
      text: 'Water levels below 50%. Recommend limiting swimming pool refills till next tank fill.',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    };
    return {
      status: 'Normal',
      text: 'Water levels are optimal. All standard property operations can proceed.',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20'
    };
  };

  const recommendation = getRecommendation(currentLevel);

  return (
    <AdminLayout>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-1">
             <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest border border-secondary/20">
                <Leaf className="w-2.5 h-2.5" /> Edge Telemetry
              </div>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tighter text-foreground">Aaram <span className="text-primary italic">Analytics</span></h1>
            <p className="text-foreground/40 text-sm font-medium">IoT real-time monitoring and resource analytics.</p>
          </div>
          <button 
            onClick={refreshData}
            className="soft-button flex items-center gap-2 px-5 py-3 border border-white text-[10px] font-extrabold uppercase tracking-widest hover:bg-white/60 transition-all shadow-sm"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            Sync Hardware
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Visualizer */}
          <div className="lg:col-span-8 space-y-8">
            <div className="soft-card p-10 border border-white flex flex-col items-center justify-center relative overflow-hidden h-[420px] bg-white/30">
              {/* Animated Wave Background - Refined */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-primary/5 transition-all duration-1000 ease-in-out border-t border-white/50" 
                style={{ height: `${currentLevel}%` }}
              >
                <div className="absolute top-0 left-0 right-0 h-4 bg-white/20 opacity-40 blur-sm block animate-pulse" />
              </div>

              <div className="relative z-10 text-center flex flex-col items-center">
                <div className="w-28 h-28 rounded-[40px] soft-ui-out flex items-center justify-center mb-8 border border-white shadow-xl bg-white/50">
                  <Droplets className="w-14 h-14 text-primary" />
                </div>
                <h2 className="text-7xl font-bold tracking-tighter text-foreground">{Math.round(currentLevel)}%</h2>
                <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-[0.3em] mt-4">{selectedProperty.name} Storage</p>
                <div className="flex items-center gap-2 mt-6 text-[9px] font-extrabold text-secondary bg-secondary/10 px-4 py-1.5 rounded-full border border-secondary/20 uppercase tracking-widest">
                  <Zap className="w-3 h-3" />
                  Signal Strength: Optimal
                </div>
              </div>
            </div>

            {/* Historical Chart - Softened */}
            <div className="soft-card p-10 border border-white h-[420px] bg-white/30">
               <div className="space-y-1 mb-10">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
                     <div className="w-1.5 h-6 rounded-full bg-primary" />
                     Drift Analysis
                  </h3>
                  <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">24-Hour Consumption Pulse</p>
               </div>
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D67D61" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#D67D61" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: 'rgba(61,61,61,0.3)', fontWeight: 'bold' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: 'rgba(61,61,61,0.3)', fontWeight: 'bold' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FDFBF7', border: '1px solid #FFFFFF', borderRadius: '16px', boxShadow: '10px 10px 20px #E3E1DE' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="level" 
                      stroke="#D67D61" 
                      fillOpacity={1} 
                      fill="url(#colorLevel)" 
                      strokeWidth={4}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Side Bar - Denser */}
          <div className="lg:col-span-4 space-y-8">
            <div className="soft-card p-6 border border-white bg-white/40">
               <div className="space-y-1 mb-6">
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-tight">Active Nodes</h3>
                  <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Switch Property</p>
               </div>
              <div className="space-y-2">
                {mockProperties.map(property => (
                  <button
                    key={property.id}
                    onClick={() => setSelectedProperty(property)}
                    className={cn(
                      "w-full p-4 rounded-2xl border transition-all duration-300",
                      selectedProperty.id === property.id 
                        ? "btn-terracotta shadow-md scale-[1.02]" 
                        : "border-white bg-white/20 hover:bg-white/60 text-foreground/40"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-left">
                        <p className="font-bold text-xs uppercase tracking-tight">{property.name}</p>
                        <p className={cn("text-[8px] font-bold uppercase tracking-widest mt-0.5", selectedProperty.id === property.id ? "text-white/60" : "text-foreground/20")}>{property.location}</p>
                      </div>
                      <span className={cn(
                        "text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                        selectedProperty.id === property.id ? "bg-white/10 border-white/20 text-white" : "bg-primary/5 border-primary/10 text-primary"
                      )}>
                        {property.property_type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={cn("p-8 rounded-[40px] border space-y-5 soft-card", recommendation.bg.replace('bg-', 'bg-').replace('/10', '/5'), recommendation.border)}>
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl soft-ui-in flex items-center justify-center bg-white/50 shadow-inner", recommendation.color)}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                   <h3 className={cn("font-bold text-sm uppercase tracking-tight", recommendation.color)}>{recommendation.status} Alert</h3>
                   <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Protocol Required</p>
                </div>
              </div>
              <p className="text-xs font-bold leading-relaxed text-foreground/60 italic">
                "{recommendation.text}"
              </p>
              <button className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary border-b-2 border-primary/20 hover:border-primary transition-all pb-1 w-fit">
                Broadcast to Nodes
              </button>
            </div>

            <div className="soft-card p-8 border border-white bg-white/30">
               <div className="space-y-1 mb-8">
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-tight">Node Topology</h3>
                  <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Hardware Meta</p>
               </div>
              <div className="space-y-5">
                {[
                  { label: 'Controller', val: 'ESP-32 Cluster' },
                  { label: 'Transducer', val: 'Ultrasonic Array' },
                  { label: 'Packet Latency', val: '12ms (Sync)' },
                ].map((item, i) => (
                   <div key={i} className="flex justify-between items-center pb-4 border-b border-white/50 last:border-0 last:pb-0">
                     <span className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest">{item.label}</span>
                     <span className="text-[11px] font-bold text-foreground tracking-tight">{item.val}</span>
                   </div>
                ))}
                <div className="flex items-center gap-2 text-[9px] text-secondary font-extrabold uppercase tracking-widest bg-secondary/5 p-3 rounded-xl border border-secondary/10">
                  <Info className="w-3.5 h-3.5" />
                  Security: Encrypted P2P
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
