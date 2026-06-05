'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket, LogOut, MessageSquare, MessageCircle, FileText, Download,
  CheckCircle2, Clock, AlertCircle, Loader2, Send, ChevronRight,
  Shield, FileCheck, Receipt, Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Ticket as TicketType } from '@/lib/types';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type SupportSection = 'tickets' | 'moveout' | 'contact' | 'feedback' | 'vault';

const SECTIONS: { id: SupportSection; icon: React.ElementType; label: string }[] = [
  { id: 'tickets',  icon: Ticket,        label: 'Tickets'    },
  { id: 'moveout',  icon: LogOut,        label: 'Move-Out'   },
  { id: 'contact',  icon: Phone,         label: 'Contact'    },
  { id: 'feedback', icon: MessageCircle, label: 'Feedback'   },
  { id: 'vault',    icon: Shield,        label: 'Vault'      },
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
          {section === 'tickets'  && <TicketsSection  tenantId={tenantId} />}
          {section === 'moveout'  && <MoveOutSection  tenantId={tenantId} />}
          {section === 'contact'  && <ContactSection  />}
          {section === 'feedback' && <FeedbackSection tenantId={tenantId} />}
          {section === 'vault'    && <VaultSection    tenantId={tenantId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tickets section
// ────────────────────────────────────────────────────────────────────────────

function TicketsSection({ tenantId }: { tenantId: string }) {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // SELECT * FROM tickets WHERE tenant_id = ? ORDER BY created_at DESC
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (data) setTickets(data as TicketType[]);
      setLoading(false);
    })();
  }, [tenantId]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-3">
      {tickets.length === 0 ? (
        <EmptyState icon={Ticket} title="No tickets yet" sub="Raise one from the Dashboard." />
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
              {t.status === 'Resolved'     ? <CheckCircle2 className="w-2.5 h-2.5" /> :
               t.status === 'In-Progress'  ? <Clock        className="w-2.5 h-2.5" /> :
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

    // INSERT INTO tickets (tenant_id, category, priority, description, status)
    // Also update tenants.notice_date = today via a separate call if desired
    await supabase.from('tickets').insert({
      tenant_id:   tenantId,
      category:    'Move-Out Request',
      priority:    'High',
      description: `Requested move-out on ${moveOutDate}. ${reason ? 'Reason: ' + reason : ''}`,
      status:      'Pending',
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
