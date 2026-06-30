'use client';

import { useEffect } from 'react';

type CommandHandler = (data: Record<string, any>) => void;
type CommandHandlers = Record<string, CommandHandler>;

const STORAGE_KEY = 'AARA_PENDING_COMMAND';

export function useAaraCommands(handlers: CommandHandlers): void {
  useEffect(() => {
    const check = () => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const { action, data } = JSON.parse(raw);
        sessionStorage.removeItem(STORAGE_KEY);
        if (action && handlers[action]) {
          handlers[action](data ?? {});
        }
      } catch {
        // ignore malformed stored commands
      }
    };

    check();

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) check();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
