'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  Bot, X, Send, Mic, MicOff, Loader2, Sparkles,
  CheckCircle2, Plus, Navigation, Database
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────
type MessageRole = 'user' | 'assistant';
type ActionType = 'ticket_created' | 'task_created' | 'navigate' | 'data_entry' | null;

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  action?: ActionType;
  actionData?: any;
  timestamp: Date;
}

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
        Ticket created · {data?.category}
      </div>
    );
  }
  if (action === 'task_created') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[9px] font-extrabold uppercase tracking-widest text-amber-600">
        <Plus className="w-3 h-3 shrink-0" />
        Task logged: {data?.title}
      </div>
    );
  }
  if (action === 'navigate') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[9px] font-extrabold uppercase tracking-widest text-blue-600">
        <Navigation className="w-3 h-3 shrink-0" />
        Navigating to: {data?.path}
      </div>
    );
  }
  if (action === 'data_entry') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[9px] font-extrabold uppercase tracking-widest text-orange-600">
        <Database className="w-3 h-3 shrink-0" />
        Data Collected: {data?.context}
      </div>
    );
  }
  return null;
}

// ─── Snitch Component ────────────────────────────────────────────────────────
function GoldenSnitch({ open }: { open: boolean }) {
  return (
    <motion.div 
      className="relative flex items-center justify-center scale-75 lg:scale-100"
      animate={open ? { scale: 0.8 } : { y: [0, -10, 0] }}
      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
    >
      <AnimatePresence>
        {!open && (
          <>
            <motion.div 
              animate={{ rotate: [-40, 20, -40], scaleX: [1, 0.8, 1] }}
              transition={{ repeat: Infinity, duration: 0.15, ease: "linear" }}
              className="absolute right-full mr-[-4px] w-14 h-5 bg-gradient-to-l from-amber-100/60 to-transparent rounded-full border-t border-white/40 origin-right blur-[0.5px]"
            />
            <motion.div 
              animate={{ rotate: [40, -20, 40], scaleX: [1, 0.8, 1] }}
              transition={{ repeat: Infinity, duration: 0.15, ease: "linear" }}
              className="absolute left-full ml-[-4px] w-14 h-5 bg-gradient-to-r from-amber-100/60 to-transparent rounded-full border-t border-white/40 origin-left blur-[0.5px]"
            />
          </>
        )}
      </AnimatePresence>

      <div className={cn(
        "w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 via-yellow-500 to-amber-700 shadow-[0_0_25px_rgba(245,158,11,0.6)] border border-white/40 flex items-center justify-center overflow-hidden relative transition-all duration-500",
        open && "bg-foreground scale-0 opacity-0"
      )}>
        <Bot className="w-6 h-6 text-white drop-shadow-md" />
        <motion.div 
          animate={{ x: [-30, 60] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full skew-x-12"
        />
      </div>
      
      {open && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center shadow-xl"><X className="text-background w-6 h-6" /></motion.div>}
    </motion.div>
  );
}

// ─── Main Chatbot Widget ────────────────────────────────────────────────────
export function AaraChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: "Hello! I am Aara. How can I help you explore AaramSmartHomes today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\{.*?\}/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.1; utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUser(user); checkAdminStatus(user.email!); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user || null);
      if (s?.user) checkAdminStatus(s.user.email!); else setIsAdmin(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (e: string) => {
    const { data } = await supabase.from('admins').select('email').eq('email', e.toLowerCase().trim()).single();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    supabase.from('properties').select('id,name,location,total_rooms').then(({ data }) => { if (data) setProperties(data); });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 300); }, [open]);

  const { listening, supported, start, stop } = useSpeechRecognition(useCallback((t: string) => {
    setInput(t); setVoiceEnabled(true); setTimeout(() => sendMessage(t), 400);
  }, [messages])); // eslint-disable-line

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.filter(m => m.id !== '0').map(m => ({ role: m.role, text: m.text }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: msg, history, 
          context: { properties, user_id: user?.id, user_email: user?.email, role: isAdmin ? 'admin' : (user ? 'tenant' : 'public') } 
        })
      });
      const data = await res.json();
      const cleanReply = data.reply.replace(/\{.*?\}/g, '').trim();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', text: cleanReply, action: data.action, actionData: data.data, timestamp: new Date()
      }]);
      if (voiceEnabled) speak(cleanReply);

      if (data.action === 'navigate' && data.data?.path) {
        const path = data.data.path;
        if (path.startsWith('/admin') && !isAdmin && path !== '/adminLogin') {
          const m = 'Please sign in to access that. I can help you with homes or login!';
          setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', text: m, timestamp: new Date() }]);
          if (voiceEnabled) speak(m); return;
        }
        setTimeout(() => { 
          if (['/', '/adminLogin'].includes(path)) window.location.href = path; else router.push(path);
          setOpen(false); 
        }, 1200);
      }
    } catch {
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', text: 'Magic connection lost. Try again!', timestamp: new Date() }]);
    }
    setLoading(false);
  };

  return (
    <>
      <motion.button onClick={() => setOpen(o => !o)} className="fixed top-6 right-8 z-[999] p-2">
        <GoldenSnitch open={open} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.8, y: -40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: -40 }}
            className="fixed top-24 right-8 z-[998] w-[380px] h-[70vh] flex flex-col border border-white/40 shadow-2xl rounded-[32px] overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(30px)' }}>
            
            <div className="flex items-center gap-3 px-6 py-5 border-b border-black/5 bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg"><Sparkles className="w-5 h-5 text-white" /></div>
              <div><p className="text-[11px] font-black text-foreground/80 uppercase tracking-tighter">Aara AI</p><p className="text-[9px] font-bold text-amber-600/60 uppercase tracking-widest">Golden Snitch Tier</p></div>
              <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={cn("ml-auto p-2.5 rounded-2xl transition-all border", voiceEnabled ? "bg-amber-500 text-white border-amber-400 shadow-lg" : "bg-black/5 text-foreground/20 border-transparent")}>
                {voiceEnabled ? <div className="flex gap-1 items-end h-3"><div className="w-1 h-3 bg-white animate-pulse"/><div className="w-1 h-2 bg-white animate-pulse delay-75"/></div> : <MicOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {messages.map(m => (
                <div key={m.id} className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-sm"><Bot className="w-4 h-4 text-white" /></div>}
                  <div className={cn('max-w-[85%]', m.role === 'user' ? 'items-end' : 'items-start', 'flex flex-col')}>
                    <div className={cn('px-5 py-3 rounded-[24px] text-[13px] font-bold shadow-sm', m.role === 'user' ? 'bg-foreground text-background rounded-tr-none' : 'bg-white border text-foreground rounded-tl-none')}>{m.text}</div>
                    <ActionBadge action={m.action || null} data={m.actionData} />
                  </div>
                </div>
              ))}
              {loading && <Loader2 className="w-6 h-6 text-amber-500 animate-spin mx-auto" />}
              <div ref={bottomRef} />
            </div>

            <AnimatePresence>{listening && <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-amber-500/10 px-6 py-4 flex items-center gap-3 border-t border-amber-500/20"><span className="text-[10px] font-black text-amber-600 uppercase tracking-widest animate-pulse">Capturing Magic Voice…</span><button onClick={stop} className="ml-auto text-[10px] font-black text-amber-600 underline">Stop</button></motion.div>}</AnimatePresence>

            <div className="p-6 bg-white/40 border-t border-black/5">
              <div className="flex gap-3 items-center">
                <div className="flex-1 flex items-center bg-white border rounded-[20px] px-2 shadow-sm">
                  <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask something magical…" className="flex-1 px-4 py-3 text-[13px] bg-transparent outline-none font-bold" />
                  {supported && <button onClick={listening ? stop : start} className={cn("w-10 h-10 rounded-full flex items-center justify-center", listening ? "bg-red-500 text-white" : "text-black/20")}>{listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</button>}
                </div>
                <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="w-12 h-12 rounded-[20px] bg-foreground text-background flex items-center justify-center shadow-xl"><Send className="w-5 h-5" /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
