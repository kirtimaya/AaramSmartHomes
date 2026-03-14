import React from 'react';
import { Sidebar } from './Sidebar';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 h-full">
        <header className="h-20 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Admin Console</h2>
            <p className="text-xs text-foreground/50">Manage your villas and residents</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded-full border border-green-500/20 uppercase tracking-wider">
              System Online
            </div>
            <div className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-primary/5 transition-colors cursor-pointer border border-border">
              <span className="relative">
                <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></div>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              </span>
            </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
