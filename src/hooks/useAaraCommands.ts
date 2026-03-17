/**
 * useAaraCommands — Central AARA integration hook
 *
 * Drop this into any page to give AARA full control over its UI.
 * Pages supply a handler map: { COMMAND_NAME: (data) => void }
 *
 * Usage:
 *   useAaraCommands({
 *     SELECT_ROOM: (data) => setSelectedRoom(rooms.find(r => r.id === data.id)),
 *     FILTER_STATUS: (data) => setFilter(data.value),
 *   });
 */

import { useEffect, useCallback } from 'react';

export type AaraCommandHandler = (data: Record<string, any>) => void;
export type AaraCommandMap = Record<string, AaraCommandHandler>;

export function useAaraCommands(handlers: AaraCommandMap) {
  const handleEvent = useCallback((e: Event) => {
    const { action, data } = (e as CustomEvent).detail ?? {};
    if (!action) return;
    const fn = handlers[action];
    if (fn) {
      console.log(`[AARA Command] ${action}`, data);
      fn(data ?? {});
    }
  }, [handlers]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // 1. Listen for live broadcast commands
    window.addEventListener('AARA_APP_COMMAND', handleEvent);

    // 2. Check for pending commands stored across page navigation
    const pending = sessionStorage.getItem('AARA_PENDING_COMMAND');
    if (pending) {
      try {
        const { action, data } = JSON.parse(pending);
        sessionStorage.removeItem('AARA_PENDING_COMMAND');
        // Delay slightly to let the page render first
        const timer = setTimeout(() => {
          handleEvent(new CustomEvent('AARA_APP_COMMAND', { detail: { action, data } }));
        }, 800);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('AARA_APP_COMMAND', handleEvent);
        };
      } catch { /* ignore */ }
    }

    return () => window.removeEventListener('AARA_APP_COMMAND', handleEvent);
  }, [handleEvent]);
}

/** Helper — dispatches an AARA command from outside the chatbot */
export function dispatchAaraCommand(action: string, data: Record<string, any> = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('AARA_APP_COMMAND', { detail: { action, data } }));
  }
}
