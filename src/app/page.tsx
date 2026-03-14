import Link from "next/link";
import { Shield, User, ArrowRight, Home, Smartphone } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />

      <main className="max-w-4xl w-full z-10 text-center space-y-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest animate-float">
            <Shield className="w-3 h-3" /> Property Management Reimagined
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
            AARAM <span className="gold-gradient bg-clip-text text-transparent">SMART HOMES</span>
          </h1>
          <p className="text-foreground/40 text-lg max-w-lg mx-auto leading-relaxed">
            The ultimate SaaS ecosystem for high-end villa rentals. Manage occupancy, financials, and IoT from a single executive console.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {/* Admin Gateway */}
          <Link href="/admin" className="group text-left">
            <div className="glass p-10 rounded-[40px] border border-border group-hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 flex flex-col h-full bg-white dark:bg-slate-900/50">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                <Home className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">Owner Dashboard</h3>
                <p className="text-sm text-foreground/50 leading-relaxed mb-8">
                  Centralized command center for property owners. Real-time occupancy, financial tracking, and maintenance management.
                </p>
              </div>
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                Access Console <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Tenant Gateway */}
          <Link href="/login" className="group text-left">
            <div className="glass p-10 rounded-[40px] border border-border group-hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col h-full bg-white dark:bg-slate-900/50">
              <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                <Smartphone className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">Resident Portal</h3>
                <p className="text-sm text-foreground/50 leading-relaxed mb-8">
                  Premium amenities, meal selectors, and maintenance reporting designed for a seamless luxury living experience.
                </p>
              </div>
              <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
                Enter Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

        </div>

        <div className="pt-12 text-foreground/30 text-xs font-medium space-x-6 flex justify-center">
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> SSL SECURED</span>
          <span className="flex items-center gap-1"><User className="w-3 h-3" /> GDPR COMPLIANT</span>
          <span>© 2026 AARAM SMART HOMES</span>
        </div>
      </main>
    </div>
  );
}

