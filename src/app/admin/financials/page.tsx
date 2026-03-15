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
  Info,
  Leaf
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
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-1">
             <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest border border-secondary/20">
                <Leaf className="w-2.5 h-2.5" /> Fiscal Intelligence
              </div>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tighter text-foreground">Aaram <span className="text-primary italic">Financials</span></h1>
            <p className="text-foreground/40 text-sm font-medium">Track yields, operating costs, and portfolio P&L.</p>
          </div>
          <div className="flex gap-3">
            <button className="soft-button flex items-center gap-2 px-5 py-3 border border-white text-[10px] font-extrabold uppercase tracking-widest hover:bg-white/60 transition-all">
              <Download className="w-4 h-4" />
              Export P&L
            </button>
            <button className="btn-terracotta flex items-center gap-2 px-6 py-3 shadow-lg hover:translate-y-[-1px] transition-all text-[10px] font-extrabold uppercase tracking-widest">
              <IndianRupee className="w-4 h-4" />
              Log Dividend
            </button>
          </div>
        </div>

        {/* Top Summary Cards - Dense */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FinanceCard 
            title="Net Yield (Q1)" 
            amount="₹8,95,000" 
            trend="+8.2%" 
            isPositive={true} 
            icon={Wallet} 
          />
          <FinanceCard 
            title="OPEX Ratio" 
            amount="₹3,65,000" 
            trend="+12%" 
            isPositive={false} 
            icon={Activity} 
          />
          <FinanceCard 
            title="Portfolio ROI" 
            amount="12.4%" 
            trend="+1.5%" 
            isPositive={true} 
            icon={ArrowUpRight} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Revenue vs Expenses Chart - Soft Look */}
          <div className="lg:col-span-8 soft-card border border-white p-8 bg-white/30 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
               <div className="space-y-1">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
                     <div className="w-1.5 h-6 rounded-full bg-primary" />
                     Monetary Flows
                  </h3>
                  <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">6-Month Trend Analysis</p>
               </div>
              <div className="flex gap-6 text-[9px] font-extrabold uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded shadow-sm bg-primary" /> <span className="text-foreground/40">Gross Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded shadow-sm bg-foreground/10" /> <span className="text-foreground/40">Cost Base</span>
                </div>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData}>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'rgba(61,61,61,0.3)', fontWeight: 'bold' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'rgba(61,61,61,0.3)', fontWeight: 'bold' }}
                    tickFormatter={(value) => `₹${value/1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(214,125,97,0.05)' }}
                    contentStyle={{ backgroundColor: '#FDFBF7', border: '1px solid #FFFFFF', borderRadius: '16px', boxShadow: '10px 10px 20px #E3E1DE' }}
                  />
                  <Bar dataKey="revenue" fill="#D67D61" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="expenses" fill="rgba(61,61,61,0.08)" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Property Performance - Modular */}
          <div className="lg:col-span-4 soft-card border border-white p-8 bg-white/40">
            <div className="space-y-1 mb-10">
               <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full bg-secondary" />
                  Asset Matrix
               </h3>
               <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Yield Per Destination</p>
            </div>
            
            <div className="space-y-8">
              {villaROI.map((villa) => (
                <div key={villa.name} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="font-bold text-xs text-foreground uppercase tracking-tight">{villa.name}</p>
                    <p className="text-secondary font-bold tracking-tighter text-lg">{villa.roi}%</p>
                  </div>
                  <div className="h-2 w-full soft-ui-in bg-white/50 rounded-full overflow-hidden border border-white/20">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(villa.roi / 20) * 100}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full rounded-full shadow-inner bg-secondary"
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-foreground/30 font-bold uppercase tracking-widest">
                    <span>Baseline: 10%</span>
                    <span className={cn(villa.roi >= 10 ? "text-secondary" : "text-primary")}>
                      {villa.roi >= 10 ? "Above Target" : "Warning"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-white/50">
              <div className="flex items-center gap-3 p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                <Info className="w-4 h-4 text-secondary shrink-0" />
                <p className="text-[10px] font-bold text-foreground/50 leading-relaxed uppercase tracking-tight">
                  <span className="text-secondary">System Insight:</span> Villa Azure is capital efficient with <span className="text-foreground">100% occupancy</span>.
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="soft-card p-8 border border-white group hover:scale-[1.01] transition-all bg-white/30"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 rounded-2xl soft-ui-in bg-white/50 flex items-center justify-center text-primary group-hover:text-primary transition-all duration-500 shadow-inner">
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-lg border border-white",
          isPositive ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
        )}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em]">{title}</p>
        <h3 className="text-3xl font-bold mt-1 text-foreground tracking-tighter">{amount}</h3>
      </div>
    </motion.div>
  );
}
