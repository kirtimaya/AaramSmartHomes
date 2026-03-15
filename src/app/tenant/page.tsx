'use client';

import React, { useState } from 'react';
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
  Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TenantPortal() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'meals' | 'tickets' | 'payments'>('home');
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 soft-ui-out flex items-center justify-center text-primary animate-pulse">
            <Shield className="w-8 h-8" />
          </div>
          <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.3em]">Preparing Sanctuary</p>
        </div>
      </div>
    );
  }

  const userName = user.user_metadata.full_name || user.email?.split('@')[0] || 'Resident';

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const amenities = [
    { icon: Wifi, label: 'High-Speed Wi-Fi', desc: 'SSID: Aaram_Pro | Pass: staylux2024' },
    { icon: Coffee, label: 'Cook on Call', desc: 'Available 7 AM - 9 PM daily' },
    { icon: Dumbbell, label: 'Gym Access', desc: 'Open 24/7 in the complex' },
    { icon: Wind, label: 'AC Maintenance', desc: 'Scheduled every 1st Sunday' },
  ];

  const stats = [
    { label: 'Unit', value: '101', sub: 'Villa Serenity', icon: Home, color: 'text-primary' },
    { label: 'WiFi Status', value: 'Prime', sub: '120 Mbps', icon: Wifi, color: 'text-secondary' },
    { label: 'Next Payment', value: 'Apr 01', sub: '₹28,500', icon: CreditCard, color: 'text-foreground/40' },
  ];

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-12 selection:bg-primary/20">
      {/* Top Header - Mobile & Desktop */}
      <div className="px-6 pt-12 pb-24 bg-accent/30 rounded-b-[64px] border-b border-white">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div className="space-y-3">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-widest border border-secondary/20">
                <Leaf className="w-3 h-3" /> Earthy Comfort
              </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tighter text-foreground">Welcome Home, <span className="text-primary italic">{userName}</span></h1>
            <p className="text-foreground/40 text-lg">Your peaceful sanctuary in North Goa.</p>
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={handleSignOut}
                className="soft-button w-14 h-14 flex items-center justify-center border border-white text-red-400 group hover:text-red-600"
              >
                <LogOut className="w-6 h-6 transition-transform group-hover:scale-110" />
              </button>
             <button className="soft-button w-14 h-14 flex items-center justify-center border border-white">
                <Settings className="w-6 h-6 text-foreground/40" />
              </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-12 space-y-12">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="soft-ui-out p-8 border border-white flex flex-col gap-5 hover:scale-[1.02] transition-transform cursor-default"
            >
              <div className={cn("w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-inner", stat.color)}>
                <stat.icon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em]">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1 tracking-tight">{stat.value}</p>
                <p className="text-sm text-foreground/40 mt-1">{stat.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Area */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Tabs for Mobile/Desktop Content */}
            <div className="flex gap-4 p-2 soft-ui-out bg-white/40 border border-white w-fit">
               {['home', 'meals', 'tickets'].map((tab) => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab as any)}
                   className={cn(
                     "px-6 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
                     activeTab === tab 
                      ? "terracotta-button shadow-lg" 
                      : "text-foreground/40 hover:bg-white/60"
                   )}
                 >
                   {tab}
                 </button>
               ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'home' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-12"
                >
                  {/* Service Request Hero */}
                  <div className="soft-ui-out p-12 border border-white relative overflow-hidden group">
                     <div className="relative z-10 space-y-6">
                        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                           <MessageSquare className="w-8 h-8" />
                        </div>
                        <div className="space-y-3">
                           <h2 className="text-3xl font-bold text-foreground">Concierge Support</h2>
                           <p className="text-foreground/45 max-w-sm text-lg leading-relaxed">Is there something we can improve? Raise a request, and our onsite team will be at your door within the hour.</p>
                        </div>
                        <button className="terracotta-button px-10 py-5 font-bold shadow-xl hover:translate-y-[-2px] transition-all rounded-2xl">
                           Report Concern
                        </button>
                     </div>
                     <Shield className="absolute -right-16 -bottom-16 w-64 h-64 text-primary/5 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
                  </div>

                  {/* Amenities List */}
                  <div className="space-y-8">
                     <h3 className="text-xl font-bold text-foreground px-2">Managed Services</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {amenities.map((item, idx) => (
                          <div key={idx} className="soft-ui-out p-6 border border-white flex items-center gap-5 hover:bg-white/40 transition-colors group">
                             <div className="w-14 h-14 rounded-2xl soft-ui-in flex items-center justify-center text-secondary group-hover:text-primary transition-colors">
                                <item.icon className="w-7 h-7" />
                             </div>
                             <div>
                                <h4 className="font-bold text-foreground">{item.label}</h4>
                                <p className="text-xs text-foreground/40 mt-1">{item.desc}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'meals' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="soft-ui-out p-12 border border-white space-y-12"
                >
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <h2 className="text-3xl font-bold text-foreground">Artisan Kitchen</h2>
                      <p className="text-foreground/40 text-lg">Curate your meals for tomorrow, March 16th.</p>
                    </div>
                    <UtensilsCrossed className="w-10 h-10 text-primary/30" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    {['Breakfast', 'Lunch', 'Dinner'].map((meal) => (
                      <button
                        key={meal}
                        onClick={() => setSelectedMeal(meal)}
                        className={cn(
                          "p-8 text-left border transition-all duration-500 rounded-[40px] flex flex-col gap-6",
                          selectedMeal === meal
                            ? "terracotta-button shadow-2xl scale-[1.05]"
                            : "soft-button border-white text-foreground/50 hover:bg-white"
                        )}
                      >
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", 
                          selectedMeal === meal ? "bg-white/20" : "bg-primary/5")}>
                           <Star className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-2xl">{meal}</p>
                          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-2">{selectedMeal === meal ? 'Selection Stored' : 'Available'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="pt-8 border-t border-border flex items-center gap-4 text-foreground/40">
                     <p className="text-sm italic">"The kitchen opens at 7:00 AM for fresh artisanal breakfast."</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Activity/Sidebar - Desktop */}
          <div className="lg:col-span-4 space-y-12">
            <div className="soft-ui-out p-10 border border-white space-y-10 bg-white/30">
               <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-foreground flex items-center gap-4">
                     <div className="w-3 h-10 rounded-full bg-secondary" />
                     Home Log
                  </h3>
                  <p className="text-xs text-foreground/40 font-bold uppercase tracking-widest pl-7">Live Updates</p>
               </div>
              
              <div className="space-y-10 relative">
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border/20" />
                
                {[
                  { title: 'Community Social', desc: "Organic wine tasting at Siolim Deck, 7 PM.", time: '2h ago', icon: Star, color: 'text-primary' },
                  { title: 'Sustainabilty Note', desc: "Rainwater harvest cycles active for the week.", time: '5h ago', icon: Leaf, color: 'text-secondary' },
                  { title: 'Portal Payment', desc: "Rent cycle for April successfully logged.", time: '1d ago', icon: CreditCard, color: 'text-foreground/30' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 relative z-10 group">
                    <div className="w-9 h-9 rounded-full bg-background border border-white flex items-center justify-center shrink-0 soft-ui-out group-hover:scale-110 transition-transform">
                      <item.icon className={cn("w-4 h-4", item.color)} />
                    </div>
                    <div className="space-y-1 pt-1">
                      <p className="font-bold text-foreground text-sm tracking-tight">{item.title}</p>
                      <p className="text-xs text-foreground/45 leading-relaxed">{item.desc}</p>
                      <p className="text-[10px] text-foreground/20 font-bold uppercase tracking-widest mt-1">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="soft-button w-full py-6 font-bold flex items-center justify-center gap-4 text-primary border border-white group">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              Explore Premium Add-ons
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
