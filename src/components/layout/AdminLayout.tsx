import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Shield, Bell, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, session, loading, signOut } = useAuth();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = React.useState(false);
  const [statusChecked, setStatusChecked] = React.useState(false);

  useEffect(() => {
    if (!user || !session) return;
    async function checkStatus() {
      try {
        const res = await fetch('/api/admin/status', {
          headers: { 'Authorization': `Bearer ${session!.access_token}` }
        });
        if (res.ok) {
          const { isAdmin: adminStatus } = await res.json();
          setIsAdmin(adminStatus);
        }
      } finally {
        setStatusChecked(true);
      }
    }
    checkStatus();
  }, [user, session]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/adminLogin');
      return;
    }
  }, [user, loading, router]);

  if (loading || (user && !statusChecked)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Verifying Admin Access</p>
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner soft-ui-in">
          <Shield className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tighter uppercase text-foreground">Access Restricted</h1>
          <p className="text-sm text-foreground/40 font-medium leading-relaxed">
            Your account (<span className="text-foreground font-bold">{user.email}</span>) does not have administrative privileges for Aaram Smart Homes.
          </p>
        </div>
        <div className="flex flex-col w-full gap-3 pt-4">
          <button 
            onClick={() => router.push('/tenant')}
            className="btn-terracotta py-4 text-xs font-bold uppercase tracking-widest shadow-xl"
          >
            Go to Resident Portal
          </button>
          <button 
            onClick={async () => { await signOut(); router.push('/adminLogin'); }}
            className="soft-button py-4 text-xs font-bold uppercase tracking-widest border border-white text-foreground/40"
          >
            Sign Out & Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

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
            <div className="flex items-center gap-3">
                <div className="soft-button w-11 h-11 border border-white text-foreground/30 hover:text-primary transition-all">
                  <span className="relative">
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background"></div>
                    <Bell className="w-5 h-5" />
                  </span>
                </div>
                <button 
                  onClick={async () => { await signOut(); router.push('/adminLogin'); }}
                  className="soft-button w-11 h-11 border border-white text-red-400 hover:text-red-500 transition-all flex items-center justify-center"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
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
