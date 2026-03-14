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
  LogOut
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-bold text-foreground/40 animate-pulse uppercase tracking-widest">Securing Session...</p>
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

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      {/* Mobile Top Header */}
      <header className="px-6 py-8 flex justify-between items-center lg:px-12">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome Home, {userName}</h1>
          <p className="text-foreground/50 text-sm">Unit 101, Villa Serenity</p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleSignOut}
            className="w-10 h-10 rounded-xl glass border border-border flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-full gold-gradient border-2 border-white/20 shadow-lg shadow-primary/20 flex items-center justify-center font-bold text-white uppercase">
            {userName.substring(0, 2)}
          </div>
        </div>
      </header>


      <div className="px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-7xl mx-auto">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Section: Status Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-6 rounded-3xl border border-border space-y-2">
              <p className="text-xs font-bold text-foreground/40 uppercase">Next Payment</p>
              <h3 className="text-xl font-bold">₹45,000</h3>
              <p className="text-[10px] text-primary font-semibold">Due in 5 days</p>
            </div>
            <div className="glass p-6 rounded-3xl border border-border space-y-2">
              <p className="text-xs font-bold text-foreground/40 uppercase">Water Level</p>
              <h3 className="text-xl font-bold text-green-500">Normal</h3>
              <p className="text-[10px] text-foreground/40">Adequate for today</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {/* Welcome Kit / Benefits */}
                <section className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Resident Benefits</h2>
                    <button className="text-primary text-xs font-bold underline">Welcome Guide PDF</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {amenities.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 glass rounded-2xl border border-border group hover:border-primary transition-colors cursor-pointer">
                        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <item.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{item.label}</p>
                          <p className="text-xs text-foreground/50">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Maintenance Request Quick Form placeholder */}
                <section className="bg-slate-900 text-white rounded-[32px] p-8 relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <h3 className="text-2xl font-bold">Have an issue?</h3>
                    <p className="text-white/60 text-sm max-w-md">Raise a maintenance ticket and track its progress in real-time. Our team usually responds within 2 hours.</p>
                    <button className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
                      Report Problem
                    </button>
                  </div>
                  <MessageSquare className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
                </section>
              </motion.div>
            )}

            {activeTab === 'meals' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Meal Selector</h2>
                  <div className="text-xs text-foreground/40 font-medium">Week 14 Mar - 20 Mar</div>
                </div>
                
                <div className="space-y-4">
                  {['Today', 'Tomorrow', '17 Mar'].map((day, dIdx) => (
                    <div key={day} className="glass rounded-3xl border border-border p-6 shadow-sm">
                      <h4 className="font-bold mb-4">{day}</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {['Breakfast', 'Lunch', 'Dinner'].map((meal) => (
                          <div key={meal} className="flex flex-col items-center gap-3">
                            <div className="w-full aspect-square rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-foreground/20 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer border border-transparent hover:border-primary/20 group">
                              <UtensilsCrossed className="w-8 h-8 group-hover:scale-125 transition-transform" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{meal}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop Sidebar / Notifications Area */}
        <div className="lg:col-span-4 space-y-12">
          <div className="glass rounded-3xl border border-border p-6">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Recent Activity
            </h3>
            <div className="space-y-6">
              <ActivityItem date="Yesterday" text="Visitor #3402 was granted entry." />
              <ActivityItem date="12 Mar" text="Rent payment received for March." />
              <ActivityItem date="10 Mar" text="AC Filter cleaning completed." />
            </div>
          </div>

          <div className="bg-primary/10 rounded-3xl border border-primary/20 p-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white">
              <Plus className="w-8 h-8" />
            </div>
            <h4 className="font-bold">Add Amenity</h4>
            <p className="text-xs text-foreground/60 leading-relaxed">Want laundry or bike rental service? Add it to your subscription in one click.</p>
            <button className="text-primary text-sm font-bold hover:underline">Explore Services</button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 lg:left-auto lg:right-12 lg:top-1/2 lg:-translate-y-1/2 lg:w-20 glass rounded-[32px] border border-border p-4 flex lg:flex-col justify-between items-center shadow-2xl z-50">
        <NavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={ShieldCheck} />
        <NavBtn active={activeTab === 'meals'} onClick={() => setActiveTab('meals')} icon={UtensilsCrossed} />
        <NavBtn active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} icon={MessageSquare} />
        <NavBtn active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={CreditCard} />
      </nav>
    </div>
  );
}

function NavBtn({ active, onClick, icon: Icon }: { active: boolean, onClick: () => void, icon: any }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
        active ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : "text-foreground/40 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
    >
      <Icon className="w-6 h-6" />
    </button>
  );
}

function ActivityItem({ date, text }: { date: string, text: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-1 h-10 bg-primary/20 rounded-full mt-1" />
      <div>
        <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{date}</p>
        <p className="text-sm font-medium">{text}</p>
      </div>
    </div>
  );
}
