'use client';

/**
 * AaraAvatar — Positions the AaraCharacter SVG on screen and drives
 * all spring-physics movement between her home corner and target DOM elements.
 *
 * ── Startup ──────────────────────────────────────────────────────────────────
 *  On mount, the character fades in from below and settles into the idle float.
 *  Speech bubble "Need Help?" appears after 800 ms.
 *
 * ── Movement ──────────────────────────────────────────────────────────────────
 *  The avatar is fixed at bottom-right (right:HOME_M bottom:HOME_M).
 *  framer-motion x/y values offset her from that home.
 *  When context state → 'moving', we compute the spring deltas to the target
 *  element's centre and call fmAnimate() imperatively.
 *  Distance-adaptive stiffness: far targets feel snappier.
 *
 * ── Eye gaze ─────────────────────────────────────────────────────────────────
 *  While moving, we compute a normalised gaze vector toward the target so
 *  AaraCharacter's pupils track the destination.
 *
 * ── Drag ─────────────────────────────────────────────────────────────────────
 *  In idle/open states the user can drag her anywhere.
 *  On drag-end she snaps to the nearest horizontal edge (left or right).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  motion, AnimatePresence,
  useMotionValue, animate as fmAnimate,
} from 'framer-motion';
import { Sparkles, MessageCircle } from 'lucide-react';
import { AaraCharacter, CharacterMood } from './AaraCharacter';
import { ElementHighlight } from './ElementHighlight';
import { useAaraContext } from '@/context/AaraContext';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const HOME_M      = 24;   // px from right/bottom edge
const AVATAR_W    = 75;   // rendered SVG width  (100:265 aspect ratio)
const AVATAR_H    = Math.round((AVATAR_W * 265) / 100); // maintains 100:265 ratio

// ─── Speech bubble ────────────────────────────────────────────────────────────

function Bubble({ text, side = 'left' }: { text: string; side?: 'left' | 'right' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.82, y: 10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cn(
        'absolute pointer-events-none',
        'bottom-[calc(100%+10px)]',
        side === 'left' ? 'right-0' : 'left-0'
      )}
      style={{ minWidth: 140, maxWidth: 200 }}
    >
      <div className="relative px-4 py-2.5 rounded-[18px] bg-white/96 backdrop-blur-xl border border-white/70 shadow-[0_8px_28px_-6px_rgba(0,0,0,0.16)]">
        <p className="text-[11.5px] font-bold text-stone-600 leading-snug flex items-start gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
          {text}
        </p>
        <div className="absolute -bottom-[6px] right-5 w-3 h-3 bg-white border-b border-r border-white/60 shadow-sm rotate-45" />
      </div>
    </motion.div>
  );
}

// ─── Status ring overlay on avatar ───────────────────────────────────────────

function StatusRing({ state }: { state: string }) {
  if (state === 'thinking') {
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
        className="absolute -inset-2 rounded-full pointer-events-none"
        style={{
          background: 'conic-gradient(from 0deg, transparent 55%, rgba(245,158,11,0.8) 100%)',
          borderRadius: '50%',
        }}
      />
    );
  }
  if (state === 'executing') {
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.0, repeat: Infinity, ease: 'linear' }}
        className="absolute -inset-2 rounded-full pointer-events-none"
        style={{
          background: 'conic-gradient(from 0deg, rgba(16,185,129,0.9) 30%, transparent 100%)',
          borderRadius: '50%',
          filter: 'blur(2px)',
        }}
      />
    );
  }
  if (state === 'error') {
    return (
      <motion.div
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 0.5, repeat: 4 }}
        className="absolute -inset-2 rounded-full border-2 border-red-400 pointer-events-none"
      />
    );
  }
  if (state === 'listening') {
    return (
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.12, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -inset-2 rounded-full border-2 border-red-500 pointer-events-none"
      />
    );
  }
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onToggleChat: () => void;
  isAdmin?: boolean;
}

export function AaraAvatar({ onToggleChat, isAdmin = false }: Props) {
  const {
    aaraState, setAaraState,
    isTalking,
    isChatOpen,
    currentTargetId, actionTooltip,
    getElement,
  } = useAaraContext();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const isDraggingRef = useRef(false);
  const animXRef = useRef<any>(null);
  const animYRef = useRef<any>(null);

  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [hasEnteredOnce, setHasEnteredOnce] = useState(false);

  // ── Return home ───────────────────────────────────────────────────────────
  const returnHome = useCallback(() => {
    animXRef.current?.stop();
    animYRef.current?.stop();
    animXRef.current = fmAnimate(x, 0, { type: 'spring', stiffness: 280, damping: 28 });
    animYRef.current = fmAnimate(y, 0, { type: 'spring', stiffness: 280, damping: 28 });
    setGaze({ x: 0, y: 0 });
    setDirection(null);
  }, [x, y]);

  // ── React to state changes ─────────────────────────────────────────────────
  useEffect(() => {
    if (isDraggingRef.current) return;

    if (aaraState === 'moving' && currentTargetId) {
      const reg = getElement(currentTargetId);
      if (!reg?.ref.current) { setAaraState('idle'); return; }

      const rect   = reg.ref.current.getBoundingClientRect();
      const targetCX = rect.left + rect.width  / 2;
      const targetCY = rect.top  + rect.height / 2;

      // Home centre of avatar
      const homeCX = window.innerWidth  - HOME_M - AVATAR_W / 2;
      const homeCY = window.innerHeight - HOME_M - AVATAR_H / 2;

      const dx   = targetCX - homeCX;
      const dy   = targetCY - homeCY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Adaptive stiffness: snappier for longer trips
      const stiffness = Math.min(80 + dist * 0.05, 150);

      // Gaze toward target
      setGaze({ x: Math.sign(dx), y: Math.sign(dy) });
      setDirection(dx > 0 ? 'right' : 'left');

      animXRef.current?.stop();
      animYRef.current?.stop();

      const aX = fmAnimate(x, dx, { type: 'spring', stiffness, damping: 17, mass: 0.9 });
      const aY = fmAnimate(y, dy, { type: 'spring', stiffness, damping: 17, mass: 0.9 });
      animXRef.current = aX;
      animYRef.current = aY;

      Promise.all([aX, aY]).then(() => {
        setAaraState('interacting');
      });
    }

    if (aaraState === 'idle' || aaraState === 'open' || aaraState === 'confirming') {
      returnHome();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aaraState, currentTargetId]);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onDragStart = () => { isDraggingRef.current = true; };
  const onDragEnd   = () => {
    isDraggingRef.current = false;
    // Snap to nearest horizontal edge
    const cx = window.innerWidth - HOME_M - AVATAR_W / 2 + x.get();
    if (cx < window.innerWidth / 2) {
      // Snap to left edge
      const leftTargetX = -(window.innerWidth - HOME_M * 2 - AVATAR_W);
      fmAnimate(x, leftTargetX, { type: 'spring', stiffness: 320, damping: 28 });
    } else {
      fmAnimate(x, Math.round(x.get()), { type: 'spring', stiffness: 320, damping: 28 });
    }
  };

  // ── Mood ──────────────────────────────────────────────────────────────────
  const mood: CharacterMood = (() => {
    if (isTalking)                 return 'talking';
    if (aaraState === 'listening') return 'thinking';
    if (aaraState === 'thinking')  return 'thinking';
    if (aaraState === 'moving')    return 'moving';
    if (aaraState === 'interacting' || aaraState === 'executing') return 'pointing';
    if (aaraState === 'error')     return 'error';
    if (isChatOpen)                return 'idle';
    return 'idle';
  })();

  // ── Bubble text ───────────────────────────────────────────────────────────
  const bubbleText = (() => {
    if (actionTooltip)                return actionTooltip;
    if (aaraState === 'listening')    return "I'm listening…";
    if (aaraState === 'thinking')     return 'On it…';
    if (aaraState === 'executing')    return 'Saving…';
    if (aaraState === 'interacting')  return 'Found it!';
    if (aaraState === 'confirming')   return 'Please confirm';
    if (aaraState === 'error')        return 'Hmm, something broke';
    return 'Need Help?';
  })();

  const showBubble =
    (!isChatOpen && aaraState === 'idle') ||
    aaraState === 'moving'               ||
    aaraState === 'interacting'          ||
    aaraState === 'confirming'           ||
    aaraState === 'thinking'             ||
    aaraState === 'listening'            ||
    aaraState === 'executing';

  return (
    <>
      <ElementHighlight />

      {/* ── Outer fixed anchor + motion offset ── */}
      <motion.div
        id="aara-avatar-root"
        drag={aaraState === 'idle' || aaraState === 'open'}
        dragMomentum={false}
        dragElastic={0.06}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        style={{
          x, y,
          position: 'fixed',
          right:  HOME_M,
          bottom: HOME_M,
          width:  AVATAR_W,
          zIndex: 1001,
          cursor: (aaraState === 'idle' || aaraState === 'open') ? 'grab' : 'default',
        }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        onAnimationComplete={() => setHasEnteredOnce(true)}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.4 }}
      >
        {/* ── Idle float wrapper ── */}
        <motion.div
          animate={
            aaraState === 'idle' || aaraState === 'open'
              ? { y: [0, -12, 0] }
              : { y: 0 }
          }
          transition={{
            duration: 3.6,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatType: 'loop',
          }}
          style={{ position: 'relative' }}
        >
          {/* ── Status ring behind character ── */}
          <div
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            <StatusRing state={aaraState} />
          </div>

          {/* ── Ambient glow ── */}
          <motion.div
            animate={{
              opacity: aaraState === 'interacting' ? [0.4, 0.8, 0.4] : [0.1, 0.2, 0.1],
              scale:   aaraState === 'interacting' ? [1, 1.3, 1] : [1, 1.12, 1],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -16,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245,158,11,0.35) 0%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 0,
              filter: 'blur(10px)',
            }}
          />

          {/* ── Speech bubble ── */}
          <AnimatePresence mode="wait">
            {showBubble && hasEnteredOnce && (
              <Bubble key={bubbleText} text={bubbleText} />
            )}
          </AnimatePresence>

          {/* ── The character herself ── */}
          <motion.button
            onClick={() => { if (!isDraggingRef.current) onToggleChat(); }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle Aara"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'block',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <AaraCharacter
              mood={mood}
              direction={direction}
              size={AVATAR_W}
              gaze={gaze}
            />
          </motion.button>

          {/* ── Admin badge ── */}
          {isAdmin && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
              style={{
                position: 'absolute',
                top: 4,
                right: -2,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F59E0B, #B45309)',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              <span style={{ fontSize: 8, fontWeight: 900, color: 'white', letterSpacing: 0 }}>A</span>
            </motion.div>
          )}

          {/* ── Talking: small waveform indicator ── */}
          <AnimatePresence>
            {isTalking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{
                  position: 'absolute',
                  bottom: -4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 3,
                  alignItems: 'flex-end',
                  background: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(8px)',
                  padding: '3px 8px',
                  borderRadius: 12,
                  border: '1px solid rgba(245,158,11,0.3)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                {[5, 8, 6, 10, 7].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [h, h * 1.8, h * 0.6, h * 2, h] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                    style={{ width: 3, background: '#F59E0B', borderRadius: 3, height: h }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Open-chat indicator dot ── */}
          {!isChatOpen && aaraState === 'idle' && (
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: 'absolute',
                top: 6,
                left: 8,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10B981',
                border: '2px solid white',
                boxShadow: '0 0 8px rgba(16,185,129,0.6)',
                zIndex: 2,
              }}
            />
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
