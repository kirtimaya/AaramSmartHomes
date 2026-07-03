import React from 'react';
import { router } from 'expo-router';
import { TenantPortalScreen } from '@aaram/ui/tenant';
import { supabase } from '../../lib/supabase';

export default function PortalScreen() {
  return (
    <TenantPortalScreen
      supabase={supabase}
      onNotAuthenticated={() => router.replace('/login')}
      onSignOut={async () => {
        await supabase.auth.signOut();
        router.replace('/login');
      }}
    />
  );
}
