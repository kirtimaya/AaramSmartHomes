'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Property } from '@/lib/types';
import { 
  MapPin, 
  Home, 
  Building, 
  Hotel,
  ArrowRight,
  Shield,
  Star,
  Search,
  Leaf,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function PropertiesCatalog() {
  const [filter, setFilter] = useState<'All' | 'Villa' | 'Flat' | 'Individual House'>('All');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*, rooms(*), benefits(*), automation_systems(*)');
    
    if (!error && data) {
      setProperties(data);
    }
    setLoading(false);
  };

  const filtered = filter === 'All' 
    ? properties 
    : properties.filter(p => p.property_type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'Villa': return <Hotel className="w-5 h-5" />;
      case 'Flat': return <Building className="w-5 h-5" />;
      default: return <Home className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header - Tied to common density */}
      <header className="px-6 py-12 lg:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col gap-10">
          <div className="flex justify-between items-start">
             <Link href="/" className="soft-button px-4 py-2 border border-white group inline-flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm shadow-primary/20">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold tracking-tighter text-foreground uppercase">Aaram</span>
             </Link>
             
             <button className="soft-button w-11 h-11 border border-white rounded-full">
                <Search className="w-5 h-5 text-foreground/40" />
             </button>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
            <div className="space-y-1.5">
               <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-widest border border-secondary/20">
                <Leaf className="w-3 h-3" /> Organic Living
              </div>
              <h1 className="text-4xl lg:text-7xl font-bold tracking-tighter text-foreground text-balance">Discovery <span className="text-primary italic">Mode</span></h1>
              <p className="text-foreground/40 text-[11px] font-bold uppercase tracking-[0.2em] mt-2">Curated sanctuaries for the intentional dweller.</p>
            </div>
            
            <div className="flex gap-2.5 soft-well p-1.5 border border-white bg-white/40 overflow-x-auto whitespace-nowrap max-w-full no-scrollbar">
              {['All', 'Villa', 'Flat', 'Individual House'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type as any)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all",
                    filter === type 
                      ? "btn-terracotta shadow-xl scale-[1.02]" 
                      : "text-foreground/40 hover:bg-white/60"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Grid - Tighter */}
      <main className="px-6 lg:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8 mt-6">
        {loading ? (
           <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-foreground/30">Harvesting Real-time Data</p>
           </div>
        ) : filtered.length === 0 ? (
           <div className="col-span-full text-center py-20 border-2 border-dashed border-white rounded-[40px] soft-ui-in">
              <p className="text-foreground/30 font-bold uppercase tracking-widest">No matching sanctuaries found.</p>
           </div>
        ) : filtered.map((property, idx) => (
          <motion.div
            key={property.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group soft-card p-2.5 border border-white transition-all duration-500 hover:translate-y-[-4px]"
          >
            <div className="aspect-[4/3] relative overflow-hidden rounded-[24px] soft-ui-in">
              <div className="absolute top-3 left-3 z-10">
                <span className="sage-badge flex items-center gap-1.5 border border-white/20 scale-90 origin-left">
                  {getIcon(property.property_type)}
                  {property.property_type}
                </span>
              </div>
              {property.image_url ? (
                <Image 
                  src={property.image_url}
                  alt={property.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-1000"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://placehold.co/800x600/fecaca/991b1b?text=Sanctuary+Exterior';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-accent animate-pulse flex items-center justify-center">
                  <Home className="w-10 h-10 text-foreground/5" />
                </div>
              )}
            </div>
            
            <div className="p-4 pt-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-foreground leading-tight uppercase tracking-tighter">{property.name}</h3>
                  <p className="text-[11px] text-foreground/40 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> {property.location}
                  </p>
                </div>
                <div className="flex items-center gap-1 soft-button px-2 py-1 border border-white scale-90">
                  <Star className="w-3 h-3 fill-primary text-primary" />
                  <span className="text-[10px] font-bold text-foreground">4.9</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-between items-center">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-[0.15em] leading-none">Rooms</p>
                  <p className="font-bold text-xs text-foreground">{property.total_rooms} Nodes Available</p>
                </div>
                <Link href={`/properties/${property.id}`} className="soft-button w-9 h-9 flex items-center justify-center text-primary group-hover:shadow-md transition-all border border-white">
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </main>
    </div>
  );
}
