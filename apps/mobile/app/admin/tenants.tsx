import React from 'react';
import { router } from 'expo-router';
import { AdminTenantsScreen } from '@aaram/ui';
import { supabase } from '../../lib/supabase';

export default function AdminTenantsRoute() {
  return (
    <AdminTenantsScreen
      supabase={supabase}
      onNotAuthenticated={() => router.replace('/login')}
      onBack={() => router.back()}
    />
  );
}
