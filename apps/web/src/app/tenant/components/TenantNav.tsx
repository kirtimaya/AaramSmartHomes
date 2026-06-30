'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Home, Utensils, LifeBuoy, Settings, Shield, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

export type TenantTab = 'dashboard' | 'meals' | 'support' | 'settings';

interface TenantNavProps {
  activeTab: TenantTab;
  onTabChange: (tab: TenantTab) => void;
  userName: string;
}

const NAV_ITEMS: { id: TenantTab; icon: React.ElementType; label: string }[] = [
  { id: 'dashboard', icon: Home,      label: 'Home'     },
  { id: 'meals',     icon: Utensils,  label: 'Meals'    },
  { id: 'support',   icon: LifeBuoy,  label: 'Support'  },
  { id: 'settings',  icon: Settings,  label: 'Settings' },
];

export function TenantSidebar({ activeTab, onTabChange, userName }: TenantNavProps) {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-background border-r border-white/40 z-40 shadow-[4px_0_24px_rgba(0,0,0,0.04)]">
      {/* Logo */}
      <div className="px-6 pt-8 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black tracking-tighter text-base uppercase text-foreground leading-none">Aaram</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/30 mt-0.5">Resident Portal</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* User greeting chip */}
      <div className="px-4 mb-6">
        <div className="soft-well border border-white px-4 py-3 rounded-2xl">
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">Welcome back</p>
          <p className="text-sm font-black tracking-tight text-foreground mt-0.5 truncate">{userName}</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[12px] font-extrabold uppercase tracking-widest transition-all duration-200',
                isActive
                  ? 'btn-terracotta text-white shadow-md shadow-primary/20'
                  : 'text-foreground/40 hover:bg-white/60 hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-4">
        <button
          onClick={async () => { await signOut(); router.push('/login'); }}
          className="w-full soft-button border border-white py-3 flex items-center justify-center gap-2 text-[10px] font-extrabold text-red-400 hover:text-red-500 uppercase tracking-widest transition-colors"
        >
          <LogOut className="w-3 h-3" /> Sign Out
        </button>
      </div>
    </aside>
  );
}

export function TenantBottomNav({ activeTab, onTabChange }: Pick<TenantNavProps, 'activeTab' | 'onTabChange'>) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-white/60">
      <div className="flex items-center justify-around px-1 py-2">
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-2xl min-w-0 flex-1 transition-all"
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  className="absolute inset-0 rounded-2xl bg-primary/10"
                  transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                />
              )}
              <item.icon
                className={cn(
                  'w-5 h-5 relative z-10 transition-all duration-200',
                  isActive ? 'text-primary scale-110' : 'text-foreground/30'
                )}
              />
              <span
                className={cn(
                  'text-[9px] font-extrabold uppercase tracking-widest relative z-10',
                  isActive ? 'text-primary' : 'text-foreground/30'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
