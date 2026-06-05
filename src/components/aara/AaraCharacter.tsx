'use client';

/**
 * AaraCharacter — Fully illustrated SVG avatar of Aara.
 *
 * A professional South Asian real estate lady — warm skin, dark updo, amber blazer.
 * Rendered as layered SVG with framer-motion driving every state.
 *
 * viewBox 0 0 120 200:
 *   Hair bun   :  cy=24, top at y=4
 *   Head       :  cx=60 cy=72, y ≈ 34–110
 *   Neck       :  y 108–126
 *   Body/blazer:  y 112–200
 *
 * Mood → animation mapping:
 *  idle        — soft breathing scale + auto-blink every 3–5s
 *  talking     — mouth open/close oscillation (~3 Hz)
 *  thinking    — head tilt 6°, eyes look up-left
 *  moving      — whole-body lean toward direction, hair lags 0.15s
 *  pointing    — right arm extends outward
 *  typing      — lean forward, hand-tap shimmer on right side
 *  happy       — brows lift, wide smile
 *  error       — shake
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, animate as fmAnimate } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CharacterMood =
  | 'idle' | 'talking' | 'thinking'
  | 'moving' | 'pointing' | 'typing'
  | 'happy' | 'error';

interface Props {
  mood?: CharacterMood;
  /** Direction avatar is travelling (for lean) */
  direction?: 'left' | 'right' | null;
  /** Size in px of the rendered SVG */
  size?: number;
  /** Eye gaze direction (-1..1 for x, -1..1 for y) */
  gaze?: { x: number; y: number };
}

// ─── Colour palette ───────────────────────────────────────────────────────────

const C = {
  skin:        '#D49868',
  skinLight:   '#ECC098',
  skinShadow:  '#A86838',
  hair:        '#0F0502',
  hairShine:   '#2E1408',
  blazer:      '#B45309',
  blazerDark:  '#7C3705',
  blazerLight: '#D4730A',
  blouse:      '#FFFBF2',
  lip:         '#C0422A',
  lipLow:      '#D05840',
  eyeWhite:    '#FDFAF8',
  iris:        '#1A0800',
  pupil:       '#080200',
  gold:        '#F0A828',
  goldDark:    '#C07818',
  bindi:       '#E84020',
};

// ─── Gradient / filter IDs ────────────────────────────────────────────────────

const G = {
  skin:    'ac-skin',
  hair:    'ac-hair',
  blazer:  'ac-blazer',
  shadow:  'ac-shadow',
};

// ─── Blink hook ───────────────────────────────────────────────────────────────

function useBlink(active: boolean) {
  const ctrl = useAnimation();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) { ctrl.stop(); return; }

    const schedule = () => {
      const wait = 2800 + Math.random() * 2400;
      timer.current = setTimeout(async () => {
        await ctrl.start({ scaleY: 0.04, transition: { duration: 0.09 } });
        await ctrl.start({ scaleY: 1,    transition: { duration: 0.11 } });
        schedule();
      }, wait);
    };

    schedule();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [active, ctrl]);

  return ctrl;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AaraCharacter({
  mood = 'idle',
  direction = null,
  size = 120,
  gaze = { x: 0, y: 0 },
}: Props) {
  const blinkCtrl   = useBlink(mood === 'idle' || mood === 'talking' || mood === 'happy');
  const bodyCtrl    = useAnimation();
  const hairCtrl    = useAnimation();
  const rightArmCtrl = useAnimation();
  const [mouthOpen, setMouthOpen] = useState(false);
  const mouthTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Talking mouth oscillation ──────────────────────────────────────────────
  useEffect(() => {
    if (mouthTimer.current) clearInterval(mouthTimer.current);
    if (mood === 'talking') {
      mouthTimer.current = setInterval(() => setMouthOpen(v => !v), 160);
    } else {
      setMouthOpen(false);
    }
    return () => { if (mouthTimer.current) clearInterval(mouthTimer.current); };
  }, [mood]);

  // ── Body / hair / arm on mood change ─────────────────────────────────────
  useEffect(() => {
    const lean = direction === 'right' ? 10 : direction === 'left' ? -10 : 0;

    if (mood === 'moving') {
      bodyCtrl.start({ rotateZ: lean, transition: { duration: 0.4, ease: 'easeOut' } });
      setTimeout(() => hairCtrl.start({ rotateZ: lean * 1.4, transition: { duration: 0.55 } } as any), 150);
    } else if (mood === 'thinking') {
      bodyCtrl.start({ rotateZ: -5, transition: { duration: 0.6, ease: 'easeInOut' } });
      hairCtrl.start({ rotateZ: -5, transition: { duration: 0.6 } });
    } else if (mood === 'error') {
      bodyCtrl.start({
        rotateZ: [0, -8, 8, -6, 6, 0],
        transition: { duration: 0.5, ease: 'easeInOut' },
      });
    } else {
      bodyCtrl.start({ rotateZ: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } });
      hairCtrl.start({ rotateZ: 0, transition: { type: 'spring', stiffness: 100, damping: 16 } });
    }

    // Pointing arm
    if (mood === 'pointing') {
      rightArmCtrl.start({ rotate: -30, x: 16, transition: { type: 'spring', stiffness: 200, damping: 18 } });
    } else {
      rightArmCtrl.start({ rotate: 0, x: 0, transition: { type: 'spring', stiffness: 160, damping: 20 } });
    }
  }, [mood, direction, bodyCtrl, hairCtrl, rightArmCtrl]);

  // Pupil offset from gaze
  const pupilDx = gaze.x * 1.8;
  const pupilDy = gaze.y * 1.4;

  // Brow raise for thinking/happy
  const browRaise = mood === 'thinking' ? -3 : mood === 'happy' ? -4 : 0;

  // Smile width for happy
  const smileExtra = mood === 'happy' ? 4 : 0;

  return (
    <div
      style={{
        width: size,
        height: (size * 200) / 120,
        perspective: 500,
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 120 200"
        width={size}
        height={(size * 200) / 120}
        overflow="visible"
        style={{ display: 'block', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.22))' }}
      >
        <defs>
          {/* Skin gradient — lighter centre, shadowed edges */}
          <radialGradient id={G.skin} cx="42%" cy="38%" r="62%">
            <stop offset="0%"   stopColor={C.skinLight} />
            <stop offset="55%"  stopColor={C.skin} />
            <stop offset="100%" stopColor={C.skinShadow} />
          </radialGradient>

          {/* Hair gradient */}
          <radialGradient id={G.hair} cx="38%" cy="28%" r="70%">
            <stop offset="0%"   stopColor={C.hairShine} />
            <stop offset="100%" stopColor={C.hair} />
          </radialGradient>

          {/* Blazer gradient */}
          <linearGradient id={G.blazer} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={C.blazerLight} />
            <stop offset="100%" stopColor={C.blazerDark} />
          </linearGradient>

          {/* Subtle under-chin shadow */}
          <radialGradient id={G.shadow} cx="50%" cy="0%" r="60%">
            <stop offset="0%"   stopColor="rgba(0,0,0,0.18)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* ── Whole-character group (breathing + lean) ── */}
        <motion.g
          animate={bodyCtrl}
          style={{ originX: '50%', originY: '80%' }}
        >
          {/* ─── Breathing wrapper ─── */}
          <motion.g
            animate={
              mood === 'idle' || mood === 'talking'
                ? { scaleY: [1, 1.014, 1] }
                : {}
            }
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '50%', originY: '100%' }}
          >

            {/* ════ BACK HAIR (behind head) ════ */}
            <motion.g animate={hairCtrl} style={{ originX: '50%', originY: '60%' }}>
              {/* Main bun shape */}
              <ellipse cx="60" cy="24" rx="27" ry="22" fill={`url(#${G.hair})`} />
              {/* Side hair volume — left */}
              <path
                d="M 33,52 C 28,42 30,28 37,20 C 42,14 52,10 60,10 L 60,46 C 50,46 40,48 33,52 Z"
                fill={C.hair}
              />
              {/* Side hair volume — right */}
              <path
                d="M 87,52 C 92,42 90,28 83,20 C 78,14 68,10 60,10 L 60,46 C 70,46 80,48 87,52 Z"
                fill={C.hair}
              />
              {/* Hair shine streak */}
              <ellipse cx="50" cy="18" rx="8" ry="4" fill={C.hairShine} opacity="0.55" transform="rotate(-15,50,18)" />
            </motion.g>

            {/* ════ BLAZER / BODY ════ */}
            {/* Arms (behind body) */}
            {/* Left arm */}
            <path
              d="M 18,148 Q 10,164 8,178"
              stroke={C.blazer} strokeWidth="15" fill="none" strokeLinecap="round"
            />
            {/* Right arm — animated for pointing */}
            <motion.path
              animate={rightArmCtrl}
              d="M 102,148 Q 110,164 112,178"
              stroke={C.blazer} strokeWidth="15" fill="none" strokeLinecap="round"
              style={{ originX: '102px', originY: '148px' }}
            />

            {/* Main blazer body */}
            <path
              d="M 0,200 L 6,156 C 10,132 24,118 50,114 L 55,120 L 60,138 L 65,120 L 70,114 C 96,118 110,132 114,156 L 120,200 Z"
              fill={`url(#${G.blazer})`}
            />

            {/* Lapel left */}
            <path
              d="M 50,114 C 52,120 56,128 60,138 C 55,130 46,122 48,116 Z"
              fill={C.blazerDark}
            />
            {/* Lapel right */}
            <path
              d="M 70,114 C 68,120 64,128 60,138 C 65,130 74,122 72,116 Z"
              fill={C.blazerDark}
            />

            {/* Blouse V-neck area */}
            <path d="M 54,118 L 60,138 L 66,118 Z" fill={C.blouse} />

            {/* Blazer button */}
            <circle cx="60" cy="155" r="3" fill={C.gold} />
            <circle cx="60" cy="170" r="3" fill={C.gold} />

            {/* ════ NECK ════ */}
            <path
              d="M 48,108 C 50,115 52,120 54,124 L 66,124 C 68,120 70,115 72,108 Z"
              fill={`url(#${G.skin})`}
            />
            {/* Blouse collar */}
            <path d="M 50,116 C 54,120 58,124 60,128 C 62,124 66,120 70,116 L 66,124 L 54,124 Z" fill={C.blouse} />

            {/* Under-chin shadow */}
            <ellipse cx="60" cy="108" rx="28" ry="6" fill={`url(#${G.shadow})`} />

            {/* ════ HEAD ════ */}
            <path
              d="M 60,34 C 82,34 94,50 94,70 C 94,92 80,110 60,112 C 40,110 26,92 26,70 C 26,50 38,34 60,34 Z"
              fill={`url(#${G.skin})`}
            />

            {/* Ear left */}
            <ellipse cx="27" cy="73" rx="5.5" ry="7" fill={C.skin} />
            <ellipse cx="27" cy="73" rx="3" ry="4.5" fill={C.skinShadow} opacity="0.4" />
            {/* Ear right */}
            <ellipse cx="93" cy="73" rx="5.5" ry="7" fill={C.skin} />
            <ellipse cx="93" cy="73" rx="3" ry="4.5" fill={C.skinShadow} opacity="0.4" />

            {/* Earring left */}
            <circle cx="27" cy="70" r="3.5" fill={C.gold} />
            <circle cx="27" cy="70" r="1.5" fill={C.goldDark} />
            {/* Earring right */}
            <circle cx="93" cy="70" r="3.5" fill={C.gold} />
            <circle cx="93" cy="70" r="1.5" fill={C.goldDark} />

            {/* ════ FACE FEATURES ════ */}

            {/* Eyebrows */}
            <motion.path
              animate={{ y: browRaise }}
              transition={{ duration: 0.3 }}
              d="M 37,59 Q 44,55 52,57"
              stroke={C.hair} strokeWidth="2.2" fill="none" strokeLinecap="round"
            />
            <motion.path
              animate={{ y: browRaise }}
              transition={{ duration: 0.3 }}
              d="M 68,57 Q 76,55 83,59"
              stroke={C.hair} strokeWidth="2.2" fill="none" strokeLinecap="round"
            />

            {/* ─── Eyes ─── */}
            {/* Left eye white */}
            <ellipse cx="46" cy="68" rx="9" ry="7" fill={C.eyeWhite} />
            {/* Left iris */}
            <circle cx={46 + pupilDx} cy={68 + pupilDy} r="4.5" fill={C.iris} />
            {/* Left pupil */}
            <circle cx={46 + pupilDx} cy={68 + pupilDy} r="2.5" fill={C.pupil} />
            {/* Left eye highlight */}
            <circle cx={47.5 + pupilDx} cy={66.5 + pupilDy} r="1.4" fill="white" opacity="0.9" />
            {/* Left upper eyelash line */}
            <path d="M 37,64 Q 46,61 55,64" stroke={C.hair} strokeWidth="1.6" fill="none" strokeLinecap="round" />
            {/* Left eyelid (animated for blink) */}
            <motion.ellipse
              animate={blinkCtrl}
              cx="46" cy="68" rx="9" ry="7"
              fill={C.skin}
              style={{ originX: '46px', originY: '68px' }}
            />

            {/* Right eye white */}
            <ellipse cx="74" cy="68" rx="9" ry="7" fill={C.eyeWhite} />
            {/* Right iris */}
            <circle cx={74 + pupilDx} cy={68 + pupilDy} r="4.5" fill={C.iris} />
            {/* Right pupil */}
            <circle cx={74 + pupilDx} cy={68 + pupilDy} r="2.5" fill={C.pupil} />
            {/* Right eye highlight */}
            <circle cx={75.5 + pupilDx} cy={66.5 + pupilDy} r="1.4" fill="white" opacity="0.9" />
            {/* Right upper eyelash line */}
            <path d="M 65,64 Q 74,61 83,64" stroke={C.hair} strokeWidth="1.6" fill="none" strokeLinecap="round" />
            {/* Right eyelid (blink) */}
            <motion.ellipse
              animate={blinkCtrl}
              cx="74" cy="68" rx="9" ry="7"
              fill={C.skin}
              style={{ originX: '74px', originY: '68px' }}
            />

            {/* Nose */}
            <path d="M 58,77 Q 56,82 58,85 Q 60,87 62,85 Q 64,82 62,77" fill="none" stroke={C.skinShadow} strokeWidth="1" />
            {/* Nose highlight */}
            <circle cx="60" cy="84" r="1.5" fill={C.skinLight} opacity="0.5" />

            {/* ─── Mouth ─── */}
            {/* Upper lip */}
            <path
              d={`M ${48 - smileExtra},90 Q 54,87 60,88 Q 66,87 ${72 + smileExtra},90`}
              fill={C.lip}
            />
            {/* Lower lip */}
            <motion.path
              animate={{ d: mouthOpen
                ? `M ${48 - smileExtra},90 Q ${60},${98 + smileExtra} ${72 + smileExtra},90`
                : `M ${48 - smileExtra},90 Q ${60},${95 + smileExtra} ${72 + smileExtra},90`
              }}
              transition={{ duration: 0.08 }}
              fill={C.lipLow}
            />
            {/* Smile crease left */}
            <path d={`M ${46 - smileExtra},89 Q ${48 - smileExtra},93 ${49 - smileExtra},96`} stroke={C.skinShadow} strokeWidth="0.8" fill="none" />
            {/* Smile crease right */}
            <path d={`M ${74 + smileExtra},89 Q ${72 + smileExtra},93 ${71 + smileExtra},96`} stroke={C.skinShadow} strokeWidth="0.8" fill="none" />
            {/* Mouth inner (open state) */}
            {mouthOpen && (
              <ellipse cx="60" cy="92" rx="7" ry="4" fill="#3A1008" opacity="0.85" />
            )}
            {/* Tooth line (when open) */}
            {mouthOpen && (
              <rect x="54" y="91" width="12" height="3.5" rx="1.5" fill="white" opacity="0.9" />
            )}

            {/* Bindi (forehead mark) */}
            <circle cx="60" cy="54" r="2.8" fill={C.bindi} />
            <circle cx="60" cy="54" r="1.4" fill="#FF8050" opacity="0.6" />

            {/* ════ FRONT HAIR (above face) ════ */}
            {/* Hair parting / centre line */}
            <path d="M 56,34 Q 60,30 64,34" fill={C.hair} stroke={C.hair} strokeWidth="0.5" />
            {/* Front bun face */}
            <ellipse cx="60" cy="22" rx="22" ry="19" fill={`url(#${G.hair})`} />
            {/* Bun highlight */}
            <ellipse cx="53" cy="16" rx="7" ry="4" fill={C.hairShine} opacity="0.5" transform="rotate(-20,53,16)" />
            {/* Hairpin / accessory */}
            <rect x="68" y="15" width="8" height="2.5" rx="1.2" fill={C.gold} transform="rotate(-30,72,16)" />

            {/* Typing hand shimmer (appears in typing state) */}
            {mood === 'typing' && (
              <motion.circle
                cx="95" cy="148"
                r="10"
                fill={C.gold}
                opacity={0}
                animate={{ opacity: [0, 0.25, 0], y: [0, -8, 0] }}
                transition={{ duration: 0.4, repeat: Infinity }}
              />
            )}

          </motion.g>{/* breathing */}
        </motion.g>{/* body / lean */}
      </svg>
    </div>
  );
}
