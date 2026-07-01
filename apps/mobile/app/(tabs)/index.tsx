import React from 'react';
import { router } from 'expo-router';
import { HomeScreen } from '@aaram/ui';
import { supabase } from '../../lib/supabase';

export default function HomeTab() {
  return (
    <HomeScreen
      supabase={supabase}
      onNavigateProperty={(id) => router.push(`/property/${id}`)}
      onNavigateTenantPortal={() => router.push('/(tabs)/portal')}
      onNavigateProperties={() => router.push('/properties')}
    />
  );
}
