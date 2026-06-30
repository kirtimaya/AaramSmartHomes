'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { UserCog, Plus, Trash2, Shield, Crown, Search, X, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface AdminRow { id: string; email: string; created_at: string; }

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const sbEntry = Object.entries(localStorage).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (sbEntry) {
    try {
      const token = JSON.parse(sbEntry[1])?.access_token;
      if (token) return { Authorization: `Bearer ${token}` };
    } catch { /* ignore */ }
  }
  return {};
}

export default function AdminsPage() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRoot, setIsRoot] = useState(false);
  const [rootChecked, setRootChecked] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToastState] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToastState({ msg, ok });
    setTimeout(() => setToastState(null), 3500);
  };

  useEffect(() => {
    if (!session) return;
    fetch('/api/admin/status', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(({ isRoot: rootStatus }) => {
        setIsRoot(!!rootStatus);
        setRootChecked(true);
        if (!rootStatus) router.push('/admin');
      });
  }, [session, router]);

  useEffect(() => {
    if (rootChecked && isRoot) fetchAdmins();
  }, [rootChecked, isRoot]);

  const fetchAdmins = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/admins', { headers: getAuthHeader() });
    if (res.ok) {
      const data = await res.json();
      setAdmins(data);
    }
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail.trim() }),
    });
    if (res.ok) {
      const added = await res.json();
      setAdmins(prev => [...prev, added]);
      setNewEmail('');
      showToast('Admin added');
    } else {
      const { error } = await res.json();
      showToast(error || 'Failed to add admin', false);
    }
    setAdding(false);
  };

  const handleDelete = async (admin: AdminRow) => {
    if (!confirm(`Remove admin access for ${admin.email}?`)) return;
    const res = await fetch('/api/admin/admins', {
      method: 'DELETE',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: admin.id }),
    });
    if (res.ok) {
      setAdmins(prev => prev.filter(a => a.id !== admin.id));
      showToast('Admin removed');
    } else {
      showToast('Failed to remove admin', false);
    }
  };

  const filteredAdmins = admins.filter(a => a.email.toLowerCase().includes(search.toLowerCase()));

  if (!rootChecked) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!isRoot) return null;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">Admin Management</h1>
            <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-widest mt-0.5">
              Root access · {admins.length} admin{admins.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Root user card */}
        <div className="soft-card border border-primary/20 bg-primary/5 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-foreground tracking-tight">{user?.email}</p>
              <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Root User · Cannot be removed</p>
            </div>
          </div>
        </div>

        {/* Add admin form */}
        <form onSubmit={handleAdd} className="soft-card border border-white bg-white/30 rounded-2xl p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30 mb-3">Add Admin</p>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" />
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full soft-well pl-9 pr-4 py-3 text-[12px] font-bold bg-transparent border-0 focus:outline-none placeholder:text-foreground/30"
                disabled={adding}
              />
            </div>
            <button
              type="submit"
              disabled={adding || !newEmail.trim()}
              className="btn-terracotta px-5 py-3 text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </form>

        {/* Admin list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">
              Admins ({filteredAdmins.length})
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter admins..."
                className="soft-well pl-9 pr-8 py-2 text-[11px] font-bold w-52 bg-transparent border-0 focus:outline-none placeholder:text-foreground/30"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/30">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="soft-well rounded-2xl p-12 text-center">
              <UserCog className="w-10 h-10 text-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-bold text-foreground/30">
                {search ? 'No admins match your search' : 'No admins added yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredAdmins.map(admin => (
                  <motion.div
                    key={admin.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="soft-card border border-white bg-white/30 rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl soft-ui-in flex items-center justify-center text-primary bg-white/50">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-extrabold text-foreground text-[13px] tracking-tight">{admin.email}</p>
                        <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                          Added {new Date(admin.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(admin)}
                      className="w-9 h-9 flex items-center justify-center soft-button border border-red-200/40 text-red-400 hover:text-red-500 transition-all rounded-xl"
                      title="Remove admin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              'fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl soft-card border text-[12px] font-extrabold uppercase tracking-widest shadow-xl z-50',
              toast.ok ? 'border-secondary/30 text-secondary' : 'border-red-300/40 text-red-500'
            )}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
