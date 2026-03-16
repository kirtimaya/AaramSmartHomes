'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Shield, ArrowRight, Star, MapPin, Zap, Leaf, Coffee, Wifi, Dumbbell, Grid, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Property } from "@/lib/types";

export default function LandingPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

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
      <nav className="fixed top-4 left-4 right-4 z-50 px-6 py-3 flex justify-between items-center bg-background/70 backdrop-blur-md rounded-2xl border border-white/40 soft-ui-out max-w-7xl mx-auto">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tighter text-lg text-foreground">AARAM</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[13px]">
          <Link href="/properties" className="font-bold text-foreground/70 hover:text-primary transition-colors">Find a Home</Link>
          <Link href="#spaces" className="font-medium text-foreground/50 hover:text-primary transition-colors">Spaces</Link>
          <Link href="#amenities" className="font-medium text-foreground/50 hover:text-primary transition-colors">Amenities</Link>
        </div>
        <Link href="/login" className="btn-terracotta px-5 py-2 text-[13px] hover:shadow-lg transition-all">
          Sign In
        </Link>
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


