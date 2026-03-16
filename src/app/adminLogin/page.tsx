'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  Fingerprint,
  ChevronLeft,
  CheckCircle2,
  Clock,
  ShieldAlert,
  UserPlus,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';

const ROOT_EMAIL = 'kirtimayaswain@gmail.com';

function AdminLoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'login' | 'signup' | 'pending-verify' | 'request-access' | 'pending-approval' | 'verifying-token'>('login');
  const [user, setUser] = useState<any>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // 1. Initial State & Token Handling
  useEffect(() => {
    // Check for errors in hash (Supabase auth errors)
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const errorMsg = params.get('error_description') || params.get('error') || 'Authentication failed';
      setError(errorMsg.replace(/\+/g, ' '));
      // If OTP expired, we still want to let them see the login form
      if (hash.includes('otp_expired')) {
        setStep('login');
      }
    }

    // Check if tables exist
    supabase.from('admins').select('id').limit(1).then(({ error }) => {
      if (error && error.message.includes('not found')) setTableMissing(true);
    });

    // Check current auth status
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        const email = user.email?.toLowerCase().trim();
        if (email === ROOT_EMAIL) {
          fetchPendingRequests();
        }
        checkAdminStatus(user.email!);
      }
    });

    // Handle verification token from root approval link
    if (token) handleTokenVerification(token);
  }, [token]);

  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from('admin_requests')
      .select('*')
      .eq('status', 'pending');
    if (data) setPendingRequests(data);
    if (error) {
      console.error('Fetch requests error:', error);
      setError(`Fetch failed [${error.code}]: ${error.message}`);
      if (error.code === '42P01') setTableMissing(true);
    }
  };

  // Subscribe to realtime updates for root
  useEffect(() => {
    const email = user?.email?.toLowerCase().trim();
    if (email === ROOT_EMAIL) {
      const channel = supabase
        .channel('admin-grid-sync')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'admin_requests' 
        }, () => {
          fetchPendingRequests();
        })
        .subscribe();
      
      return () => { channel.unsubscribe(); };
    }
  }, [user]);

  const approveRequest = async (request: any) => {
    setApprovingId(request.id);
    try {
      // 1. Add to admins
      const { error: adminErr } = await supabase
        .from('admins')
        .insert([{ email: request.email, added_by: 'ROOT_DIRECT' }]);
      
      if (adminErr && adminErr.code !== '23505') throw adminErr;

      // 2. Update request status
      await supabase
        .from('admin_requests')
        .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: ROOT_EMAIL })
        .eq('id', request.id);

      // 3. Refresh
      fetchPendingRequests();
    } catch (err: any) {
      alert('Approval failed: ' + err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const checkAdminStatus = async (userEmail: string) => {
    if (!userEmail) return;
    const normalized = userEmail.toLowerCase().trim();
    
    // ROOT BYPASS
    if (normalized === ROOT_EMAIL) {
      // Stay on login page to manage requests, or we can add a bypass button
      return;
    }

    const { data: admin, error: adminErr } = await supabase.from('admins').select('*').eq('email', normalized).single();
    
    if (adminErr && adminErr.code !== 'PGRST116') { // Ignore 'not found'
      console.error('Admin check error:', adminErr);
      setError('Admin verification failed: ' + adminErr.message);
    }

    if (admin) {
      router.push('/admin');
    } else {
      // Check if there's already a pending request
      const { data: request, error: reqErr } = await supabase
        .from('admin_requests')
        .select('*')
        .eq('email', normalized)
        .eq('status', 'pending')
        .single();
      
      if (reqErr && reqErr.code !== 'PGRST116') {
        console.error('Request status check error:', reqErr);
      }
      
      if (request) {
        setStep('pending-approval');
      } else {
        setStep('request-access');
      }
    }
  };

  const handleTokenVerification = async (verifyToken: string) => {
    setStep('verifying-token');
    setLoading(true);
    try {
      const { data: request, error: reqErr } = await supabase
        .from('admin_requests')
        .select('*')
        .eq('token', verifyToken)
        .eq('status', 'pending')
        .single();

      if (reqErr || !request) throw new Error('Invalid token');

      await supabase.from('admins').insert([{ email: request.email, added_by: 'ROOT_LINK' }]);
      await supabase.from('admin_requests').update({ status: 'approved' }).eq('id', request.id);
      
      router.push('/admin');
    } catch (err: any) {
      setError('Token verification failed: ' + err.message);
      setStep('login');
    } finally {
      setLoading(false);
    }
  };

  // 2. Auth Actions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (user) {
      setUser(user);
      if (user.email === ROOT_EMAIL) {
        fetchPendingRequests();
      }
      checkAdminStatus(user.email!);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { emailRedirectTo: `${window.location.origin}/adminLogin` }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // PROACTIVELY CREATE REQUEST
      const { error: reqErr } = await supabase.from('admin_requests').insert([{ 
        email: email, 
        token: Math.random().toString(36).substring(2, 15),
        status: 'pending' 
      }]);
      
      if (reqErr && reqErr.code !== '23505') { 
        console.error('Request creation failed:', reqErr);
        setError(`Onboarding request failed [${reqErr.code}]: ${reqErr.message}`);
      }
      
      setStep('pending-verify');
      setLoading(false);
    }
  };

  const requestRootApproval = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const email = user.email?.toLowerCase().trim();
      if (email === ROOT_EMAIL) {
        // Just refresh if they are actually root but stuck
        await fetchPendingRequests();
        setStep('login'); // This will trigger the useEffect re-check
        return;
      }

      const verifyToken = Math.random().toString(36).substring(2, 15);
      const { error } = await supabase.from('admin_requests').insert([{ 
        email: user.email, 
        token: verifyToken,
        status: 'pending' 
      }]);
      if (error) throw error;
      setStep('pending-approval');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[420px] z-10">
        <div className="text-center mb-10 space-y-4">
          <Link href="/login" className="soft-button inline-flex items-center gap-2 px-4 py-2 border border-white group bg-white/60">
            <ChevronLeft className="w-4 h-4 text-foreground/40 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-extrabold tracking-widest text-foreground/40 uppercase">Gate Switch</span>
          </Link>
          
          <div className="pt-2">
            <div className="mx-auto w-20 h-20 rounded-[2.5rem] bg-foreground text-background flex items-center justify-center shadow-2xl mb-6 border-4 border-white/20">
                <ShieldCheck className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">
              Admin <span className="text-primary italic">Gateway</span>
            </h1>
            <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-foreground/5 border border-foreground/10">
               <Fingerprint className="w-3 h-3 text-primary" />
               <span className="text-[9px] font-extrabold text-foreground/40 uppercase tracking-[0.4em]">Secure Node</span>
            </div>
          </div>
        </div>

        <div className="soft-card p-10 border-2 border-white bg-white/40 shadow-2xl backdrop-blur-xl">
          {tableMissing && (
             <div className="mb-8 p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col items-center gap-3 text-center">
                <ShieldAlert className="w-8 h-8 text-primary animate-pulse" />
                <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-relaxed">System Setup Required: Run Fixed SQL Artifact</p>
             </div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-bold flex gap-3 italic"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* Root Approval View */}
            {user?.email?.toLowerCase()?.trim() === ROOT_EMAIL ? (
              <motion.div key="root-dashboard" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-left space-y-1">
                    <h3 className="text-xl font-black uppercase text-foreground italic">Root Dashboard</h3>
                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{pendingRequests.length} Pending Auth Nodes</p>
                  </div>
                  <button 
                    onClick={() => { setLoading(true); fetchPendingRequests().finally(() => setLoading(false)); }}
                    className="w-10 h-10 rounded-xl bg-white/60 border border-white flex items-center justify-center hover:bg-white transition-all shadow-sm"
                    title="Refresh Grid"
                  >
                    <Loader2 className={cn("w-4 h-4 text-primary", loading && "animate-spin")} />
                  </button>
                </div>

                {pendingRequests.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="p-4 rounded-2xl bg-white/60 border border-white flex flex-col gap-3 shadow-sm group">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center text-foreground/20">
                              <UserPlus className="w-4 h-4" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-foreground truncate">{req.email}</p>
                              <p className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest">Request Pending</p>
                           </div>
                        </div>
                        <button 
                          onClick={() => approveRequest(req)}
                          disabled={approvingId === req.id}
                          className="w-full py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          {approvingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Grant Admin Access
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-foreground/5 border border-white/50 text-center space-y-3">
                    {error?.includes('Fetch failed') ? (
                      <>
                        <AlertCircle className="w-10 h-10 text-destructive/30 mx-auto" />
                        <p className="text-[10px] font-black text-destructive/40 uppercase tracking-widest leading-relaxed">Database Access Error<br/>Check SQL Policies</p>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mx-auto" />
                        <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest">No Pending Approvals</p>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-4 border-t border-white">
                   <button 
                    onClick={() => router.push('/admin')}
                    className="btn-terracotta w-full py-4 text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 group"
                  >
                    Enter Admin Console <ArrowRight className="w-4 h-4 group-hover:translate-x-1" />
                  </button>
                  <button 
                    onClick={() => supabase.auth.signOut().then(() => { setUser(null); setPendingRequests([]); })}
                    className="soft-button w-full py-4 text-[10px] font-black uppercase tracking-widest border border-white text-foreground/30"
                  >
                    Sign Out (Root)
                  </button>
                </div>
              </motion.div>
            ) : (
              // Standard View (Login/Signup/Pending)
              <>
                {(step === 'login' || step === 'signup') && (
                  <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <div className="flex bg-foreground/5 rounded-2xl p-1">
                      <button onClick={() => setStep('login')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${step === 'login' ? 'bg-white shadow-lg text-primary' : 'text-foreground/30'}`}>Login</button>
                      <button onClick={() => setStep('signup')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${step === 'signup' ? 'bg-white shadow-lg text-primary' : 'text-foreground/30'}`}>Onboard</button>
                    </div>

                    <form onSubmit={step === 'login' ? handleLogin : handleSignup} className="space-y-6">
                      <div className="space-y-4">
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Identity" className="soft-ui-in w-full py-4 pl-12 pr-5 text-sm focus:outline-none bg-white/70 border-2 border-white" required />
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Encryption Key" className="soft-ui-in w-full py-4 pl-12 pr-5 text-sm focus:outline-none bg-white/70 border-2 border-white" required />
                        </div>
                      </div>


                      <button type="submit" disabled={loading} className="btn-terracotta w-full py-5 font-black flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-xs uppercase tracking-widest">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Key className="w-4 h-4" />{step === 'login' ? 'Establish Link' : 'Initialize Node'}</>}
                      </button>
                      
                      {user?.email === ROOT_EMAIL && (
                        <button 
                          type="button"
                          onClick={() => router.push('/admin')}
                          className="w-full text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline pt-2"
                        >
                          Root Bypass: Enter Console
                        </button>
                      )}
                    </form>
                  </motion.div>
                )}

                {step === 'pending-verify' && (
                  <motion.div key="verify" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8 py-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 mx-auto shadow-inner"><Mail className="w-10 h-10 animate-bounce" /></div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black uppercase text-foreground tracking-tighter italic">Check Transmission</h3>
                      <p className="text-sm text-foreground/50 font-bold leading-relaxed uppercase">Verification link sent to identity node. Please verify to continue.</p>
                    </div>
                    <button onClick={() => setStep('login')} className="text-[10px] font-black text-primary uppercase tracking-[0.3em] hover:underline">Return to Login</button>
                  </motion.div>
                )}

                {step === 'request-access' && (
                  <motion.div key="request" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8 py-4">
                    <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 mx-auto shadow-inner"><ShieldCheck className="w-10 h-10" /></div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black uppercase text-foreground tracking-tighter italic">Access Restricted</h3>
                      <p className="text-sm text-foreground/50 font-bold leading-relaxed uppercase">Identity verified, but node lacks admin clearance.</p>
                    </div>
                    <div className="bg-foreground/5 p-4 rounded-2xl border border-foreground/10"><p className="text-[10px] font-bold text-foreground/40 uppercase leading-relaxed italic">Logged in as: <span className="text-foreground">{user?.email}</span></p></div>
                    <button onClick={requestRootApproval} disabled={loading} className="btn-terracotta w-full py-5 font-black flex items-center justify-center gap-3 shadow-2xl transition-all disabled:opacity-50 text-xs uppercase tracking-widest">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Request Root Approval'}
                    </button>
                    <button onClick={() => supabase.auth.signOut().then(() => { setUser(null); setStep('login'); })} className="text-[9px] font-bold text-foreground/20 uppercase tracking-[0.4em] hover:text-primary transition-colors">Terminate Session</button>
                  </motion.div>
                )}

                {step === 'pending-approval' && (
                  <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-8 py-4">
                    <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 mx-auto shadow-inner"><Clock className="w-10 h-10 animate-pulse" /></div>
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black uppercase text-foreground tracking-tighter italic">Approval Pending</h3>
                      <p className="text-sm text-foreground/50 font-bold leading-relaxed uppercase tracking-wider">Wait for root sync:<br/><span className="text-primary font-black block mt-1">{ROOT_EMAIL}</span></p>
                    </div>
                    <button onClick={() => setStep('login')} className="text-[10px] font-black text-primary uppercase tracking-[0.3em] hover:underline">System Reset</button>
                  </motion.div>
                )}

                {step === 'verifying-token' && (
                  <motion.div key="token" className="text-center py-10 space-y-6">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-foreground/40 animate-pulse">Syncing Admin Nodes...</p>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-12 text-center">
           <div className="inline-block p-4 rounded-3xl bg-white/30 border border-white backdrop-blur-md">
              <p className="text-[9px] font-black text-foreground/30 leading-tight uppercase tracking-[0.4em]">Root Control Console: <span className="text-foreground/20">{ROOT_EMAIL}</span></p>
           </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}
