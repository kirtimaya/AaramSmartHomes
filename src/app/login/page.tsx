'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  Leaf
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Intelligently redirect based on email (placeholder for actual role)
      if (email.includes('admin') || email === 'kirtimayaswain@gmail.com') {
        router.push('/admin');
      } else {
        router.push('/tenant');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary/20">
      {/* Background Ornaments - Tighter */}
      <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] bg-primary/5 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[380px] z-10"
      >
        <div className="text-center mb-8 space-y-3">
          <Link href="/" className="soft-button inline-flex items-center gap-2 px-3 py-1.5 border border-white group bg-white/40">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm shadow-primary/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tighter text-foreground uppercase">Aaram</span>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-foreground text-balance">Welcome <span className="text-primary italic">Back</span></h1>
            <p className="text-foreground/40 text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center justify-center gap-1.5">
              <Leaf className="w-3 h-3 text-secondary" /> Secure Resident Node
            </p>
          </div>
        </div>

        <div className="soft-card p-8 border border-white bg-white/40">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/30 ml-1">Resident Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="identity@aaram.space"
                  className="soft-ui-in w-full py-3.5 pl-11 pr-5 text-xs focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-foreground bg-white/60 border border-white/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/30">Auth Key</label>
                <button type="button" className="text-[9px] font-bold text-primary/60 hover:text-primary transition-colors uppercase tracking-widest">Forgot?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="soft-ui-in w-full py-3.5 pl-11 pr-5 text-xs focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-foreground bg-white/60 border border-white/50"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-terracotta w-full py-4 font-bold flex items-center justify-center gap-2.5 shadow-xl hover:translate-y-[-1px] transition-all disabled:opacity-50 group text-xs uppercase tracking-widest"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : (
                <>
                  Establish Connection
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-white/50">
            <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest">
              Digital Nomad? <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors underline-offset-4 underline decoration-primary/20">Apply for entry</Link>
            </p>
          </div>
        </div>

        <div className="mt-10 text-center text-[9px] text-foreground/10 font-bold tracking-[0.4em] uppercase">
          Zero-Trust Environment
        </div>
      </motion.div>
    </div>
  );
}
