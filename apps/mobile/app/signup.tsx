import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { SignupScreen } from '@aaram/ui';

export default function SignupRoute() {
  return (
    <SignupScreen
      supabase={supabase}
      onNavigateLogin={() => router.push('/login')}
      onNavigateHome={() => router.back()}
    />
  );
}
