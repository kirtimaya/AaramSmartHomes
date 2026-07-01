import React from 'react';
import { router } from 'expo-router';
import { AaraChatScreen } from '@aaram/ui';
import { supabase } from '../lib/supabase';

async function callAaraApi(userText: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL ?? ''}/api/aara`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message: userText }),
    },
  );

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.reply ?? json.message ?? 'No response from Aara.';
}

export default function AaraScreen() {
  return (
    <AaraChatScreen
      sendMessage={callAaraApi}
      onClose={() => router.back()}
    />
  );
}
