'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Home,
  Users,
  UserCog,
  ClipboardList,
  Droplets,
  LogOut,
  PieChart,
  Calendar,
  Shield,
  User,
  ChefHat,
  Wrench,
  ScrollText,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

const baseSidebarItems = [
  { icon: Home,          label: 'Dashboard',    href: '/admin' },
  { icon: Shield,        label: 'Properties',   href: '/admin/properties/manage' },
  { icon: PieChart,      label: 'Occupancy',    href: '/admin/occupancy' },
  { icon: Users,         label: 'Members',      href: '/admin/tenants' },
  { icon: Calendar,      label: 'Move-Outs',    href: '/admin/calendar' },
  { icon: BarChart3,     label: 'Financials',   href: '/admin/financials' },
  { icon: ClipboardList, label: 'Tickets',      href: '/admin/tickets' },
  { icon: Wrench,        label: 'Roster',       href: '/admin/professionals' },
  { icon: Droplets,      label: 'Water Levels', href: '/admin/iot' },
  { icon: ChefHat,       label: 'Kitchen',      href: '/admin/kitchen' },
  { icon: ScrollText,    label: 'Audit Trail',  href: '/admin/audit' },
];

const rootOnlyItems = [
  { icon: UserCog, label: 'Admins', href: '/admin/admins' },
];

export function Sidebar({
  isRoot = false,
  isOpen = false,
  onClose,
}: {
  isRoot?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/adminLogin');
  };

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <>
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/25 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      <div className={cn(
        'flex h-screen w-64 flex-col fixed left-0 top-0 bg-background border-r border-white/40 z-50',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}>
        <div className="p-6 md:p-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group" onClick={handleNavClick}>
            <Image src="/images/aaram-logo.png" alt="Aaram" width={32} height={32}
              className="w-8 h-8 object-contain transition-transform group-hover:scale-110" />
            <span className="font-bold tracking-tighter text-lg text-foreground uppercase">Aaram</span>
          </Link>
          <button
            onClick={onClose}
            className="md:hidden soft-button w-8 h-8 border border-white text-foreground/30 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="hidden md:flex">
            <ThemeToggle />
          </div>
        </div>

        <nav className="flex-1 mt-2 px-4 space-y-1.5 overflow-y-auto">
          {[...baseSidebarItems, ...(isRoot ? rootOnlyItems : [])].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group text-[13px] font-bold',
                pathname === item.href
                  ? 'btn-terracotta shadow-md scale-[1.02]'
                  : 'text-foreground/40 hover:bg-white/60 hover:text-foreground',
              )}
            >
              <item.icon className={cn(
                'w-4 h-4',
                pathname === item.href ? 'text-white' : 'group-hover:scale-110 transition-transform',
              )} />
              <span className="uppercase tracking-widest">{item.label}</span>
            </Link>
          ))}
        </nav>

        {user && (
          <div className="p-4 mt-auto">
            <div className="soft-card p-4 border border-white bg-white/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl soft-ui-in flex items-center justify-center text-primary font-bold shadow-inner bg-white/50">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold truncate text-foreground uppercase tracking-tight">{user.email?.split('@')[0]}</p>
                  <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest leading-none">Access Node</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="mt-5 flex items-center justify-center gap-2 text-[10px] font-extrabold text-red-400 hover:text-red-500 transition-colors w-full p-2.5 soft-button border border-white bg-white/50 uppercase tracking-[0.2em]"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
