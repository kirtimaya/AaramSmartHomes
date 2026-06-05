'use client';

import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from 'react';

// ─── State Machine ────────────────────────────────────────────────────────────

export type AaraState =
  | 'idle'          // floating in corner, speech bubble visible
  | 'open'          // chat panel is open, still at home position
  | 'thinking'      // AI is processing
  | 'moving'        // avatar flying across screen to a target element
  | 'interacting'   // avatar has arrived, glow ring on target element
  | 'confirming'    // write action pending — confirmation dialog in chat
  | 'executing'     // server action in flight
  | 'error';

// ─── Element Registry ─────────────────────────────────────────────────────────

export type ElementActionType = 'click' | 'fill' | 'select' | 'read' | 'submit' | 'scroll';

export interface AaraElementRegistration {
  id: string;
  label: string;
  description: string;
  actionTypes: ElementActionType[];
  ref: React.RefObject<HTMLElement | null>;
}

// ─── Confirmation ─────────────────────────────────────────────────────────────

export interface AaraPendingConfirmation {
  message: string;
  elementId?: string;
  resolve: (confirmed: boolean) => void;
}

// ─── Context Shape ────────────────────────────────────────────────────────────

interface AaraContextValue {
  aaraState: AaraState;
  setAaraState: (s: AaraState) => void;

  // Speaking state (drives mouth animation in AaraCharacter)
  isTalking: boolean;
  setIsTalking: (v: boolean) => void;

  // DOM element registry
  registerElement: (r: AaraElementRegistration) => void;
  unregisterElement: (id: string) => void;
  getElement: (id: string) => AaraElementRegistration | undefined;
  getAllElements: () => AaraElementRegistration[];

  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;

  currentTargetId: string | null;
  actionTooltip: string | null;

  highlightedElementId: string | null;

  pendingConfirmation: AaraPendingConfirmation | null;

  // ── High-level agent APIs ──────────────────────────────────────────────────

  /** Instructs the avatar to fly to a registered element. State → 'moving'. */
  moveToElement: (id: string, tooltip?: string) => DOMRect | null;

  /** Activate glow ring on element. State → 'interacting'. */
  highlightElement: (id: string) => void;
  clearHighlight: () => void;

  /**
   * Type text into a registered input/textarea character by character,
   * triggering React synthetic events so controlled components update.
   * For <select> elements, use selectOption instead.
   */
  typeInElement: (id: string, value: string, charDelay?: number) => Promise<void>;

  /**
   * Set a <select> element's value and dispatch a change event so React
   * controlled selects update their state.
   */
  selectOption: (id: string, value: string) => void;

  /**
   * Programmatically click a registered button or clickable element.
   */
  clickElement: (id: string) => void;

  /**
   * Return the avatar home and show a confirmation dialog.
   * Resolves true on Confirm, false on Cancel.
   */
  requestConfirmation: (message: string, elementId?: string) => Promise<boolean>;

  resetToIdle: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AaraContext = createContext<AaraContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AaraProvider({ children }: { children: React.ReactNode }) {
  const [aaraState, setAaraState] = useState<AaraState>('idle');
  const [isTalking, setIsTalking] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentTargetId, setCurrentTargetId] = useState<string | null>(null);
  const [actionTooltip, setActionTooltip] = useState<string | null>(null);
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<AaraPendingConfirmation | null>(null);

  const registryRef = useRef<Map<string, AaraElementRegistration>>(new Map());

  const registerElement   = useCallback((r: AaraElementRegistration) => { registryRef.current.set(r.id, r); }, []);
  const unregisterElement = useCallback((id: string) => { registryRef.current.delete(id); }, []);
  const getElement        = useCallback((id: string) => registryRef.current.get(id), []);
  const getAllElements     = useCallback(() => Array.from(registryRef.current.values()), []);

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

  const clearHighlight = useCallback(() => setHighlightedElementId(null), []);

  // ── DOM interaction helpers ────────────────────────────────────────────────

  const typeInElement = useCallback(async (id: string, value: string, charDelay = 55) => {
    const reg = registryRef.current.get(id);
    if (!reg?.ref.current) return;

    const el = reg.ref.current as HTMLInputElement;
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // React's synthetic event system requires native setter trick
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;

    let current = '';
    for (const char of value) {
      current += char;
      nativeSetter?.call(el, current);
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, charDelay));
    }
  }, []);

  const selectOption = useCallback((id: string, value: string) => {
    const reg = registryRef.current.get(id);
    if (!reg?.ref.current) return;

    const el = reg.ref.current as HTMLSelectElement;
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype, 'value'
    )?.set;
    nativeSetter?.call(el, value);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, []);

  const clickElement = useCallback((id: string) => {
    const reg = registryRef.current.get(id);
    if (!reg?.ref.current) return;
    const el = reg.ref.current;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.click();
  }, []);

  const requestConfirmation = useCallback(
    (message: string, elementId?: string): Promise<boolean> => {
      return new Promise((resolve) => {
        setCurrentTargetId(null);
        setActionTooltip(null);
        setHighlightedElementId(null);
        setAaraState('confirming');
        setIsChatOpen(true);
        setPendingConfirmation({ message, elementId, resolve });
      });
    }, []
  );

  const resetToIdle = useCallback(() => {
    setAaraState('idle');
    setCurrentTargetId(null);
    setActionTooltip(null);
    setHighlightedElementId(null);
    setPendingConfirmation(null);
    setIsTalking(false);
  }, []);

  // Auto-cancel if chat closed during confirmation
  useEffect(() => {
    if (!isChatOpen && aaraState === 'confirming' && pendingConfirmation) {
      pendingConfirmation.resolve(false);
      setPendingConfirmation(null);
      setAaraState('idle');
    }
  }, [isChatOpen, aaraState, pendingConfirmation]);

  return (
    <AaraContext.Provider value={{
      aaraState, setAaraState,
      isTalking, setIsTalking,
      registerElement, unregisterElement, getElement, getAllElements,
      isChatOpen, setIsChatOpen,
      currentTargetId, actionTooltip,
      highlightedElementId,
      pendingConfirmation,
      moveToElement, highlightElement, clearHighlight,
      typeInElement, selectOption, clickElement,
      requestConfirmation, resetToIdle,
    }}>
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
 * Register a DOM element with Aara so she can navigate to and interact with it.
 *
 * Usage:
 *   const ref = useRegisterAaraElement({
 *     id: `room-${room.id}-status`,
 *     label: 'Room 201 status dropdown',
 *     description: 'Changes occupancy status',
 *     actionTypes: ['select'],
 *   });
 *   <select ref={ref as React.Ref<HTMLSelectElement>} ...>
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
