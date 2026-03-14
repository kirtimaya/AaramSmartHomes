import Link from "next/link";
import Image from "next/image";
import { Shield, User, ArrowRight, Smartphone, Coffee, Wifi, Dumbbell, Star, MapPin, Grid, Layers, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 lg:px-12 flex justify-between items-center backdrop-blur-md border-b border-border/10">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center transition-transform group-hover:scale-110">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tighter text-lg">AARAM</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link href="/properties" className="text-sm font-bold hover:text-primary transition-colors">Find a Home</Link>
          <Link href="#spaces" className="text-sm font-medium text-foreground/50 hover:text-primary transition-colors">Our Spaces</Link>
          <Link href="#amenities" className="text-sm font-medium text-foreground/50 hover:text-primary transition-colors">Amenities</Link>
        </div>
        <Link href="/login" className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
          Resident Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest">
            <Star className="w-3 h-3 fill-primary" /> Premier Co-living Experience
          </div>
          <h1 className="text-5xl lg:text-8xl font-bold tracking-tighter leading-[0.9]">
            MODERN LIVING <br />
            <span className="gold-gradient bg-clip-text text-transparent italic">SIMPLIFIED.</span>
          </h1>
          <p className="text-foreground/50 text-xl max-w-xl leading-relaxed">
            Beautifully designed, fully managed homes across Goa's best neighborhoods. Join a community that values comfort, convenience, and connection.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link href="/properties" className="px-8 py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-primary/20 group">
              Explore Available Homes
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/signup" className="px-8 py-4 glass border border-border rounded-2xl font-bold flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
              Join the Community
            </Link>
          </div>
        </div>

        <div className="lg:w-1/2 relative">
          <div className="rounded-[40px] overflow-hidden border-8 border-white/5 shadow-2x aspect-[4/3] relative">
            <Image 
              src="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/realistic_villa_exterior_1773522363119.png"
              alt="Standard Modern Villa"
              fill
              className="object-cover"
              priority
            />
          </div>
          {/* Floating Status Card */}
          <div className="absolute -bottom-6 -right-6 lg:-right-12 glass p-6 rounded-[32px] border border-border flex items-center gap-4 bg-white/80 dark:bg-slate-900/80 shadow-2xl animate-float">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-600">Smart Ready</p>
              <p className="font-bold font-mono">15+ Active IoT Units</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Spaces Section */}
      <section id="spaces" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">Thoughtfully Designed Spaces</h2>
          <p className="text-foreground/50 max-w-2xl mx-auto">From private sanctuaries to vibrant community hubs, every corner is crafted for your comfort.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="group relative rounded-[40px] overflow-hidden aspect-video border border-border">
            <Image 
              src="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/standard_co_living_room_1773522377787.png"
              alt="Modern Co-living Bedroom"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-10 translate-y-4 group-hover:translate-y-0 transition-transform">
              <h3 className="text-2xl font-bold text-white">Private Suites</h3>
              <p className="text-white/60 text-sm mt-2">Clean lines, warm lighting, and clutter-free zones for deeper rest.</p>
            </div>
          </div>
          <div className="group relative rounded-[40px] overflow-hidden aspect-video border border-border">
            <Image 
              src="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/common_living_dining_area_1773522392110.png"
              alt="Shared Living Area"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-10 translate-y-4 group-hover:translate-y-0 transition-transform">
              <h3 className="text-2xl font-bold text-white">Common Lounges</h3>
              <p className="text-white/60 text-sm mt-2">Spacious areas to connect, share meals, and relax with fellow residents.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities Grid */}
      <section id="amenities" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground">Lifestyle & Recreation</h2>
            <p className="text-foreground/50 max-w-xl">Everything you need to thrive, integrated directly into your living experience.</p>
          </div>
          <Link href="/login" className="text-primary font-bold flex items-center gap-2 hover:underline">
            View All Amenities <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AmenityItem 
            image="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/community_swimming_pool_realistic_1773522406584.png"
            title="Swimming Pool"
            icon={Zap}
          />
          <AmenityItem 
            image="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/modern_gym_facility_1773522045760.png"
            title="Integrated Fitness"
            icon={Dumbbell}
          />
          <AmenityItem 
            image="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/community_badminton_court_realistic_1773522421812.png"
            title="Sports Courts"
            icon={Grid}
          />
        </div>
      </section>

      {/* Subtle Footer */}
      <footer className="py-12 px-6 lg:px-12 border-t border-border/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
             <Shield className="w-4 h-4 text-primary" />
             <span className="text-xs font-bold tracking-tighter">AARAM SMART HOMES</span>
             <span className="mx-2 text-foreground/10">•</span>
             <span className="text-foreground/30 text-[10px] uppercase font-bold tracking-widest">Est. 2024</span>
          </div>

          <div className="flex items-center gap-8">
            <Link href="/privacy" className="text-foreground/30 text-xs hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="text-foreground/30 text-xs hover:text-foreground transition-colors">Terms</Link>
            <Link href="/admin" className="px-4 py-1.5 rounded-full border border-border/20 text-foreground/30 text-[10px] font-bold tracking-widest hover:border-primary/50 hover:text-primary transition-all uppercase">
              Admin Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AmenityItem({ image, title, icon: Icon }: { image: string, title: string, icon: any }) {
  return (
    <div className="group space-y-4">
      <div className="relative aspect-[4/3] rounded-[32px] overflow-hidden border border-border shadow-sm">
        <Image 
          src={image}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="flex justify-between items-center px-2">
        <h4 className="font-bold">{title}</h4>
        <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}


