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

// ─── Directional Stardust Trail ──────────────────────────────────────────────
function StarDust({ dragVelocity }: { dragVelocity: { x: number; y: number } }) {
  const [particles, setParticles] = useState<{
    id: number;
    startX: number; startY: number;
    endX: number; endY: number;
    size: number; opacity: number; duration: number;
  }[]>([]);

  const isMoving = Math.abs(dragVelocity.x) > 2 || Math.abs(dragVelocity.y) > 2;

  useEffect(() => {
    const interval = setInterval(() => {
      const count = isMoving ? 4 : 1;
      setParticles(prev => {
        const newBatch = Array.from({ length: count }).map(() => {
          // Trail spawns opposite to direction of movement
          const angle = isMoving
            ? Math.atan2(-dragVelocity.y, -dragVelocity.x) + (Math.random() - 0.5) * 0.8
            : Math.random() * Math.PI * 2;
          const spawnDist = 10 + Math.random() * 15;
          const travelDist = isMoving ? 40 + Math.random() * 60 : 20 + Math.random() * 40;
          const sz = isMoving ? 6 + Math.random() * 14 : 4 + Math.random() * 10;
          return {
            id: Math.random(),
            startX: Math.cos(angle) * spawnDist,
            startY: Math.sin(angle) * spawnDist,
            endX: Math.cos(angle) * (spawnDist + travelDist),
            endY: Math.sin(angle) * (spawnDist + travelDist),
            size: sz,
            opacity: 0.7 + Math.random() * 0.3,
            duration: isMoving ? 0.6 + Math.random() * 0.6 : 1.5 + Math.random() * 1.5,
          };
        });
        return [...prev.slice(isMoving ? -50 : -20), ...newBatch];
      });
    }, isMoving ? 30 : 200);
    return () => clearInterval(interval);
  }, [isMoving, dragVelocity.x, dragVelocity.y]);

  return (
    <div className="absolute inset-0 overflow-visible pointer-events-none" style={{ zIndex: -1 }}>
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ x: p.startX, y: p.startY, scale: 1, opacity: p.opacity }}
            animate={{ x: p.endX, y: p.endY, scale: 0, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: p.duration, ease: 'easeOut' }}
            className="absolute rounded-full"
            style={{
              left: '50%',
              top: '50%',
              width: p.size,
              height: p.size,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
              background: 'radial-gradient(circle at 30% 30%, #fff9e6, #f5c842 50%, #d4860a)',
              boxShadow: `0 0 ${p.size * 1.5}px ${p.size * 0.8}px rgba(245,200,66,0.6), 0 0 ${p.size * 3}px rgba(255,200,50,0.3)`,
              filter: 'blur(0.5px)',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Golden Snitch (Cinematic Prop) ──────────────────────────────────────────
function GoldenSnitch({ open, dragVelocity }: { open: boolean; dragVelocity: { x: number; y: number } }) {
  return (
    <motion.div
      className="relative flex items-center justify-center overflow-visible"
      animate={{ y: open ? 0 : [0, -10, 0] }}
      transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
    >
      {/* Stardust trail around ball */}
      <StarDust dragVelocity={dragVelocity} />

      {/* ── Wings (only when closed) ── */}
      <AnimatePresence>
        {!open && (
          <motion.div
            animate={{ rotateX: [-20, 40, -20], rotateZ: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="absolute"
            style={{ bottom: '78%', perspective: '1200px', originY: 'bottom' }}
          >
            <svg width="300" height="160" viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-[0_4px_24px_rgba(235,192,109,0.5)]">
              <defs>
                {/* Iridescent silver-gold for rachis */}
                <linearGradient id="rachis_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#E8D5A3" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#C4973B" stopOpacity="0.9" />
                </linearGradient>
                {/* Feather vane gradient — white/silver near rachis, fade out at tip */}
                <linearGradient id="vane_grad_l" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                  <stop offset="60%" stopColor="#E8D5A3" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#EBC06D" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="vane_grad_r" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                  <stop offset="60%" stopColor="#E8D5A3" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#EBC06D" stopOpacity="0.0" />
                </linearGradient>
                <filter id="wing_glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* LEFT WING */}
              <g transform="translate(135,148) rotate(-8)" filter="url(#wing_glow)">
                {/* Rachis shaft */}
                <path d="M0,0 C-20,-22 -60,-65 -130,-148" stroke="url(#rachis_grad)" strokeWidth="3" strokeLinecap="round" />
                {/* 38 individual feather barbs */}
                {Array.from({ length: 38 }).map((_, i) => {
                  const t = i / 37;
                  // point along rachis curve
                  const rx = -20 * t - 60 * t * t - 130 * t * t * t;
                  const ry = -22 * t - 65 * t * t - 148 * t * t * t;
                  // barb spreads perpendicular+slightly toward top
                  const bLen = 14 + t * 28;
                  const bx = rx - bLen * (1 - t * 0.3);
                  const by = ry - bLen * 0.3;
                  return (
                    <line key={i}
                      x1={rx} y1={ry}
                      x2={bx} y2={by}
                      stroke="url(#vane_grad_l)"
                      strokeWidth={0.7 + t * 0.4}
                      strokeLinecap="round"
                      opacity={0.5 + t * 0.5}
                    />
                  );
                })}
              </g>

              {/* RIGHT WING */}
              <g transform="translate(165,148) rotate(8)" filter="url(#wing_glow)">
                {/* Rachis shaft */}
                <path d="M0,0 C20,-22 60,-65 130,-148" stroke="url(#rachis_grad)" strokeWidth="3" strokeLinecap="round" />
                {/* 38 individual feather barbs */}
                {Array.from({ length: 38 }).map((_, i) => {
                  const t = i / 37;
                  const rx = 20 * t + 60 * t * t + 130 * t * t * t;
                  const ry = -22 * t - 65 * t * t - 148 * t * t * t;
                  const bLen = 14 + t * 28;
                  const bx = rx + bLen * (1 - t * 0.3);
                  const by = ry - bLen * 0.3;
                  return (
                    <line key={i}
                      x1={rx} y1={ry}
                      x2={bx} y2={by}
                      stroke="url(#vane_grad_r)"
                      strokeWidth={0.7 + t * 0.4}
                      strokeLinecap="round"
                      opacity={0.5 + t * 0.5}
                    />
                  );
                })}
              </g>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sphere ── */}
      <div
        className="relative rounded-full overflow-hidden"
        style={{
          width: 80, height: 80,
          background: 'radial-gradient(circle at 35% 30%, #FFF8DC 0%, #F5C842 20%, #D4860A 55%, #7A4400 85%, #3A1F00 100%)',
          boxShadow: 'inset -12px -14px 30px rgba(0,0,0,0.7), inset 10px 10px 25px rgba(255,240,160,0.5), 0 8px 32px rgba(180,100,0,0.5), 0 0 60px rgba(235,192,80,0.3)',
          border: '1.5px solid rgba(255,230,100,0.4)',
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            {/* Warm gold specular highlight */}
            <radialGradient id="ball_spec" cx="35%" cy="28%" r="45%">
              <stop offset="0%" stopColor="#FFFAE0" stopOpacity="1" />
              <stop offset="40%" stopColor="#F5C842" stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            {/* Brushed-gold surface micro-texture */}
            <pattern id="gold_grain" width="3" height="3" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="3" y2="3" stroke="#7A4400" strokeWidth="0.3" opacity="0.15" />
            </pattern>
            {/* Dark atmosphere at base */}
            <radialGradient id="ball_shadow" cx="65%" cy="75%" r="55%">
              <stop offset="0%" stopColor="#3A1000" stopOpacity="0.8" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grain texture */}
          <circle cx="50" cy="50" r="50" fill="url(#gold_grain)" />
          {/* Atmospheric shadow */}
          <circle cx="50" cy="50" r="50" fill="url(#ball_shadow)" />
          {/* Specular highlight */}
          <circle cx="50" cy="50" r="50" fill="url(#ball_spec)" />

          {/* Main curved armor seams — like the reference image panels */}
          <path d="M8 50 C22 38, 78 62, 92 50" fill="none" stroke="#3A1F00" strokeWidth="2" opacity="0.9" />
          <path d="M50 8 C38 22, 62 78, 50 92" fill="none" stroke="#3A1F00" strokeWidth="2" opacity="0.9" />
          <path d="M18 20 C35 30, 65 30, 82 20" fill="none" stroke="#3A1F00" strokeWidth="1.2" opacity="0.7" />
          <path d="M18 80 C35 70, 65 70, 82 80" fill="none" stroke="#3A1F00" strokeWidth="1.2" opacity="0.7" />

          {/* Clockwork gear port (left side — matches reference) */}
          <g transform="translate(22,50)">
            <circle r="16" fill="#1A0800" stroke="#C4973B" strokeWidth="1.5" />
            <circle r="11" fill="none" stroke="#8B6020" strokeWidth="0.8" />
            <motion.g animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <rect key={i} x="9" y="-2" width="5" height="4" rx="0.5"
                  fill="#D4A030" transform={`rotate(${i * 45})`} />
              ))}
            </motion.g>
            <circle r="5" fill="#8B6020" stroke="#C4973B" strokeWidth="0.8" />
            <circle r="2" fill="#F0D080" />
          </g>

          {/* Wing socket rivets */}
          <circle cx="80" cy="30" r="4.5" fill="#1A0800" stroke="#D4A030" strokeWidth="1" />
          <circle cx="80" cy="30" r="2" fill="#D4A030" />
          <circle cx="80" cy="70" r="4.5" fill="#1A0800" stroke="#D4A030" strokeWidth="1" />
          <circle cx="80" cy="70" r="2" fill="#D4A030" />

          {/* Equator band detail */}
          <path d="M8 50 C18 47, 40 46, 50 46 C60 46, 82 47, 92 50" fill="none" stroke="#C4973B" strokeWidth="0.5" opacity="0.5" />
        </svg>

        {/* Rim glow */}
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: 'inset 0 0 10px 2px rgba(245,200,60,0.2)' }} />
        {/* Primary specular bright spot */}
        <div className="absolute" style={{
          top: '10%', left: '20%', width: '35%', height: '20%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.85) 0%, transparent 80%)',
          borderRadius: '50%', transform: 'rotate(-25deg)', filter: 'blur(3px)'
        }} />
        {/* Sweeping glint */}
        <motion.div
          animate={{ x: [-120, 200] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,200,0.45) 50%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
      </div>
    </motion.div>
  );
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
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isNearRight, setIsNearRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragVelocity, setDragVelocity] = useState({ x: 0, y: 0 });

  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef(null);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\{.*?\}/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.1; utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

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
          if (!isPinned) setOpen(false); 
        }, 1200);
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
          className="absolute top-10 right-10 w-24 h-24 pointer-events-auto cursor-grab active:cursor-grabbing flex items-center justify-center overflow-visible"
        >
          <motion.div 
            onClick={() => !isDragging && setOpen(o => !o)} 
            className="relative"
          >
            <GoldenSnitch open={open} dragVelocity={dragVelocity} />
            
            <AnimatePresence>
              {!open && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, x: isNearRight ? -20 : 20 }}
                  animate={{ opacity: 1, scale: 1, x: isNearRight ? -10 : 10 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 whitespace-nowrap px-5 py-2.5 rounded-[22px] bg-white/70 backdrop-blur-xl border border-white/80 shadow-2xl pointer-events-none",
                    isNearRight ? "right-[130%]" : "left-[130%]"
                  )}
                >
                  <p className="text-[11px] font-black uppercase tracking-tighter text-foreground italic flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Shall we talk? I&apos;m Aara.
                  </p>
                  <div className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white/70 border-t border-l border-white/80 rotate-45 shadow-sm",
                    isNearRight ? "right-[-6px]" : "left-[-6px]"
                  )} />
                </motion.div>
              )}
            </AnimatePresence>
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
                <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={cn("p-3 rounded-2xl transition-all border", voiceEnabled ? "bg-amber-500 text-white border-amber-400 shadow-lg" : "bg-black/5 text-foreground/40 border-transparent hover:bg-black/10")}>
                  {voiceEnabled ? <div className="flex gap-1 items-end h-3"><div className="w-1.5 h-3 bg-white animate-pulse"/><div className="w-1.5 h-2 bg-white animate-pulse delay-75"/></div> : <MicOff className="w-4 h-4" />}
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
