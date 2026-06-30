/**
 * aaraMemory — Persistent memory for the Aara AI agent.
 *
 * Storage strategy:
 *  • All roles : localStorage (immediate, survives refresh)
 *  • Key scheme : `aara_mem_<userId | "guest">`
 *
 * The memory context is injected into the Gemini system prompt on every
 * chat request so Aara can follow user-specific rules and preferences
 * without the user repeating themselves.
 *
 * Triggering saves:
 *  When the AI returns `{"action":"save_memory","text":"...","category":"..."}`,
 *  the chat client calls `addMemoryEntry(userId, text, category)`.
 *  When `{"action":"clear_memory"}` is returned, call `clearMemory(userId)`.
 */

export type MemoryCategory = 'preference' | 'rule' | 'context' | 'task';

export interface AaraMemoryEntry {
  id: string;
  text: string;
  category: MemoryCategory;
  createdAt: number;
}

export interface AaraMemoryStore {
  entries: AaraMemoryEntry[];
  lastUpdated: number;
}

const PREFIX = 'aara_mem_';

function key(userId: string | null) {
  return `${PREFIX}${userId ?? 'guest'}`;
}

export function loadMemory(userId: string | null): AaraMemoryStore {
  if (typeof window === 'undefined') return { entries: [], lastUpdated: 0 };
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return { entries: [], lastUpdated: 0 };
    return JSON.parse(raw) as AaraMemoryStore;
  } catch {
    return { entries: [], lastUpdated: 0 };
  }
}

function persist(userId: string | null, store: AaraMemoryStore) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key(userId), JSON.stringify({ ...store, lastUpdated: Date.now() }));
}

export function addMemoryEntry(
  userId: string | null,
  text: string,
  category: MemoryCategory = 'rule'
): AaraMemoryEntry {
  const store = loadMemory(userId);
  const entry: AaraMemoryEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: text.trim(),
    category,
    createdAt: Date.now(),
  };
  store.entries.push(entry);
  persist(userId, store);
  return entry;
}

export function removeMemoryEntry(userId: string | null, id: string) {
  const store = loadMemory(userId);
  store.entries = store.entries.filter(e => e.id !== id);
  persist(userId, store);
}

export function clearMemory(userId: string | null) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key(userId));
}

/**
 * Returns a formatted block to inject into the Gemini system prompt.
 * Empty string if no entries exist.
 */
export function formatMemoryForPrompt(userId: string | null): string {
  const { entries } = loadMemory(userId);
  if (!entries.length) return '';

  const lines = entries.map((e, i) => `${i + 1}. [${e.category}] ${e.text}`).join('\n');
  return `\n\n--- AARA MEMORY (persistent user instructions — always follow these) ---\n${lines}\n--- END MEMORY ---`;
}

/** Returns all entries for display in the chat UI */
export function getMemoryEntries(userId: string | null): AaraMemoryEntry[] {
  return loadMemory(userId).entries;
}
