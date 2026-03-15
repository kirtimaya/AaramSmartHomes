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
  const [activeTab, setActiveTab ] = useState<'home' | 'meals' | 'tickets' | 'payments'>('home');
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
    <div className="min-h-screen bg-background pb-20 lg:pb-12 selection:bg-primary/20">
      {/* Top Header - Compact */}
      <div className="px-6 pt-10 pb-20 bg-accent/40 rounded-b-[48px] border-b border-white">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div className="space-y-2">
             <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest border border-secondary/20">
                <Leaf className="w-2.5 h-2.5" /> Earthy Comfort
              </div>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tighter text-foreground">Namaste, <span className="text-primary italic">{userName}</span></h1>
            <p className="text-foreground/40 text-sm">Your peaceful sanctuary in North Goa.</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={handleSignOut}
                className="soft-button w-12 h-12 border border-white text-red-400 group hover:text-red-500"
              >
                <LogOut className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
             <button className="soft-button w-12 h-12 border border-white">
                <Settings className="w-5 h-5 text-foreground/40" />
              </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 space-y-8">
        {/* Quick Stats Grid - Tighter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="soft-card p-6 border border-white flex flex-col gap-4 hover:scale-[1.01] transition-transform"
            >
              <div className={cn("w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-inner", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-[0.15em]">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5 tracking-tight">{stat.value}</p>
                <p className="text-xs text-foreground/40">{stat.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Area */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Tabs - Compact */}
            <div className="flex gap-2.5 p-1.5 soft-ui-out bg-white/40 border border-white w-fit">
               {['home', 'meals', 'tickets'].map((tab) => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab as any)}
                   className={cn(
                     "px-5 py-2 rounded-xl text-[10px] font-extrabold transition-all uppercase tracking-widest",
                     activeTab === tab 
                      ? "terracotta-button shadow-md scale-105" 
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
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  className="space-y-8"
                >
                  {/* Service Request Hero - Tighter */}
                  <div className="soft-card p-10 border border-white relative overflow-hidden group bg-accent/20">
                     <div className="relative z-10 space-y-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                           <MessageSquare className="w-7 h-7" />
                        </div>
                        <div className="space-y-2">
                           <h2 className="text-2xl font-bold text-foreground">Concierge Support</h2>
                           <p className="text-foreground/45 max-w-sm text-sm leading-relaxed">Need help? Raise a request and we'll be there within the hour.</p>
                        </div>
                        <button className="terracotta-button px-8 py-3.5 text-xs font-bold shadow-lg hover:translate-y-[-1px] transition-all rounded-xl">
                           Report Concern
                        </button>
                     </div>
                     <Shield className="absolute -right-12 -bottom-12 w-48 h-48 text-primary/5 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
                  </div>

                  {/* Amenities List - Tighter */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {amenities.map((item, idx) => (
                      <div key={idx} className="soft-card-sm p-4 border border-white flex items-center gap-4 hover:bg-white/40 transition-colors group">
                         <div className="w-11 h-11 rounded-xl soft-ui-in flex items-center justify-center text-secondary group-hover:text-primary transition-colors">
                            <item.icon className="w-5 h-5" />
                         </div>
                         <div>
                            <h4 className="font-bold text-xs text-foreground uppercase tracking-tight">{item.label}</h4>
                            <p className="text-[10px] text-foreground/40 mt-0.5 truncate max-w-[180px]">{item.desc}</p>
                         </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'meals' && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  className="soft-card p-10 border border-white space-y-8"
                >
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-foreground">Artisan Kitchen</h2>
                      <p className="text-foreground/40 text-sm">Select your meals for tomorrow.</p>
                    </div>
                    <UtensilsCrossed className="w-8 h-8 text-primary/30" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {['Breakfast', 'Lunch', 'Dinner'].map((meal) => (
                      <button
                        key={meal}
                        onClick={() => setSelectedMeal(meal)}
                        className={cn(
                          "p-6 text-left border transition-all duration-500 rounded-[32px] flex flex-col gap-4",
                          selectedMeal === meal
                            ? "terracotta-button shadow-xl scale-[1.03]"
                            : "soft-button border-white text-foreground/50 hover:bg-white"
                        )}
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner", 
                          selectedMeal === meal ? "bg-white/20" : "bg-primary/5")}>
                           <Star className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{meal}</p>
                          <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-1">{selectedMeal === meal ? 'Selected' : 'Available'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Activity/Sidebar - Desktop */}
          <div className="lg:col-span-4 space-y-8">
            <div className="soft-card p-8 border border-white space-y-8 bg-white/30">
               <div className="space-y-1">
                  <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                     <div className="w-2.5 h-8 rounded-full bg-secondary" />
                     Home Log
                  </h3>
                  <p className="text-[9px] text-foreground/40 font-bold uppercase tracking-widest pl-5">Live Updates</p>
               </div>
              
              <div className="space-y-8 relative">
                <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-border/20" />
                
                {[
                  { title: 'Community Social', desc: "Organic wine tasting tonight.", time: '2h ago', icon: Star, color: 'text-primary' },
                  { title: 'Sustainabilty Note', desc: "Rainwater harvest cycles active.", time: '5h ago', icon: Leaf, color: 'text-secondary' },
                  { title: 'Portal Payment', desc: "Rent for April logged.", time: '1d ago', icon: CreditCard, color: 'text-foreground/30' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-5 relative z-10 group">
                    <div className="w-8 h-8 rounded-full bg-background border border-white flex items-center justify-center shrink-0 soft-button group-hover:scale-105 transition-transform">
                      <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                    </div>
                    <div className="space-y-0.5 pt-0.5">
                      <p className="font-bold text-foreground text-xs">{item.title}</p>
                      <p className="text-[10px] text-foreground/45 leading-relaxed">{item.desc}</p>
                      <p className="text-[9px] text-foreground/20 font-bold uppercase tracking-widest mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="soft-button w-full py-4.5 font-bold flex items-center justify-center gap-3 text-primary border border-white group text-xs">
              <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                <Plus className="w-4 h-4" />
              </div>
              Explore Premium Add-ons
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
