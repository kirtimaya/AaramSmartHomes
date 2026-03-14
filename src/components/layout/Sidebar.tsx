'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Home, 
  Users, 
  ClipboardList, 
  Droplets, 
  LogOut, 
  PieChart,
  Calendar,
  Settings,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { icon: Home, label: 'Dashboard', href: '/admin' },
  { icon: PieChart, label: 'Occupancy', href: '/admin/occupancy' },
  { icon: Calendar, label: 'Move-Outs', href: '/admin/calendar' },
  { icon: BarChart3, label: 'Financials', href: '/admin/financials' },
  { icon: ClipboardList, label: 'Tickets', href: '/admin/tickets' },
  { icon: Droplets, label: 'Water Levels', href: '/admin/iot' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 bg-card border-r border-border z-50">
      <div className="p-6">
        <h1 className="text-2xl font-bold gold-gradient bg-clip-text text-transparent tracking-tight">
          AARAM
          <span className="block text-xs font-medium text-foreground opacity-60 tracking-widest uppercase">Smart Homes</span>
        </h1>
      </div>

      <nav className="flex-1 mt-6 px-4 space-y-2">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
              pathname === item.href 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "text-foreground/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5",
              pathname === item.href ? "text-white" : "group-hover:scale-110 transition-transform"
            )} />
            <span className="font-medium text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              KS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">Kirti Swain</p>
              <p className="text-xs text-foreground/50 truncate">Owner</p>
            </div>
          </div>
          <button className="mt-4 flex items-center gap-2 text-xs font-medium text-red-500 hover:text-red-600 transition-colors w-full group">
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
