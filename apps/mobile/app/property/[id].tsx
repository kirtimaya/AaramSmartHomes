import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { PropertyDetailScreen } from '@aaram/ui';
import { supabase } from '../../lib/supabase';

export default function PropertyDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PropertyDetailScreen
      supabase={supabase}
      propertyId={id ?? null}
      onBack={() => router.back()}
      onRequestRoom={(roomId, roomName) => {
        // Guest room request — navigated from here when guest portal exists
        router.push(`/guest?roomId=${roomId}&roomName=${encodeURIComponent(roomName)}`);
      }}
    />
  );
}
