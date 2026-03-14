'use client';

import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { cn } from '@/lib/utils';
import { 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Activity,
  Download,
  Filter,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const financialData = [
  { month: 'Jan', revenue: 380000, expenses: 120000 },
  { month: 'Feb', revenue: 410000, expenses: 115000 },
  { month: 'Mar', revenue: 425000, expenses: 130000 },
  { month: 'Apr', revenue: 450000, expenses: 140000 },
  { month: 'May', revenue: 440000, expenses: 135000 },
  { month: 'Jun', revenue: 480000, expenses: 150000 },
];

const villaROI = [
  { name: 'Villa Serenity', roi: 12.4, color: '#c5a059' },
  { name: 'Villa Azure', roi: 15.8, color: '#3b82f6' },
  { name: 'Villa Orenda', roi: 9.2, color: '#10b981' },
];

export default function FinancialHub() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Hub</h1>
            <p className="text-foreground/50 mt-1">Track rent, expenses, and investment returns.</p>
          </div>
          <div className="flex gap-4">
            <button className="glass flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Download className="w-4 h-4" />
              Statement
            </button>
            <button className="bg-primary text-white flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
              <IndianRupee className="w-4 h-4" />
              Collect Rent
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FinanceCard 
            title="Net Profit (Q1)" 
            amount="₹8,95,000" 
            trend="+8.2%" 
            isPositive={true} 
            icon={Wallet} 
          />
          <FinanceCard 
            title="Operating Expenses" 
            amount="₹3,65,000" 
            trend="+12%" 
            isPositive={false} 
            icon={Activity} 
          />
          <FinanceCard 
            title="Projected ROI" 
            amount="12.4%" 
            trend="+1.5%" 
            isPositive={true} 
            icon={ArrowUpRight} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue vs Expenses Chart */}
          <div className="lg:col-span-2 glass rounded-[32px] border border-border p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-bold text-lg">Revenue vs Operating Expenses</h3>
              <div className="flex gap-4 text-xs font-bold text-foreground/40">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" /> Revenue
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" /> Expenses
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.4)' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                    tickFormatter={(value) => `₹${value/1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  />
                  <Bar dataKey="revenue" fill="#c5a059" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ROI Breakdown per Villa */}
          <div className="glass rounded-[32px] border border-border p-8">
            <h3 className="font-bold text-lg mb-8">Property Performance</h3>
            <div className="space-y-8">
              {villaROI.map((villa) => (
                <div key={villa.name} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="font-bold text-sm">{villa.name}</p>
                    <p className="text-primary font-bold">{villa.roi}% ROI</p>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(villa.roi / 20) * 100}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: villa.color }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-foreground/40 font-bold">
                    <span>Target: 10%</span>
                    <span className={cn(villa.roi >= 10 ? "text-green-500" : "text-amber-500")}>
                      {villa.roi >= 10 ? "Above Target" : "Underperforming"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <Info className="w-5 h-5 text-primary shrink-0" />
                <p className="text-xs font-medium text-foreground/70">
                  Villa Azure is your best performer this quarter due to 100% occupancy and low maintenance overhead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function FinanceCard({ title, amount, trend, isPositive, icon: Icon }: { title: string, amount: string, trend: string, isPositive: boolean, icon: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass p-8 rounded-[32px] border border-border group hover:border-primary/20 transition-all"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
          isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        )}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-bold mt-2 tracking-tighter">{amount}</h3>
      </div>
    </motion.div>
  );
}
