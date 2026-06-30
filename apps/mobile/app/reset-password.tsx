import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ResetPasswordScreen } from '@aaram/ui';

export default function ResetPasswordRoute() {
  return (
    <ResetPasswordScreen
      supabase={supabase}
      onSuccess={() => router.replace('/login')}
      onNavigateHome={() => router.back()}
    />
  );
}
