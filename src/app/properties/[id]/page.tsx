'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Shield, Zap, Waves, Wifi, Sun, Building2, Check, Star, ChevronRight, ChevronLeft, Loader2, Calendar } from 'lucide-react';
import { Property, Room } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Edit2 } from 'lucide-react';

export default function PropertyDetailView() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const { user } = useAuth();
  const isAdmin = user?.email?.includes('admin@');

  useEffect(() => {
    if (params.id) {
      fetchProperty();
    }
  }, [params.id]);

  const fetchProperty = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*, rooms(*), benefits(*), automation_systems(*)')
      .eq('id', params.id)
      .single();
    
    if (!error && data) {
      const mappedData = {
        ...data,
        automation: data.automation_systems
      };
      setProperty(mappedData);
      if (data.rooms && data.rooms.length > 0) {
        setActiveRoom(data.rooms[0]);
        setCurrentImgIdx(0);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">Syncing with Node</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4 uppercase tracking-tighter">Property Not Found</h1>
        <Link href="/properties" className="soft-button px-6 py-3 border border-white uppercase text-xs font-bold">
          Return to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 relative">
       {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-background/60 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => router.back()}
            className="soft-button w-10 h-10 flex items-center justify-center border border-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tighter text-foreground uppercase">Aaram</span>
          </Link>

          {isAdmin && (
            <Link 
              href={`/admin/properties/manage?id=${property?.id}`}
              className="soft-button px-5 py-2 text-[10px] font-extrabold uppercase tracking-widest border border-secondary text-secondary flex items-center gap-2 hover:bg-secondary hover:text-white transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" /> Modify Node
            </Link>
          )}

          <Link href="/login" className="btn-terracotta px-5 py-2 text-[10px] font-extrabold uppercase tracking-widest">
            Book Visit
          </Link>
        </div>
      </nav>

      <main className="pt-32 max-w-7xl mx-auto px-6 lg:px-12 space-y-24">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-widest border border-secondary/20">
                <MapPin className="w-3 h-3" /> {property.location}
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter leading-[0.9] text-foreground uppercase">
                {property.name}
              </h1>
              <p className="text-foreground/40 text-lg max-w-md italic mt-4 leading-relaxed">
                {property.description || "A masterfully designed sanctuary optimized for smart living and mental clarity."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
               <div className="soft-well p-5 border border-white flex flex-col items-center justify-center text-center">
                  <Building2 className="w-5 h-5 text-primary mb-2" />
                  <p className="text-[9px] font-extrabold text-foreground/30 uppercase tracking-widest">Architectural Node</p>
                  <p className="font-bold text-xs text-foreground uppercase mt-1">{property.property_type}</p>
               </div>
               <div className="soft-well p-5 border border-white flex flex-col items-center justify-center text-center">
                  <Zap className="w-5 h-5 text-secondary mb-2" />
                  <p className="text-[9px] font-extrabold text-foreground/30 uppercase tracking-widest">Smart Layers</p>
                  <p className="font-bold text-xs text-foreground uppercase mt-1">Full IoT</p>
               </div>
               <div className="soft-well p-5 border border-white flex flex-col items-center justify-center text-center">
                  <Star className="w-5 h-5 text-amber-500 mb-2" />
                  <p className="text-[9px] font-extrabold text-foreground/30 uppercase tracking-widest">Status</p>
                  <p className="font-bold text-xs text-foreground uppercase mt-1">Certified</p>
               </div>
            </div>
          </div>

          <div className="soft-card p-3 border border-white rounded-[40px] bg-white/40 shadow-2xl relative">
            <div className="aspect-[4/3] rounded-[32px] overflow-hidden relative soft-ui-in">
              <Image 
                src={property.image_url || "/images/realistic_villa_exterior_1773522363119.png"}
                alt={property.name}
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="absolute -bottom-6 -right-6 soft-card p-4 bg-background border border-white animate-float">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                     <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-foreground/30">Verified</p>
                    <p className="text-[11px] font-bold text-foreground">Premium Asset</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Room Explorer */}
        <section className="space-y-12">
           <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/40 pb-8">
              <div className="space-y-1">
                 <h2 className="text-4xl font-bold tracking-tight text-foreground uppercase">Internal Nodes</h2>
                 <p className="text-foreground/40 text-[10px] font-bold uppercase tracking-[0.2em]">Select an architectural unit to view details</p>
              </div>
              <div className="flex gap-2.5 soft-well p-1.5 border border-white bg-white/40 overflow-x-auto no-scrollbar max-w-full">
                {property.rooms?.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => { setActiveRoom(room); setCurrentImgIdx(0); }}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all whitespace-nowrap",
                      activeRoom?.id === room.id 
                        ? "btn-terracotta shadow-lg" 
                        : "text-foreground/40 hover:bg-white/60"
                    )}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
           </div>

           <AnimatePresence mode="wait">
             {activeRoom && (
                <motion.div 
                  key={activeRoom.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-12"
                >
                   <div className="lg:col-span-7 soft-card p-3 border border-white overflow-hidden aspect-[16/10] bg-white/20 relative group">
                      <div className="w-full h-full relative rounded-[32px] overflow-hidden">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeRoom.image_urls?.[currentImgIdx] || 'empty'}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="absolute inset-0"
                          >
                            <Image 
                              src={(activeRoom.image_urls && activeRoom.image_urls.length > 0) ? activeRoom.image_urls[currentImgIdx] : "/images/standard_co_living_room_1773522377787.png"}
                              alt={activeRoom.name}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://placehold.co/1200x800/fecaca/991b1b?text=Room+Interior';
                              }}
                            />
                          </motion.div>
                        </AnimatePresence>

                        {/* Slider Controls */}
                        {activeRoom.image_urls && activeRoom.image_urls.length > 1 && (
                          <>
                            <div className="absolute inset-x-0 bottom-8 flex justify-between px-8 z-20">
                               <button onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(p => (p === 0 ? activeRoom.image_urls!.length - 1 : p - 1)); }} 
                                 className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/40 transition-all">
                                 <ChevronLeft className="w-6 h-6" />
                               </button>
                               <div className="px-4 py-2 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold tracking-widest">
                                 {currentImgIdx + 1} / {activeRoom.image_urls.length}
                               </div>
                               <button onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(p => (p === activeRoom.image_urls!.length - 1 ? 0 : p + 1)); }}
                                 className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/40 transition-all">
                                 <ChevronRight className="w-6 h-6" />
                               </button>
                            </div>
                          </>
                        )}
                        
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-8 pointer-events-none">
                           <div className="flex items-center gap-4">
                              <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-white shadow-2xl">
                                 <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest leading-none mb-1">Scale</p>
                                 <p className="text-xl font-bold text-foreground tracking-tighter">{activeRoom.sqft} SQFT</p>
                              </div>
                              <div className="bg-secondary/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-white shadow-2xl text-white">
                                 <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none mb-1">Classification</p>
                                 <p className="text-xl font-bold tracking-tighter uppercase">{activeRoom.type}</p>
                              </div>
                           </div>
                        </div>
                      </div>
                   </div>
                  <div className="lg:col-span-5 space-y-10 py-6">
                     <div className="space-y-6">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-8 rounded-full bg-primary" />
                           <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">{activeRoom.name}</h3>
                           {isAdmin && (
                             <button 
                               onClick={() => router.push(`/admin/properties/manage?id=${property.id}&room=${activeRoom.id}`)}
                               className="soft-button w-8 h-8 flex items-center justify-center border border-white text-secondary hover:bg-secondary hover:text-white transition-all"
                             >
                               <Edit2 className="w-3.5 h-3.5" />
                             </button>
                           )}
                        </div>
                        <p className="text-foreground/50 text-sm leading-relaxed max-w-sm italic">
                          Meticulously engineered for tranquility and cognitive performance, featuring ambient light harvesting.
                        </p>
                     </div>

                     <div className="space-y-5">
                        <p className="text-[10px] font-extrabold text-foreground/30 uppercase tracking-[0.2em] ml-1">Asset Features</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {activeRoom.features?.length > 0 ? activeRoom.features.map((feature) => (
                              <div key={feature} className="soft-well p-4 border border-white flex items-center gap-3 bg-white/40">
                                 <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/10">
                                    <Check className="w-4 h-4" />
                                 </div>
                                 <span className="text-[11px] font-bold text-foreground/70 uppercase tracking-widest">{feature}</span>
                              </div>
                           )) : (
                             <p className="text-[10px] text-foreground/20 italic ml-1">Standard Smart Living Package Included</p>
                           )}
                        </div>
                     </div>

                     <button className="w-full py-5 soft-button border border-white text-primary text-[11px] font-extrabold uppercase tracking-[0.3em] hover:bg-white/80 transition-all shadow-xl">
                        Request Allocation
                     </button>
                  </div>
                </motion.div>
             )}
           </AnimatePresence>
        </section>

        {/* Benefits Ecosystem */}
        <section className="py-24 bg-secondary/5 -mx-6 lg:-mx-12 px-6 lg:px-12 rounded-[80px] border border-secondary/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-secondary/10 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full blur-[120px] -ml-40 -mb-40 pointer-events-none" />
          
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
             <div className="space-y-10 relative z-10">
                <div className="space-y-4">
                   <h2 className="text-5xl lg:text-7xl font-bold tracking-tighter text-foreground uppercase leading-[0.9]">Wellness<br /><span className="text-secondary italic">Inventory</span></h2>
                   <p className="text-foreground/40 text-sm max-w-sm italic border-l-2 border-secondary/20 pl-4">
                     Every node in the Aaram network is augmented with critical lifestyle services.
                   </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {(property?.benefits || []).length > 0 ? (property.benefits || []).map((benefit) => (
                    <div key={benefit.id} className="soft-card border border-white flex flex-col group hover:bg-white transition-all shadow-lg hover:shadow-2xl overflow-hidden">
                       <div className="relative h-32 bg-secondary/5 overflow-hidden">
                          <img 
                            src={benefit.image_url || "/images/amenity_pool.png"} 
                            alt={benefit.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://placehold.co/400x300/fecaca/991b1b?text=Amenity';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <div className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                             <Sun className="w-4 h-4" />
                          </div>
                       </div>
                       <div className="p-5">
                          <p className="font-bold text-foreground uppercase tracking-tight text-base leading-tight">{benefit.name}</p>
                          <p className="text-[9px] text-foreground/30 font-extrabold uppercase tracking-widest mt-1">Certified Amenity</p>
                          {benefit.description && <p className="text-[10px] text-foreground/50 mt-2 line-clamp-2 italic">{benefit.description}</p>}
                       </div>
                    </div>
                  )) : (
                    <p className="text-xs text-foreground/20 italic">Curating amenities for this specific node...</p>
                  )}
                </div>
             </div>

             <div className="relative">
                <div className="soft-card p-3 border border-white bg-white/40 rotate-[2deg] shadow-2xl">
                   <Image 
                     src="/images/luxury_villa_lifestyle_1773521469562.png"
                     alt="Lifestyle"
                     width={600}
                     height={800}
                     className="rounded-[40px] shadow-inner"
                   />
                </div>
                {/* Floating Insight */}
                <div className="absolute -bottom-12 -left-12 soft-card p-8 border border-white bg-background/90 backdrop-blur-xl max-w-[280px] shadow-2xl -rotate-1">
                   <p className="text-primary font-bold text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Living Insight
                   </p>
                   <p className="text-foreground/60 text-xs italic leading-relaxed">
                      "Aaram properties integrate circadian lighting systems that harmonize with your biological clock."
                   </p>
                </div>
             </div>
          </div>
        </section>
      </main>

      {/* Footer Branding */}
      <footer className="py-20 px-6 lg:px-12 mt-24 border-t border-white/20 bg-accent/5">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                 <Shield className="w-6 h-6" />
              </div>
              <p className="text-2xl font-bold tracking-tighter text-foreground">AARAM SMART HOMES</p>
           </div>
           <p className="text-[10px] font-extrabold text-foreground/20 uppercase tracking-[0.5em] text-center">Architecting Tranquility Since 2024</p>
        </div>
      </footer>
    </div>
  );
}
