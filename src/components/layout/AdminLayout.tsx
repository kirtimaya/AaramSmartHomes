import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Shield, Bell, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const [adminList, setAdminList] = React.useState<string[]>([]);
  const ROOT_EMAIL = 'kirtimayaswain@gmail.com';

  useEffect(() => {
    async function fetchAdmins() {
      const { data } = await supabase.from('admins').select('email');
      if (data) {
        setAdminList(data.map((a: { email: string }) => a.email.toLowerCase()));
      }
    }
    fetchAdmins();
  }, []);

  const isAdmin = React.useMemo(() => {
    if (!user?.email) return false;
    const normalizedEmail = user.email.toLowerCase().trim();
    const result = 
      normalizedEmail === ROOT_EMAIL || 
      normalizedEmail.includes('admin') || 
      adminList.includes(normalizedEmail);
    console.log('[Auth Debug] Email:', normalizedEmail, 'isAdmin:', result);
    return result;
  }, [user, adminList]);

  useEffect(() => {
    if (!loading && !user) {
      console.log('[Auth Debug] No user, redirecting to admin login');
      router.push('/adminLogin');
      return;
    }

    // Root bypass logic inside useEffect to ensure redirect if not admin
    if (!loading && user && !isAdmin) {
      const normalized = user.email?.toLowerCase().trim();
      if (normalized === ROOT_EMAIL) {
        console.log('[Auth Debug] Root detected in guard, allowing access');
        return; 
      }
    }
  }, [user, loading, router, isAdmin]);

  if (loading) {
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
        <div className="p-4 rounded-2xl bg-white/40 border border-white soft-well space-y-2 text-left">
          <p className="text-[10px] font-extrabold text-foreground/30 uppercase tracking-widest">Diagnostic Info</p>
          <code className="block text-[10px] font-mono text-primary/70 break-all leading-tight">
            Auth ID: {user.id}<br/>
            Email: {user.email}<br/>
            Admin List: {adminList.join(', ') || 'Fetching...'}
          </code>
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
