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
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const sidebarItems = [
  { icon: Home, label: 'Dashboard', href: '/admin' },
  { icon: Shield, label: 'Properties', href: '/admin/properties/manage' },
  { icon: PieChart, label: 'Occupancy', href: '/admin/occupancy' },
  { icon: Calendar, label: 'Move-Outs', href: '/admin/calendar' },
  { icon: BarChart3, label: 'Financials', href: '/admin/financials' },
  { icon: ClipboardList, label: 'Tickets', href: '/admin/tickets' },
  { icon: Droplets, label: 'Water Levels', href: '/admin/iot' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="hidden md:flex flex-col w-64 bg-background border-r border-white/50 h-screen fixed left-0 top-0 z-50">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tighter text-foreground uppercase">Aaram <span className="text-primary italic">Admin</span></h1>
        </div>

        <nav className="space-y-1.5">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group",
                  isActive 
                    ? "bg-white shadow-md border border-white/50 text-foreground scale-[1.02]" 
                    : "text-foreground/40 hover:bg-white/40 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform group-hover:scale-110",
                  isActive ? "text-primary" : "text-foreground/20"
                )} />
                <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-white/50">
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-foreground/40 hover:bg-red-50 hover:text-red-500 transition-all group font-bold"
        >
          <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
