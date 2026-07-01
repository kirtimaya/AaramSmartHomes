import React from 'react';
import { router } from 'expo-router';
import { GuestPortalScreen } from '@aaram/ui';
import { supabase } from '../lib/supabase';

export default function GuestRoute() {
  return (
    <GuestPortalScreen
      supabase={supabase}
      onNotAuthenticated={() => router.replace('/login')}
      onSignOut={async () => {
        await supabase.auth.signOut();
        router.replace('/login');
      }}
      onViewProperty={(id) => router.push(`/property/${id}`)}
    />
  );
}
