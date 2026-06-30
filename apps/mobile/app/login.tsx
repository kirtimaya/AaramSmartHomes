import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LoginScreen } from '@aaram/ui';

export default function LoginRoute() {
  return (
    <LoginScreen
      supabase={supabase}
      onSuccess={() => router.replace('/(tabs)/portal')}
      onNavigateSignup={() => router.push('/signup')}
      onNavigateHome={() => router.back()}
    />
  );
}
