'use client';

/**
 * AaraAvatar — The animated AI assistant avatar.
 *
 * ── Behaviour by state ──────────────────────────────────────────────────────
 *  idle        : floats in bottom-right corner, "Need Help?" speech bubble visible
 *  open        : same position, bubble hidden (chat panel is visible)
 *  thinking    : spinning halo + three-dot pulse
 *  moving      : spring-physics flight across screen toward a registered DOM element
 *  interacting : arrived at element; body bobs & ElementHighlight glow ring is active
 *  confirming  : spring-return to home; confirmation UI rendered inside chat panel
 *  executing   : progress ring on avatar halo
 *
 * ── Movement math ───────────────────────────────────────────────────────────
 *  Avatar home center (when x=0, y=0):
 *    cx = window.innerWidth  - HOME_MARGIN - AVATAR_R
 *    cy = window.innerHeight - HOME_MARGIN - AVATAR_R
 *
 *  To fly to a target element's center (tx, ty):
 *    x = tx - cx   (positive → move right)
 *    y = ty - cy   (positive → move down; framer-motion y axis is inverted from CSS)
 *
 *  We use framer-motion's imperative `animate(motionValue, target, options)` so
 *  the avatar can still be dragged freely during idle and the two systems never clash.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  motion, AnimatePresence,
  useMotionValue, animate as fmAnimate,
} from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ElementHighlight } from './ElementHighlight';
import { useAaraContext } from '@/context/AaraContext';
import { cn } from '@/lib/utils';

// ─── Inline Avatar Icon ───────────────────────────────────────────────────────
// Wraps the /images/aara_icon.png asset with a mystical glow.
// This mirrors AaraFABIcon but without the external import dependency.

function AaraIcon({ size, isOpen }: { size: number; isOpen: boolean }) {
  return (
    <div className="relative flex items-center justify-center p-1" style={{ width: size, height: size }}>
      {!isOpen && (
        <motion.div
          animate={{ opacity: [0.3, 0.65, 0.3], scale: [1, 1.18, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl"
        />
      )}
      <motion.img
        src="/images/aara_icon.png"
        alt="Aara"
        className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
        animate={isOpen ? { scale: 0.9, opacity: 0.85 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOME_MARGIN = 24;  // px from right/bottom edge
const AVATAR_SIZE = 88;  // px diameter
const AVATAR_R    = AVATAR_SIZE / 2;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ThinkingHalo() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
      className="absolute inset-0 rounded-full border-2 border-transparent"
      style={{
        background: 'conic-gradient(from 0deg, transparent 60%, rgba(245,158,11,0.7) 100%)',
        borderRadius: '50%',
      }}
    />
  );
}

function ExecutingRing() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
      className="absolute inset-[-4px] rounded-full"
      style={{
        background: 'conic-gradient(from 0deg, rgba(245,158,11,0.9) 30%, transparent 100%)',
        borderRadius: '50%',
        filter: 'blur(2px)',
      }}
    />
  );
}

function MovingTrail() {
  return (
    <>
      {[0.4, 0.25, 0.12].map((opacity, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.5 + i * 0.3, 0], opacity: [opacity, opacity * 0.5, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeOut' }}
          className="absolute rounded-full bg-amber-400"
          style={{
            width: AVATAR_SIZE - i * 14,
            height: AVATAR_SIZE - i * 14,
            top: (i * 7),
            left: (i * 7),
          }}
        />
      ))}
    </>
  );
}

function SpeechBubble({ text, side = 'left' }: { text: string; side?: 'left' | 'right' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 8 }}
      transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        'absolute bottom-[calc(100%+12px)] pointer-events-none',
        side === 'left' ? 'right-0' : 'left-0'
      )}
      style={{ minWidth: 130 }}
    >
      <div className="relative px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)]">
        <p className="text-[11px] font-extrabold text-stone-600 tracking-tight whitespace-nowrap flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
          {text}
        </p>
        {/* Downward caret */}
        <div className="absolute -bottom-[6px] right-5 w-3 h-3 bg-white border-b border-r border-white/60 shadow-sm rotate-45" />
      </div>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1 bg-white/80 rounded-full px-2 py-1 shadow-sm border border-white/60">
      {[0, 0.2, 0.4].map((delay) => (
        <motion.div
          key={delay}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay, ease: 'easeInOut' }}
          className="w-1.5 h-1.5 rounded-full bg-amber-500"
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AaraAvatarProps {
  onToggleChat: () => void;
  isAdmin?: boolean;
}

export function AaraAvatar({ onToggleChat, isAdmin = false }: AaraAvatarProps) {
  const {
    aaraState, setAaraState,
    isChatOpen,
    currentTargetId, actionTooltip,
    getElement,
  } = useAaraContext();

  // Framer motion values for the avatar's offset from its home position
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Track drag-induced offset so we can restore home relative to the drag position
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  // ── Return avatar to home corner ──────────────────────────────────────────
  const returnHome = useCallback(() => {
    fmAnimate(x, 0, { type: 'spring', stiffness: 260, damping: 26 });
    fmAnimate(y, 0, { type: 'spring', stiffness: 260, damping: 26 });
    dragOffsetRef.current = { x: 0, y: 0 };
  }, [x, y]);

  // ── React to context state changes ────────────────────────────────────────
  useEffect(() => {
    if (isDraggingRef.current) return; // never interrupt a live drag

    if (aaraState === 'moving' && currentTargetId) {
      const reg = getElement(currentTargetId);
      if (!reg?.ref.current) {
        setAaraState('idle');
        return;
      }

      const rect = reg.ref.current.getBoundingClientRect();
      const targetCX = rect.left + rect.width / 2;
      const targetCY = rect.top + rect.height / 2;

      // Home position of avatar center (CSS: right:24px bottom:24px)
      const homeCX = window.innerWidth  - HOME_MARGIN - AVATAR_R;
      const homeCY = window.innerHeight - HOME_MARGIN - AVATAR_R;

      const dx = targetCX - homeCX;
      // Positive CSS y = element is lower on screen.
      // framer-motion y positive = moves DOWN relative to position, so this is the same sign.
      const dy = targetCY - homeCY;

      const distPx = Math.sqrt(dx * dx + dy * dy);
      // Longer distance → slightly higher stiffness for snappier travel
      const stiffness = Math.min(90 + distPx * 0.04, 160);

      const animX = fmAnimate(x, dx, { type: 'spring', stiffness, damping: 18, mass: 0.8 });
      const animY = fmAnimate(y, dy, { type: 'spring', stiffness, damping: 18, mass: 0.8 });

      // Transition to interacting once arrival spring settles
      Promise.all([animX, animY]).then(() => {
        // Only advance if we're still on the same target (not cancelled)
        setAaraState('interacting');
      });
    }

    if (aaraState === 'confirming' || aaraState === 'idle' || aaraState === 'open') {
      returnHome();
    }
  }, [aaraState, currentTargetId, getElement, setAaraState, returnHome, x, y]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  // During drag, framer-motion accumulates x/y automatically via `drag`.
  // On drag-end, we record the offset so returnHome can reset it from
  // the NEW drag position.

  const handleDragStart = () => { isDraggingRef.current = true; };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    dragOffsetRef.current = { x: x.get(), y: y.get() };
    // Snap to nearest edge (aesthetic polish)
    const cx = window.innerWidth  - HOME_MARGIN - AVATAR_R + x.get();
    const snapToRight = cx > window.innerWidth / 2;
    if (!snapToRight) {
      // Snap left
      const leftCX = HOME_MARGIN + AVATAR_R;
      fmAnimate(x, leftCX - (window.innerWidth - HOME_MARGIN - AVATAR_R), {
        type: 'spring', stiffness: 300, damping: 28,
      });
    } else {
      fmAnimate(x, dragOffsetRef.current.x, { type: 'spring', stiffness: 300, damping: 28 });
    }
  };

  // ── Speech bubble copy ────────────────────────────────────────────────────
  const bubbleText = (() => {
    if (actionTooltip) return actionTooltip;
    if (aaraState === 'thinking') return 'Thinking…';
    if (aaraState === 'executing') return 'Updating…';
    if (aaraState === 'interacting') return 'Here it is!';
    if (aaraState === 'confirming') return 'Please confirm';
    return 'Need Help?';
  })();

  const showBubble =
    (aaraState === 'idle' && !isChatOpen) ||
    aaraState === 'moving'               ||
    aaraState === 'interacting'          ||
    aaraState === 'confirming'           ||
    aaraState === 'thinking'             ||
    aaraState === 'executing';

  return (
    <>
      {/* ── Glow ring portal on target element ── */}
      <ElementHighlight />

      {/* ── Avatar container ─────────────────────────────────────────────── */}
      {/*
        Positioned fixed at bottom-right. framer-motion x/y offsets this
        relative to that home position. During idle the user can drag it.
      */}
      <motion.div
        drag={aaraState === 'idle' || aaraState === 'open'}
        dragMomentum={false}
        dragElastic={0.08}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{
          x, y,
          position: 'fixed',
          right: HOME_MARGIN,
          bottom: HOME_MARGIN,
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          zIndex: 1001,
          cursor: (aaraState === 'idle' || aaraState === 'open') ? 'grab' : 'default',
        }}
      >
        {/* ── Idle floating bob (only when not in flight) ── */}
        <motion.div
          animate={
            aaraState === 'idle' || aaraState === 'open'
              ? { y: [0, -10, 0] }
              : { y: 0 }
          }
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatType: 'loop',
          }}
          className="relative w-full h-full flex items-center justify-center"
        >
          {/* State overlays — behind the icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {aaraState === 'moving'    && <MovingTrail />}
            {aaraState === 'thinking'  && <ThinkingHalo />}
            {aaraState === 'executing' && <ExecutingRing />}

            {/* Ambient glow — always present, intensity varies */}
            <motion.div
              animate={{
                opacity: aaraState === 'interacting' ? [0.5, 0.9, 0.5]
                       : aaraState === 'moving'      ? [0.3, 0.5, 0.3]
                       : [0.15, 0.3, 0.15],
                scale:   aaraState === 'interacting' ? [1, 1.25, 1] : [1, 1.1, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-[-12px] rounded-full bg-amber-400/30 blur-xl"
            />
          </div>

          {/* ── Click target — the icon itself ── */}
          <motion.button
            onClick={() => {
              if (!isDraggingRef.current) onToggleChat();
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            aria-label="Toggle Aara AI Assistant"
            className="relative z-10 focus:outline-none"
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, background: 'transparent', border: 'none' }}
          >
            {/* Interacting: add extra pop scale */}
            <motion.div
              animate={aaraState === 'interacting' ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.7, repeat: aaraState === 'interacting' ? Infinity : 0 }}
            >
              <AaraIcon size={AVATAR_SIZE} isOpen={isChatOpen} />
            </motion.div>
          </motion.button>

          {/* ── Thinking / executing dots ── */}
          {(aaraState === 'thinking' || aaraState === 'executing') && <ThinkingDots />}

          {/* ── Speech bubble (above the avatar) ── */}
          <AnimatePresence mode="wait">
            {showBubble && (
              <SpeechBubble key={bubbleText} text={bubbleText} />
            )}
          </AnimatePresence>

          {/* ── Admin badge ── */}
          {isAdmin && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-md z-20"
            >
              <span className="text-[7px] font-black text-white">A</span>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
