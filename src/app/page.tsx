import Link from "next/link";
import Image from "next/image";
import { Shield, User, ArrowRight, Smartphone, Coffee, Wifi, Dumbbell, Star, MapPin } from "lucide-react";

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
        <Link href="/login" className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
          Resident Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest">
            <Star className="w-3 h-3 fill-primary" /> Redefining Luxury Living
          </div>
          <h1 className="text-5xl lg:text-8xl font-bold tracking-tighter leading-[0.9]">
            YOUR SANCTUARY <br />
            <span className="gold-gradient bg-clip-text text-transparent italic">AWAITS.</span>
          </h1>
          <p className="text-foreground/50 text-xl max-w-xl leading-relaxed">
            Welcome to Aaram Smart Homes. Experience a seamless fusion of world-class amenities and intuitive technology in Goa's most exclusive properties.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link href="/login" className="px-8 py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-primary/20 group">
              Explore Your Home
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/signup" className="px-8 py-4 glass border border-border rounded-2xl font-bold flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
              Request Access
            </Link>
          </div>
        </div>

        <div className="lg:w-1/2 relative">
          <div className="rounded-[40px] overflow-hidden border-8 border-white/5 shadow-2xl relative aspect-square">
            <Image 
              src="/Users/kirtimayaswain/.gemini/antigravity/brain/ad45c97d-fd61-41d5-8c49-0e483d0a1a61/luxury_villa_lifestyle_1773521469562.png"
              alt="Luxury Villa"
              fill
              className="object-cover"
              priority
            />
          </div>
          {/* Floating Feature Card */}
          <div className="absolute -bottom-6 -left-6 lg:-left-12 glass p-6 rounded-[32px] border border-border flex items-center gap-4 bg-white/80 dark:bg-slate-900/80 shadow-2xl animate-float">
            <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-white">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Location</p>
              <p className="font-bold">Anjuna, North Goa</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Wifi}
            title="Smart Connectivity"
            desc="Gigabit Wi-Fi across all properties with 100% uptime for work or leisure."
          />
          <FeatureCard 
            icon={Coffee}
            title="Private Chef"
            desc="Select your daily menu via the portal and enjoy curated culinary experiences."
          />
          <FeatureCard 
            icon={Dumbbell}
            title="Wellness Suites"
            desc="State-of-the-art gym and spa facilities available at your fingertips."
          />
        </div>
      </section>

      {/* Subtle Footer */}
      <footer className="py-12 px-6 lg:px-12 border-t border-border/10 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-1 text-foreground/30 text-xs font-medium">
            <span>© 2026 AARAM SMART HOMES</span>
            <span className="mx-2">•</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> SECURED BY SSL</span>
          </div>

          <div className="flex items-center gap-8">
            <Link href="/privacy" className="text-foreground/30 text-xs hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-foreground/30 text-xs hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/admin" className="px-4 py-1.5 rounded-full border border-border/20 text-foreground/30 text-xs hover:border-primary/50 hover:text-primary transition-all">
              Owner Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="glass p-10 rounded-[40px] border border-border hover:border-primary/20 transition-all duration-500 group">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-sm text-foreground/50 leading-relaxed">
        {desc}
      </p>
    </div>
  );
}


