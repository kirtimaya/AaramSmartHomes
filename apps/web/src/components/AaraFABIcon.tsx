'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface AaraFABIconProps {
  size?: number;
  isOpen?: boolean;
  /** Pulses the orb while voice input is active (wired up in Phase 7). */
  listening?: boolean;
}

const AMBER = '#F59E0B';
const AMBER_LIGHT = '#FCD34D';
const AMBER_DARK = '#B45309';

function useBlink(active: boolean) {
  const ctrl = useAnimation();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) { ctrl.stop(); return; }
    const schedule = () => {
      const wait = 2600 + Math.random() * 2600;
      timer.current = setTimeout(async () => {
        await ctrl.start({ scaleY: 0.08, transition: { duration: 0.08 } });
        await ctrl.start({ scaleY: 1, transition: { duration: 0.1 } });
        schedule();
      }, wait);
    };
    schedule();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [active, ctrl]);

  return ctrl;
}

/**
 * AaraFABIcon — the animated orb face for the Aara agent. Replaces the static
 * PNG mark with a breathing, blinking SVG so the assistant reads as "alive"
 * even at rest, and can pulse while listening for voice input.
 */
export function AaraFABIcon({ size = 80, isOpen = false, listening = false }: AaraFABIconProps) {
  const blinkCtrl = useBlink(!isOpen);
  const [talking, setTalking] = useState(false);

  useEffect(() => {
    if (!isOpen) { setTalking(false); return; }
    const id = setInterval(() => setTalking(v => !v), 220);
    return () => clearInterval(id);
  }, [isOpen]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Ambient glow — breathes when idle, pulses fast when listening */}
      <motion.div
        animate={listening
          ? { opacity: [0.5, 0.9, 0.5], scale: [1, 1.25, 1] }
          : { opacity: [0.35, 0.65, 0.35], scale: [1, 1.12, 1] }}
        transition={{ duration: listening ? 0.9 : 3.4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: `radial-gradient(circle, ${AMBER_LIGHT}55, transparent 70%)` }}
      />

      <motion.svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="relative z-10 drop-shadow-xl"
        animate={{ y: [0, -3, 0], scale: isOpen ? 0.92 : 1 }}
        transition={{ y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 0.25 } }}
      >
        <defs>
          <radialGradient id="aara-orb" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor={AMBER_LIGHT} />
            <stop offset="55%" stopColor={AMBER} />
            <stop offset="100%" stopColor={AMBER_DARK} />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="44" fill="url(#aara-orb)" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />

        {/* Eyes */}
        <motion.g animate={blinkCtrl} style={{ originX: '38px', originY: '46px' }}>
          <circle cx="38" cy="46" r="5" fill="#1C1917" />
        </motion.g>
        <motion.g animate={blinkCtrl} style={{ originX: '62px', originY: '46px' }}>
          <circle cx="62" cy="46" r="5" fill="#1C1917" />
        </motion.g>
        <circle cx="36.5" cy="44.5" r="1.4" fill="white" />
        <circle cx="60.5" cy="44.5" r="1.4" fill="white" />

        {/* Mouth — soft smile at rest, gentle oscillation while "talking" (chat open) */}
        {isOpen && talking ? (
          <ellipse cx="50" cy="63" rx="7" ry="4.5" fill="#1C1917" fillOpacity="0.85" />
        ) : (
          <path d="M 39 62 Q 50 70 61 62" stroke="#1C1917" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        )}
      </motion.svg>
    </div>
  );
}

export default AaraFABIcon;
