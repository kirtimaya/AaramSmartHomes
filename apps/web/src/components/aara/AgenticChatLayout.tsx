'use client';

/**
 * AgenticChatLayout — The AI chat panel for AaraWidget.
 *
 * ── Role split ──────────────────────────────────────────────────────────────
 *  guest / tenant : Standard chatbot. Calls the streaming /api/chat, renders
 *                   the reply as it arrives. Role and any data the model needs
 *                   are resolved server-side from the verified JWT — never
 *                   posted by this client.
 *  admin          : Agentic mode. Intercepts write-action responses, drives the
 *                   avatar through moveToElement → highlight → confirm before
 *                   re-calling /api/chat to actually execute the action.
 *
 * ── Memory ──────────────────────────────────────────────────────────────────
 *  Persistent per-user memory stored in localStorage via aaraMemory.ts.
 *  Sent with every API call as a formatted string injected into the system prompt.
 *  AI can return action="save_memory" or "clear_memory" to manage memory entries.
 */

import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Mic, MicOff, Navigation, Sparkles,
  CheckCircle2, AlertTriangle, Loader2, Brain, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAaraContext } from '@/context/AaraContext';
import { useRouter } from 'next/navigation';
import type { UserRole } from './AaraWidget';
import {
  addMemoryEntry, clearMemory, formatMemoryForPrompt, getMemoryEntries,
  type MemoryCategory, type AaraMemoryEntry,
} from '@/lib/aaraMemory';

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

// ─── Memory Pills ─────────────────────────────────────────────────────────────

function MemoryPanel({
  entries, userId, onClear,
}: {
  entries: AaraMemoryEntry[];
  userId: string | null;
  onClear: () => void;
}) {
  if (!entries.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-5 pt-3 pb-1 border-b border-black/5"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3 h-3 text-violet-500" />
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-violet-500">Memory</span>
        </div>
        <button
          onClick={onClear}
          title="Clear memory"
          className="flex items-center gap-1 text-[9px] font-bold text-stone-400 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-2.5 h-2.5" /> Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 pb-2">
        {entries.map(e => (
          <span
            key={e.id}
            className="px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200/60 text-[10px] font-semibold text-violet-700 leading-none max-w-[200px] truncate"
            title={e.text}
          >
            {e.text}
          </span>
        ))}
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
    save_memory:       { icon: <Brain        className="w-3 h-3 shrink-0" />, label: 'Remembered', color: 'text-violet-600 bg-violet-500/10 border-violet-500/20' },
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
//
// Role and any data the model needs (properties/rooms/tickets/bills/etc.) are
// resolved server-side from the verified JWT inside role-scoped tools — the
// client no longer prefetches and posts admin data with every message.
// Consumes the SSE stream from /api/chat and reports incremental text via
// onDelta, still resolving to the same {reply, action, data} shape the
// write-action confirmation flow below expects.

async function callChatAPI(
  message: string,
  history: { role: string; text: string }[],
  token: string | undefined,
  memory: string | undefined,
  onDelta?: (text: string) => void,
): Promise<{ reply: string; action: string | null; data: Record<string, unknown> | null }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history, memory, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`Chat API error ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';
  let action: string | null = null;
  let data: Record<string, unknown> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const dataLine = frame.split('\n').find(l => l.startsWith('data: '));
      if (!dataLine) continue;
      let event: any;
      try { event = JSON.parse(dataLine.slice(6)); } catch { continue; }

      if (event.type === 'text-delta' || event.type === 'done') {
        reply = event.text || reply;
        onDelta?.(reply);
      } else if (event.type === 'client-action') {
        action = event.name;
        data = event.args;
      }
    }
  }

  return { reply: reply || 'Got it!', action, data };
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AgenticChatLayoutProps {
  userRole: UserRole;
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AgenticChatLayout({ userRole, userId, isOpen, onClose }: AgenticChatLayoutProps) {
  const isAdmin = userRole === 'admin';
  const { aaraState, setAaraState, setIsTalking } = useAaraContext();

  const router = useRouter();

  // Memory state — always sync from localStorage
  const [memEntries, setMemEntries] = useState<AaraMemoryEntry[]>(() => getMemoryEntries(userId));
  const refreshMemory = useCallback(() => setMemEntries(getMemoryEntries(userId)), [userId]);

  const [showMemory, setShowMemory] = useState(false);

  const getWelcome = () => {
    if (isAdmin) return "Hello! I'm Aara — your property management agent. Tell me what you need done and I'll handle it for you.";
    if (userRole === 'tenant') return "Hi! I'm Aara. I can help with your tenancy, raise tickets, or answer questions about your home.";
    return "Hello! I'm Aara, your smart home assistant. Ask me anything about AaramSmartHomes!";
  };

  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '0',
    role: 'assistant',
    text: getWelcome(),
    timestamp: new Date(),
  }]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const chatRef    = useRef<HTMLDivElement>(null);

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

  const talkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speak = useCallback((text: string) => {
    if (talkTimerRef.current) clearTimeout(talkTimerRef.current);
    setIsTalking(true);
    talkTimerRef.current = setTimeout(() => setIsTalking(false), Math.min(text.length * 70, 8000));

    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\{.*?\}/g, '').trim());
    u.lang = 'en-US'; u.rate = 0.95; u.pitch = 1.15;
    const v = window.speechSynthesis.getVoices();
    const fem = v.find(vv => vv.name.includes('Samantha') || vv.name.includes('Female')) ?? v[0];
    if (fem) u.voice = fem;
    u.onend = () => setIsTalking(false);
    window.speechSynthesis.speak(u);
  }, [voiceEnabled, setIsTalking]);

  // ── Core: send message ────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: msg, timestamp: new Date() };
    const pendingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, userMsg, { id: pendingId, role: 'assistant', text: '', timestamp: new Date() }]);
    setLoading(true);
    setAaraState('thinking');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const history = messages
        .filter(m => m.id !== '0')
        .slice(-8)
        .map(m => ({ role: m.role, text: m.text }));

      const memory = formatMemoryForPrompt(userId);

      const responseData = await callChatAPI(msg, history, session?.access_token, memory || undefined,
        (delta) => setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, text: delta } : m)));

      const { reply, action, data } = responseData;

      // ── Memory actions ────────────────────────────────────────────────────
      if (action === 'save_memory' && data) {
        const text   = (data as any).text     as string;
        const cat    = (data as any).category as MemoryCategory | undefined;
        if (text) {
          addMemoryEntry(userId, text, cat ?? 'rule');
          refreshMemory();
        }
        setAaraState('open');
        setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, text: reply, action: 'save_memory' } : m));
        speak(reply);
        setLoading(false);
        return;
      }

      if (action === 'clear_memory') {
        clearMemory(userId);
        refreshMemory();
        setAaraState('open');
        setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, text: reply } : m));
        speak(reply);
        setLoading(false);
        return;
      }

      // ── Standard flow ────────────────────────────────────────────────────
      // Write actions (update_room_status, create_ticket, skip_meal, ...) are
      // now executed server-side inside the model's own tool-calling turn —
      // the model is instructed (system prompt) to restate the action and
      // get an explicit "yes" from the user in conversation before calling
      // the tool, rather than the client gating a second network round-trip
      // behind a UI confirm dialog. By the time a reply reaches here, any
      // write the user approved has already happened; this branch just
      // renders the model's natural-language response.
      setAaraState('open');
      setMessages(prev => prev.map(m => m.id === pendingId
        ? { ...m, text: reply, action: action ?? undefined, actionData: data as any }
        : m));
      speak(reply);

      if (action === 'navigate' || action === 'app_command') {
        const path = (data as any)?.path;
        const cmd  = (data as any)?.cmd;
        if (cmd) sessionStorage.setItem('AARA_PENDING_COMMAND', JSON.stringify({ action: cmd, data }));
        if (path) setTimeout(() => { router.push(path); if (!isPinned) onClose(); }, 900);
      }
    } catch {
      setAaraState('error');
      setMessages(prev => prev.map(m => m.id === pendingId
        ? { ...m, text: 'Connection lost. Please try again.' }
        : m));
      setTimeout(() => setAaraState('open'), 2000);
    } finally {
      setLoading(false);
      if (!['thinking', 'moving', 'interacting', 'confirming', 'executing'].includes(aaraState)) {
        setAaraState('open');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, messages, userId]);

  const { listening, supported, start, stop } = useSpeechRecognition(
    useCallback((t: string) => { setInput(t); setVoiceEnabled(true); setTimeout(() => sendMessage(t), 400); }, [sendMessage])
  );

  // Pulse the avatar (StatusRing) while the mic is capturing speech.
  useEffect(() => {
    if (listening) setAaraState('listening');
    else if (aaraState === 'listening') setAaraState('open');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

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
                  className={cn('w-1.5 h-1.5 rounded-full',
                    isAdmin ? 'bg-amber-500' : userRole === 'tenant' ? 'bg-blue-500' : 'bg-emerald-500'
                  )}
                />
                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                  {isAdmin ? 'Agent Mode' : userRole === 'tenant' ? 'Member Mode' : 'Guest Mode'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Memory toggle */}
              {memEntries.length > 0 && (
                <button
                  onClick={() => setShowMemory(p => !p)}
                  className={cn('w-9 h-9 rounded-2xl transition-all border flex items-center justify-center',
                    showMemory ? 'bg-violet-500 text-white border-violet-400' : 'bg-black/5 text-foreground/30 border-transparent hover:bg-black/8'
                  )}
                  title="Memory"
                >
                  <Brain className="w-3.5 h-3.5" />
                </button>
              )}

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

          {/* ── Memory panel ── */}
          <AnimatePresence>
            {showMemory && (
              <MemoryPanel
                entries={memEntries}
                userId={userId}
                onClear={() => { clearMemory(userId); refreshMemory(); }}
              />
            )}
          </AnimatePresence>

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
