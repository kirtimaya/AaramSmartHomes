'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Coffee, 
  Dumbbell, 
  Wind, 
  ShieldCheck, 
  UtensilsCrossed, 
  MessageSquare, 
  CreditCard,
  ChevronRight,
  Plus,
  LogOut,
  Settings,
  Home,
  Star,
  Shield,
  User,
  Zap,
  Leaf,
  Heart,
  Calendar,
  Phone,
  CheckCircle2,
  Building2,
  Waves,
  MapPin,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Tenant, Property } from '@/lib/types';

import { supabase } from '@/lib/supabase';

export default function UnifiedUserDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab ] = useState<'explore' | 'home' | 'meals' | 'support'>('home');
  const [tenantProfile, setTenantProfile] = useState<Tenant | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        fetchProfileAndData();
      }
    }
  }, [user, loading, router]);

  const fetchProfileAndData = async () => {
    setDashboardLoading(true);
    try {
      // 1. Fetch Tenant Profile
      const { data: profile, error: profileError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', user?.id)
        .single();

      let currentProfile: Tenant;

      if (profileError || !profile) {
        // Fallback or Guest initialization
        currentProfile = {
          id: user?.id || 'guest',
          name: user?.user_metadata?.full_name || 'Guest Member',
          email: user?.email || '',
          status: 'guest',
          shortlisted_property_ids: []
        };
      } else {
        currentProfile = profile as Tenant;
      }

      setTenantProfile(currentProfile);
      if (currentProfile.status === 'guest') setActiveTab('explore');

      // 2. Fetch All Properties (to filter shortlisted)
      const { data: props, error: propsError } = await supabase
        .from('properties')
        .select('*');

      if (!propsError && props) {
        setProperties(props as Property[]);
      }
    } catch (err) {
      console.error('Dashboard initialization error:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  if (loading || dashboardLoading || !user || !tenantProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 text-center px-6">
          <div className="w-20 h-20 soft-ui-out flex items-center justify-center text-primary animate-pulse border border-white">
            <Shield className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold text-foreground/30 uppercase tracking-[0.4em]">Synchronizing Lifestyle</p>
            <p className="text-[10px] font-bold text-primary italic">Hand-crafting your sanctuary...</p>
          </div>
        </div>
      </div>
    );
  }

  const isGuest = tenantProfile.status === 'guest';
  const userName = user.user_metadata.full_name || user.email?.split('@')[0] || 'Member';

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const universalBenefits = [
    { icon: Wifi, label: 'Hyper-WiFi', desc: 'Secure mesh networking across all nodes.' },
    { icon: Coffee, label: 'Kitchen Hub', desc: 'Curated meal plans and on-call chefs.' },
    { icon: ShieldCheck, label: 'Biometric Security', desc: 'Zero-touch entry via Aaram Mobile App.' },
    { icon: Sparkles, label: 'Deep Cleaning', desc: 'Weekly professional architectural care.' },
  ];

  const shortlistedProperties = properties.filter(p => tenantProfile.shortlisted_property_ids?.includes(p.id));

  return (
    <div className="min-h-screen bg-background pb-20 selection:bg-primary/20">
      {/* Dynamic Header */}
      <div className={cn(
        "px-6 pt-12 pb-24 rounded-b-[64px] border-b border-white transition-colors duration-1000",
        isGuest ? "bg-secondary/5" : "bg-accent/40"
      )}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 text-secondary text-[10px] font-extrabold uppercase tracking-widest border border-white shadow-sm">
                {isGuest ? <Sparkles className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3 text-primary" />}
                {isGuest ? 'Future Resident' : 'Active Sanctuary'} Node
              </div>
            <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-foreground">
                {isGuest ? 'Welcome,' : 'Namaste,'} <span className="text-primary italic">{userName}</span>
            </h1>
            <p className="text-foreground/40 text-base max-w-xl font-medium leading-relaxed">
                {isGuest 
                  ? 'Your shortlisted properties are ready for a walkthrough. Connect with our team to finalize your stay.'
                  : 'Welcome back to your duplex. Everything is set to your preferences.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={handleSignOut}
                className="soft-button w-14 h-14 border border-white text-red-300 group hover:text-red-500 shadow-xl"
              >
                <LogOut className="w-6 h-6 transition-transform group-hover:scale-110" />
              </button>
             <button className="soft-button w-14 h-14 border border-white shadow-xl">
                <Settings className="w-6 h-6 text-foreground/40" />
              </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-12 space-y-12">
        {/* Navigation Tabs */}
        <div className="flex justify-center">
            <div className="flex gap-2 p-2 soft-ui-out bg-white/80 backdrop-blur-md border border-white w-fit rounded-[24px] shadow-2xl">
               {isGuest ? (
                 <>
                   <button onClick={() => setActiveTab('explore')} className={cn("tab-user", activeTab === 'explore' && "active")}>Explore</button>
                   <button onClick={() => setActiveTab('support')} className={cn("tab-user", activeTab === 'support' && "active")}>Contact Team</button>
                 </>
               ) : (
                 <>
                   <button onClick={() => setActiveTab('home')} className={cn("tab-user", activeTab === 'home' && "active")}>Home</button>
                   <button onClick={() => setActiveTab('meals')} className={cn("tab-user", activeTab === 'meals' && "active")}>Meals</button>
                   <button onClick={() => setActiveTab('support')} className={cn("tab-user", activeTab === 'support' && "active")}>Concierge</button>
                 </>
               )}
            </div>
        </div>

        <AnimatePresence mode="wait">
            {activeTab === 'explore' && isGuest && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                   {/* Shortlisted Properties */}
                   <section className="space-y-8">
                       <h2 className="text-2xl font-bold uppercase tracking-tight flex items-center gap-3">
                           <Heart className="w-6 h-6 text-primary fill-primary/10" /> Your Selection
                       </h2>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           {shortlistedProperties.map(property => (
                               <div key={property.id} className="soft-card p-0 overflow-hidden border border-white group">
                                   <div className="relative h-64">
                                       <img src={property.image_url} className="w-full h-full object-cover" />
                                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                       <div className="absolute bottom-6 left-6">
                                           <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">{property.name}</h3>
                                           <p className="text-white/70 text-sm font-bold flex items-center gap-1 uppercase tracking-widest"><MapPin className="w-3 h-3" /> {property.location}</p>
                                       </div>
                                       <div className="absolute top-6 right-6">
                                            <span className="sage-badge scale-110 shadow-lg">{property.property_type}</span>
                                       </div>
                                   </div>
                                   <div className="p-8 flex justify-between items-center bg-white/40">
                                       <div className="flex gap-6">
                                           <div className="text-center">
                                               <p className="text-lg font-black text-foreground">{property.total_rooms}</p>
                                               <p className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-foreground/30">Rooms</p>
                                           </div>
                                           <div className="w-[1px] h-8 bg-white/60 my-auto" />
                                           <div className="text-center">
                                               <p className="text-lg font-black text-secondary">Aaram+</p>
                                               <p className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-foreground/30">Tier</p>
                                           </div>
                                       </div>
                                       <button className="btn-terracotta px-6 py-3 text-[10px] font-extrabold uppercase tracking-widest shadow-lg">Schedule Visit</button>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </section>

                   {/* Common Benefits */}
                   <section className="space-y-8">
                       <h2 className="text-2xl font-bold uppercase tracking-tight flex items-center gap-3">
                           <Star className="w-6 h-6 text-secondary" /> The Aaram Standard
                       </h2>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                           {universalBenefits.map((item, i) => (
                               <div key={i} className="soft-card p-8 border border-white space-y-4 hover:scale-[1.03] transition-transform">
                                   <div className="w-12 h-12 rounded-2xl bg-secondary/5 flex items-center justify-center text-secondary shadow-inner">
                                       <item.icon className="w-6 h-6" />
                                   </div>
                                   <div className="space-y-1">
                                       <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">{item.label}</h4>
                                       <p className="text-[11px] text-foreground/45 leading-relaxed">{item.desc}</p>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </section>
                </motion.div>
            )}

            {activeTab === 'home' && !isGuest && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="soft-card p-8 border border-white space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">Your Unit</p>
                                <p className="text-2xl font-black text-foreground">101A • Master Duplex</p>
                            </div>
                        </div>
                        <div className="soft-card p-8 border border-white space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/5 flex items-center justify-center text-secondary shadow-inner">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">Automation</p>
                                <p className="text-2xl font-black text-foreground">8 Nodes Active</p>
                            </div>
                        </div>
                        <div className="soft-card p-8 border border-white space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center text-foreground/40 shadow-inner">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">Dues</p>
                                <p className="text-2xl font-black text-foreground">₹2,400 <span className="text-[10px] text-emerald-500 font-bold ml-1">PAID</span></p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="soft-card p-10 border border-white bg-white/40 flex flex-col md:flex-row gap-10 items-center">
                        <div className="space-y-4 flex-1">
                            <h2 className="text-3xl font-black tracking-tighter uppercase">Living Area Status</h2>
                            <p className="text-foreground/45 max-w-sm text-sm">Light levels are optimized for mid-day focus. AC is set to 22°C Energy Saver mode.</p>
                            <div className="flex gap-4 pt-2">
                                <button className="soft-button px-6 py-3 border border-white text-[10px] font-extrabold uppercase tracking-widest">Adjust Climate</button>
                                <button className="terracotta-button px-6 py-3 text-[10px] font-extrabold uppercase tracking-widest shadow-lg">Scene: Relax</button>
                            </div>
                        </div>
                        <div className="w-full md:w-64 h-64 soft-ui-out bg-white/50 rounded-[48px] border border-white flex items-center justify-center relative overflow-hidden group">
                           <Shield className="w-20 h-20 text-primary/10 transition-transform duration-1000 group-hover:scale-125" />
                           <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/30">Security Status</p>
                               <p className="text-lg font-black text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-5 h-5" /> FORTIFIED</p>
                           </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {activeTab === 'support' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-12 py-10">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl font-black tracking-tighter uppercase">Direct Line to Aaram</h2>
                        <p className="text-foreground/40 text-lg uppercase tracking-widest font-bold">Priority Connect Node</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="soft-card p-10 border border-white space-y-8 bg-white/60">
                             <div className="space-y-2">
                                <h3 className="text-xl font-bold uppercase tracking-tight">Speak with a Lead</h3>
                                <p className="text-xs text-foreground/40 leading-relaxed font-bold">Instant connection with our property managers regarding visits or stay details.</p>
                             </div>
                             <div className="space-y-4">
                                <button className="w-full btn-terracotta py-5 flex items-center justify-center gap-3 text-sm font-bold shadow-2xl">
                                    <Phone className="w-5 h-5" />
                                    Call Management
                                </button>
                                <button className="w-full soft-button py-5 flex items-center justify-center gap-3 text-sm font-bold border border-white bg-white/40">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                    WhatsApp Concierge
                                </button>
                             </div>
                        </div>

                        <div className="soft-card p-10 border border-white space-y-8 bg-secondary/5">
                             <div className="space-y-2">
                                <h3 className="text-xl font-bold uppercase tracking-tight">Request Documentation</h3>
                                <p className="text-xs text-foreground/40 leading-relaxed font-bold">Get digital copies of floor plans, rental agreements, or community guidelines.</p>
                             </div>
                             <div className="space-y-4">
                                <div className="soft-well p-4 border border-white flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Agreement Template</span>
                                    <Plus className="w-4 h-4 text-primary cursor-pointer" />
                                </div>
                                <div className="soft-well p-4 border border-white flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Floor Plan - p1 Duplex</span>
                                    <Plus className="w-4 h-4 text-primary cursor-pointer" />
                                </div>
                             </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .tab-user {
            padding: 10px 24px;
            border-radius: 16px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        }
        .tab-user.active {
            background: #E07A5F;
            color: white;
            box-shadow: 0 10px 20px -10px rgba(224, 122, 95, 0.4);
            transform: scale(1.05);
        }
        .tab-user:not(.active):hover {
            background: rgba(255,255,255,0.8);
            color: black;
        }
      `}</style>
    </div>
  );
}
