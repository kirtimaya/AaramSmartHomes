'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket, LogOut, MessageSquare, MessageCircle, FileText, Download,
  CheckCircle2, Clock, AlertCircle, Loader2, Send, ChevronRight,
  Shield, FileCheck, Receipt, Phone, Plus, Wrench, Zap, Droplets,
  Wind, HelpCircle, X, BatteryCharging, CreditCard, Camera, Upload,
} from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Ticket as TicketType } from '@/lib/types';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type SupportSection = 'tickets' | 'electricity' | 'moveout' | 'contact' | 'feedback' | 'vault';

const SECTIONS: { id: SupportSection; icon: React.ElementType; label: string }[] = [
  { id: 'tickets',     icon: Ticket,          label: 'Tickets'     },
  { id: 'electricity', icon: BatteryCharging, label: 'Electricity' },
  { id: 'moveout',     icon: LogOut,          label: 'Move-Out'    },
  { id: 'contact',     icon: Phone,           label: 'Contact'     },
  { id: 'feedback',    icon: MessageCircle,   label: 'Feedback'    },
  { id: 'vault',       icon: Shield,          label: 'Vault'       },
];

const STATUS_STYLE: Record<string, string> = {
  Pending:     'bg-amber-500/10  text-amber-600  border-amber-500/20',
  'In-Progress': 'bg-blue-500/10   text-blue-600   border-blue-500/20',
  Resolved:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

const PRIORITY_STYLE: Record<string, string> = {
  Low:    'text-emerald-600',
  Medium: 'text-amber-600',
  High:   'text-orange-600',
  Urgent: 'text-red-600',
};

const VAULT_DOCS = [
  { icon: FileCheck, label: 'Rental Agreement',    desc: 'Your signed tenancy agreement',      bucket: 'tenant-documents', path: 'rental-agreement.pdf' },
  { icon: Receipt,   label: 'Rent Receipt – May',  desc: 'Official receipt for May 2026',       bucket: 'tenant-documents', path: 'receipts/2026-05.pdf' },
  { icon: Receipt,   label: 'Rent Receipt – Apr',  desc: 'Official receipt for April 2026',     bucket: 'tenant-documents', path: 'receipts/2026-04.pdf' },
  { icon: FileText,  label: 'Community Guidelines', desc: 'House rules and policies document',  bucket: 'tenant-documents', path: 'guidelines.pdf' },
];

// ────────────────────────────────────────────────────────────────────────────

interface Props { tenantId: string }

export function SupportTab({ tenantId }: Props) {
  const [section, setSection] = useState<SupportSection>('tickets');

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-widest whitespace-nowrap transition-all border shrink-0',
              section === s.id
                ? 'btn-terracotta text-white border-primary shadow-md'
                : 'soft-button border-white text-foreground/40 hover:text-foreground'
            )}
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{   opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {section === 'tickets'     && <TicketsSection     tenantId={tenantId} />}
          {section === 'electricity' && <ElectricitySection tenantId={tenantId} />}
          {section === 'moveout'     && <MoveOutSection     tenantId={tenantId} />}
          {section === 'contact'     && <ContactSection />}
          {section === 'feedback'    && <FeedbackSection    tenantId={tenantId} />}
          {section === 'vault'       && <VaultSection       tenantId={tenantId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tickets section
// ────────────────────────────────────────────────────────────────────────────

type TicketCategory = 'Maintenance' | 'Electrical' | 'Plumbing' | 'Housekeeping' | 'Other';
type TicketPriority  = 'Low' | 'Medium' | 'High' | 'Urgent';

const TICKET_CATEGORIES: { value: TicketCategory; icon: React.ElementType; color: string }[] = [
  { value: 'Maintenance',  icon: Wrench,     color: 'text-amber-600  bg-amber-50  border-amber-300/60'  },
  { value: 'Electrical',   icon: Zap,        color: 'text-yellow-600 bg-yellow-50 border-yellow-300/60' },
  { value: 'Plumbing',     icon: Droplets,   color: 'text-blue-600   bg-blue-50   border-blue-300/60'   },
  { value: 'Housekeeping', icon: Wind,       color: 'text-green-600  bg-green-50  border-green-300/60'  },
  { value: 'Other',        icon: HelpCircle, color: 'text-purple-600 bg-purple-50 border-purple-300/60' },
];

const TICKET_PRIORITIES: { value: TicketPriority; active: string }[] = [
  { value: 'Low',    active: 'bg-emerald-500 border-emerald-500 text-white' },
  { value: 'Medium', active: 'bg-amber-500   border-amber-500   text-white' },
  { value: 'High',   active: 'bg-orange-500  border-orange-500  text-white' },
  { value: 'Urgent', active: 'bg-red-500     border-red-500     text-white' },
];

function TicketsSection({ tenantId }: { tenantId: string }) {
  const [tickets,     setTickets]     = useState<TicketType[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [category,    setCategory]    = useState<TicketCategory>('Maintenance');
  const [priority,    setPriority]    = useState<TicketPriority>('Medium');
  const [description, setDescription] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('requester_id', tenantId)
      .order('created_at', { ascending: false });
    if (data) setTickets(data as TicketType[]);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [tenantId]);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    await supabase.from('tickets').insert({
      requester_id: tenantId, requester_type: 'tenant', category, priority,
      description: description.trim(), status: 'Pending',
    });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(async () => {
      setSubmitted(false);
      setDescription('');
      setCategory('Maintenance');
      setPriority('Medium');
      setShowForm(false);
      await fetchTickets();
    }, 1800);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* Raise ticket button / inline form */}
      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.button
            key="open-btn"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(true)}
            className="w-full flex items-center gap-3 soft-card border border-primary/20 bg-primary/5 px-5 py-4 text-left hover:bg-primary/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-tight text-primary">Raise a Ticket</p>
              <p className="text-[10px] text-foreground/40 font-medium">Our team responds within 2 hours</p>
            </div>
          </motion.button>
        ) : submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="soft-card border border-emerald-300/40 bg-emerald-50 p-6 flex flex-col items-center gap-2 text-center"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p className="font-extrabold uppercase tracking-tight text-emerald-700">Ticket submitted!</p>
            <p className="text-[11px] text-emerald-600/70">We'll get back to you shortly.</p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="soft-card border border-white bg-white/50 p-5 space-y-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold uppercase tracking-tight">New Ticket</p>
              <button onClick={() => setShowForm(false)} className="soft-button w-7 h-7 border border-white text-foreground/30">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Category</p>
              <div className="grid grid-cols-5 gap-2">
                {TICKET_CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className={cn('flex flex-col items-center gap-1 p-2.5 rounded-xl border text-[9px] font-extrabold uppercase tracking-widest transition-all',
                      category === c.value ? c.color : 'border-foreground/10 text-foreground/30 hover:border-foreground/20'
                    )}>
                    <c.icon className="w-4 h-4" />
                    {c.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Priority</p>
              <div className="flex gap-2">
                {TICKET_PRIORITIES.map(p => (
                  <button key={p.value} onClick={() => setPriority(p.value)}
                    className={cn('flex-1 py-2 rounded-xl border text-[9px] font-extrabold uppercase tracking-widest transition-all',
                      priority === p.value ? p.active : 'border-foreground/10 text-foreground/30 hover:border-foreground/20'
                    )}>
                    {p.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Describe the issue</p>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                rows={3} placeholder="e.g. Tap in bathroom is dripping constantly..."
                className="w-full soft-well border border-white rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!description.trim() || submitting}
              className={cn('w-full py-3.5 rounded-xl text-[11px] font-extrabold uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                description.trim() && !submitting ? 'btn-terracotta' : 'bg-foreground/5 text-foreground/20 cursor-not-allowed'
              )}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing tickets list */}
      {tickets.length === 0 ? (
        <EmptyState icon={Ticket} title="No tickets yet" sub="Raise your first one above." />
      ) : tickets.map((t, i) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="soft-card border border-white bg-white/40 p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-extrabold uppercase tracking-tight text-foreground">{t.category}</p>
                <span className={cn('text-[10px] font-extrabold uppercase tracking-widest', PRIORITY_STYLE[t.priority])}>
                  {t.priority}
                </span>
              </div>
              <p className="text-[11px] text-foreground/50 font-medium mt-1 line-clamp-2">{t.description}</p>
            </div>
            <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] font-extrabold uppercase tracking-widest shrink-0', STATUS_STYLE[t.status] ?? '')}>
              {t.status === 'Resolved'    ? <CheckCircle2 className="w-2.5 h-2.5" /> :
               t.status === 'In-Progress' ? <Clock        className="w-2.5 h-2.5" /> :
                                            <AlertCircle  className="w-2.5 h-2.5" />}
              {t.status}
            </span>
          </div>
          <p className="text-[9px] font-bold text-foreground/25 uppercase tracking-widest">
            {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Move-Out section
// ────────────────────────────────────────────────────────────────────────────

function MoveOutSection({ tenantId }: { tenantId: string }) {
  const [moveOutDate, setMoveOutDate] = useState('');
  const [reason,      setReason]      = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [done,        setDone]        = useState(false);

  const handleSubmit = async () => {
    if (!moveOutDate) return;
    setSubmitting(true);

    await supabase.from('tickets').insert({
      requester_id:   tenantId,
      requester_type: 'tenant',
      category:       'Move-Out Request',
      priority:       'High',
      description:    `Requested move-out on ${moveOutDate}. ${reason ? 'Reason: ' + reason : ''}`,
      status:         'Pending',
    });

    setSubmitting(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="soft-card border border-white bg-white/40 p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Move-Out Initiated</p>
        <p className="text-xs text-foreground/40 max-w-xs">
          Our team will review your request and reach out within 24 hours to schedule a walkthrough and handover checklist.
        </p>
      </div>
    );
  }

  return (
    <div className="soft-card border border-white bg-white/40 p-7 space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-black tracking-tighter uppercase">Initiate Move-Out</h3>
        <p className="text-[10px] font-bold text-foreground/35 uppercase tracking-widest mt-1">
          30-day notice period applies as per your agreement
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Preferred Move-Out Date</label>
          <input
            type="date"
            value={moveOutDate}
            onChange={e => setMoveOutDate(e.target.value)}
            min={new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}
            className="w-full soft-well border border-white px-4 py-3 text-sm font-bold text-foreground outline-none rounded-2xl focus:border-primary/40 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Reason (Optional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="e.g., Relocating to another city for work..."
            className="w-full soft-well border border-white px-4 py-3 text-sm font-medium text-foreground placeholder:text-foreground/20 resize-none outline-none rounded-2xl focus:border-primary/40 transition-colors"
          />
        </div>
      </div>

      <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200/60">
        <p className="text-[11px] text-amber-700 font-bold leading-snug">
          <strong>Note:</strong> Move-out requests trigger a 30-day notice period. Your rent continues until the confirmed move-out date. A security deposit refund will be processed after room inspection.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!moveOutDate || submitting}
        className={cn(
          'w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
          moveOutDate && !submitting
            ? 'btn-terracotta shadow-lg shadow-primary/20'
            : 'bg-foreground/5 text-foreground/20 cursor-not-allowed'
        )}
      >
        {submitting
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
          : <><LogOut className="w-4 h-4" /> Submit Move-Out Request</>}
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Contact section
// ────────────────────────────────────────────────────────────────────────────

function ContactSection() {
  const WA_NUMBER = '919876543210'; // Replace with actual WhatsApp business number
  const WA_MSG    = encodeURIComponent('Hi Aaram Smart Homes! I need some assistance.');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
      {/* WhatsApp */}
      <div className="soft-card border border-white bg-white/40 p-7 space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-[#25D366]/10 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-[#25D366]" />
        </div>
        <div>
          <h3 className="text-base font-extrabold uppercase tracking-tight">WhatsApp Concierge</h3>
          <p className="text-xs text-foreground/40 font-bold mt-1 leading-relaxed">
            Chat directly with our property management team. Available 9 AM – 9 PM.
          </p>
        </div>
        <a
          href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full btn-terracotta py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-widest shadow-lg"
          style={{ background: '#25D366' }}
        >
          <MessageSquare className="w-4 h-4" />
          Chat on WhatsApp
        </a>
      </div>

      {/* Call */}
      <div className="soft-card border border-white bg-white/40 p-7 space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Phone className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-extrabold uppercase tracking-tight">Call Management</h3>
          <p className="text-xs text-foreground/40 font-bold mt-1 leading-relaxed">
            Speak with our property manager for urgent matters. Available 10 AM – 7 PM.
          </p>
        </div>
        <a
          href="tel:+919876543210"
          className="w-full btn-terracotta py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-widest shadow-lg"
        >
          <Phone className="w-4 h-4" />
          Call Now
        </a>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Feedback section
// ────────────────────────────────────────────────────────────────────────────

function FeedbackSection({ tenantId }: { tenantId: string }) {
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);

    // INSERT INTO food_suggestions (tenant_id, suggestion) — or a dedicated feedback table
    await supabase.from('food_suggestions').insert({
      tenant_id:  tenantId,
      suggestion: text.trim(),
    });

    setSubmitting(false);
    setDone(true);
    setTimeout(() => { setDone(false); setText(''); }, 3000);
  };

  return (
    <div className="soft-card border border-white bg-white/40 p-7 space-y-5 max-w-lg">
      <div>
        <h3 className="text-lg font-black tracking-tighter uppercase">Share Feedback</h3>
        <p className="text-[10px] font-bold text-foreground/35 uppercase tracking-widest mt-1">
          Suggestions for food, amenities, or anything else
        </p>
      </div>

      {done ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-6 flex flex-col items-center gap-3 text-center"
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Thanks for the feedback!</p>
        </motion.div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={5}
            placeholder="e.g., It would be great to have Saturday brunch or a smoothie station added in the common area..."
            className="w-full soft-well border border-white px-4 py-3 text-sm font-medium text-foreground placeholder:text-foreground/20 resize-none outline-none rounded-2xl focus:border-primary/40 transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className={cn(
              'w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
              text.trim() && !submitting
                ? 'btn-terracotta shadow-lg shadow-primary/20'
                : 'bg-foreground/5 text-foreground/20 cursor-not-allowed'
            )}
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              : <><Send className="w-4 h-4" /> Send Feedback</>}
          </button>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Vault section
// ────────────────────────────────────────────────────────────────────────────

function VaultSection({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleDownload = async (doc: typeof VAULT_DOCS[0]) => {
    setLoading(doc.label);
    // Generate a signed URL from Supabase Storage
    // Bucket: '{doc.bucket}', Path: '{tenantId}/{doc.path}'
    // e.g.: supabase.storage.from(doc.bucket).createSignedUrl(`${tenantId}/${doc.path}`, 60)
    const { data, error } = await supabase.storage
      .from(doc.bucket)
      .createSignedUrl(`${tenantId}/${doc.path}`, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      // Fallback: show error toast or open placeholder
      console.warn('Document not found:', error?.message);
      alert('Document not yet uploaded. Please contact management.');
    }
    setLoading(null);
  };

  return (
    <div className="space-y-3 max-w-lg">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/35">
        Your Documents
      </p>
      {VAULT_DOCS.map(doc => (
        <div key={doc.label} className="soft-card border border-white bg-white/40 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
              <doc.icon className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-tight text-foreground">{doc.label}</p>
              <p className="text-[10px] text-foreground/40 font-bold mt-0.5">{doc.desc}</p>
            </div>
          </div>
          <button
            onClick={() => handleDownload(doc)}
            disabled={loading === doc.label}
            className="soft-button border border-white w-9 h-9 text-secondary hover:text-primary transition-colors"
          >
            {loading === doc.label
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
          </button>
        </div>
      ))}
      <p className="text-[10px] text-foreground/25 font-bold px-2">
        Files are served from Supabase Storage bucket <code className="bg-foreground/5 px-1 rounded">tenant-documents/{'{'}tenantId{'}'}/</code>
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Electricity section — bill share status + AC unit submission
// ────────────────────────────────────────────────────────────────────────────

import type { BillShareResponse } from '@/app/api/tenant/bills/my-share/route';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const e = Object.entries(localStorage).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (e) { try { const t = JSON.parse(e[1])?.access_token; if (t) return { Authorization: `Bearer ${t}` }; } catch {} }
  return {};
}

function ElectricitySection({ tenantId }: { tenantId: string }) {
  const [share,      setShare]      = useState<BillShareResponse | null>(null);
  const [hasAC,      setHasAC]      = useState(false);
  const [activeBill, setActiveBill] = useState<{ id: string; bill_month: string } | null>(null);
  const [existing,   setExisting]   = useState<number | null>(null);
  const [acUnits,    setAcUnits]    = useState('');
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState('');

  // Meter photo upload
  const meterPhotoRef                   = useRef<HTMLInputElement>(null);
  const [meterPhoto, setMeterPhoto]     = useState<File | null>(null);
  const [meterPhotoUrl, setMeterPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Main bill upload
  const billFileRef                     = useRef<HTMLInputElement>(null);
  const [billMonth,  setBillMonth]      = useState('');
  const [billFile,   setBillFile]       = useState<File | null>(null);
  const [uploadingBill, setUploadingBill] = useState(false);
  const [billUploaded, setBillUploaded] = useState(false);
  const [billUploadErr, setBillUploadErr] = useState('');

  const load = async () => {
    setLoading(true);
    // Fetch bill share status
    const res = await fetch('/api/tenant/bills/my-share', { headers: getAuthHeader() });
    if (res.ok) setShare(await res.json());

    // Fetch room's AC flag + current validated bill for submission
    const { data: tenant } = await supabase.from('tenants').select('room_id').eq('id', tenantId).single();
    if (!tenant?.room_id) { setLoading(false); return; }

    const { data: room } = await supabase.from('rooms').select('property_id, has_ac').eq('id', tenant.room_id).single();
    setHasAC(!!room?.has_ac);

    if (room?.property_id) {
      const { data: bills } = await supabase
        .from('electricity_bills')
        .select('id, bill_month')
        .eq('property_id', room.property_id)
        .eq('status', 'validated')
        .order('bill_month', { ascending: false })
        .limit(1);

      if (bills?.length) {
        setActiveBill(bills[0]);
        const { data: sub } = await supabase
          .from('tenant_ac_submissions')
          .select('ac_units_submitted')
          .eq('bill_id', bills[0].id)
          .eq('tenant_id', tenantId)
          .maybeSingle();
        if (sub) { setExisting(sub.ac_units_submitted); setAcUnits(String(sub.ac_units_submitted)); }
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  // Upload meter photo to storage, return public URL
  const handleMeterPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBill) return;
    setMeterPhoto(file);
    setUploadingPhoto(true);
    const path = `ac-meter-photos/${tenantId}/${activeBill.id}.${file.name.split('.').pop() || 'jpg'}`;
    const { error } = await supabase.storage.from('bills').upload(path, file, { upsert: true, contentType: file.type });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('bills').getPublicUrl(path);
      setMeterPhotoUrl(publicUrl);
    }
    setUploadingPhoto(false);
  };

  const handleSubmit = async () => {
    if (!activeBill || !acUnits.trim()) return;
    const val = parseFloat(acUnits);
    if (isNaN(val) || val < 0) { setError('Enter a valid number ≥ 0'); return; }
    setError('');
    setSubmitting(true);
    const res = await fetch(`/api/bills/${activeBill.id}/ac-units`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ac_units_submitted: val, meter_photo_url: meterPhotoUrl }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(json.error || 'Submission failed'); return; }
    setExisting(val);
    setSaved(true);
    setTimeout(async () => { setSaved(false); await load(); }, 2000);
  };

  const handleBillUpload = async () => {
    if (!billFile || !billMonth) return;
    setBillUploadErr('');
    setUploadingBill(true);
    const fd = new FormData();
    fd.append('bill_month', billMonth);
    fd.append('image', billFile);
    const res = await fetch('/api/tenant/bills/upload', {
      method: 'POST',
      headers: getAuthHeader(),
      body: fd,
    });
    const json = await res.json();
    setUploadingBill(false);
    if (!res.ok) { setBillUploadErr(json.error || 'Upload failed'); return; }
    setBillUploaded(true);
    setBillFile(null);
    setBillMonth('');
    setTimeout(() => setBillUploaded(false), 4000);
  };

  if (loading) return <Spinner />;

  const STATUS_CONFIG = {
    no_bill:          { icon: BatteryCharging, color: 'text-foreground/30', bg: 'bg-foreground/5',   border: 'border-foreground/10' },
    pending:          { icon: Clock,           color: 'text-amber-600',     bg: 'bg-amber-50',        border: 'border-amber-200/60'  },
    rejected:         { icon: AlertCircle,     color: 'text-red-600',       bg: 'bg-red-50',          border: 'border-red-200/60'    },
    waiting_readings: { icon: Clock,           color: 'text-blue-600',      bg: 'bg-blue-50',         border: 'border-blue-200/60'   },
    calculated:       { icon: CheckCircle2,    color: 'text-purple-600',    bg: 'bg-purple-50',       border: 'border-purple-200/60' },
    locked:           { icon: CheckCircle2,    color: 'text-emerald-600',   bg: 'bg-emerald-50',      border: 'border-emerald-200/60'},
  } as const;

  const cfg = share ? STATUS_CONFIG[share.status] : STATUS_CONFIG.no_bill;
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-4">
      {/* ── Bill share status card ── */}
      <div className={cn('soft-card border p-5 space-y-3', cfg.bg, cfg.border)}>
        <div className="flex items-start gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
            <StatusIcon className={cn('w-5 h-5', cfg.color)} />
          </div>
          <div className="flex-1 min-w-0">
            {share?.bill_month && (
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 mb-0.5">{share.bill_month}</p>
            )}
            <p className={cn('text-sm font-bold leading-snug', cfg.color)}>{share?.message ?? 'Loading billing status…'}</p>
          </div>
        </div>

        {/* AC reading progress bar */}
        {share?.ac_progress && share.ac_progress.total > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">
              <span>AC Meter Readings</span>
              <span>{share.ac_progress.submitted}/{share.ac_progress.total} submitted</span>
            </div>
            <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-700"
                style={{ width: `${(share.ac_progress.submitted / share.ac_progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── My split breakdown (when calculated or locked) ── */}
      {share?.my_split && (
        <div className="soft-card border border-white bg-white/40 p-5 space-y-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">Your Bill Breakdown</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'AC Charge',     value: `₹${share.my_split.ac_charge.toLocaleString('en-IN')}`,     sub: `${share.my_split.ac_units} units` },
              { label: 'Common Share',  value: `₹${share.my_split.common_share.toLocaleString('en-IN')}`,  sub: 'your portion' },
              { label: 'Total Payable', value: `₹${share.my_split.total_payable.toLocaleString('en-IN')}`, sub: share.status === 'locked' ? 'finalised' : 'estimated', highlight: true },
            ].map(item => (
              <div key={item.label} className={cn('soft-well border border-white rounded-xl p-3 text-center', item.highlight && 'border-primary/20 bg-primary/5')}>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30">{item.label}</p>
                <p className={cn('text-lg font-black tracking-tighter mt-0.5', item.highlight ? 'text-primary' : 'text-foreground')}>{item.value}</p>
                <p className="text-[9px] text-foreground/30 font-medium">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* All flatmates summary (locked only, totals only) */}
          {share.status === 'locked' && share.all_splits && share.all_splits.length > 1 && (
            <div className="space-y-1.5 border-t border-foreground/5 pt-3">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/25">All Flatmates</p>
              {share.all_splits.map(s => (
                <div key={s.tenant_name} className="flex justify-between items-center text-xs">
                  <span className="text-foreground/50 font-medium">{s.tenant_name}</span>
                  <span className="font-bold text-foreground">₹{s.total_payable.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AC meter reading submission (only when bill is validated & room has AC) ── */}
      {hasAC && activeBill && (
        <div className="soft-card border border-white bg-white/40 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">Submit AC Reading</p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {new Date(activeBill.bill_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-blue-400/30 bg-blue-50 text-blue-600">
              Open
            </span>
          </div>

          {existing !== null && (
            <div className="soft-well border border-emerald-300/30 bg-emerald-50/60 px-4 py-3 rounded-xl">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Current submission</p>
              <p className="text-2xl font-black text-emerald-700 tracking-tighter">{existing} <span className="text-sm font-bold text-emerald-600/60">units</span></p>
              <p className="text-[10px] text-emerald-600/60 mt-0.5">You can update this before the bill is locked.</p>
            </div>
          )}

          {/* Units input */}
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">AC Units Used This Month</label>
            <div className="flex gap-3">
              <input
                type="number" min="0" step="0.5"
                value={acUnits} onChange={e => setAcUnits(e.target.value)}
                placeholder="e.g. 120"
                className="flex-1 soft-well border border-white rounded-xl px-4 py-3 text-base font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60"
              />
              <button
                onClick={handleSubmit}
                disabled={!acUnits.trim() || submitting}
                className={cn('px-6 py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-widest transition-all flex items-center gap-2',
                  acUnits.trim() && !submitting ? 'btn-terracotta' : 'bg-foreground/5 text-foreground/20 cursor-not-allowed'
                )}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 saved      ? <CheckCircle2 className="w-4 h-4 text-white" /> :
                              <Send className="w-4 h-4" />}
                {submitting ? 'Saving…' : saved ? 'Saved!' : 'Submit'}
              </button>
            </div>
            {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
            <p className="text-[10px] text-foreground/30">Check your AC meter at month-end and enter total units consumed.</p>
          </div>

          {/* Meter photo upload */}
          <div className="border-t border-white/60 pt-4 space-y-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 flex items-center gap-1.5">
              <Camera className="w-3 h-3" /> Meter Photo <span className="text-foreground/20 normal-case tracking-normal font-medium">(optional)</span>
            </label>
            {meterPhotoUrl ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-[11px] font-bold text-emerald-700 flex-1 truncate">
                  {meterPhoto?.name ?? 'Photo uploaded'}
                </span>
                <button onClick={() => { setMeterPhoto(null); setMeterPhotoUrl(null); }}
                  className="text-emerald-400 hover:text-red-400 transition-colors text-[10px] font-bold">Remove</button>
              </div>
            ) : (
              <button
                onClick={() => meterPhotoRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-full soft-button border border-dashed border-foreground/20 py-3 flex items-center justify-center gap-2 text-[11px] font-bold text-foreground/40 hover:text-foreground/60 hover:border-foreground/30 transition-colors rounded-xl"
              >
                {uploadingPhoto
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                  : <><Camera className="w-3.5 h-3.5" /> Take / Upload Photo</>}
              </button>
            )}
            <input
              ref={meterPhotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleMeterPhoto}
            />
          </div>
        </div>
      )}

      {/* No AC room message */}
      {!hasAC && !share?.my_split && (
        <div className="soft-card border border-white p-5 flex items-center gap-3 text-sm text-foreground/40">
          <BatteryCharging className="w-5 h-5 shrink-0" />
          Your room does not have AC — no meter reading required from you.
        </div>
      )}

      {/* ── Upload main electricity bill ─── */}
      <div className="soft-card border border-white bg-white/40 p-5 space-y-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30 flex items-center gap-1.5">
            <Upload className="w-3 h-3" /> Upload Electricity Bill
          </p>
          <p className="text-[11px] text-foreground/40 mt-1">
            If you have the physical bill, upload a photo and we'll add it to your account.
          </p>
        </div>

        {billUploaded && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] font-bold text-emerald-700">Bill submitted — our team will review it shortly.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Bill Month</label>
            <input
              type="month"
              value={billMonth}
              onChange={e => setBillMonth(e.target.value)}
              className="w-full soft-well border border-white rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white/60"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Bill Image / PDF</label>
            <button
              onClick={() => billFileRef.current?.click()}
              className="w-full soft-well border border-white rounded-xl px-4 py-3 text-[11px] font-bold text-left text-foreground/40 hover:text-foreground/60 transition-colors bg-white/60"
            >
              {billFile ? billFile.name : 'Choose file…'}
            </button>
            <input ref={billFileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setBillFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        {billUploadErr && <p className="text-[11px] text-red-500 font-medium">{billUploadErr}</p>}

        <button
          onClick={handleBillUpload}
          disabled={!billFile || !billMonth || uploadingBill}
          className={cn(
            'px-6 py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-2 transition-all',
            billFile && billMonth && !uploadingBill
              ? 'btn-terracotta'
              : 'bg-foreground/5 text-foreground/20 cursor-not-allowed'
          )}
        >
          {uploadingBill ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</> : <><Upload className="w-3.5 h-3.5" /> Submit Bill</>}
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="soft-card border border-white p-10 flex flex-col items-center gap-3 text-center">
      <Icon className="w-8 h-8 text-foreground/20" />
      <p className="text-sm font-extrabold uppercase tracking-widest text-foreground/30">{title}</p>
      <p className="text-[11px] text-foreground/20">{sub}</p>
    </div>
  );
}
