'use client';

import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { mockTickets, mockTenants } from '@/lib/mockData';
import { 
  ClipboardList, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MoreVertical,
  Filter,
  ArrowUpRight,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function TicketsPage() {
  const [filter, setFilter] = useState<'All' | 'Pending' | 'In-Progress' | 'Resolved'>('All');
  
  const filteredTickets = filter === 'All' 
    ? mockTickets 
    : mockTickets.filter(t => t.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <AlertCircle className="w-4 h-4 text-primary" />;
      case 'In-Progress': return <Clock className="w-4 h-4 text-secondary" />;
      case 'Resolved': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <ClipboardList className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-primary/10 text-primary border-primary/20';
      case 'Medium': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'Low': return 'bg-foreground/5 text-foreground/40 border-foreground/10';
      default: return '';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">Service Desk</h1>
            <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-[0.2em]">Maintenance & Support Tickets</p>
          </div>
          
          <div className="flex gap-3 soft-well p-1.5 border border-white bg-white/40">
            {['All', 'Pending', 'In-Progress', 'Resolved'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s as any)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all",
                  filter === s 
                    ? "btn-terracotta shadow-xl scale-[1.02]" 
                    : "text-foreground/40 hover:bg-white/60"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets Grid/List */}
        <div className="grid grid-cols-1 gap-6">
          {filteredTickets.map((ticket, idx) => {
            const tenant = mockTenants.find(t => t.id === ticket.tenant_id);
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="soft-card p-6 border border-white flex flex-col md:flex-row items-center gap-6 group hover:translate-y-[-2px] transition-transform"
              >
                {/* Status Column */}
                <div className="flex flex-col items-center gap-2 min-w-[100px]">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner soft-ui-in",
                    ticket.status === 'Pending' ? "bg-primary/5" : "bg-secondary/5"
                  )}>
                    {getStatusIcon(ticket.status)}
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/40">{ticket.status}</span>
                </div>

                {/* Content Column */}
                <div className="flex-1 space-y-3 text-center md:text-left">
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest border",
                      getPriorityColor(ticket.priority)
                    )}>
                      {ticket.priority} Priority
                    </span>
                    <span className="text-[9px] font-extrabold text-foreground/30 uppercase tracking-widest">
                      ID: #{ticket.id.toUpperCase()}
                    </span>
                    <span className="text-[9px] font-extrabold text-foreground/30 uppercase tracking-widest">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground leading-tight">{ticket.description}</h3>
                  
                  <div className="flex items-center justify-center md:justify-start gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-bold text-foreground/40 uppercase">
                          {tenant?.name?.charAt(0)}
                       </div>
                       <p className="text-[11px] font-bold text-foreground/60">{tenant?.name}</p>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-foreground/10" />
                    <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest">{ticket.category}</p>
                  </div>
                </div>

                {/* Action Column */}
                <div className="flex gap-3">
                  <button className="soft-button w-12 h-12 border border-white hover:text-primary transition-all">
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  <button className="soft-button px-6 py-3 border border-white group-hover:btn-terracotta transition-all text-[11px] font-extrabold uppercase tracking-widest">
                    Update
                  </button>
                  <button className="soft-button w-12 h-12 border border-white hover:text-primary transition-all">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Floating Add Ticket (Mock) */}
        <button className="fixed bottom-10 right-10 btn-terracotta p-5 shadow-2xl scale-110 hover:scale-[1.15] transition-transform z-50">
          <ClipboardList className="w-7 h-7" />
        </button>
      </div>
    </AdminLayout>
  );
}
