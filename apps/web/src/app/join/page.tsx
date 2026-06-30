'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Home, Loader2, CheckCircle2, AlertCircle,
  MapPin, ArrowRight, Mail, Lock, User, Phone
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type InvitationInfo = {
  name: string;
  phone: string | null;
  email: string | null;
  move_in_date: string | null;
  rooms: { name: string; type: string; properties: { name: string; location: string } };
};

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const sbEntry = Object.entries(localStorage).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (sbEntry) {
    try {
      const t = JSON.parse(sbEntry[1])?.access_token;
      if (t) return { Authorization: `Bearer ${t}` };
    } catch { /* ignore */ }
  }
  return {};
}

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loadingInv, setLoadingInv] = useState(true);
  const [invError, setInvError] = useState('');

  // Auth form state
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [step, setStep] = useState<'form' | 'verify_email' | 'claiming' | 'done'>('form');

  // Load invitation info on mount
  useEffect(() => {
    if (!token) { setInvError('No invitation token found in URL.'); setLoadingInv(false); return; }
    fetch(`/api/join?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(({ invitation: inv, error, claimed }) => {
        if (error) { setInvError(claimed ? 'This invitation has already been used.' : error); }
        else { setInvitation(inv); setFullName(inv.name); setEmail(inv.email ?? ''); }
        setLoadingInv(false);
      });
  }, [token]);

  // If user is already logged in when they land here, auto-claim
  useEffect(() => {
    if (!token || loadingInv || invError) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) claimInvitation(session.access_token);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loadingInv, invError]);

  const claimInvitation = async (accessToken?: string) => {
    setStep('claiming');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authH = accessToken ? { Authorization: `Bearer ${accessToken}` } : getAuthHeader();
    Object.assign(headers, authH);

    const res = await fetch('/api/join', {
      method: 'POST',
      headers,
      body: JSON.stringify({ token }),
    });
    const json = await res.json();
    if (json.success) {
      setStep('done');
      setTimeout(() => router.push('/tenant'), 1500);
    } else if (json.claimed) {
      setStep('done'); // already claimed, still redirect
      setTimeout(() => router.push('/tenant'), 1500);
    } else {
      setAuthError(json.error ?? 'Failed to activate account');
      setStep('form');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/join?token=${token}`)}`,
      },
    });

    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    setStep('verify_email');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    if (session) await claimInvitation(session.access_token);
  };

  const handleGoogle = async () => {
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/join?token=${token}`)}`,
      },
    });
    if (error) { setAuthError(error.message); setAuthLoading(false); }
  };

  if (loadingInv) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (invError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-primary mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Invalid Invitation</h2>
        <p className="text-foreground/50 text-sm mb-6">{invError}</p>
        <Link href="/login" className="btn-terracotta px-6 py-3 text-xs font-bold uppercase tracking-widest">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] bg-primary/5 rounded-full blur-[100px]" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="soft-button inline-flex items-center gap-2 px-3 py-1.5 border border-white bg-white/40">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tighter text-foreground uppercase">Aaram</span>
          </Link>
        </div>

        {/* Invitation card */}
        {invitation && (
          <div className="soft-card border border-white bg-white/40 p-6 space-y-3">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-secondary">Your Invitation</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome, {invitation.name}!
            </h1>
            <div className="flex items-center gap-2 soft-well px-4 py-3 border border-white">
              <Home className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">{(invitation.rooms as any)?.name} — {(invitation.rooms as any)?.type}</p>
                <p className="text-[10px] text-foreground/40 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {(invitation.rooms as any)?.properties?.name} · {(invitation.rooms as any)?.properties?.location}
                </p>
              </div>
            </div>
            {invitation.move_in_date && (
              <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">
                Move-in: {new Date(invitation.move_in_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        )}

        {/* Steps */}
        <AnimatePresence mode="wait">
          {step === 'claiming' && (
            <motion.div key="claiming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="soft-card border border-white bg-white/40 p-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-sm font-bold text-foreground">Activating your tenant portal…</p>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="soft-card border border-secondary/20 bg-secondary/5 p-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-secondary mx-auto" />
              <p className="text-lg font-bold text-foreground">Portal Activated!</p>
              <p className="text-xs text-foreground/50">Redirecting to your tenant portal…</p>
            </motion.div>
          )}

          {step === 'verify_email' && (
            <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="soft-card border border-white bg-white/40 p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Check Your Email</h3>
              <p className="text-sm text-foreground/50 leading-relaxed">
                We sent a verification link to <strong>{email}</strong>.
                Click it to activate your account — you'll land right back here.
              </p>
              <p className="text-[10px] text-foreground/30 uppercase tracking-widest">Check spam if it doesn't arrive within 2 minutes</p>
            </motion.div>
          )}

          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="soft-card border border-white bg-white/40 p-8 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">
                  {mode === 'signup' ? 'Create your account' : 'Log in to activate'}
                </h2>
                <p className="text-[10px] text-foreground/40 uppercase tracking-widest mt-0.5">
                  {mode === 'signup' ? 'Set up your portal access' : 'Use your existing Aaram account'}
                </p>
              </div>

              {/* Google */}
              <button onClick={handleGoogle} disabled={authLoading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl border border-white bg-white/80 text-sm font-bold text-foreground/70 hover:shadow-md transition-all disabled:opacity-50">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/60" />
                <span className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/60" />
              </div>

              <form onSubmit={mode === 'signup' ? handleSignup : handleLogin} className="space-y-3">
                {mode === 'signup' && (
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name"
                      className="soft-ui-in w-full py-3.5 pl-10 pr-4 text-xs text-foreground bg-white/60 border border-white/50 focus:outline-none"
                      required />
                  </div>
                )}
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
                    className="soft-ui-in w-full py-3.5 pl-10 pr-4 text-xs text-foreground bg-white/60 border border-white/50 focus:outline-none"
                    required />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 chars)"
                    className="soft-ui-in w-full py-3.5 pl-10 pr-4 text-xs text-foreground bg-white/60 border border-white/50 focus:outline-none"
                    required minLength={6} />
                </div>

                {authError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {authError}
                  </div>
                )}

                <button type="submit" disabled={authLoading}
                  className="btn-terracotta w-full py-3.5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>{mode === 'signup' ? 'Create Account & Activate' : 'Log In & Activate'} <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              <div className="text-center text-[10px] text-foreground/30 font-bold uppercase tracking-widest">
                {mode === 'signup' ? (
                  <>Already have an account?{' '}
                    <button onClick={() => setMode('login')} className="text-primary underline underline-offset-4">Log in</button>
                  </>
                ) : (
                  <>New here?{' '}
                    <button onClick={() => setMode('signup')} className="text-primary underline underline-offset-4">Create account</button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
