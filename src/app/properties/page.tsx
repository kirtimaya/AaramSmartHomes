'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout'; // Though usually user-facing, we can use parts of design
import { Property } from '@/lib/types';
import { mockProperties } from '@/lib/mockData';
import { 
  MapPin, 
  Home, 
  Building, 
  Hotel,
  ArrowRight,
  Shield,
  Star,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function PropertiesCatalog() {
  const [filter, setFilter] = useState<'All' | 'Villa' | 'Flat' | 'Individual House'>('All');

  const filtered = filter === 'All' 
    ? mockProperties 
    : mockProperties.filter(p => p.property_type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'Villa': return <Hotel className="w-5 h-5" />;
      case 'Flat': return <Building className="w-5 h-5" />;
      default: return <Home className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="px-6 py-16 lg:px-12 max-w-7xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-3 mb-12 group soft-button px-5 py-2.5 border border-white">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tighter text-foreground">AARAM</span>
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-end gap-10">
          <div className="space-y-2">
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter text-foreground">Available Homes</h1>
            <p className="text-foreground/40 text-lg">Curated sanctuaries designed for your well-being.</p>
          </div>
          
          <div className="flex gap-3 soft-ui-out p-2 border border-white overflow-x-auto whitespace-nowrap max-w-full">
            {['All', 'Villa', 'Flat', 'Individual House'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type as any)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-bold transition-all",
                  filter === type 
                    ? "terracotta-button shadow-lg" 
                    : "text-foreground/40 hover:bg-white/50"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="px-6 lg:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mt-8">
        {filtered.map((property, idx) => (
          <motion.div
            key={property.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group soft-ui-out border border-white p-4 transition-all duration-500 hover:scale-[1.02]"
          >
            <div className="aspect-[4/3] relative overflow-hidden rounded-[32px] soft-ui-in">
              <div className="absolute top-4 left-4 z-10">
                <span className="sage-badge flex items-center gap-2 border border-white/20">
                  {getIcon(property.property_type)}
                  {property.property_type}
                </span>
              </div>
              {property.image_url ? (
                <Image 
                  src={property.image_url}
                  alt={property.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-1000"
                />
              ) : (
                <div className="w-full h-full bg-accent/50 animate-pulse flex items-center justify-center">
                  <Home className="w-12 h-12 text-foreground/5" />
                </div>
              )}
            </div>
            
            <div className="p-6 pt-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">{property.name}</h3>
                  <p className="text-sm text-foreground/45 flex items-center gap-2 mt-2">
                    <MapPin className="w-4 h-4 text-primary" /> {property.location}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 soft-button px-3 py-1.5 border border-white">
                  <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                  <span className="text-xs font-bold text-foreground">4.9</span>
                </div>
              </div>

              <div className="pt-6 border-t border-border flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em] leading-none">Available Units</p>
                  <p className="font-bold text-foreground">{property.total_units} Managed Spaces</p>
                </div>
                <button className="soft-button w-12 h-12 flex items-center justify-center text-primary group-hover:soft-ui-out transition-all border border-white">
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </main>
    </div>
  );
}
