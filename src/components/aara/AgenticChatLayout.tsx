'use client';

/**
 * AgenticChatLayout — The AI chat panel for AaraWidget.
 *
 * ── Role split ──────────────────────────────────────────────────────────────
 *  guest / tenant : Standard RAG chatbot. Calls /api/chat, renders replies.
 *  admin          : Agentic mode. Intercepts write-action responses, drives the
 *                   avatar through moveToElement → highlight → confirm before
 *                   executing the real DB operation via /api/chat (confirmed=true).
 *
 * ── Agentic loop (admin write actions) ─────────────────────────────────────
 *  1. Parse AI response → detect action type (update_room_status, etc.)
 *  2. If action requires confirmation:
 *     a. Find the best-match registered element via label/ID heuristic
 *     b. Call context.moveToElement()   → avatar flies to element
 *     c. Wait for avatar to reach 'interacting' state (1.5 s grace)
 *     d. Call context.highlightElement()
 *     e. Short pause → context.requestConfirmation(message) → Promise<boolean>
 *     f. Confirmed: call /api/chat with execute=true → commit DB change
 *        Cancelled: context.resetToIdle(), add "Cancelled." message
 *  3. Non-write actions (navigate, read, ticket creation): execute immediately.
 *
 * ── AI SDK note ─────────────────────────────────────────────────────────────
 *  The existing /api/chat endpoint already uses Gemini 2.0 Flash Lite and returns
 *  a structured {reply, action, data} response. This layout wraps that contract.
 *  To migrate to the Vercel AI SDK (streamText + tools), replace `callChatAPI`
 *  with a streaming fetch and handle `tool_calls` instead of JSON-in-text.
 *  The orchestration code below is SDK-agnostic on purpose.
 */

import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Mic, MicOff, Navigation, Sparkles,
  CheckCircle2, AlertTriangle, Loader2, ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAaraContext } from '@/context/AaraContext';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  action?: string | null;
  actionData?: Record<string, unknown> | null;
  timestamp: Date;
}

// Write actions that require avatar navigation + confirmation
const WRITE_ACTIONS = new Set([
  'update_room_status',
  'record_financials',
  'resolve_ticket',
]);

// ─── Speech recognition ───────────────────────────────────────────────────────

function useSpeechRecognition(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-IN';
    rec.onresult = (e: any) => { onResult(e.results[0][0].transcript); setListening(false); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
  }, [onResult]);

  return {
    listening,
    supported,
    start: () => { recRef.current?.start(); setListening(true); },
    stop:  () => { recRef.current?.stop();  setListening(false); },
  };
}

// ─── Confirmation Dialog ──────────────────────────────────────────────────────

interface ConfirmationCardProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmationCard({ message, onConfirm, onCancel, loading }: ConfirmationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      className="mx-2 my-1 rounded-[20px] border border-amber-300/40 bg-amber-50/80 backdrop-blur-sm p-5 shadow-lg"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-amber-600 mb-1">
            Confirm Action
          </p>
          <p className="text-sm font-bold text-stone-700 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-3 rounded-2xl border border-stone-200 bg-white text-stone-500 text-[11px] font-extrabold uppercase tracking-widest hover:bg-stone-50 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-3 rounded-2xl bg-amber-500 text-white text-[11px] font-extrabold uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Confirm
        </button>
      </div>
    </motion.div>
  );
}

// ─── Action Badge ─────────────────────────────────────────────────────────────

function ActionBadge({ action, data }: { action?: string | null; data?: Record<string, unknown> | null }) {
  if (!action) return null;

  const badges: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    ticket_created:    { icon: <CheckCircle2 className="w-3 h-3 shrink-0" />, label: `Ticket · ${data?.category ?? ''}`, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
    data_entry:        { icon: <Sparkles     className="w-3 h-3 shrink-0" />, label: `${data?.context ?? 'Data'} updated`, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
    navigate:          { icon: <Navigation  className="w-3 h-3 shrink-0" />, label: `→ ${data?.path ?? ''}`, color: 'text-violet-600 bg-violet-500/10 border-violet-500/20' },
    update_room_status:{ icon: <CheckCircle2 className="w-3 h-3 shrink-0" />, label: 'Room status updated', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
    resolve_ticket:    { icon: <CheckCircle2 className="w-3 h-3 shrink-0" />, label: 'Ticket resolved', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  };

  const badge = badges[action];
  if (!badge) return null;

  return (
    <div className={cn('mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-extrabold uppercase tracking-widest', badge.color)}>
      {badge.icon} {badge.label}
    </div>
  );
}

// ─── Chat API call ────────────────────────────────────────────────────────────

async function callChatAPI(
  message: string,
  history: { role: string; text: string }[],
  context: Record<string, unknown>,
  token?: string,
  agentMode?: boolean,
): Promise<{ reply: string; action: string | null; data: Record<string, unknown> | null }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history, context, agent_mode: agentMode }),
  });
  if (!res.ok) throw new Error(`Chat API error ${res.status}`);
  return res.json();
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AgenticChatLayoutProps {
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function AgenticChatLayout({ isAdmin, isOpen, onClose }: AgenticChatLayoutProps) {
  const {
    aaraState, setAaraState,
    moveToElement, highlightElement, clearHighlight, requestConfirmation, resetToIdle,
    getAllElements, pendingConfirmation,
  } = useAaraContext();

  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '0',
    role: 'assistant',
    text: isAdmin
      ? "Hello! I'm Aara — your property management agent. Tell me what you need done and I'll handle it for you."
      : "Hello! I'm Aara. How can I help you today?",
    timestamp: new Date(),
  }]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [adminContext, setAdminContext] = useState<Record<string, unknown>>({});
  const [isPinned, setIsPinned] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const chatRef    = useRef<HTMLDivElement>(null);

  // Pending agent action waiting for confirmation (separate from context's pendingConfirmation)
  const pendingAgentActionRef = useRef<{
    originalMessage: string;
    action: string;
    data: Record<string, unknown>;
  } | null>(null);

  // ── Load admin context on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      supabase.from('properties').select('id, name, location'),
      supabase.from('rooms').select('id, room_number, name, status, occupancy_status, property_id'),
      supabase.from('tickets').select('id, category, status, description').eq('status', 'Pending'),
    ]).then(([propsRes, roomsRes, ticketsRes]) => {
      setAdminContext({
        properties: propsRes.data ?? [],
        rooms: roomsRes.data ?? [],
        tickets: ticketsRes.data ?? [],
      });
    });
  }, [isAdmin]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 300); }, [isOpen]);

  // Close on outside click (unless pinned)
  useEffect(() => {
    if (!isOpen || isPinned) return;
    const handle = (e: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        const avatar = document.getElementById('aara-avatar-root');
        if (avatar?.contains(e.target as Node)) return;
        onClose();
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen, isPinned, onClose]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\{.*?\}/g, '').trim());
    u.lang = 'en-US'; u.rate = 0.95; u.pitch = 1.15;
    const v = window.speechSynthesis.getVoices();
    const fem = v.find(vv => vv.name.includes('Samantha') || vv.name.includes('Female')) ?? v[0];
    if (fem) u.voice = fem;
    window.speechSynthesis.speak(u);
  }, [voiceEnabled]);

  // ── Find the best registered element for an agent action ─────────────────
  const findTargetElement = useCallback((action: string, data: Record<string, unknown>): string | null => {
    const elements = getAllElements();
    if (!elements.length) return null;

    const roomId = data?.room_id as string | undefined;
    const ticketId = data?.ticket_id as string | undefined;

    // Priority 1: direct id match
    if (roomId) {
      const exact = elements.find(e => e.id === `room-${roomId}` || e.id === `room-${roomId}-status`);
      if (exact) return exact.id;
    }
    if (ticketId) {
      const exact = elements.find(e => e.id === `ticket-${ticketId}`);
      if (exact) return exact.id;
    }

    // Priority 2: action-type match
    const actionTargets: Record<string, string[]> = {
      update_room_status: ['fill', 'click'],
      record_financials:  ['fill', 'submit'],
      resolve_ticket:     ['click', 'submit'],
    };
    const requiredTypes = actionTargets[action] ?? [];
    const match = elements.find(e => requiredTypes.some(t => e.actionTypes.includes(t as any)));
    return match?.id ?? null;
  }, [getAllElements]);

  // ── Core: send message ────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setAaraState('thinking');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const history = messages
        .filter(m => m.id !== '0')
        .slice(-8)
        .map(m => ({ role: m.role, text: m.text }));

      const context: Record<string, unknown> = isAdmin ? { admin_data: adminContext } : {};
      const responseData = await callChatAPI(msg, history, context, session?.access_token, isAdmin);

      const { reply, action, data } = responseData;
      const isWriteAction = action && WRITE_ACTIONS.has(action);

      // ── Admin + write action: trigger agentic flow ───────────────────────
      if (isAdmin && isWriteAction && data) {
        // Show the AI's natural-language reply first
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: reply,
          timestamp: new Date(),
        }]);
        speak(reply);
        setLoading(false);

        // Store the action for post-confirmation execution
        pendingAgentActionRef.current = { originalMessage: msg, action, data: data as Record<string, unknown> };

        // Find target element
        const targetId = findTargetElement(action, data as Record<string, unknown>);

        if (targetId) {
          const elementReg = getAllElements().find(e => e.id === targetId);
          const tooltip = `Going to ${elementReg?.label ?? 'the element'}…`;
          moveToElement(targetId, tooltip);

          // Wait for interacting state, then highlight, then confirm
          // We poll with a short interval (max 3s) for state to become 'interacting'
          const waitForInteracting = () => new Promise<void>((resolve) => {
            const deadline = Date.now() + 3000;
            const check = setInterval(() => {
              if (Date.now() > deadline) { clearInterval(check); resolve(); return; }
              // Check via context — aaraState ref trick
            }, 100);
            // Simpler: just wait 1.8 s (spring settles by then for most distances)
            clearTimeout(check as any);
            setTimeout(resolve, 1800);
          });

          await waitForInteracting();
          highlightElement(targetId);

          // Brief pause to let glow render
          await new Promise(r => setTimeout(r, 600));

          const confirmMsg = (data as any).confirm_message
            ?? `Are you sure you want me to ${action.replace(/_/g, ' ')}?`;

          const confirmed = await requestConfirmation(confirmMsg, targetId);
          clearHighlight();

          if (confirmed) {
            setConfirmLoading(true);
            setAaraState('executing');
            try {
              // Re-submit to execute (the chat API will run the DB operation)
              const execData = await callChatAPI(
                msg,
                history,
                context,
                session?.access_token,
                false, // agent_mode=false → actually execute
              );
              setMessages(prev => [...prev, {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                text: execData.reply,
                action: execData.action ?? undefined,
                actionData: execData.data as any,
                timestamp: new Date(),
              }]);
              speak(execData.reply);
            } catch {
              setMessages(prev => [...prev, {
                id: 'exec-err',
                role: 'system',
                text: 'Action failed. Please try again.',
                timestamp: new Date(),
              }]);
            } finally {
              setConfirmLoading(false);
              resetToIdle();
            }
          } else {
            setMessages(prev => [...prev, {
              id: (Date.now() + 2).toString(),
              role: 'assistant',
              text: "No problem — I've cancelled that. Let me know if you'd like to do something else.",
              timestamp: new Date(),
            }]);
            resetToIdle();
          }
        } else {
          // No registered element found → fall back to confirmation-only
          const confirmMsg = (data as any).confirm_message
            ?? `Confirm: ${action.replace(/_/g, ' ')}?`;
          const confirmed = await requestConfirmation(confirmMsg);

          if (confirmed) {
            setConfirmLoading(true);
            setAaraState('executing');
            try {
              const execData = await callChatAPI(msg, history, context, session?.access_token, false);
              setMessages(prev => [...prev, {
                id: (Date.now() + 3).toString(),
                role: 'assistant',
                text: execData.reply,
                action: execData.action ?? undefined,
                actionData: execData.data as any,
                timestamp: new Date(),
              }]);
            } catch { /* ignore */ } finally {
              setConfirmLoading(false);
              resetToIdle();
            }
          } else {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: 'Cancelled.', timestamp: new Date() }]);
            resetToIdle();
          }
        }
        pendingAgentActionRef.current = null;
        return;
      }

      // ── Standard flow (non-write or non-admin) ───────────────────────────
      setAaraState('open');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: reply,
        action: action ?? undefined,
        actionData: data as any,
        timestamp: new Date(),
      }]);
      speak(reply);

      // Navigation actions
      if (action === 'navigate' || action === 'app_command') {
        const path = (data as any)?.path;
        const cmd  = (data as any)?.cmd;
        if (cmd) sessionStorage.setItem('AARA_PENDING_COMMAND', JSON.stringify({ action: cmd, data }));
        if (path) setTimeout(() => { router.push(path); if (!isPinned) onClose(); }, 900);
      }
    } catch {
      setAaraState('error');
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', text: 'Connection lost. Please try again.', timestamp: new Date() }]);
      setTimeout(() => setAaraState('open'), 2000);
    } finally {
      setLoading(false);
      if (!['thinking', 'moving', 'interacting', 'confirming', 'executing'].includes(aaraState)) {
        setAaraState('open');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, messages, isAdmin, adminContext]);

  const { listening, supported, start, stop } = useSpeechRecognition(
    useCallback((t: string) => { setInput(t); setVoiceEnabled(true); setTimeout(() => sendMessage(t), 400); }, [sendMessage])
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={chatRef}
          initial={{ opacity: 0, y: 48, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 48, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          className="fixed inset-0 lg:inset-auto lg:bottom-36 lg:right-6 z-[1000] w-full h-full lg:w-[440px] lg:h-[72vh] lg:max-h-[760px] flex flex-col border-none lg:border lg:border-white/40 shadow-[0_40px_80px_-16px_rgba(0,0,0,0.25)] rounded-none lg:rounded-[40px] overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.72) 100%)',
            backdropFilter: 'blur(48px)',
          }}
        >
          {/* ── Header ── */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-black/5 bg-gradient-to-r from-amber-500/8 to-transparent shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg border-2 border-white/50">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-foreground uppercase tracking-tight leading-none">Aara Intelligence</p>
              <div className="flex items-center gap-1.5 mt-1">
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={cn('w-1.5 h-1.5 rounded-full', isAdmin ? 'bg-amber-500' : 'bg-emerald-500')}
                />
                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                  {isAdmin ? 'Agent Mode' : 'Assistant Mode'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Pin */}
              <button
                onClick={() => setIsPinned(p => !p)}
                className={cn('w-9 h-9 rounded-2xl transition-all border flex items-center justify-center',
                  isPinned ? 'bg-amber-500 text-white border-amber-400' : 'bg-black/5 text-foreground/30 border-transparent hover:bg-black/8'
                )}
                title={isPinned ? 'Unpin' : 'Pin'}
              >
                <motion.div animate={{ rotate: isPinned ? 45 : 0 }}>
                  <Navigation className="w-3.5 h-3.5" />
                </motion.div>
              </button>

              {/* Voice */}
              <button
                onClick={() => setVoiceEnabled(v => !v)}
                className={cn('w-9 h-9 rounded-2xl transition-all border flex items-center justify-center',
                  voiceEnabled ? 'bg-amber-500 text-white border-amber-400' : 'bg-black/5 text-foreground/30 border-transparent hover:bg-black/8'
                )}
                title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
              >
                {voiceEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </button>

              {/* Close */}
              <button onClick={onClose} className="w-9 h-9 rounded-2xl bg-black/5 text-foreground/30 hover:bg-black/10 transition-all border border-transparent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {messages.map(m => (
              <div
                key={m.id}
                className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-md border-2 border-white/20 mt-0.5">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
                {m.role === 'system' && (
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                )}

                <div className={cn('max-w-[82%] flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
                  <div className={cn(
                    'px-5 py-3.5 rounded-[22px] text-[13.5px] font-semibold leading-relaxed',
                    m.role === 'user'
                      ? 'bg-foreground text-background rounded-tr-none shadow-xl'
                      : m.role === 'system'
                        ? 'bg-red-50 border border-red-200 text-red-700 rounded-tl-none'
                        : 'bg-white/90 border border-black/5 text-foreground rounded-tl-none shadow-sm backdrop-blur-md'
                  )}>
                    {m.text}
                  </div>
                  <ActionBadge action={m.action} data={m.actionData} />
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {loading && (
              <div className="flex justify-start pl-11">
                <div className="flex gap-1.5 items-center bg-white/70 px-4 py-2.5 rounded-2xl border border-black/5 shadow-sm">
                  {[0, 0.15, 0.3].map(d => (
                    <motion.div
                      key={d}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: d }}
                      className="w-1.5 h-1.5 rounded-full bg-amber-500"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Confirmation card (rendered inline in the message stream) */}
            <AnimatePresence>
              {pendingConfirmation && (
                <ConfirmationCard
                  key="confirm"
                  message={pendingConfirmation.message}
                  loading={confirmLoading}
                  onConfirm={() => {
                    pendingConfirmation.resolve(true);
                  }}
                  onCancel={() => {
                    pendingConfirmation.resolve(false);
                  }}
                />
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>

          {/* ── Voice listening banner ── */}
          <AnimatePresence>
            {listening && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="shrink-0 bg-amber-500/10 px-6 py-3.5 flex items-center gap-3 border-t border-amber-500/20"
              >
                <div className="flex gap-1 items-end h-4">
                  {[4, 2, 5].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [h, h * 2, h] }}
                      transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                      className="w-1.5 bg-amber-600 rounded-full"
                      style={{ height: h }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest">Listening…</span>
                <button onClick={stop} className="ml-auto text-[10px] font-black text-amber-700 underline uppercase tracking-widest">Stop</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input bar ── */}
          <div className="shrink-0 p-5 bg-white/20 border-t border-black/5 backdrop-blur-md">
            <div className="flex gap-3 items-center">
              <div className="flex-1 flex items-center bg-white/90 border border-black/8 rounded-[22px] px-3 shadow-inner focus-within:ring-2 ring-amber-500/20 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={isAdmin ? 'Command Aara…' : 'Ask me anything…'}
                  disabled={loading || aaraState === 'executing'}
                  className="flex-1 px-3 py-3.5 text-[13px] bg-transparent outline-none font-semibold placeholder:text-black/20"
                />
                {supported && (
                  <button
                    onClick={listening ? stop : start}
                    className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      listening ? 'bg-red-500 text-white' : 'text-black/20 hover:text-amber-500'
                    )}
                  >
                    {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
              </div>

              <motion.button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading || aaraState === 'executing'}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-[22px] bg-foreground text-background flex items-center justify-center shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)] disabled:opacity-40 disabled:grayscale"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
