'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { AaraFABIcon } from '@/components/AaraFABIcon';
import {
  Bot, X, Send, Mic, MicOff, Loader2, Sparkles,
  CheckCircle2, Plus, Navigation, Database
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────
type MessageRole = 'user' | 'assistant';
type ActionType = 'ticket_created' | 'task_created' | 'navigate' | 'data_entry' | 'water_level' | null;

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
  if (!action && !data?.context) return null;
  
  const displayAction = action || (data?.context === 'Water Level' ? 'water_level' : null);

  if (displayAction === 'ticket_created') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-extrabold uppercase tracking-widest text-emerald-600">
        <CheckCircle2 className="w-3 h-3 shrink-0" />
        Ticket created · {data?.category}
      </div>
    );
  }
  if (displayAction === 'task_created') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[9px] font-extrabold uppercase tracking-widest text-amber-600">
        <Plus className="w-3 h-3 shrink-0" />
        Task logged: {data?.title}
      </div>
    );
  }
  if (displayAction === 'navigate') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[9px] font-extrabold uppercase tracking-widest text-blue-600">
        <Navigation className="w-3 h-3 shrink-0" />
        Navigating to: {data?.path}
      </div>
    );
  }
  if (displayAction === 'water_level') {
    return (
      <div className="mt-2 flex flex-col gap-2 p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20">
        <div className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-widest text-blue-600">
          <Sparkles className="w-3 h-3 shrink-0" />
          Water Level Diagnostics
        </div>
        <div className="w-full h-2 bg-blue-500/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${data?.value || 0}%` }}
            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          />
        </div>
        <p className="text-[10px] font-black text-blue-800">{data?.value}% Capacity</p>
      </div>
    );
  }
  if (displayAction === 'data_entry') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[9px] font-extrabold uppercase tracking-widest text-orange-600">
        <Database className="w-3 h-3 shrink-0" />
        Data Collected: {data?.context}
      </div>
    );
  }
  return null;
}

/**
 * Dispatches a global event for components to listen to (e.g., Selecting a room)
 */
function dispatchAaraCommand(action: string, data: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('AARA_APP_COMMAND', { detail: { action, data } }));
  }
}

// ─── Main Chatbot Widget ────────────────────────────────────────────────────
export function AaraChatbot() {
  const [open, setOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
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
  const [adminContext, setAdminContext] = useState<any>({ properties: [], rooms: [], tickets: [] });
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isNearRight, setIsNearRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragVelocity, setDragVelocity] = useState({ x: 0, y: 0 });

  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef(null);

  // Audio pre-warming for some browsers
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      if ('onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
      }
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    
    // Resume if paused (Chrome/Safari bug)
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/\{.*?\}/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';

    // Attempt to find a warm female voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Fallback: If no voices yet, try again in 100ms
      setTimeout(() => speak(text), 100);
      return;
    }

    const femaleVoice = voices.find(v => 
      v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google UK English Female') || v.lang.includes('GB')
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.volume = 1;
    utterance.rate = 0.95;
    utterance.pitch = 1.15;
    
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Handle Click Outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (open && !isPinned && chatRef.current && !chatRef.current.contains(event.target as Node)) {
        // Only close if not clicking on snitch
        const snitchBtn = document.getElementById('aara-snitch-container');
        if (snitchBtn && snitchBtn.contains(event.target as Node)) return;
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, isPinned]);

  const [authReady, setAuthReady] = useState(false);

  // Derived role — always up-to-date
  const currentRole = isAdmin ? 'admin' : (user ? 'tenant' : 'guest');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        checkAdminStatus(user.email!).then(() => setAuthReady(true));
      } else {
        setAuthReady(true); // No user logged in — guest
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user || null);
      if (s?.user) checkAdminStatus(s.user.email!).then(() => setAuthReady(true));
      else { setIsAdmin(false); setAuthReady(true); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (e: string): Promise<void> => {
    const { data } = await supabase.from('admins').select('email').eq('email', e.toLowerCase().trim()).single();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    const fetchAdminData = async () => {
      const [{ data: props }, { data: rms }, { data: tix }] = await Promise.all([
        supabase.from('properties').select('id, name, location'),
        supabase.from('rooms').select('id, room_number, status, property_id'),
        supabase.from('tickets').select('id, category, status, description').eq('status', 'Pending')
      ]);
      setAdminContext({ properties: props || [], rooms: rms || [], tickets: tix || [] });
      if (props) setProperties(props);
    };

    if (isAdmin) {
      fetchAdminData();
    } else {
      supabase.from('properties').select('id,name,location,total_rooms').then(({ data }) => { if (data) setProperties(data); });
    }
  }, [isAdmin]);

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
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: msg, history,
          context: {
            properties,
            admin_data: isAdmin ? adminContext : null,
          }
        })
      });
      const data = await res.json();
      const cleanReply = data.reply || 'I heard you!';
      
      console.log('[Aara Frontend] action:', data.action, '| path:', data.data?.path, '| reply:', cleanReply.slice(0, 60));
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', text: cleanReply, action: data.action, actionData: data.data, timestamp: new Date()
      }]);
      if (voiceEnabled) speak(cleanReply);

      // ── Action Handlers ──
      if (data.action === 'navigate' || data.action === 'app_command') {
        const path = data.data?.path;
        const cmd = data.data?.cmd;
        const cmdData = data.data;

        // Save command for post-navigation execution
        if (cmd) {
          sessionStorage.setItem('AARA_PENDING_COMMAND', JSON.stringify({ action: cmd, data: cmdData }));
          if (!path) dispatchAaraCommand(cmd, cmdData);
        }

        // Navigate — trust the AI's role-awareness rather than blocking here
        if (path) {
          setTimeout(() => { 
            router.push(path);
            if (!isPinned) setOpen(false);
            if (cmd) setTimeout(() => dispatchAaraCommand(cmd, cmdData), 800);
          }, 900);
        }
      }
    } catch {
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', text: 'Magic connection lost. Try again!', timestamp: new Date() }]);
    }
    setLoading(false);
  };

  const handleDragEnd = (_: any, info: any) => {
    setDragVelocity({ x: 0, y: 0 });
    setTimeout(() => setIsDragging(false), 50);
    const isRight = (window.innerWidth / 2) < (info.point.x);
    setIsNearRight(isRight);
  };

  const handleDrag = (_: any, info: any) => {
    setDragVelocity({ x: info.velocity.x, y: info.velocity.y });
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  return (
    <>
      {/* Viewport Anchor Container */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[999]">
        <motion.div 
          id="aara-snitch-container"
          drag 
          dragMomentum={false}
          dragConstraints={constraintsRef}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className="absolute top-24 right-16 w-32 h-32 pointer-events-auto cursor-grab active:cursor-grabbing flex items-center justify-center overflow-visible"
        >
        {/* ── Shared bob wrapper ── */}
        <motion.div
          className="flex flex-col items-center gap-1"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        >
            {/* Tooltip — NOW ABOVE BUTTON */}
            <AnimatePresence>
              {!open && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 10, x: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: -10 }}
                  exit={{ opacity: 0, scale: 0.85, y: 10, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="relative pointer-events-none mb-2"
                >
                  <div className="px-5 py-3 rounded-[22px] bg-white/90 backdrop-blur-xl border border-white/40 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] text-center">
                    <p className="text-[11px] font-bold text-stone-600 leading-tight flex items-center justify-center gap-2 tracking-tight">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-left">
                        How can I help you?<br />
                        <span className="text-amber-500/80 font-extrabold uppercase text-[9px] tracking-widest">I&apos;m AARA</span>
                      </span>
                    </p>
                  </div>
                  {/* Downward caret */}
                  <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 border-b border-r border-white/60 shadow-sm rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* FAB Button — BIGGER LOGO */}
            <motion.button
              onClick={() => !isDragging && setOpen(o => !o)}
              aria-label="Open Aara AI Assistant"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex items-center justify-center focus:outline-none"
              style={{
                width: 120, height: 120,
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                transition: 'transform 0.2s',
              }}
            >
              <AaraFABIcon size={120} isOpen={open} />
            </motion.button>
        </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div 
            ref={chatRef}
            initial={{ opacity: 0, y: 40, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed inset-0 lg:inset-auto lg:bottom-12 lg:right-12 z-[1000] w-full h-full lg:w-[440px] lg:h-[780px] flex flex-col border-none lg:border lg:border-white/40 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] rounded-none lg:rounded-[44px] overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)', 
              backdropFilter: 'blur(50px)'
            }}
          >
            <div className="flex items-center gap-4 px-8 py-7 border-b border-black/5 bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl border-2 border-white/50"><Sparkles className="w-7 h-7 text-white" /></div>
              <div>
                <p className="text-[14px] font-black text-foreground uppercase tracking-tight">Aara Intelligence</p>
                <div className="flex items-center gap-2 mt-0.5">
                   <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                   <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest opacity-80">Sync Active</p>
                </div>
              </div>
              
              <div className="ml-auto flex items-center gap-2">
                <button 
                  onClick={() => setIsPinned(!isPinned)} 
                  className={cn(
                    "p-3 rounded-2xl transition-all border", 
                    isPinned ? "bg-amber-500 text-white border-amber-400 shadow-lg" : "bg-black/5 text-foreground/40 border-transparent hover:bg-black/10"
                  )}
                  title={isPinned ? "Unpin Window" : "Pin Window"}
                >
                  <motion.div animate={isPinned ? { rotate: 45 } : { rotate: 0 }}><Navigation className="w-4 h-4" /></motion.div>
                </button>
                <button 
                  onClick={() => {
                    if (voiceEnabled) stopSpeaking();
                    setVoiceEnabled(!voiceEnabled);
                  }} 
                  className={cn("p-3 rounded-2xl transition-all border", voiceEnabled ? "bg-amber-500 text-white border-amber-400 shadow-lg" : "bg-black/5 text-foreground/40 border-transparent hover:bg-black/10")}
                  title={voiceEnabled ? "Stop/Disable Audio" : "Enable Audio"}
                >
                  {voiceEnabled ? (
                    <div className="flex gap-1 items-center">
                      <div className="flex gap-1 items-end h-3">
                        <div className="w-1.5 h-3 bg-white animate-pulse"/><div className="w-1.5 h-2 bg-white animate-pulse delay-75"/>
                      </div>
                      <span className="text-[10px] font-bold ml-1">STOP</span>
                    </div>
                  ) : <MicOff className="w-4 h-4" />}
                </button>
                <button onClick={() => setOpen(false)} className="p-3 rounded-2xl bg-black/5 text-foreground/40 hover:bg-black/10 transition-all border border-transparent">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {messages.map(m => (
                <div key={m.id} className={cn('flex gap-4', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shrink-0 shadow-lg border-2 border-white/20">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className={cn('max-w-[80%]', m.role === 'user' ? 'items-end' : 'items-start', 'flex flex-col')}>
                    <div className={cn(
                      'px-6 py-4 rounded-[28px] text-[14px] font-bold shadow-sm leading-relaxed',
                      m.role === 'user' ? 'bg-foreground text-background rounded-tr-none shadow-xl' : 'bg-white/80 border text-foreground rounded-tl-none backdrop-blur-md'
                    )}>
                      {m.text}
                      {m.actionData?.path && (
                        <div className="mt-3 pt-3 border-t border-black/5">
                          <button 
                            onClick={() => router.push(m.actionData!.path!)}
                            className="flex items-center gap-2 text-[10px] text-amber-600 hover:text-amber-700 font-black uppercase tracking-widest transition-colors"
                          >
                            <Navigation className="w-3 h-3" /> Take me there
                          </button>
                        </div>
                      )}
                    </div>
                    <ActionBadge action={m.action || null} data={m.actionData} />
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-center py-4">
                  <div className="flex gap-1.5 items-center bg-white/50 px-4 py-2 rounded-full border border-black/5 backdrop-blur-sm shadow-sm">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <AnimatePresence>
              {listening && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-amber-500/15 px-8 py-5 flex items-center gap-4 border-t border-amber-500/20 backdrop-blur-xl">
                  <div className="flex gap-1 items-end h-4">
                    <div className="w-1.5 h-4 bg-amber-600 animate-pulse"/>
                    <div className="w-1.5 h-2 bg-amber-600 animate-pulse delay-75"/>
                    <div className="w-1.5 h-5 bg-amber-600 animate-pulse delay-150"/>
                  </div>
                  <span className="text-[11px] font-black text-amber-700 uppercase tracking-widest">Listening for magic instructions…</span>
                  <button onClick={stop} className="ml-auto text-[10px] font-black text-amber-700 underline uppercase tracking-widest">Stop</button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-8 bg-white/30 border-t border-black/5 backdrop-blur-md">
              <div className="flex gap-4 items-center">
                <div className="flex-1 flex items-center bg-white/80 border rounded-[26px] px-3 shadow-inner group transition-all focus-within:ring-2 ring-amber-500/20 border-black/10">
                  <input 
                    ref={inputRef} type="text" value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                    placeholder="Type your magical query…" 
                    className="flex-1 px-5 py-4 text-[14px] bg-transparent outline-none font-bold placeholder:text-black/20" 
                  />
                  {supported && (
                    <button 
                      onClick={listening ? stop : start} 
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all", 
                        listening ? "bg-red-500 text-white shadow-lg" : "text-black/10 hover:text-amber-500"
                      )}
                    >
                      {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => sendMessage()} 
                  disabled={!input.trim() || loading} 
                  className="w-16 h-16 rounded-[28px] bg-foreground text-background flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  <Send className="w-7 h-7" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
