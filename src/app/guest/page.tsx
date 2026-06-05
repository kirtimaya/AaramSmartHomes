'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart, MapPin, Home, Calendar, MessageCircle, Bell,
  LogOut, Loader2, Shield, ArrowRight, ChevronDown, ChevronUp,
  X, CheckCircle2, Clock, AlertCircle, CreditCard, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { Property, Guest, RoomBooking, VisitRequest, Notification } from '@/lib/types';

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const stored = Object.entries(localStorage)
    .find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  const token = stored ? (() => { try { return JSON.parse(stored[1])?.access_token; } catch { return null; } })() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiCall(path: string, method = 'GET', body?: object) {
  const res = await fetch(path, {
    method,
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

type Tab = 'explore' | 'visits' | 'support';

export default function GuestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('explore');

  // Explore
  const [properties, setProperties] = useState<Property[]>([]);
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());

  // Visits & Bookings
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  // Modals
  const [visitModal, setVisitModal] = useState<{ propertyId: string; propertyName: string } | null>(null);
  const [bookModal, setBookModal] = useState<{ propertyId: string; propertyName: string; roomId?: string } | null>(null);
  const [supportModal, setSupportModal] = useState(false);
  const [tenantRequestModal, setTenantRequestModal] = useState<{ bookingId: string } | null>(null);
  const [roomRequestModal, setRoomRequestModal] = useState<{ roomId: string; roomName: string; propertyName: string } | null>(null);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  // Form state
  const [visitDate, setVisitDate] = useState('');
  const [visitMessage, setVisitMessage] = useState('');
  const [supportDesc, setSupportDesc] = useState('');
  const [roomRequestMoveIn, setRoomRequestMoveIn] = useState('');
  const [roomRequestMessage, setRoomRequestMessage] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const headers = getAuthHeader();

    // Check if user is guest
    const { data: guestRow } = await supabase
      .from('guests')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!guestRow) {
      // Might be tenant or admin — redirect
      const meRes = await fetch('/api/auth/me', { headers });
      const { role } = await meRes.json();
      if (role === 'tenant') { router.push('/tenant'); return; }
      if (role === 'admin') { router.push('/admin'); return; }
      router.push('/login');
      return;
    }

    setGuest(guestRow);

    const [propsRes, shortlistsRes, visitsRes, bookingsRes, notifsRes] = await Promise.all([
      supabase.from('properties').select('*, rooms(*), benefits(*)').limit(20),
      supabase.from('guest_shortlists').select('property_id').eq('guest_id', session.user.id),
      fetch('/api/visit-requests', { headers }),
      fetch('/api/bookings/my-bookings', { headers }),
      fetch('/api/notifications', { headers }),
    ]);

    if (propsRes.data) setProperties(propsRes.data);
    if (shortlistsRes.data) setShortlisted(new Set(shortlistsRes.data.map((s: any) => s.property_id)));

    const visitsJson = await visitsRes.json();
    const bookingsJson = await bookingsRes.json();
    const notifsJson = await notifsRes.json();

    setVisitRequests(visitsJson.visitRequests ?? []);
    setBookings(bookingsJson.bookings ?? []);
    setNotifications(notifsJson.notifications ?? []);

    setLoading(false);
  }, [router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-open room request modal when navigated from /properties/[id]?requestRoom=<id>
  useEffect(() => {
    const requestRoomId = searchParams.get('requestRoom');
    if (!requestRoomId || loading) return;
    // Find the room across all loaded properties
    for (const prop of properties) {
      const rooms = (prop as any).rooms as any[] | undefined;
      const room = rooms?.find((r: any) => r.id === requestRoomId);
      if (room) {
        setRoomRequestModal({ roomId: room.id, roomName: room.name, propertyName: prop.name });
        break;
      }
    }
  }, [searchParams, properties, loading]);

  // Poll notifications every 30s
  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch('/api/notifications', { headers: getAuthHeader() });
      const { notifications: n } = await res.json();
      if (n) setNotifications(n);
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const toggleShortlist = async (propertyId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const isListed = shortlisted.has(propertyId);
    if (isListed) {
      await supabase.from('guest_shortlists').delete()
        .eq('guest_id', session.user.id).eq('property_id', propertyId);
      setShortlisted(prev => { const s = new Set(prev); s.delete(propertyId); return s; });
    } else {
      await supabase.from('guest_shortlists').insert({ guest_id: session.user.id, property_id: propertyId });
      setShortlisted(prev => new Set([...prev, propertyId]));
    }
  };

  const submitVisit = async () => {
    if (!visitModal) return;
    setFormLoading(true);
    const result = await apiCall('/api/visit-requests', 'POST', {
      propertyId: visitModal.propertyId,
      preferredDate: visitDate || null,
      message: visitMessage || null,
    });
    setFormLoading(false);
    if (result.visitRequest) {
      setVisitRequests(prev => [result.visitRequest, ...prev]);
      setVisitModal(null);
      setVisitDate(''); setVisitMessage('');
      showToast('Visit request submitted!');
    } else {
      showToast(result.error ?? 'Failed to submit', false);
    }
  };

  const initiateBooking = async () => {
    if (!bookModal) return;
    setFormLoading(true);
    const order = await apiCall('/api/bookings/create-order', 'POST', {
      propertyId: bookModal.propertyId,
      roomId: bookModal.roomId ?? null,
    });
    setFormLoading(false);

    if (!order.orderId) {
      showToast(order.error ?? 'Failed to create order', false);
      return;
    }

    // Load Razorpay script and open checkout
    if (typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);
    script.onload = () => {
      const rzp = new (window as any).Razorpay({
        key: order.keyId || RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency,
        name: 'Aaram Smart Homes',
        description: `Room Token Booking — ${bookModal.propertyName}`,
        order_id: order.orderId,
        handler: async (response: any) => {
          const verify = await apiCall('/api/bookings/verify-payment', 'POST', {
            bookingId: order.bookingId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (verify.success) {
            setBookModal(null);
            showToast('Payment successful! Your room is secured.');
            fetchAll();
            setActiveTab('visits');
          } else {
            showToast(verify.error ?? 'Payment verification failed', false);
          }
        },
        prefill: { name: guest?.name, email: guest?.email },
        theme: { color: '#C1440E' },
      });
      rzp.open();
    };
  };

  const submitSupport = async () => {
    if (!supportDesc.trim()) return;
    setFormLoading(true);
    const result = await apiCall('/api/tickets', 'POST', {
      category: 'Support',
      description: supportDesc,
      priority: 'Medium',
    });
    setFormLoading(false);
    if (result.ticket) {
      setSupportModal(false);
      setSupportDesc('');
      showToast('Support request sent! Our team will get back to you.');
    } else {
      showToast(result.error ?? 'Failed to submit', false);
    }
  };

  const requestTenantAccess = async (bookingId: string) => {
    setFormLoading(true);
    const result = await apiCall('/api/tickets', 'POST', {
      category: 'TenantAccessRequest',
      description: 'Requesting tenant portal access after room booking.',
      priority: 'High',
      bookingId,
    });
    setFormLoading(false);
    if (result.ticket) {
      setTenantRequestModal(null);
      showToast('Tenant access request sent to admin!');
    } else {
      showToast(result.error ?? 'Failed to send request', false);
    }
  };

  const submitRoomRequest = async () => {
    if (!roomRequestModal) return;
    setFormLoading(true);
    const result = await apiCall('/api/tickets', 'POST', {
      category:         'TenantAccessRequest',
      priority:         'High',
      description:      `Room access request for "${roomRequestModal.roomName}" at ${roomRequestModal.propertyName}. ${roomRequestMessage || ''}`.trim(),
      roomId:           roomRequestModal.roomId,
      preferredMoveIn:  roomRequestMoveIn || null,
    });
    setFormLoading(false);
    if (result.ticket) {
      setRoomRequestModal(null);
      setRoomRequestMoveIn('');
      setRoomRequestMessage('');
      showToast('Room request sent! Admin will review and get back to you.');
    } else {
      showToast(result.error ?? 'Failed to send request', false);
    }
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH', headers: getAuthHeader() });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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

      {/* Header */}
      <nav className="sticky top-0 z-40 px-6 py-3 flex justify-between items-center bg-background/80 backdrop-blur-md border-b border-border/20">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tighter text-foreground">AARAM</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Notifications bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="soft-button w-9 h-9 flex items-center justify-center relative"
            >
              <Bell className="w-4 h-4 text-foreground/50" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifs && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-12 w-80 soft-card border border-white bg-background/95 backdrop-blur z-50 p-3 space-y-2 max-h-80 overflow-y-auto"
                >
                  <p className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 px-1">Notifications</p>
                  {notifications.length === 0 && (
                    <p className="text-xs text-foreground/30 text-center py-4">No notifications</p>
                  )}
                  {notifications.map(n => (
                    <button key={n.id} onClick={() => markRead(n.id)}
                      className={cn('w-full text-left p-3 rounded-xl text-xs space-y-0.5 transition-all', n.read ? 'opacity-50' : 'bg-primary/5 border border-primary/10')}>
                      <p className="font-bold text-foreground">{n.title}</p>
                      <p className="text-foreground/50 text-[10px] leading-relaxed">{n.message}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 soft-card px-3 py-1.5 border border-white">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
              {guest?.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-[11px] font-bold text-foreground/70 hidden sm:block">{guest?.name}</span>
          </div>
          <button onClick={handleSignOut} className="soft-button w-9 h-9 flex items-center justify-center text-foreground/30 hover:text-primary transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Tab Bar */}
      <div className="sticky top-[57px] z-30 bg-background/80 backdrop-blur-md border-b border-border/20 px-6">
        <div className="flex gap-1 max-w-xl">
          {([
            { id: 'explore', label: 'Explore', icon: Home },
            { id: 'visits', label: 'My Visits & Bookings', icon: Calendar },
            { id: 'support', label: 'Support', icon: MessageCircle },
          ] as { id: Tab; label: string; icon: any }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground/40 hover:text-foreground/70'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ── EXPLORE TAB ── */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Available Homes</h2>
                <p className="text-foreground/40 text-xs mt-1">Shortlist your favourites • Book a visit • Secure with token</p>
              </div>
              {shortlisted.size > 0 && (
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  {shortlisted.size} shortlisted
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map(property => (
                <div key={property.id} className="soft-card border border-white bg-white/30 rounded-[32px] overflow-hidden group">
                  <div className="relative aspect-video">
                    <Image
                      src={property.image_url || '/images/realistic_villa_exterior_1773522363119.png'}
                      alt={property.name}
                      fill className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <button
                      onClick={() => toggleShortlist(property.id)}
                      className={cn(
                        'absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg',
                        shortlisted.has(property.id)
                          ? 'bg-primary text-white'
                          : 'bg-white/80 text-foreground/40 hover:text-primary'
                      )}
                    >
                      <Heart className={cn('w-4 h-4', shortlisted.has(property.id) && 'fill-current')} />
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="font-bold text-foreground tracking-tight">{property.name}</h3>
                      <p className="text-[10px] text-foreground/40 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {property.location}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg bg-secondary/10 text-secondary">
                        {property.property_type}
                      </span>
                      <span className="text-[9px] text-foreground/30 font-bold">{property.total_rooms} rooms</span>
                      <div className="flex items-center gap-0.5 ml-auto">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-bold text-foreground/60">4.9</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setVisitModal({ propertyId: property.id, propertyName: property.name })}
                        className="flex-1 soft-button py-2.5 text-[11px] font-bold text-foreground/60 hover:text-primary border border-white transition-all flex items-center justify-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Schedule Visit
                      </button>
                      <button
                        onClick={() => setBookModal({ propertyId: property.id, propertyName: property.name })}
                        className="flex-1 btn-terracotta py-2.5 text-[11px] font-bold flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Book ₹5,000
                      </button>
                    </div>

                    {/* Rooms availability toggle */}
                    {(property as any).rooms?.length > 0 && (
                      <button
                        onClick={() => setExpandedProperty(expandedProperty === property.id ? null : property.id)}
                        className="w-full soft-button py-2 text-[10px] font-bold text-foreground/50 border border-white/60 flex items-center justify-center gap-1.5 hover:text-secondary transition-colors"
                      >
                        <Home className="w-3 h-3" />
                        {expandedProperty === property.id ? 'Hide Rooms' : `View ${(property as any).rooms.length} Room${(property as any).rooms.length > 1 ? 's' : ''}`}
                        <ChevronDown className={cn('w-3 h-3 transition-transform', expandedProperty === property.id && 'rotate-180')} />
                      </button>
                    )}

                    <AnimatePresence>
                      {expandedProperty === property.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 overflow-hidden"
                        >
                          {((property as any).rooms as any[]).map((room: any) => {
                            const isVacant = !room.occupancy_status || room.occupancy_status === 'Vacant';
                            return (
                              <div key={room.id} className="flex items-center justify-between soft-well px-3 py-2.5 border border-white/60">
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-foreground truncate">{room.name}</p>
                                  <p className="text-[9px] text-foreground/40 font-bold uppercase tracking-widest">{room.type}{room.sqft ? ` · ${room.sqft} sqft` : ''}</p>
                                </div>
                                {isVacant ? (
                                  <button
                                    onClick={() => setRoomRequestModal({ roomId: room.id, roomName: room.name, propertyName: property.name })}
                                    className="shrink-0 ml-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest bg-secondary/10 text-secondary border border-secondary/20 rounded-lg hover:bg-secondary hover:text-white transition-all"
                                  >
                                    Request
                                  </button>
                                ) : (
                                  <span className="shrink-0 ml-2 px-2 py-1 text-[9px] font-bold uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">
                                    {room.occupancy_status ?? 'Occupied'}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Link href={`/properties/${property.id}`}
                      className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-1 justify-center transition-colors">
                      View full details <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VISITS & BOOKINGS TAB ── */}
        {activeTab === 'visits' && (
          <div className="space-y-8 max-w-2xl">
            {/* Bookings */}
            <section>
              <h3 className="text-lg font-bold tracking-tight text-foreground mb-4">Room Bookings</h3>
              {bookings.length === 0 ? (
                <div className="soft-well p-6 text-center text-xs text-foreground/40">
                  No bookings yet. Pay a ₹5,000 token to secure your room.
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b: any) => (
                    <div key={b.id} className="soft-card border border-white p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-foreground text-sm">{b.properties?.name}</p>
                          <p className="text-[10px] text-foreground/40">{b.properties?.location}</p>
                          {b.rooms && <p className="text-[10px] text-foreground/40 mt-0.5">{b.rooms.name} — {b.rooms.type}</p>}
                        </div>
                        <span className={cn(
                          'text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg',
                          b.status === 'paid' ? 'bg-secondary/10 text-secondary' :
                          b.status === 'confirmed' ? 'bg-blue-100 text-blue-600' :
                          b.status === 'cancelled' ? 'bg-red-100 text-red-500' :
                          'bg-amber-100 text-amber-600'
                        )}>
                          {b.status}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/50">Token: ₹{Number(b.token_amount).toLocaleString('en-IN')}</p>
                      {b.status === 'paid' && (
                        <button
                          onClick={() => setTenantRequestModal({ bookingId: b.id })}
                          className="btn-terracotta w-full py-2.5 text-[11px] font-bold flex items-center justify-center gap-1.5"
                        >
                          <Home className="w-3.5 h-3.5" /> Request Tenant Access
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Visit Requests */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold tracking-tight text-foreground">Visit Requests</h3>
                <button
                  onClick={() => properties[0] && setVisitModal({ propertyId: properties[0].id, propertyName: properties[0].name })}
                  className="soft-button px-3 py-1.5 text-[11px] font-bold text-primary border border-primary/20"
                >
                  + New Visit
                </button>
              </div>
              {visitRequests.length === 0 ? (
                <div className="soft-well p-6 text-center text-xs text-foreground/40">
                  No visit requests yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {visitRequests.map((v: any) => (
                    <div key={v.id} className="soft-card border border-white p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm text-foreground">{v.properties?.name}</p>
                        {v.preferred_date && <p className="text-[10px] text-foreground/40 mt-0.5"><Calendar className="inline w-3 h-3 mr-1" />{v.preferred_date}</p>}
                        {v.message && <p className="text-[10px] text-foreground/40 mt-0.5 line-clamp-1">{v.message}</p>}
                      </div>
                      <span className={cn(
                        'text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg shrink-0',
                        v.status === 'confirmed' ? 'bg-secondary/10 text-secondary' :
                        v.status === 'cancelled' ? 'bg-red-100 text-red-500' :
                        'bg-amber-100 text-amber-600'
                      )}>
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── SUPPORT TAB ── */}
        {activeTab === 'support' && (
          <div className="max-w-lg space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Support</h2>
              <p className="text-foreground/40 text-xs mt-1">Can't find what you need in Aara AI? Reach our team directly.</p>
            </div>
            <div className="soft-card border border-white p-6 space-y-4">
              <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30">Describe your query</label>
              <textarea
                rows={5}
                value={supportDesc}
                onChange={e => setSupportDesc(e.target.value)}
                placeholder="E.g. I have a question about room availability in January..."
                className="soft-ui-in w-full p-4 text-xs text-foreground focus:outline-none focus:ring-4 focus:ring-primary/5 resize-none"
              />
              <button
                onClick={submitSupport}
                disabled={!supportDesc.trim() || formLoading}
                className="btn-terracotta w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MessageCircle className="w-4 h-4" /> Send to Support Team</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Visit Modal ── */}
      <AnimatePresence>
        {visitModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="soft-card border border-white bg-background w-full max-w-md p-6 space-y-5"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-foreground">Schedule a Visit</h3>
                <button onClick={() => setVisitModal(null)} className="soft-button w-8 h-8 flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-foreground/50">{visitModal.propertyName}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 ml-1">Preferred Date</label>
                  <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                    className="soft-ui-in w-full px-4 py-3 text-xs text-foreground mt-1" />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 ml-1">Message (optional)</label>
                  <textarea rows={3} value={visitMessage} onChange={e => setVisitMessage(e.target.value)}
                    placeholder="Any questions or requirements..."
                    className="soft-ui-in w-full px-4 py-3 text-xs text-foreground mt-1 resize-none" />
                </div>
              </div>
              <button onClick={submitVisit} disabled={formLoading}
                className="btn-terracotta w-full py-3 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Calendar className="w-4 h-4" /> Request Visit</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Book Modal ── */}
      <AnimatePresence>
        {bookModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="soft-card border border-white bg-background w-full max-w-md p-6 space-y-5"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-foreground">Secure Your Room</h3>
                <button onClick={() => setBookModal(null)} className="soft-button w-8 h-8 flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div className="soft-well p-4 space-y-2">
                <p className="text-sm font-bold text-foreground">{bookModal.propertyName}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-foreground/50">Token Amount</span>
                  <span className="text-lg font-bold text-primary">₹5,000</span>
                </div>
                <p className="text-[10px] text-foreground/40 leading-relaxed">
                  This refundable token secures your interest. After payment, you can request tenant access via your bookings.
                </p>
              </div>
              <button onClick={initiateBooking} disabled={formLoading}
                className="btn-terracotta w-full py-4 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-4 h-4" /> Pay ₹5,000 via Razorpay</>}
              </button>
              <p className="text-[9px] text-center text-foreground/20 uppercase tracking-widest">Secured by Razorpay</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tenant Access Request Modal ── */}
      <AnimatePresence>
        {tenantRequestModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="soft-card border border-white bg-background w-full max-w-sm p-6 space-y-5 text-center"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
                <Home className="w-7 h-7 text-secondary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Request Tenant Access</h3>
                <p className="text-xs text-foreground/50 mt-2 leading-relaxed">
                  Your request will be reviewed by our admin team. Once approved, you'll receive full access to the tenant portal.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setTenantRequestModal(null)} className="flex-1 soft-button py-3 text-xs font-bold">Cancel</button>
                <button
                  onClick={() => requestTenantAccess(tenantRequestModal.bookingId)}
                  disabled={formLoading}
                  className="flex-1 btn-terracotta py-3 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Request'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Room Request Modal ── */}
      <AnimatePresence>
        {roomRequestModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="soft-card border border-white bg-background w-full max-w-md p-6 space-y-5"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-foreground">Request This Room</h3>
                  <p className="text-xs text-foreground/50 mt-0.5">{roomRequestModal.roomName} · {roomRequestModal.propertyName}</p>
                </div>
                <button onClick={() => setRoomRequestModal(null)} className="soft-button w-8 h-8 flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 ml-1">Preferred Move-in Date</label>
                  <input type="date" value={roomRequestMoveIn} onChange={e => setRoomRequestMoveIn(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="soft-ui-in w-full px-4 py-3 text-xs text-foreground mt-1" />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 ml-1">Message (optional)</label>
                  <textarea rows={3} value={roomRequestMessage} onChange={e => setRoomRequestMessage(e.target.value)}
                    placeholder="Any details about yourself or questions for the admin..."
                    className="soft-ui-in w-full px-4 py-3 text-xs text-foreground mt-1 resize-none" />
                </div>
              </div>
              <p className="text-[9px] text-foreground/30 leading-relaxed">
                Your request will be reviewed by the admin. Once approved, you'll get full tenant portal access.
              </p>
              <button onClick={submitRoomRequest} disabled={formLoading}
                className="btn-terracotta w-full py-3 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Home className="w-4 h-4" /> Send Room Request</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
