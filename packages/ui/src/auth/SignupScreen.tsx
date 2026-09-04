'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSignupForm } from '@aaram/core';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, Shield, Leaf } from '../icons';

type AuthClient = {
  auth: {
    signUp: (opts: {
      email: string;
      password: string;
      options?: { data?: Record<string, string>; emailRedirectTo?: string };
    }) => Promise<{ error: { message: string } | null }>;
  };
};

export interface SignupScreenProps {
  supabase: AuthClient;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
  emailRedirectTo?: string;
}

export function SignupScreen({ supabase, onNavigateLogin, onNavigateHome, emailRedirectTo }: SignupScreenProps) {
  const [success, setSuccess] = useState(false);
  const { name, setName, email, setEmail, password, setPassword, loading, error, submit } =
    useSignupForm(supabase, () => setSuccess(true), emailRedirectTo);

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="soft-ui-out p-12 border border-white max-w-md space-y-8"
        >
          <div className="w-24 h-24 rounded-full soft-ui-in flex items-center justify-center text-secondary mx-auto">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-foreground">Request Received</h2>
            <p className="text-foreground/45 leading-relaxed text-lg">
              Please verify your email to activate your account.
            </p>
          </div>
          <button onClick={onNavigateLogin} className="btn-terracotta block w-full py-4 font-bold shadow-lg">
            Return to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary/20">
      <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] bg-primary/5 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[380px] z-10"
      >
        <div className="text-center mb-8 space-y-3">
          <button
            onClick={onNavigateHome}
            className="soft-button inline-flex items-center gap-2 px-3 py-1.5 border border-white group bg-white/40"
          >
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm shadow-primary/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tighter text-foreground uppercase">Aaram</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-foreground text-balance">
              Join the <span className="text-secondary italic">Sanctuary</span>
            </h1>
            <p className="text-foreground/40 text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center justify-center gap-1.5">
              <Leaf className="w-3 h-3 text-secondary" /> Intelligent Living Node
            </p>
          </div>
        </div>

        <div className="soft-card p-8 border border-white bg-white/40">
          <form onSubmit={e => { e.preventDefault(); submit(); }} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/30 ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/10 group-focus-within:text-primary transition-colors" />
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe"
                  className="soft-ui-in w-full py-3.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-foreground bg-white/60 border border-white/50" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/30 ml-1">Email Identity</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/10 group-focus-within:text-primary transition-colors" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="identity@aaram.space"
                  className="soft-ui-in w-full py-3.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-foreground bg-white/60 border border-white/50" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/30 ml-1">Secure Key</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/10 group-focus-within:text-primary transition-colors" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters"
                  className="soft-ui-in w-full py-3.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-foreground bg-white/60 border border-white/50" required minLength={6} />
              </div>
            </div>
            {error && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
              </motion.div>
            )}
            <button type="submit" disabled={loading}
              className="btn-terracotta w-full py-4 mt-4 font-bold flex items-center justify-center gap-2.5 shadow-xl hover:translate-y-[-1px] transition-all disabled:opacity-50 group text-xs uppercase tracking-widest">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : (
                <>Initialize Profile<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-1" /></>
              )}
            </button>
          </form>
          <div className="mt-8 text-center pt-6 border-t border-white/50">
            <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest">
              Already a Node?{' '}
              <button onClick={onNavigateLogin} className="text-primary hover:text-primary/80 transition-colors underline-offset-4 underline decoration-primary/20">
                Establish Link
              </button>
            </p>
          </div>
        </div>
        <div className="mt-10 text-center text-[9px] text-foreground/60 font-bold tracking-[0.4em] uppercase">Zero-Trust Environment</div>
      </motion.div>
    </div>
  );
}
