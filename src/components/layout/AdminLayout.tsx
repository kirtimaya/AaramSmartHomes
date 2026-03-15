'use client';

import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Shield, Bell, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const isAdmin = user?.email?.includes('admin') || user?.email === 'kirtimayaswain@gmail.com';

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/tenant');
      }
    }
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Authorized Access Only</p>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Sidebar />
      <main className="md:pl-64 min-h-screen relative">
        <header className="h-20 border-b border-white/50 bg-background/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
          <div>
            <h2 className="text-xl font-bold tracking-tighter text-foreground uppercase">Estate Control</h2>
            <p className="text-[10px] font-bold text-foreground/30 flex items-center gap-1 uppercase tracking-widest">
              <Shield className="w-3 h-3 text-primary" /> Active Nodes
            </p>
          </div>
          <div className="flex items-center gap-6">
             <button 
                  onClick={async () => { await signOut(); router.push('/login'); }}
                  className="soft-button w-11 h-11 border border-white text-red-300 hover:text-red-500 transition-all flex items-center justify-center"
                >
                  <LogOut className="w-5 h-5" />
             </button>
          </div>
        </header>
        <div className="p-8 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
