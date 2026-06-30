'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  ClipboardList, AlertCircle, CheckCircle2, Clock,
  UserCheck, UserPlus, Shield, Loader2, RefreshCw,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

type TicketTab = 'All' | 'AccessRequests' | 'AdminRequests';

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

export default function TicketsPage() {
  const [tab, setTab] = useState<TicketTab>('All');
  const [tickets, setTickets] = useState<any[]>([]);
  const [adminRequests, setAdminRequests] = useState<any[]>([]);
  const [isRoot, setIsRoot] = useState(false);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const headers = getAuthHeader();

    // Check root status
    const statusRes = await fetch('/api/admin/status', { headers });
    const { isRoot: root } = await statusRes.json();
    setIsRoot(root);

    // Fetch tickets with requester details
    const { data: ticketsData } = await supabase
      .from('tickets')
      .select(`
        *,
        guests:requester_id(name, email),
        tenants:requester_id(name, email),
        room_bookings(property_id, room_id, status, properties(name, location), rooms(name, type))
      `)
      .order('created_at', { ascending: false });

    setTickets(ticketsData ?? []);

    // Fetch admin requests (root only)
    if (root) {
      const { data: adminReqData } = await supabase
        .from('admin_requests')
        .select('*')
        .order('created_at', { ascending: false });
      setAdminRequests(adminReqData ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const approveTicket = async (ticketId: string) => {
    setApproving(ticketId);
    const note = noteInputs[ticketId] || 'Approved';
    const res = await fetch(`/api/admin/tickets/${ticketId}/approve`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminNote: note }),
    });
    const data = await res.json();
    setApproving(null);
    if (data.success) {
      showToast('Tenant access approved! User notified.');
      fetchData();
    } else {
      showToast(data.error ?? 'Approval failed', false);
    }
  };

  const approveAdminRequest = async (requestId: string, email: string) => {
    setApproving(requestId);
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });
    const data = await res.json();
    setApproving(null);
    if (data.success || res.ok) {
      showToast(`Admin access approved for ${email}`);
      fetchData();
    } else {
      showToast(data.error ?? 'Approval failed', false);
    }
  };

  const allTickets = tickets;
  const accessTickets = tickets.filter(t => t.category === 'TenantAccessRequest');

  const displayedTickets = tab === 'All' ? allTickets
    : tab === 'AccessRequests' ? accessTickets
    : [];

  const getRequesterName = (t: any) => {
    if (t.requester_type === 'guest') return t.guests?.name ?? t.requester_id;
    return t.tenants?.name ?? t.requester_id;
  };

  const getStatusChip = (status: string) => {
    const map: Record<string, string> = {
      Pending: 'bg-amber-100 text-amber-700',
      'In-Progress': 'bg-blue-100 text-blue-600',
      Resolved: 'bg-emerald-100 text-emerald-600',
    };
    return map[status] ?? 'bg-foreground/5 text-foreground/40';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-primary/10 text-primary border-primary/20';
      case 'Medium': return 'bg-secondary/10 text-secondary border-secondary/20';
      default: return 'bg-foreground/5 text-foreground/40 border-foreground/10';
    }
  };

  return (
    <AdminLayout>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn(
              'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-xl border',
              toast.ok ? 'bg-secondary/10 border-secondary/20 text-secondary' : 'bg-primary/10 border-primary/20 text-primary'
            )}
          >
            {toast.ok ? <CheckCircle2 className="inline w-3.5 h-3.5 mr-1.5" /> : <AlertCircle className="inline w-3.5 h-3.5 mr-1.5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">Service Desk</h1>
            <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-[0.2em]">Tickets • Access Requests • Admin Requests</p>
          </div>
          <button onClick={fetchData} className="soft-button px-4 py-2.5 border border-white text-[11px] font-bold flex items-center gap-1.5 text-foreground/50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 soft-well p-1.5 border border-white bg-white/40 w-fit">
          {([
            { id: 'All', label: 'All Tickets', icon: ClipboardList, count: allTickets.length },
            { id: 'AccessRequests', label: 'Access Requests', icon: UserCheck, count: accessTickets.filter(t => t.status !== 'Resolved').length },
            ...(isRoot ? [{ id: 'AdminRequests', label: 'Admin Requests', icon: Shield, count: adminRequests.filter(r => r.status === 'pending').length }] : []),
          ] as { id: TicketTab; label: string; icon: any; count: number }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all',
                tab === t.id ? 'btn-terracotta shadow-xl scale-[1.02]' : 'text-foreground/40 hover:bg-white/60'
              )}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count > 0 && (
                <span className={cn('w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center',
                  tab === t.id ? 'bg-white/30 text-white' : 'bg-primary/10 text-primary')}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Tickets List ── */}
            {tab !== 'AdminRequests' && (
              <div className="grid grid-cols-1 gap-6">
                {displayedTickets.length === 0 && (
                  <div className="soft-well p-12 text-center text-foreground/30 text-sm font-bold">
                    No tickets to show.
                  </div>
                )}
                {displayedTickets.map((ticket, idx) => {
                  const isExpanded = expanded === ticket.id;
                  const booking = ticket.room_bookings;

                  return (
                    <motion.div key={ticket.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="soft-card p-6 border border-white space-y-4">
                      {/* Row 1: Status + Info */}
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className={cn(
                          'w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner soft-ui-in shrink-0',
                          ticket.status === 'Resolved' ? 'bg-emerald-500/5' : ticket.category === 'TenantAccessRequest' ? 'bg-secondary/5' : 'bg-primary/5'
                        )}>
                          {ticket.status === 'Resolved' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            : ticket.category === 'TenantAccessRequest' ? <UserPlus className="w-5 h-5 text-secondary" />
                            : ticket.status === 'In-Progress' ? <Clock className="w-5 h-5 text-secondary" />
                            : <AlertCircle className="w-5 h-5 text-primary" />}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest border', getPriorityColor(ticket.priority))}>
                              {ticket.priority}
                            </span>
                            <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest', getStatusChip(ticket.status))}>
                              {ticket.status}
                            </span>
                            <span className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{ticket.category}</span>
                            <span className="text-[9px] font-bold text-foreground/20 ml-auto">
                              {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          <p className="text-sm font-bold text-foreground leading-snug">{ticket.description}</p>

                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-[9px] font-bold">
                                {getRequesterName(ticket)?.[0]?.toUpperCase()}
                              </div>
                              <span className="font-bold text-foreground/60">{getRequesterName(ticket)}</span>
                              <span className="text-[9px] text-foreground/30 uppercase tracking-widest">{ticket.requester_type}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {ticket.category === 'TenantAccessRequest' && ticket.status !== 'Resolved' && (
                            <button
                              onClick={() => setExpanded(isExpanded ? null : ticket.id)}
                              className="soft-button px-4 py-2.5 border border-white text-[11px] font-bold text-secondary flex items-center gap-1.5"
                            >
                              Approve {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {ticket.status !== 'Resolved' && ticket.category !== 'TenantAccessRequest' && (
                            <span className="text-[9px] text-foreground/30 font-bold italic">No action needed</span>
                          )}
                          {ticket.status === 'Resolved' && ticket.admin_note && (
                            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                              Note: {ticket.admin_note}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Booking info */}
                      {booking && (
                        <div className="soft-well border border-white px-4 py-3 flex gap-6 text-xs">
                          <div>
                            <span className="text-foreground/30 font-bold uppercase tracking-widest text-[9px]">Property</span>
                            <p className="font-bold text-foreground">{booking.properties?.name}</p>
                            <p className="text-foreground/40 text-[10px]">{booking.properties?.location}</p>
                          </div>
                          {booking.rooms && (
                            <div>
                              <span className="text-foreground/30 font-bold uppercase tracking-widest text-[9px]">Room</span>
                              <p className="font-bold text-foreground">{booking.rooms.name}</p>
                              <p className="text-foreground/40 text-[10px]">{booking.rooms.type}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-foreground/30 font-bold uppercase tracking-widest text-[9px]">Booking Status</span>
                            <p className="font-bold text-foreground capitalize">{booking.status}</p>
                          </div>
                        </div>
                      )}

                      {/* Approve panel (expanded) */}
                      <AnimatePresence>
                        {isExpanded && ticket.category === 'TenantAccessRequest' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border/20 pt-4 space-y-3">
                              <p className="text-xs font-bold text-foreground/50">Admin note (optional)</p>
                              <div className="flex gap-3">
                                <input
                                  value={noteInputs[ticket.id] ?? ''}
                                  onChange={e => setNoteInputs(p => ({ ...p, [ticket.id]: e.target.value }))}
                                  placeholder="e.g. Approved after document verification"
                                  className="soft-ui-in flex-1 px-4 py-3 text-xs text-foreground"
                                />
                                <button
                                  onClick={() => approveTicket(ticket.id)}
                                  disabled={approving === ticket.id}
                                  className="btn-terracotta px-6 py-3 text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                                >
                                  {approving === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserCheck className="w-4 h-4" /> Approve Tenant</>}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* ── Admin Requests Tab (root only) ── */}
            {tab === 'AdminRequests' && isRoot && (
              <div className="grid grid-cols-1 gap-6">
                {adminRequests.length === 0 && (
                  <div className="soft-well p-12 text-center text-foreground/30 text-sm font-bold">
                    No admin requests.
                  </div>
                )}
                {adminRequests.map((req, idx) => (
                  <motion.div key={req.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="soft-card p-6 border border-white flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-bold text-foreground">{req.email}</p>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-lg',
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                          req.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                          'bg-foreground/10 text-foreground/30'
                        )}>{req.status}</span>
                        <span className="text-[9px] text-foreground/30 font-bold">
                          {new Date(req.created_at).toLocaleDateString('en-IN')}
                        </span>
                        {req.token_expires_at && (
                          <span className={cn(
                            'text-[9px] font-bold',
                            new Date(req.token_expires_at) < new Date() ? 'text-red-500' : 'text-foreground/30'
                          )}>
                            {new Date(req.token_expires_at) < new Date() ? 'Token expired' : `Expires ${new Date(req.token_expires_at).toLocaleDateString('en-IN')}`}
                          </span>
                        )}
                      </div>
                    </div>
                    {req.status === 'pending' && new Date(req.token_expires_at) > new Date() && (
                      <button
                        onClick={() => approveAdminRequest(req.id, req.email)}
                        disabled={approving === req.id}
                        className="btn-terracotta px-6 py-3 text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                      >
                        {approving === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Shield className="w-4 h-4" /> Approve Admin</>}
                      </button>
                    )}
                    {req.status === 'approved' && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Approved
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
