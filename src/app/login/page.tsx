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
      router.push('/tenant');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary/20">
      {/* Background Ornaments */}
      <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10 space-y-4">
          <Link href="/" className="soft-button inline-flex items-center gap-2 px-4 py-2 border border-white group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-110">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tighter text-foreground">AARAM</span>
          </Link>
          <div>
            <h1 className="text-4xl font-bold tracking-tighter text-foreground">Welcome Back</h1>
            <p className="text-foreground/40 text-sm mt-2 flex items-center justify-center gap-1">
              <Leaf className="w-3 h-3 text-secondary" /> Access your home sanctuary
            </p>
          </div>
        </div>

        <div className="soft-ui-out p-10 border border-white">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/30 ml-2">Email Identity</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/10 group-focus-within:text-primary transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="soft-ui-in w-full py-4 pl-14 pr-6 text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-foreground bg-white/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/30">Security Key</label>
                <button type="button" className="text-[10px] font-bold text-primary/60 hover:text-primary transition-colors">Recover?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/10 group-focus-within:text-primary transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="soft-ui-in w-full py-4 pl-14 pr-6 text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-foreground bg-white/50"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-500 text-xs font-bold"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="terracotta-button w-full py-5 font-bold flex items-center justify-center gap-3 shadow-xl hover:translate-y-[-2px] transition-all disabled:opacity-50 group"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Enter Resident Portal
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-xs text-foreground/30 font-bold">
              New to Aaram? <Link href="/signup" className="text-primary hover:underline hover:text-primary/80 transition-colors">Join the collective</Link>
            </p>
          </div>
        </div>

        <div className="mt-12 text-center text-[10px] text-foreground/10 font-bold tracking-[0.3em] uppercase">
          Minimalist Secure Access
        </div>
      </motion.div>
    </div>
  );
}
