import React from 'react';
import { Sidebar } from './Sidebar';
import { Shield, Bell } from 'lucide-react';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Sidebar />
      <main className="md:pl-64 min-h-screen relative">
        <header className="h-20 border-b border-white/50 bg-background/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
          <div>
            <h2 className="text-xl font-bold tracking-tighter text-foreground uppercase">Admin Console</h2>
            <p className="text-[10px] font-bold text-foreground/30 flex items-center gap-1 uppercase tracking-widest">
              <Shield className="w-3 h-3 text-primary" /> Managed Estates
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="sage-badge flex items-center gap-2 border border-white px-3 py-1 scale-90">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              System Operational
            </div>
            <div className="soft-button w-11 h-11 border border-white text-foreground/30 hover:text-primary transition-all">
              <span className="relative">
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background"></div>
                <Bell className="w-5 h-5" />
              </span>
            </div>
          </div>
        </header>
        <div className="p-8 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
