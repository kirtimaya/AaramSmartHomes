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
      <header className="px-6 py-12 lg:px-12 max-w-7xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tighter">AARAM</span>
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tighter">Available Homes</h1>
            <p className="text-foreground/50 mt-2">Discover your next sanctuary in our curated portfolio.</p>
          </div>
          
          <div className="flex gap-2 glass p-1.5 rounded-2xl border border-border overflow-x-auto whitespace-nowrap max-w-full">
            {['All', 'Villa', 'Flat', 'Individual House'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  filter === type 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-foreground/40 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="px-6 lg:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
        {filtered.map((property, idx) => (
          <motion.div
            key={property.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group glass rounded-[40px] border border-border overflow-hidden hover:border-primary/30 transition-all duration-500"
          >
            <div className="aspect-[4/3] relative overflow-hidden">
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold border border-border flex items-center gap-1.5">
                  {getIcon(property.property_type)}
                  {property.property_type.toUpperCase()}
                </span>
              </div>
              {property.image_url ? (
                <Image 
                  src={property.image_url}
                  alt={property.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center">
                  <Home className="w-12 h-12 text-foreground/10" />
                </div>
              )}
            </div>
            
            <div className="p-8 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{property.name}</h3>
                  <p className="text-sm text-foreground/40 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {property.location}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-primary">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-xs font-bold">4.9</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">Available Units</p>
                  <p className="font-bold">{property.total_units} Spaces</p>
                </div>
                <button className="w-10 h-10 rounded-full border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </main>
    </div>
  );
}
