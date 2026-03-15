'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Bot, X, Send, Mic, MicOff, Loader2, Sparkles,
  CheckCircle2, AlertCircle, Plus, ChevronDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────
type MessageRole = 'user' | 'assistant';
type ActionType = 'ticket_created' | 'task_created' | null;

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  action?: ActionType;
  actionData?: any;
  timestamp: Date;
}

// ─── Suggested prompts ─────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Raise a maintenance ticket for Villa 32',
  'How many rooms are vacant?',
  'Report a plumbing issue',
  'What amenities do the villas have?',
];

// ─── Speech recognition hook ───────────────────────────────────────────────
function useSpeechRecognition(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        onResult(transcript);
        setListening(false);
      };
      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);
      recognitionRef.current = recognition;
    }
  }, [onResult]);

  const start = useCallback(() => {
    if (recognitionRef.current && !listening) {
      recognitionRef.current.start();
      setListening(true);
    }
  }, [listening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, start, stop };
}

// ─── Action badge ──────────────────────────────────────────────────────────
function ActionBadge({ action, data }: { action: ActionType; data?: any }) {
  if (!action) return null;
  if (action === 'ticket_created') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-extrabold uppercase tracking-widest text-emerald-600">
        <CheckCircle2 className="w-3 h-3 shrink-0" />
        Ticket created · {data?.category} · {data?.priority} priority
      </div>
    );
  }
  if (action === 'task_created') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/10 border border-secondary/20 text-[9px] font-extrabold uppercase tracking-widest text-secondary">
        <Plus className="w-3 h-3 shrink-0" />
        Task logged: {data?.title}
      </div>
    );
  }
  return null;
}

// ─── Main Chatbot Widget ────────────────────────────────────────────────────
export function AaraChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: 'Hi! I\'m Aara, your AaramSmartHomes AI assistant. Ask me anything about your properties, or say "raise a ticket" to report an issue. I also understand voice!',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch properties for context
  useEffect(() => {
    supabase.from('properties').select('id,name,location,total_rooms').then(({ data }) => {
      if (data) setProperties(data);
    });
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const { listening, supported, start, stop } = useSpeechRecognition(
    useCallback((text: string) => {
      setInput(text);
      setTimeout(() => sendMessage(text), 300);
    }, []) // eslint-disable-line
  );

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setShowSuggestions(false);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.role !== 'assistant' || m.id !== '0') // skip intro
        .map(m => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history, context: { properties } })
      });

      const data = await res.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.reply,
        action: data.action,
        actionData: data.data,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Sorry, I ran into an error. Please try again.',
        timestamp: new Date()
      }]);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'fixed bottom-6 right-6 z-[999] w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all',
          open
            ? 'bg-foreground text-background'
            : 'bg-gradient-to-br from-primary to-secondary text-white'
        )}
        aria-label="Open Aara AI assistant"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}><X className="w-6 h-6" /></motion.div>
            : <motion.div key="bot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="relative">
                <Bot className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
              </motion.div>
          }
        </AnimatePresence>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-[998] w-[380px] max-h-[600px] flex flex-col soft-card border border-white shadow-2xl overflow-hidden"
            style={{ background: 'rgba(253,251,247,0.97)', backdropFilter: 'blur(20px)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/60 bg-gradient-to-r from-primary/5 to-secondary/5 shrink-0">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground uppercase tracking-tight">Aara AI</p>
                <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">AaramSmartHomes Assistant</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Live</span>
                {supported && (
                  <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">Voice</span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
              {messages.map(msg => (
                <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className={cn('max-w-[82%]', msg.role === 'user' ? 'items-end' : 'items-start', 'flex flex-col')}>
                    <div className={cn(
                      'px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed font-medium',
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-secondary text-white rounded-tr-sm shadow-md'
                        : 'bg-white/70 border border-white text-foreground rounded-tl-sm shadow-sm'
                    )}>
                      {msg.text}
                    </div>
                    <ActionBadge action={msg.action || null} data={msg.actionData} />
                    <p className="text-[8px] font-bold text-foreground/20 uppercase tracking-widest mt-1 px-1">
                      {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white/70 border border-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest">Thinking…</span>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {showSuggestions && messages.length === 1 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[9px] font-extrabold text-foreground/30 uppercase tracking-widest px-1">Try asking:</p>
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => { setInput(s); sendMessage(s); }}
                      className="w-full text-left px-3 py-2 rounded-xl bg-white/60 border border-white text-[11px] font-medium text-foreground/60 hover:bg-white hover:text-foreground hover:border-secondary/20 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Voice indicator */}
            <AnimatePresence>
              {listening && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  className="overflow-hidden border-t border-white/40">
                  <div className="px-5 py-3 bg-red-500/5 flex items-center gap-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <motion.div key={i} animate={{ scaleY: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                          className="w-1 h-4 bg-red-500 rounded-full" />
                      ))}
                    </div>
                    <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest">Listening…</span>
                    <button onClick={stop} className="ml-auto text-[9px] font-bold text-red-500/60 uppercase tracking-widest hover:text-red-500">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/60 shrink-0 bg-white/30">
              <div className="flex gap-2 items-center">
                <div className="flex-1 flex items-center soft-ui-in bg-white/60 border border-white rounded-xl overflow-hidden">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask anything or say 'raise a ticket'…"
                    disabled={loading || listening}
                    className="flex-1 px-4 py-2.5 text-[12px] bg-transparent outline-none font-medium text-foreground placeholder:text-foreground/30"
                  />
                </div>
                {supported && (
                  <button
                    onClick={listening ? stop : start}
                    disabled={loading}
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0',
                      listening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'soft-button border border-white text-foreground/40 hover:text-secondary hover:border-secondary/30'
                    )}
                    title={listening ? 'Stop recording' : 'Voice input'}
                  >
                    {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 shrink-0 shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[8px] font-bold text-foreground/20 uppercase tracking-widest text-center mt-2">
                Powered by Gemini · Voice-enabled · Actions auto-sync to DB
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
