'use client';

import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuditLog } from '@aaram/core';
import { Search, X, ChevronDown, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

const SOURCES = ['web', 'mobile', 'aara', 'whatsapp', 'alexa', 'system'] as const;

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    web: 'bg-blue-100 text-blue-700',
    mobile: 'bg-purple-100 text-purple-700',
    aara: 'bg-emerald-100 text-emerald-700',
    whatsapp: 'bg-green-100 text-green-700',
    alexa: 'bg-amber-100 text-amber-700',
    system: 'bg-foreground/10 text-foreground/60',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest', colors[source] ?? colors.system)}>
      {source}
    </span>
  );
}

function DiffRow({ label, before, after }: { label: string; before: unknown; after: unknown }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-[10px]">
      <div>
        <p className="font-extrabold uppercase tracking-widest text-foreground/30 mb-1">{label} — Before</p>
        <pre className="soft-well rounded-lg p-2 overflow-x-auto text-foreground/60">{JSON.stringify(before, null, 2) ?? '—'}</pre>
      </div>
      <div>
        <p className="font-extrabold uppercase tracking-widest text-foreground/30 mb-1">{label} — After</p>
        <pre className="soft-well rounded-lg p-2 overflow-x-auto text-foreground/60">{JSON.stringify(after, null, 2) ?? '—'}</pre>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const { entries, loading, error, filters, setFilters, page, hasMore, nextPage, prevPage, refresh } = useAuditLog(supabase, 25);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actorInput, setActorInput] = useState('');
  const [entityInput, setEntityInput] = useState('');

  const applyTextFilters = () => {
    setFilters({ ...filters, actorEmail: actorInput || undefined, entityType: entityInput || undefined });
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase">Audit Trail</h1>
              <p className="text-[11px] font-bold text-foreground/30 uppercase tracking-widest mt-0.5">
                Every admin change and Aara-executed action, with who/when/before/after
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="soft-card border border-white p-4 flex flex-wrap items-end gap-3">
          <div className="relative">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 block mb-1">Actor email</label>
            <Search className="absolute left-3 top-1/2 translate-y-[3px] w-3.5 h-3.5 text-foreground/30" />
            <input
              value={actorInput}
              onChange={e => setActorInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyTextFilters()}
              placeholder="admin@..."
              className="soft-well pl-8 pr-3 py-2 text-[12px] font-bold bg-transparent border-0 focus:outline-none w-48"
            />
          </div>

          <div>
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 block mb-1">Entity type</label>
            <input
              value={entityInput}
              onChange={e => setEntityInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyTextFilters()}
              placeholder="menu, ticket, room…"
              className="soft-well px-3 py-2 text-[12px] font-bold bg-transparent border-0 focus:outline-none w-40"
            />
          </div>

          <div>
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 block mb-1">Source</label>
            <select
              value={filters.source ?? ''}
              onChange={e => setFilters({ ...filters, source: e.target.value || undefined })}
              className="soft-well px-3 py-2 text-[12px] font-bold bg-transparent border-0 focus:outline-none appearance-none"
            >
              <option value="">All</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 block mb-1">From</label>
            <input
              type="date"
              value={filters.from?.slice(0, 10) ?? ''}
              onChange={e => setFilters({ ...filters, from: e.target.value || undefined })}
              className="soft-well px-3 py-2 text-[12px] font-bold bg-transparent border-0 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-foreground/30 block mb-1">To</label>
            <input
              type="date"
              value={filters.to?.slice(0, 10) ?? ''}
              onChange={e => setFilters({ ...filters, to: e.target.value || undefined })}
              className="soft-well px-3 py-2 text-[12px] font-bold bg-transparent border-0 focus:outline-none"
            />
          </div>

          <button onClick={applyTextFilters} className="btn-terracotta px-4 py-2 text-[11px] font-bold uppercase tracking-widest">
            Apply
          </button>

          {(filters.actorEmail || filters.entityType || filters.source || filters.from || filters.to) && (
            <button
              onClick={() => { setActorInput(''); setEntityInput(''); setFilters({}); }}
              className="flex items-center gap-1 text-[11px] font-bold text-foreground/40 hover:text-foreground px-2 py-2"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="soft-card border border-white overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[11px] font-bold text-foreground/30 uppercase tracking-widest">Loading…</div>
          ) : error ? (
            <div className="p-12 text-center text-[11px] font-bold text-red-500">{error}</div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center text-[11px] font-bold text-foreground/30 uppercase tracking-widest">No audit entries match these filters</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/40 text-foreground/30 text-[9px] uppercase tracking-[0.2em]">
                    <th className="px-6 py-4 font-extrabold">When</th>
                    <th className="px-6 py-4 font-extrabold">Actor</th>
                    <th className="px-6 py-4 font-extrabold">Action</th>
                    <th className="px-6 py-4 font-extrabold">Entity</th>
                    <th className="px-6 py-4 font-extrabold">Source</th>
                    <th className="px-6 py-4 font-extrabold"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <React.Fragment key={entry.id}>
                      <tr className="border-t border-foreground/5 hover:bg-white/40 transition-colors">
                        <td className="px-6 py-3 text-[11px] font-bold text-foreground/50 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-[11px] font-bold">
                          {entry.actor_email}
                          <span className="ml-1.5 text-[9px] font-extrabold uppercase text-foreground/30">({entry.actor_role})</span>
                        </td>
                        <td className="px-6 py-3 text-[11px] font-bold text-foreground/70">{entry.action}</td>
                        <td className="px-6 py-3 text-[11px] font-bold text-foreground/70">
                          {entry.entity_type}{entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ''}
                        </td>
                        <td className="px-6 py-3"><SourceBadge source={entry.source} /></td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                            className="text-foreground/30 hover:text-foreground transition-colors"
                          >
                            <ChevronDown className={cn('w-4 h-4 transition-transform', expanded === entry.id && 'rotate-180')} />
                          </button>
                        </td>
                      </tr>
                      {expanded === entry.id && (
                        <tr className="bg-white/30">
                          <td colSpan={6} className="px-6 py-4">
                            <DiffRow label={entry.entity_type} before={entry.before} after={entry.after} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <button onClick={refresh} className="text-[11px] font-bold text-foreground/40 hover:text-foreground uppercase tracking-widest">
            Refresh
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={prevPage}
              disabled={page === 0}
              className="soft-button px-3 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold text-foreground/40">Page {page + 1}</span>
            <button
              onClick={nextPage}
              disabled={!hasMore}
              className="soft-button px-3 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
