import React from 'react';
import { router } from 'expo-router';
import { AdminTicketsScreen } from '@aaram/ui';
import { supabase } from '../../lib/supabase';

export default function AdminTicketsRoute() {
  return (
    <AdminTicketsScreen
      supabase={supabase}
      onNotAuthenticated={() => router.replace('/login')}
      onBack={() => router.back()}
    />
  );
}
