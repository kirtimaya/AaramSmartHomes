import React from 'react';
import { router } from 'expo-router';
import { PropertyCatalogScreen } from '@aaram/ui';
import { supabase } from '../lib/supabase';

export default function PropertiesRoute() {
  return (
    <PropertyCatalogScreen
      supabase={supabase}
      onBack={() => router.back()}
      onViewProperty={(id) => router.push(`/property/${id}`)}
    />
  );
}
