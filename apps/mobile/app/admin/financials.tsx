import React from 'react';
import { router } from 'expo-router';
import { AdminFinancialsScreen } from '@aaram/ui/admin';
import { supabase } from '../../lib/supabase';

export default function AdminFinancialsRoute() {
  return (
    <AdminFinancialsScreen
      supabase={supabase}
      onNotAuthenticated={() => router.replace('/login')}
      onBack={() => router.back()}
    />
  );
}
