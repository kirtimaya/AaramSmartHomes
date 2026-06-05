'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Wrench, Zap, Droplets, Wind, HelpCircle,
  AlertTriangle, Loader2, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

type Category = 'Maintenance' | 'Electrical' | 'Plumbing' | 'Housekeeping' | 'Other';
type Priority  = 'Low' | 'Medium' | 'High' | 'Urgent';

const CATEGORIES: { value: Category; icon: React.ElementType; color: string }[] = [
  { value: 'Maintenance', icon: Wrench,     color: 'text-amber-600 bg-amber-50  border-amber-300/60'  },
  { value: 'Electrical',  icon: Zap,        color: 'text-yellow-600 bg-yellow-50 border-yellow-300/60' },
  { value: 'Plumbing',    icon: Droplets,   color: 'text-blue-600  bg-blue-50   border-blue-300/60'   },
  { value: 'Housekeeping',icon: Wind,       color: 'text-green-600 bg-green-50  border-green-300/60'  },
  { value: 'Other',       icon: HelpCircle, color: 'text-purple-600 bg-purple-50 border-purple-300/60' },
];

const PRIORITIES: { value: Priority; active: string }[] = [
  { value: 'Low',    active: 'bg-emerald-500 border-emerald-500 text-white' },
  { value: 'Medium', active: 'bg-amber-500   border-amber-500   text-white' },
  { value: 'High',   active: 'bg-orange-500  border-orange-500  text-white' },
  { value: 'Urgent', active: 'bg-red-500     border-red-500     text-white' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

export function QuickTicketModal({ isOpen, onClose, tenantId }: Props) {
  const [category,    setCategory]    = useState<Category>('Maintenance');
  const [priority,    setPriority]    = useState<Priority>('Medium');
  const [description, setDescription] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);

    // INSERT INTO tickets (tenant_id, category, priority, description, status)
    await supabase.from('tickets').insert({
      tenant_id:   tenantId,
      category,
      priority,
      description: description.trim(),
      status:      'Pending',
    });

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setDescription('');
      setCategory('Maintenance');
      setPriority('Medium');
      onClose();
    }, 2200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 60, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 md:inset-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 md:max-w-lg w-full"
          >
            <div className="bg-background soft-card border border-white/80 p-7 rounded-t-[32px] md:rounded-[28px] shadow-2xl space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-black tracking-tighter uppercase">Raise a Ticket</h3>
                  <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest mt-0.5">Our team responds within 2 hours</p>
                </div>
                <button onClick={onClose} className="soft-button w-9 h-9 border border-white text-foreground/40">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Ticket Raised!</p>
                  <p className="text-xs text-foreground/40 text-center">
                    Your request has been logged.<br />We'll reach out shortly.
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Category */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Category</p>
                    <div className="grid grid-cols-5 gap-2">
                      {CATEGORIES.map(cat => {
                        const active = category === cat.value;
                        return (
                          <button
                            key={cat.value}
                            onClick={() => setCategory(cat.value)}
                            className={cn(
                              'flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border text-[9px] font-extrabold uppercase tracking-tight transition-all',
                              active
                                ? `${cat.color} shadow-sm scale-105`
                                : 'border-foreground/10 bg-foreground/5 text-foreground/30 hover:bg-white/60'
                            )}
                          >
                            <cat.icon className="w-4 h-4" />
                            {cat.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Priority</p>
                    <div className="flex gap-2">
                      {PRIORITIES.map(p => (
                        <button
                          key={p.value}
                          onClick={() => setPriority(p.value)}
                          className={cn(
                            'flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all',
                            priority === p.value
                              ? `${p.active} shadow-md`
                              : 'border-foreground/10 bg-foreground/5 text-foreground/30 hover:bg-white/60'
                          )}
                        >
                          {p.value}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">Describe the Issue</p>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      placeholder="e.g., AC in Room 102 is making a loud noise and not cooling below 28°C since yesterday..."
                      className="w-full soft-well border border-white px-4 py-3 text-sm font-medium text-foreground placeholder:text-foreground/20 resize-none outline-none rounded-2xl focus:border-primary/40 transition-colors"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!description.trim() || submitting}
                    className={cn(
                      'w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
                      description.trim() && !submitting
                        ? 'btn-terracotta shadow-lg shadow-primary/20'
                        : 'bg-foreground/5 text-foreground/20 cursor-not-allowed'
                    )}
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                      : <><AlertTriangle className="w-4 h-4" /> Raise Ticket</>}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
