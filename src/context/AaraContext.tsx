'use client';

import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from 'react';

// ─── State Machine ────────────────────────────────────────────────────────────

export type AaraState =
  | 'idle'          // floating in corner, speech bubble visible
  | 'open'          // chat panel is open, still at home position
  | 'thinking'      // AI is processing, spinner on avatar
  | 'moving'        // avatar flying across screen to a target element
  | 'interacting'   // avatar has arrived, glow ring on target element
  | 'confirming'    // write action pending — confirmation dialog in chat
  | 'executing'     // server action in flight
  | 'error';        // something went wrong

// ─── Element Registry ─────────────────────────────────────────────────────────

export type ElementActionType = 'click' | 'fill' | 'read' | 'submit' | 'scroll';

export interface AaraElementRegistration {
  /** Unique key — use `room-${room.id}`, `btn-update-occupancy`, etc. */
  id: string;
  /** Short human label for the AI: "Room 201 status dropdown" */
  label: string;
  /** One sentence describing the action: "Changes occupancy status of Room 201" */
  description: string;
  /** Which interaction types are valid on this element */
  actionTypes: ElementActionType[];
  /** Live ref to the DOM node */
  ref: React.RefObject<HTMLElement | null>;
}

// ─── Confirmation ─────────────────────────────────────────────────────────────

export interface AaraPendingConfirmation {
  message: string;
  elementId?: string;
  /** Resolved by the chat UI when admin clicks Confirm/Cancel */
  resolve: (confirmed: boolean) => void;
}

// ─── Context Shape ────────────────────────────────────────────────────────────

interface AaraContextValue {
  // Avatar state machine
  aaraState: AaraState;
  setAaraState: (s: AaraState) => void;

  // DOM element registry (populated via useRegisterAaraElement from page components)
  registerElement: (r: AaraElementRegistration) => void;
  unregisterElement: (id: string) => void;
  getElement: (id: string) => AaraElementRegistration | undefined;
  getAllElements: () => AaraElementRegistration[];

  // Chat window open/close
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;

  // Current navigation target
  currentTargetId: string | null;
  actionTooltip: string | null;

  // Highlighted element (renders glow overlay)
  highlightedElementId: string | null;

  // Pending confirmation state (consumed by AgenticChatLayout)
  pendingConfirmation: AaraPendingConfirmation | null;

  // ── High-level agent APIs ──────────────────────────────────────────────────

  /**
   * Instructs the avatar to fly to a registered element and returns its DOMRect
   * once the animation begins. State becomes 'moving'.
   */
  moveToElement: (id: string, tooltip?: string) => DOMRect | null;

  /**
   * After arriving at an element, activate the glow ring. State becomes 'interacting'.
   */
  highlightElement: (id: string) => void;

  /**
   * Clear the glow ring without resetting the whole state.
   */
  clearHighlight: () => void;

  /**
   * Return the avatar to the home corner and show a confirmation dialog in the
   * chat. Resolves `true` if admin clicks Confirm, `false` if they cancel.
   * State becomes 'confirming' then 'idle'/'executing'.
   */
  requestConfirmation: (message: string, elementId?: string) => Promise<boolean>;

  /** Hard-reset everything — avatar returns home, state → 'idle'. */
  resetToIdle: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AaraContext = createContext<AaraContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AaraProvider({ children }: { children: React.ReactNode }) {
  const [aaraState, setAaraState] = useState<AaraState>('idle');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentTargetId, setCurrentTargetId] = useState<string | null>(null);
  const [actionTooltip, setActionTooltip] = useState<string | null>(null);
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<AaraPendingConfirmation | null>(null);

  // Ref-based registry so registration never re-renders consumers
  const registryRef = useRef<Map<string, AaraElementRegistration>>(new Map());

  const registerElement = useCallback((r: AaraElementRegistration) => {
    registryRef.current.set(r.id, r);
  }, []);

  const unregisterElement = useCallback((id: string) => {
    registryRef.current.delete(id);
  }, []);

  const getElement = useCallback((id: string) => {
    return registryRef.current.get(id);
  }, []);

  const getAllElements = useCallback(() => {
    return Array.from(registryRef.current.values());
  }, []);

  // ── Agent APIs ─────────────────────────────────────────────────────────────

  const moveToElement = useCallback((id: string, tooltip?: string): DOMRect | null => {
    const reg = registryRef.current.get(id);
    if (!reg?.ref.current) return null;

    const rect = reg.ref.current.getBoundingClientRect();
    setCurrentTargetId(id);
    if (tooltip) setActionTooltip(tooltip);
    setAaraState('moving');
    return rect;
  }, []);

  const highlightElement = useCallback((id: string) => {
    setHighlightedElementId(id);
    setAaraState('interacting');
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedElementId(null);
  }, []);

  const requestConfirmation = useCallback(
    (message: string, elementId?: string): Promise<boolean> => {
      return new Promise((resolve) => {
        // Return avatar home before showing confirmation
        setCurrentTargetId(null);
        setActionTooltip(null);
        setHighlightedElementId(null);
        setAaraState('confirming');
        setIsChatOpen(true); // always open the chat so user sees the dialog
        setPendingConfirmation({ message, elementId, resolve });
      });
    },
    []
  );

  const resetToIdle = useCallback(() => {
    setAaraState('idle');
    setCurrentTargetId(null);
    setActionTooltip(null);
    setHighlightedElementId(null);
    setPendingConfirmation(null);
  }, []);

  // Sync: closing chat during confirming → auto-cancel
  useEffect(() => {
    if (!isChatOpen && aaraState === 'confirming' && pendingConfirmation) {
      pendingConfirmation.resolve(false);
      setPendingConfirmation(null);
      setAaraState('idle');
    }
  }, [isChatOpen, aaraState, pendingConfirmation]);

  return (
    <AaraContext.Provider
      value={{
        aaraState, setAaraState,
        registerElement, unregisterElement, getElement, getAllElements,
        isChatOpen, setIsChatOpen,
        currentTargetId, actionTooltip,
        highlightedElementId,
        pendingConfirmation,
        moveToElement, highlightElement, clearHighlight,
        requestConfirmation, resetToIdle,
      }}
    >
      {children}
    </AaraContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAaraContext() {
  const ctx = useContext(AaraContext);
  if (!ctx) throw new Error('useAaraContext must be used within AaraProvider');
  return ctx;
}

/**
 * Drop this hook into any page component to make a DOM element visible to Aara.
 *
 * Example:
 *   const statusRef = useRegisterAaraElement({
 *     id: `room-${room.id}-status`,
 *     label: `Room ${room.name} status dropdown`,
 *     description: 'Changes the occupancy status of this room',
 *     actionTypes: ['fill'],
 *   });
 *   <select ref={statusRef} ...>
 */
export function useRegisterAaraElement(
  opts: Omit<AaraElementRegistration, 'ref'>
): React.RefObject<HTMLElement | null> {
  const { registerElement, unregisterElement } = useAaraContext();
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    registerElement({ ...opts, ref });
    return () => unregisterElement(opts.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.id]);

  return ref;
}
