'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Zap, Leaf, Loader2, Home, ChefHat, Sprout, Star, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Property } from "@/lib/types";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalRole, setPortalRole] = useState<'admin' | 'tenant' | 'guest' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProperties();
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const { role } = await res.json();
    setPortalRole(role);
  };

  const handleTenantPortalClick = async () => {
    if (portalRole === 'admin') {
      await supabase.auth.signOut();
      router.push('/login');
      return;
    }
    if (portalRole === 'tenant') { router.push('/tenant'); return; }
    if (portalRole === 'guest') { router.push('/guest'); return; }
    router.push('/login');
  };

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*, rooms(*), benefits(*)')
      .limit(2);
    
    if (!error && data) {
      setProperties(data);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/20">
      {/* Background Ornaments - Tighter Blurs */}
      <div className="absolute top-[-2%] right-[-2%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-2%] left-[-2%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Navigation - Compact */}
      <nav className="fixed top-4 left-4 right-4 z-50 px-4 sm:px-6 py-3 bg-background/70 backdrop-blur-md rounded-2xl border border-white/40 soft-ui-out max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <Image src="/images/aaram-logo.png" alt="Aaram" width={36} height={36}
              className="w-9 h-9 object-contain transition-transform group-hover:scale-110" />
            <span className="font-bold tracking-tighter text-lg text-foreground">AARAM</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[13px]">
            <Link href="/properties" className="font-bold text-foreground/70 hover:text-primary transition-colors">Find a Home</Link>
            <Link href="#spaces" className="font-medium text-foreground/50 hover:text-primary transition-colors">Spaces</Link>
            <Link href="#amenities" className="font-medium text-foreground/50 hover:text-primary transition-colors">Amenities</Link>
            <Link href="/food-hub" className="font-medium text-foreground/50 hover:text-primary transition-colors">Kitchen</Link>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleTenantPortalClick}
              className="soft-button px-4 py-2 text-[12px] font-bold flex items-center gap-1.5 hover:text-primary transition-all whitespace-nowrap"
            >
              <Home className="w-3.5 h-3.5" />
              {portalRole === 'tenant' ? 'My Portal' : portalRole === 'guest' ? 'My Space' : 'Member Portal'}
            </button>
            <Link href="/login" className="btn-terracotta px-5 py-2 text-[13px] hover:shadow-lg transition-all whitespace-nowrap">
              Sign In
            </Link>
          </div>

          {/* Mobile: hamburger toggle only — everything else moves into the panel below */}
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className="md:hidden soft-button w-10 h-10 flex items-center justify-center border border-white/40 shrink-0"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-white/40 flex flex-col gap-1">
                <Link href="/properties" onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl font-bold text-sm text-foreground/70 hover:bg-white/50 hover:text-primary transition-colors">Find a Home</Link>
                <Link href="#spaces" onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl font-medium text-sm text-foreground/50 hover:bg-white/50 hover:text-primary transition-colors">Spaces</Link>
                <Link href="#amenities" onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl font-medium text-sm text-foreground/50 hover:bg-white/50 hover:text-primary transition-colors">Amenities</Link>
                <Link href="/food-hub" onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl font-medium text-sm text-foreground/50 hover:bg-white/50 hover:text-primary transition-colors">Kitchen</Link>

                <div className="flex items-center gap-2 pt-3 mt-2 border-t border-white/40">
                  <ThemeToggle />
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleTenantPortalClick(); }}
                    className="flex-1 soft-button px-4 py-2.5 text-[12px] font-bold flex items-center justify-center gap-1.5"
                  >
                    <Home className="w-3.5 h-3.5" />
                    {portalRole === 'tenant' ? 'My Portal' : portalRole === 'guest' ? 'My Space' : 'Member Portal'}
                  </button>
                </div>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                  className="btn-terracotta px-5 py-3 text-center text-[13px] mt-1">
                  Sign In
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section - Tighter Padding */}
      <section className="pt-32 pb-12 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        <div className="lg:w-1/2 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-widest border border-secondary/20">
            <Leaf className="w-3 h-3" /> Earthy & Organic
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter leading-[1] text-foreground">
            LIVE IN <br />
            <span className="text-primary italic">HARMONY.</span>
          </h1>
          <p className="text-foreground/50 text-lg max-w-md leading-relaxed mx-auto lg:mx-0">
            Thoughtfully managed homes combining minimalist design with smart technology in India.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
            <Link href="/properties" className="btn-terracotta px-8 py-4 flex items-center justify-center gap-2 group">
              Explore Available Homes
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/signup" className="soft-button px-8 py-4 text-foreground/70">
              Join the Community
            </Link>
          </div>
        </div>

        <div className="lg:w-1/2 relative">
          <div className="rounded-[40px] soft-card p-3 bg-white/50 border border-white w-full">
            <div className="rounded-[30px] overflow-hidden relative aspect-[4/3] shadow-inner">
              <Image 
                src={properties[0]?.image_url || "/images/realistic_villa_exterior_1773522363119.png"}
                alt="Minimalist Duplex Villa"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
          {/* Floating Status Card */}
          <div className="absolute -bottom-6 -right-4 lg:-right-8 soft-card-sm p-4 flex items-center gap-4 bg-background animate-float">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-secondary/60">Sustainability</p>
              <p className="font-bold text-xs text-foreground">Solar Powered</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Spaces Section */}
      <section id="spaces" className="py-16 px-6 lg:px-12 max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground">A Home That Breathes</h2>
          <p className="text-foreground/45 max-w-lg mx-auto text-sm leading-relaxed">Natural materials and intentional white space, balanced for focus.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {loading ? (
             <div className="col-span-2 flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
             </div>
          ) : properties.map(property => (
            <div key={property.id} className="group relative rounded-[40px] soft-card p-3 bg-white/30 border border-white">
              <div className="rounded-[30px] overflow-hidden w-full aspect-video relative shadow-inner">
                <Image 
                  src={property.image_url || "/images/standard_co_living_room_1773522377787.png"}
                  alt={property.name}
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-8">
                  <h3 className="text-xl font-bold text-foreground uppercase tracking-tighter">{property.name}</h3>
                  <p className="text-foreground/60 text-xs mt-1 line-clamp-2">{property.description || `Luxury ${property.property_type} in ${property.location}`}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Amenities Grid */}
      <section id="amenities" className="py-16 px-6 lg:px-12 max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground">Curated Amenities</h2>
            <p className="text-foreground/45 max-w-sm text-sm">Designed to support your wellness journey seamlessly.</p>
          </div>
          <Link href="/login" className="text-primary text-sm font-bold flex items-center gap-2 hover:translate-x-1 transition-transform">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AmenityItem 
            image="/images/community_swimming_pool_realistic_1773522406584.png"
            title="Azure Pool"
            type="Relax"
          />
          <AmenityItem 
            image="/images/modern_gym_facility_1773522045760.png"
            title="Focus Studio"
            type="Active"
          />
          <AmenityItem 
            image="/images/community_badminton_court_realistic_1773522421812.png"
            title="Play Court"
            type="Social"
          />
        </div>
      </section>

      {/* Food Hub Section */}
      <section className="py-16 px-6 lg:px-12 max-w-7xl mx-auto">
        <Link href="/food-hub" className="group block">
          <div className="relative rounded-[40px] soft-card p-8 md:p-12 border border-white overflow-hidden bg-white/30 hover:border-primary/30 transition-all duration-500">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-secondary/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />

            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12">
              {/* Icon cluster */}
              <div className="flex-shrink-0 grid grid-cols-2 gap-3 w-24">
                {['🫓', '🌿', '🥘', '🌱'].map((e, i) => (
                  <div key={i} className="w-10 h-10 rounded-2xl soft-well border border-white flex items-center justify-center text-xl">
                    {e}
                  </div>
                ))}
              </div>

              <div className="flex-1 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-bold uppercase tracking-[0.2em]">
                  <Sprout className="w-3 h-3" /> Aaram Kitchen
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold tracking-tighter text-foreground leading-tight">
                  Organic Food Hub &<br />
                  <span className="text-primary italic">Nutrition Science</span>
                </h2>
                <p className="text-foreground/50 text-sm max-w-lg leading-relaxed">
                  Whole spice recipes, weekly balanced menus, and nutritional science — tailored for residents. No processed masala. Maximum nutrition, minimum oil.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  {['Weekly Balanced Menu', 'Whole Spice Recipes', 'Live Nutrition Charts', 'AI Dish Analysis'].map(f => (
                    <span key={f} className="px-3 py-1.5 soft-well border border-white text-[10px] font-black uppercase tracking-widest text-foreground/40">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex-shrink-0 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-lg group-hover:shadow-primary/20 group-hover:shadow-xl group-hover:scale-110">
                  <ChefHat className="w-7 h-7" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-widest group-hover:gap-2.5 transition-all">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Stat row */}
            <div className="relative mt-8 pt-8 border-t border-white/60 grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { emoji: '🥗', label: '7-Day Plan',      desc: 'Balanced macros & micros' },
                { emoji: '🧑‍🍳', label: '12+ Dishes',    desc: 'With full nutrition profiles' },
                { emoji: '⚗️', label: 'Whole Spices',    desc: 'Science-backed combinations' },
                { emoji: '📊', label: 'Live Charts',     desc: 'Dynamic daily balance tracking' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-2xl">{s.emoji}</span>
                  <div>
                    <p className="text-xs font-black text-foreground uppercase tracking-tight">{s.label}</p>
                    <p className="text-[9px] text-foreground/40">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 lg:px-12 border-t border-border/20 mt-12 bg-accent/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] font-bold">
          <div className="flex items-center gap-3">
             <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <Shield className="w-4 h-4" />
             </div>
             <span className="tracking-tighter text-foreground">AARAM SMART HOMES</span>
             <span className="mx-2 text-border">•</span>
             <span className="text-foreground/30 uppercase tracking-widest">Est. 2024</span>
          </div>

          <div className="flex items-center gap-8 text-foreground/30 uppercase tracking-widest">
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="/adminLogin" className="soft-button px-4 py-1.5 text-[9px] hover:text-primary transition-all uppercase border border-white">
              Admin Gateway
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AmenityItem({ image, title, type }: { image: string, title: string, type: string }) {
  return (
    <div className="group space-y-4">
      <div className="soft-card p-2 rounded-[32px] bg-white/50 border border-white">
        <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden shadow-inner">
          <Image 
            src={image}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
        </div>
      </div>
      <div className="flex justify-between items-center px-4">
        <div>
          <h4 className="font-bold text-foreground">{title}</h4>
          <span className="text-[9px] font-extrabold text-secondary uppercase tracking-[0.2em]">{type}</span>
        </div>
        <div className="soft-button w-10 h-10 flex items-center justify-center text-foreground/30 group-hover:text-primary transition-all">
          <Zap className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}


