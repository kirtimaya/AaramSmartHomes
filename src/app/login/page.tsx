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
  Leaf,
  Fingerprint,
  User as UserIcon,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Route by role
    const token = session?.access_token;
    if (token) {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      const { role } = await res.json();
      if (role === 'admin') { router.push('/admin'); return; }
      if (role === 'tenant') { router.push('/tenant'); return; }
    }
    router.push('/guest');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setError(null);
    // Use explicit env var so the reset link in the email points to production,
    // not localhost. Set NEXT_PUBLIC_SITE_URL in Vercel env vars (e.g. https://aaramsmarthomes.com).
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : typeof window !== 'undefined' ? window.location.origin : '');
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setForgotSent(true);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary/20">
      {/* Background Ornaments */}
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

        <div className="soft-card p-8 border border-white bg-white/40 space-y-6">
          
          {/* Google Sign-In — Primary for Admin */}
          <div className="space-y-2">
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl border border-white bg-white/80 shadow-md hover:shadow-lg hover:translate-y-[-1px] active:translate-y-0 transition-all font-bold text-sm text-foreground/70 disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-foreground/40" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continue with Google
            </button>
            <p className="text-center text-[9px] font-bold text-foreground/20 uppercase tracking-widest">Recommended for admin access</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/60" />
            <span className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/60" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
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
                <button type="button" onClick={() => { setForgotMode(true); setForgotEmail(email); setForgotSent(false); setError(null); }}
                  className="text-[9px] font-bold text-primary/60 hover:text-primary transition-colors uppercase tracking-widest">Forgot?</button>
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

          <div className="text-center pt-4 border-t border-white/50">
            <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest">
              Digital Nomad? <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors underline-offset-4 underline decoration-primary/20">Apply for entry</Link>
            </p>
          </div>
        </div>

        <div className="mt-10 text-center text-[9px] text-foreground/10 font-bold tracking-[0.4em] uppercase">
          Zero-Trust Environment
        </div>
      </motion.div>

      {/* Forgot password overlay */}
      {forgotMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-6"
          onClick={() => setForgotMode(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm soft-card border border-white bg-background p-8 rounded-3xl shadow-2xl space-y-5"
          >
            {forgotSent ? (
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6 text-secondary" />
                </div>
                <p className="font-extrabold text-foreground tracking-tight">Check your inbox</p>
                <p className="text-[11px] text-foreground/40 font-medium leading-relaxed">
                  A password reset link was sent to <span className="font-bold text-foreground/60">{forgotEmail}</span>. Check spam if you don't see it.
                </p>
                <button onClick={() => setForgotMode(false)}
                  className="w-full btn-terracotta py-3 text-[11px] font-extrabold uppercase tracking-widest mt-2">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div>
                  <p className="font-extrabold text-foreground tracking-tight">Reset Password</p>
                  <p className="text-[11px] text-foreground/40 mt-1">Enter your email and we'll send a reset link.</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="soft-ui-in w-full py-3.5 pl-11 pr-5 text-xs focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-foreground bg-white/60 border border-white/50"
                    />
                  </div>
                  {error && (
                    <p className="text-[10px] text-red-500 font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" /> {error}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setForgotMode(false)}
                      className="flex-1 soft-button border border-white py-3 text-[11px] font-extrabold uppercase tracking-widest text-foreground/40">
                      Cancel
                    </button>
                    <button type="submit" disabled={forgotLoading}
                      className="flex-1 btn-terracotta py-3 text-[11px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-2">
                      {forgotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      {forgotLoading ? 'Sending…' : 'Send Link'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
