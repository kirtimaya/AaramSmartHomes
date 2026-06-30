'use client';

/**
 * AaraWidget — Top-level entry point that replaces <AaraChatbot /> in layout.tsx.
 *
 * Auth state determines userRole:
 *   no session           → 'guest'
 *   session, not admin   → 'tenant'
 *   session + admin API  → 'admin'
 *
 * Default is always 'guest'. Only elevates after confirmed server response.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AaraProvider, useAaraContext } from '@/context/AaraContext';
import { AaraAvatar } from './AaraAvatar';
import { AgenticChatLayout } from './AgenticChatLayout';

export type UserRole = 'guest' | 'tenant' | 'admin';

// ─── Inner widget (needs AaraContext) ─────────────────────────────────────────

function WidgetInner({ userRole, userId }: { userRole: UserRole; userId: string | null }) {
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
        <AaraAvatar onToggleChat={handleToggle} isAdmin={userRole === 'admin'} />
      </div>
      <AgenticChatLayout
        userRole={userRole}
        userId={userId}
        isOpen={isChatOpen}
        onClose={handleClose}
      />
    </>
  );
}

// ─── Outer widget (handles auth) ──────────────────────────────────────────────

export function AaraWidget() {
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [userId, setUserId]     = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setUserRole('guest');
        setUserId(null);
        setAuthReady(true);
        return;
      }

      // Authenticated — at minimum tenant
      setUserId(session.user.id);
      setUserRole('tenant');

      try {
        const res = await fetch('/api/admin/status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const { isAdmin } = await res.json();
          if (isAdmin) setUserRole('admin');
        }
      } catch { /* remain tenant */ }

      setAuthReady(true);
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setAuthReady(false);
      setUserRole('guest');
      setUserId(null);
      check();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) return null;

  return (
    <AaraProvider>
      <WidgetInner userRole={userRole} userId={userId} />
    </AaraProvider>
  );
}
