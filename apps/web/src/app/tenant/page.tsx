'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useAuth }   from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase }  from '@/lib/supabase';
import { Tenant }    from '@/lib/types';

import { TenantSidebar, TenantBottomNav, type TenantTab } from './components/TenantNav';
import { DashboardTab }     from './components/DashboardTab';
import { MealsTab }         from './components/MealsTab';
import { SupportTab }       from './components/SupportTab';
import { SettingsTab }      from './components/SettingsTab';
import { QuickTicketModal } from './components/QuickTicketModal';

// ────────────────────────────────────────────────────────────────────────────

export default function TenantPortal() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tenantProfile,    setTenantProfile]    = useState<Tenant | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [activeTab,        setActiveTab]        = useState<TenantTab>('dashboard');
  const [ticketOpen,       setTicketOpen]       = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (loading) return;
    if (!user)   { router.push('/login'); return; }

    (async () => {
      // Primary lookup via RLS-gated anon client
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', user.id)
        .in('status', ['active', 'notice'])
        .maybeSingle();

      if (data) {
        setTenantProfile(data as Tenant);
        setDashboardLoading(false);
        return;
      }

      // Fallback: tenant was activated with a placeholder UUID (no email invite).
      // The anon client can't see their row via RLS, so hit the server route
      // which uses the service-role client and can match by email.
      const session = await supabase.auth.getSession();
      const token   = session.data.session?.access_token;
      if (token) {
        const res = await fetch('/api/tenant/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          setTenantProfile(profile as Tenant);
          setDashboardLoading(false);
          return;
        }
      }

      // Not a registered tenant — redirect to guest portal
      router.push('/guest');
    })();
  }, [user, loading, router]);

  // ── Loading screen ──────────────────────────────────────────────────────

  if (loading || dashboardLoading || !user || !tenantProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-5"
        >
          <div className="w-16 h-16 soft-card border border-white flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <p className="text-[10px] font-extrabold text-foreground/30 uppercase tracking-[0.4em]">
            Loading your portal…
          </p>
        </motion.div>
      </div>
    );
  }

  const firstName = (user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Member').split(' ')[0];
  const userName  = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Member';

  const TAB_TITLES: Record<TenantTab, { sub: string; title: string }> = {
    dashboard: { sub: 'Overview',            title: `Namaste, ${firstName}` },
    meals:     { sub: 'Kitchen & Meals',      title: 'My Meal Plan'         },
    support:   { sub: 'Support & Documents',  title: 'Concierge'            },
    settings:  { sub: 'Profile & Settings',   title: 'Settings'             },
  };

  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <TenantSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName={userName}
      />

      {/* ── Main content area (offset by sidebar on md+) ─────────────── */}
      <main className="md:pl-64 pb-24 md:pb-0 min-h-screen">

        {/* Sticky header */}
        <header className="sticky top-0 z-30 px-5 sm:px-8 pt-6 pb-5 border-b border-white/50 bg-background/85 backdrop-blur-md">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold text-foreground/30 uppercase tracking-[0.3em]">
                {TAB_TITLES[activeTab].sub}
              </p>
              <h1 className="text-2xl font-black tracking-tighter text-foreground leading-none mt-0.5">
                {TAB_TITLES[activeTab].title}
              </h1>
            </div>

            {/* Avatar chip — taps to settings */}
            <button
              onClick={() => setActiveTab('settings')}
              className="w-11 h-11 soft-button border border-white text-foreground/60 hover:text-primary transition-colors font-black text-sm"
            >
              {firstName.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>

        {/* Tab content */}
        <section className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
          <AnimatePresence mode="wait">

            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <DashboardTab
                  tenantProfile={tenantProfile}
                  onRaiseTicket={() => setTicketOpen(true)}
                />
              </motion.div>
            )}

            {activeTab === 'meals' && (
              <motion.div
                key="meals"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <MealsTab userId={tenantProfile.id} />
              </motion.div>
            )}

            {activeTab === 'support' && (
              <motion.div
                key="support"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <SupportTab tenantId={tenantProfile.id} />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <SettingsTab
                  tenantId={tenantProfile.id}
                  initialName={tenantProfile.name}
                  initialEmail={tenantProfile.email}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </section>
      </main>

      {/* ── Mobile Bottom Nav ───────────────────────────────────────────── */}
      <TenantBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Quick Ticket Modal ──────────────────────────────────────────── */}
      <QuickTicketModal
        isOpen={ticketOpen}
        onClose={() => setTicketOpen(false)}
        tenantId={tenantProfile.id}
      />
    </div>
  );
}
