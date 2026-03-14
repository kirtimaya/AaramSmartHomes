'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { mockVillas, mockWaterLogs } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { Droplets, AlertTriangle, Info, RefreshCw, Zap } from 'lucide-react';
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
  const [selectedVilla, setSelectedVilla] = useState(mockVillas[0]);
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
      text: 'Water levels are optimal. All standard villa operations can proceed.',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20'
    };
  };

  const recommendation = getRecommendation(currentLevel);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Water Management</h1>
            <p className="text-foreground/50 mt-1">IoT real-time monitoring and analytics.</p>
          </div>
          <button 
            onClick={refreshData}
            className="glass flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            Refresh Sensors
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Visualizer */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass p-8 rounded-[32px] border border-border flex flex-col items-center justify-center relative overflow-hidden h-[400px]">
              {/* Animated Wave Background */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-primary/10 transition-all duration-1000 ease-in-out" 
                style={{ height: `${currentLevel}%` }}
              >
                <div className="absolute top-0 left-0 right-0 h-4 bg-primary/20 opacity-50 block animate-float" />
              </div>

              <div className="relative z-10 text-center flex flex-col items-center">
                <div className="w-24 h-24 rounded-full gold-gradient flex items-center justify-center shadow-2xl mb-6">
                  <Droplets className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-6xl font-bold tracking-tighter">{Math.round(currentLevel)}%</h2>
                <p className="text-foreground/40 font-bold uppercase tracking-widest mt-2">{selectedVilla.name} Tank</p>
                <div className="flex items-center gap-2 mt-4 text-xs font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full">
                  <Zap className="w-3 h-3" />
                  SENSOR STATUS: OK
                </div>
              </div>
            </div>

            {/* Historical Chart */}
            <div className="glass p-8 rounded-[32px] border border-border h-[400px]">
              <h3 className="text-lg font-bold mb-8">Consumption Pattern (24h)</h3>
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c5a059" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#c5a059" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#c5a059' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="level" 
                      stroke="#c5a059" 
                      fillOpacity={1} 
                      fill="url(#colorLevel)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recommendations Side Bar */}
          <div className="space-y-6">
            <div className="glass p-6 rounded-[32px] border border-border">
              <h3 className="font-bold mb-4">Select Property</h3>
              <div className="space-y-2">
                {mockVillas.map(villa => (
                  <button
                    key={villa.id}
                    onClick={() => setSelectedVilla(villa)}
                    className={cn(
                      "w-full p-4 rounded-2xl border text-left transition-all duration-300",
                      selectedVilla.id === villa.id 
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                        : "border-border hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    )}
                  >
                    <p className="font-bold text-sm">{villa.name}</p>
                    <p className={cn("text-[10px]", selectedVilla.id === villa.id ? "text-white/60" : "text-foreground/40")}>{villa.location}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className={cn("p-8 rounded-[32px] border space-y-4", recommendation.bg, recommendation.border)}>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white/10", recommendation.color)}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className={cn("font-bold", recommendation.color)}>Usage Recommendation</h3>
              </div>
              <p className="text-sm font-medium leading-relaxed opacity-80">
                {recommendation.text}
              </p>
              <button className="text-[10px] font-bold uppercase tracking-widest underline decoration-2 underline-offset-4">
                Push Alert to Residents
              </button>
            </div>

            <div className="glass p-8 rounded-[32px] border border-border">
              <h3 className="font-bold mb-4">Hardware Info</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="text-xs text-foreground/40 font-medium">Controller</span>
                  <span className="text-xs font-bold">ESP-32 DevKit V1</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="text-xs text-foreground/40 font-medium">Sensor</span>
                  <span className="text-xs font-bold">HC-SR04 Ultrasonic</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="text-xs text-foreground/40 font-medium">Last Ping</span>
                  <span className="text-xs font-bold">2 mins ago</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-primary font-bold">
                  <Info className="w-3 h-3" />
                  WEBHOOK URL CONFIGURED
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
