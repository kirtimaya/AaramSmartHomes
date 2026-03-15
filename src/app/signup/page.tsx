'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Mail, 
  Lock, 
  User,
  ArrowRight, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Leaf
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

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
              Your resident access request has been sent for curation. Please verify your email to activate your account.
            </p>
          </div>
          <Link href="/login" className="terracotta-button block w-full py-4 font-bold shadow-lg">
            Return to Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

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
            <h1 className="text-4xl font-bold tracking-tighter text-foreground">Join the Collective</h1>
            <p className="text-foreground/40 text-sm mt-2 flex items-center justify-center gap-1">
              <Leaf className="w-3 h-3 text-secondary" /> Request your co-living entry
            </p>
          </div>
        </div>

        <div className="soft-ui-out p-10 border border-white">
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/30 ml-2">Full Name</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/10 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="soft-ui-in w-full py-4 pl-14 pr-6 text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-foreground bg-white/50"
                  required
                />
              </div>
            </div>

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
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/30 ml-2">Security Key</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/10 group-focus-within:text-primary transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="soft-ui-in w-full py-4 pl-14 pr-6 text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-foreground bg-white/50"
                  required
                  minLength={6}
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
                  Submit Access Request
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
             <p className="text-xs text-foreground/30 font-bold">
              Already have access? <Link href="/login" className="text-primary hover:underline hover:text-primary/80 transition-colors">Sign In</Link>
            </p>
          </div>
        </div>

        <div className="mt-12 text-center text-[10px] text-foreground/10 font-bold tracking-[0.3em] uppercase">
          Minimalist Community Boarding
        </div>
      </motion.div>
    </div>
  );
}
