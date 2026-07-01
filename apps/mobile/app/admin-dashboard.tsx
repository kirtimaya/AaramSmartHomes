import React from 'react';
import { router } from 'expo-router';
import { AdminDashboardScreen } from '@aaram/ui';
import { supabase } from '../lib/supabase';

export default function AdminDashboardRoute() {
  return (
    <AdminDashboardScreen
      supabase={supabase}
      onNotAuthenticated={() => router.replace('/login')}
      onNavigateTickets={() => router.push('/admin/tickets')}
      onNavigateFinancials={() => router.push('/admin/financials')}
      onNavigateOccupancy={() => router.push('/admin/occupancy')}
      onNavigateIoT={() => router.push('/admin/iot')}
    />
  );
}
