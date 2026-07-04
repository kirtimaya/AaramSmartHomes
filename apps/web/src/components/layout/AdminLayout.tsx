import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Shield, Bell, Loader2, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, session, loading, signOut } = useAuth();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isRoot, setIsRoot] = React.useState(false);
  const [statusChecked, setStatusChecked] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  useEffect(() => {
    if (!user || !session) return;
    async function checkStatus() {
      try {
        const res = await fetch('/api/admin/status', {
          headers: { 'Authorization': `Bearer ${session!.access_token}` }
        });
        if (res.ok) {
          const { isAdmin: adminStatus, isRoot: rootStatus } = await res.json();
          setIsAdmin(adminStatus);
          setIsRoot(!!rootStatus);
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
            Go to Member Portal
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
      <Sidebar
        isRoot={isRoot}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <main className="md:pl-64 min-h-screen relative">
        <header className="h-16 md:h-20 border-b border-white/50 bg-background/50 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 sticky top-0 z-40 gap-3">
          {/* Left: hamburger (mobile) + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden soft-button w-10 h-10 border border-white text-foreground/40 hover:text-foreground transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base md:text-xl font-bold tracking-tighter text-foreground uppercase truncate">Admin Console</h2>
              <p className="hidden sm:flex text-[10px] font-bold text-foreground/30 items-center gap-1 uppercase tracking-widest">
                <Shield className="w-3 h-3 text-primary" /> Managed Estates
              </p>
            </div>
          </div>

          {/* Right: status + actions */}
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            <div className="hidden sm:flex sage-badge items-center gap-2 border border-white px-3 py-1 scale-90">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              System Operational
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex soft-button w-11 h-11 border border-white text-foreground/30 hover:text-primary transition-all">
                <span className="relative">
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background"></div>
                  <Bell className="w-5 h-5" />
                </span>
              </div>
              <button
                onClick={async () => { await signOut(); router.push('/adminLogin'); }}
                className="soft-button w-10 h-10 md:w-11 md:h-11 border border-white text-red-400 hover:text-red-500 transition-all flex items-center justify-center"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
