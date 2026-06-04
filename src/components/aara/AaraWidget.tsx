'use client';

/**
 * AaraWidget — Top-level entry point that replaces <AaraChatbot /> in layout.tsx.
 *
 * Reads auth state to determine isAdmin, then renders:
 *   <AaraProvider>
 *     <AaraAvatar />           ← the animated flying avatar
 *     <AgenticChatLayout />    ← the chat panel
 *   </AaraProvider>
 *
 * The AaraProvider must live HERE (inside the client boundary) so the
 * context is available to both the avatar and the chat panel without
 * needing to touch the server root layout.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AaraProvider, useAaraContext } from '@/context/AaraContext';
import { AaraAvatar } from './AaraAvatar';
import { AgenticChatLayout } from './AgenticChatLayout';

// ─── Inner widget (needs AaraContext) ─────────────────────────────────────────

function WidgetInner({ isAdmin }: { isAdmin: boolean }) {
  const { isChatOpen, setIsChatOpen, setAaraState } = useAaraContext();

  const handleToggle = useCallback(() => {
    const next = !isChatOpen;
    setIsChatOpen(next);
    setAaraState(next ? 'open' : 'idle');
  }, [isChatOpen, setIsChatOpen, setAaraState]);

  const handleClose = useCallback(() => {
    setIsChatOpen(false);
    setAaraState('idle');
  }, [setIsChatOpen, setAaraState]);

  return (
    <>
      <div id="aara-avatar-root">
        <AaraAvatar onToggleChat={handleToggle} isAdmin={isAdmin} />
      </div>
      <AgenticChatLayout
        isAdmin={isAdmin}
        isOpen={isChatOpen}
        onClose={handleClose}
      />
    </>
  );
}

// ─── Outer widget (handles auth) ──────────────────────────────────────────────

export function AaraWidget() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAuthReady(true); return; }

      try {
        const res = await fetch('/api/admin/status', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const { isAdmin: admin } = await res.json();
          setIsAdmin(!!admin);
        }
      } catch { /* ignore */ }
      setAuthReady(true);
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setAuthReady(false);
      setIsAdmin(false);
      check();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) return null;

  return (
    <AaraProvider>
      <WidgetInner isAdmin={isAdmin} />
    </AaraProvider>
  );
}
