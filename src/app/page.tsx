import Link from "next/link";
import Image from "next/image";
import { Shield, ArrowRight, Smartphone, Coffee, Wifi, Dumbbell, Star, MapPin, Grid, Zap, Leaf } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden selection:bg-primary/20">
      {/* Organic Background Elements */}
      <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-6 left-6 right-6 z-50 px-8 py-4 flex justify-between items-center bg-background/80 backdrop-blur-md rounded-2xl border border-border/40 soft-ui-out max-w-7xl mx-auto">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold tracking-tighter text-xl text-foreground">AARAM</span>
        </div>
        <div className="hidden md:flex items-center gap-10">
          <Link href="/properties" className="text-sm font-bold text-foreground/70 hover:text-primary transition-colors">Find a Home</Link>
          <Link href="#spaces" className="text-sm font-medium text-foreground/50 hover:text-primary transition-colors">Our Spaces</Link>
          <Link href="#amenities" className="text-sm font-medium text-foreground/50 hover:text-primary transition-colors">Amenities</Link>
        </div>
        <Link href="/login" className="terracotta-button px-6 py-2.5 text-sm font-bold hover:shadow-xl transition-all">
          Resident Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="pt-48 pb-20 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
        <div className="lg:w-1/2 space-y-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-widest border border-secondary/20">
            <Leaf className="w-3 h-3" /> Earthy, Organic, Effortless
          </div>
          <h1 className="text-6xl lg:text-8xl font-bold tracking-tighter leading-[0.95] text-foreground">
            LIVE IN <br />
            <span className="text-primary italic">HARMONY.</span>
          </h1>
          <p className="text-foreground/50 text-xl max-w-lg leading-relaxed">
            Experience organic comfort in Goa's most thoughtfully managed homes. We combine minimalist design with smart technology to create your perfect sanctuary.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start pt-4">
            <Link href="/properties" className="terracotta-button px-10 py-5 font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl group rounded-2xl">
              Explore Available Homes
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/signup" className="soft-button px-10 py-5 font-bold flex items-center justify-center hover:bg-white transition-all text-foreground/70 rounded-2xl border border-white">
              Join the Community
            </Link>
          </div>
        </div>

        <div className="lg:w-1/2 relative">
          <div className="rounded-[48px] overflow-hidden soft-ui-out p-4 bg-white/50 border border-white">
            <div className="rounded-[36px] overflow-hidden relative aspect-[4/3]">
              <Image 
                src="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/realistic_villa_exterior_1773522363119.png"
                alt="Minimalist Duplex Villa"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
          {/* Floating Soft UI Card */}
          <div className="absolute -bottom-8 -right-8 lg:-right-16 soft-ui-out p-6 rounded-[32px] flex items-center gap-5 bg-background border border-white shadow-2xl animate-float">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">Sustainability</p>
              <p className="font-bold text-foreground font-sans">90% Solar Powered</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Spaces Section */}
      <section id="spaces" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl lg:text-6xl font-bold tracking-tight text-foreground">A Home That Breathes</h2>
          <p className="text-foreground/45 max-w-xl mx-auto text-lg leading-relaxed">Thoughtful interiors designed with natural materials and intentional white space.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="group relative rounded-[48px] overflow-hidden aspect-video soft-ui-out p-4 bg-white/30 border border-white">
            <div className="rounded-[36px] overflow-hidden w-full h-full relative">
              <Image 
                src="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/standard_co_living_room_1773522377787.png"
                alt="Sage & Cream Interior"
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-10">
                <h3 className="text-2xl font-bold text-foreground">The Sanctuary</h3>
                <p className="text-foreground/60 text-sm mt-2">Private suites featuring organic linens and ample natural light.</p>
              </div>
            </div>
          </div>
          <div className="group relative rounded-[48px] overflow-hidden aspect-video soft-ui-out p-4 bg-white/30 border border-white">
             <div className="rounded-[36px] overflow-hidden w-full h-full relative">
              <Image 
                src="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/common_living_dining_area_1773522392110.png"
                alt="Minimalist Living Area"
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-10">
                <h3 className="text-2xl font-bold text-foreground">Community Hubs</h3>
                <p className="text-foreground/60 text-sm mt-2">Open-plan areas that foster connection without the clutter.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities Grid */}
      <section id="amenities" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto space-y-16">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-4xl lg:text-6xl font-bold tracking-tight text-foreground">Curated Amenities</h2>
            <p className="text-foreground/45 max-w-md text-lg">Designed to support your wellness journey and daily essentials seamlessly.</p>
          </div>
          <Link href="/login" className="text-primary font-bold flex items-center gap-2 hover:translate-x-1 transition-transform">
            View All Amenities <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <AmenityItem 
            image="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/community_swimming_pool_realistic_1773522406584.png"
            title="Azure Pool"
            type="Relax"
          />
          <AmenityItem 
            image="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/modern_gym_facility_1773522045760.png"
            title="Focus Studio"
            type="Active"
          />
          <AmenityItem 
            image="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/community_badminton_court_realistic_1773522421812.png"
            title="Play Court"
            type="Social"
          />
        </div>
      </section>

      {/* Subtle Footer */}
      <footer className="py-20 px-6 lg:px-12 border-t border-border/20 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <Shield className="w-4 h-4" />
             </div>
             <span className="text-sm font-bold tracking-tighter text-foreground">AARAM SMART HOMES</span>
             <span className="mx-3 text-border">•</span>
             <span className="text-foreground/30 text-[10px] uppercase font-bold tracking-widest leading-none">Est. 2024</span>
          </div>

          <div className="flex items-center gap-10">
            <Link href="/privacy" className="text-foreground/30 text-xs hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="text-foreground/30 text-xs hover:text-primary transition-colors">Terms</Link>
            <Link href="/admin" className="soft-button px-5 py-2 text-[10px] font-bold tracking-widest text-foreground/40 hover:text-primary transition-all uppercase border border-white">
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
    <div className="group space-y-6">
      <div className="soft-ui-out p-3 rounded-[40px] bg-white/50 border border-white">
        <div className="relative aspect-[4/3] rounded-[28px] overflow-hidden shadow-inner">
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
          <h4 className="font-bold text-foreground text-lg">{title}</h4>
          <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em]">{type}</span>
        </div>
        <div className="soft-button w-12 h-12 flex items-center justify-center text-foreground/40 group-hover:text-primary group-hover:soft-ui-out transition-all">
          <Zap className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}


