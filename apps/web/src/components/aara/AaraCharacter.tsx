'use client';

/**
 * AaraCharacter — Full-body SVG avatar of Aara, a South Asian real estate agent.
 *
 * viewBox 0 0 100 265 — head-to-heel cartoon-realistic figure:
 *   Hair/Head    :  y 5–50   (head cx=50 cy=27, rx=18 ry=22)
 *   Neck/collar  :  y 49–63
 *   Blazer body  :  y 61–150 (amber professional blazer)
 *   Arms         :  y 65–162 (right arm holds property clipboard)
 *   Belt         :  y 148–155
 *   Pencil skirt :  y 150–208 (deep purple)
 *   Legs         :  y 208–258
 *   Heeled shoes :  y 254–265
 *
 * Animated elements:
 *  - Eyelids  : scaleY blink every 3–5 s
 *  - Mouth    : d-path open/close @ 160 ms when mood='talking'|'typing'
 *  - Body     : rotateZ lean (moving / thinking / error shake)
 *  - Hair     : rotateZ lag behind body (0.15 s delay)
 *  - Right arm: rotate + x when mood='pointing'
 *  - Eyebrows : y raise on thinking/happy
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CharacterMood =
  | 'idle' | 'talking' | 'thinking'
  | 'moving' | 'pointing' | 'typing'
  | 'happy' | 'error';

interface Props {
  mood?: CharacterMood;
  direction?: 'left' | 'right' | null;
  size?: number;
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
  skirt:       '#4C1D95',
  skirtMid:    '#6D28D9',
  skirtLight:  '#7C3AED',
  shoe:        '#1C1917',
  shoeHigh:    '#44403C',
  lip:         '#C0422A',
  lipLow:      '#D05840',
  eyeWhite:    '#FDFAF8',
  iris:        '#1A0800',
  pupil:       '#080200',
  gold:        '#F0A828',
  goldDark:    '#C07818',
  bindi:       '#E84020',
};

// ─── Blink hook ───────────────────────────────────────────────────────────────

function useBlink(active: boolean) {
  const ctrl  = useAnimation();
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

// ─── Component ────────────────────────────────────────────────────────────────

export function AaraCharacter({
  mood = 'idle',
  direction = null,
  size = 100,
  gaze = { x: 0, y: 0 },
}: Props) {
  const blinkCtrl    = useBlink(mood === 'idle' || mood === 'talking' || mood === 'happy');
  const bodyCtrl     = useAnimation();
  const hairCtrl     = useAnimation();
  const rightArmCtrl = useAnimation();

  const [mouthOpen, setMouthOpen] = useState(false);
  const mouthTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mouth oscillation when talking or typing
  useEffect(() => {
    if (mouthTimer.current) clearInterval(mouthTimer.current);
    if (mood === 'talking' || mood === 'typing') {
      mouthTimer.current = setInterval(() => setMouthOpen(v => !v), 160);
    } else {
      setMouthOpen(false);
    }
    return () => { if (mouthTimer.current) clearInterval(mouthTimer.current); };
  }, [mood]);

  // Body / hair / arm animations on mood change
  useEffect(() => {
    const lean = direction === 'right' ? 10 : direction === 'left' ? -10 : 0;

    if (mood === 'moving') {
      bodyCtrl.start({ rotateZ: lean, transition: { duration: 0.4, ease: 'easeOut' } });
      setTimeout(() => (hairCtrl.start as any)({ rotateZ: lean * 1.4, transition: { duration: 0.55 } }), 150);
    } else if (mood === 'thinking') {
      bodyCtrl.start({ rotateZ: -5, transition: { duration: 0.6, ease: 'easeInOut' } });
      (hairCtrl.start as any)({ rotateZ: -5, transition: { duration: 0.6 } });
    } else if (mood === 'error') {
      bodyCtrl.start({ rotateZ: [0, -8, 8, -6, 6, 0], transition: { duration: 0.5, ease: 'easeInOut' } });
    } else {
      bodyCtrl.start({ rotateZ: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } });
      (hairCtrl.start as any)({ rotateZ: 0, transition: { type: 'spring', stiffness: 100, damping: 16 } });
    }

    if (mood === 'pointing') {
      rightArmCtrl.start({ rotate: -30, x: 14, transition: { type: 'spring', stiffness: 200, damping: 18 } });
    } else {
      rightArmCtrl.start({ rotate: 0, x: 0, transition: { type: 'spring', stiffness: 160, damping: 20 } });
    }
  }, [mood, direction, bodyCtrl, hairCtrl, rightArmCtrl]);

  const px = gaze.x * 1.6;
  const py = gaze.y * 1.2;
  const browRaise  = mood === 'thinking' ? -2.5 : mood === 'happy' ? -3.5 : 0;
  const smileExtra = mood === 'happy' ? 3 : 0;

  const W = size;
  const H = Math.round((size * 265) / 100);

  return (
    <div style={{ width: W, height: H, flexShrink: 0 }}>
      <svg
        viewBox="0 0 100 265"
        width={W}
        height={H}
        overflow="visible"
        style={{ display: 'block', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.22))' }}
      >
        <defs>
          <radialGradient id="fc-skin" cx="42%" cy="38%" r="62%">
            <stop offset="0%"   stopColor={C.skinLight} />
            <stop offset="55%"  stopColor={C.skin} />
            <stop offset="100%" stopColor={C.skinShadow} />
          </radialGradient>
          <radialGradient id="fc-hair" cx="38%" cy="28%" r="70%">
            <stop offset="0%"   stopColor={C.hairShine} />
            <stop offset="100%" stopColor={C.hair} />
          </radialGradient>
          <linearGradient id="fc-blazer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={C.blazerLight} />
            <stop offset="100%" stopColor={C.blazerDark} />
          </linearGradient>
          <linearGradient id="fc-skirt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={C.skirtMid} />
            <stop offset="100%" stopColor={C.skirt} />
          </linearGradient>
          <linearGradient id="fc-shoe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={C.shoeHigh} />
            <stop offset="100%" stopColor={C.shoe} />
          </linearGradient>
          <radialGradient id="fc-shadow" cx="50%" cy="0%" r="60%">
            <stop offset="0%"   stopColor="rgba(0,0,0,0.18)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* ══ Full body group — body lean animation ══ */}
        <motion.g animate={bodyCtrl} style={{ originX: '50px', originY: '155px' }}>

          {/* ── Breathing wrapper ── */}
          <motion.g
            animate={mood === 'idle' || mood === 'talking' ? { scaleY: [1, 1.012, 1] } : {}}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '50px', originY: '200px' }}
          >

            {/* ════ BACK HAIR (drawn first, behind everything) ════ */}
            <motion.g animate={hairCtrl} style={{ originX: '50px', originY: '27px' }}>
              {/* Long flowing locks — left side */}
              <path
                d="M 33 22 C 20 38 17 72 18 100 C 19 112 23 122 28 130 L 32 120 C 27 108 25 88 26 65 C 28 44 33 30 38 22 Z"
                fill={C.hair}
              />
              {/* Long flowing locks — right side */}
              <path
                d="M 67 22 C 80 38 83 72 82 100 C 81 112 77 122 72 130 L 68 120 C 73 108 75 88 74 65 C 72 44 67 30 62 22 Z"
                fill={C.hair}
              />
              {/* Crown hair mass */}
              <path
                d="M 32 20 C 36 7 50 4 50 4 C 50 4 64 7 68 20 C 61 12 50 11 50 11 C 50 11 39 12 32 20 Z"
                fill="url(#fc-hair)"
              />
              {/* Hair shine streak */}
              <ellipse cx="43" cy="13" rx="9" ry="4" fill={C.hairShine} opacity="0.5" transform="rotate(-18,43,13)" />
            </motion.g>

            {/* ════ LEFT ARM ════ */}
            {/* Sleeve (blazer fabric) */}
            <path
              d="M 35 65 C 25 82 20 108 18 128 C 20 134 26 132 28 130 C 28 112 31 88 40 70 Z"
              fill="url(#fc-blazer)"
            />
            {/* Cuff */}
            <path
              d="M 18 128 C 15 140 14 152 16 162 C 20 165 25 163 27 160 C 24 150 24 138 28 130 Z"
              fill={C.skin}
            />
            {/* Hand */}
            <ellipse cx="15" cy="166" rx="5.5" ry="7" fill={C.skin} />
            {/* Finger lines */}
            <path d="M 10 163 Q 9 169 11 173" stroke={C.skinShadow} strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M 15 164 Q 14 170 15 174" stroke={C.skinShadow} strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M 20 163 Q 21 169 19 173" stroke={C.skinShadow} strokeWidth="1" fill="none" strokeLinecap="round" />

            {/* ════ RIGHT ARM + CLIPBOARD ════ */}
            <motion.g animate={rightArmCtrl} style={{ originX: '65px', originY: '67px' }}>
              {/* Sleeve */}
              <path
                d="M 65 65 C 75 82 80 108 82 128 C 80 134 74 132 72 130 C 72 112 69 88 60 70 Z"
                fill="url(#fc-blazer)"
              />
              {/* Cuff */}
              <path
                d="M 82 128 C 85 140 86 152 84 162 C 80 165 75 163 73 160 C 76 150 76 138 72 130 Z"
                fill={C.skin}
              />
              {/* Hand */}
              <ellipse cx="85" cy="166" rx="5.5" ry="7" fill={C.skin} />

              {/* ── Clipboard ── */}
              {/* Frame */}
              <rect x="78" y="120" width="20" height="34" rx="2.5" fill={C.blazerDark} />
              {/* Paper */}
              <rect x="79.5" y="121.5" width="17" height="30" rx="2" fill="#FEFCE8" />
              {/* Metal clip at top */}
              <rect x="84" y="118" width="8" height="5" rx="2" fill={C.blazerDark} />
              <rect x="85" y="118.5" width="6" height="3" rx="1" fill={C.goldDark} />
              {/* Paper ruling lines */}
              <line x1="81.5" y1="126" x2="95.5" y2="126" stroke={C.blazerDark} strokeWidth="0.9" opacity="0.45" />
              <line x1="81.5" y1="129.5" x2="95.5" y2="129.5" stroke={C.blazerDark} strokeWidth="0.9" opacity="0.45" />
              <line x1="81.5" y1="133" x2="95.5" y2="133" stroke={C.blazerDark} strokeWidth="0.9" opacity="0.45" />
              <line x1="81.5" y1="136.5" x2="93" y2="136.5" stroke={C.blazerDark} strokeWidth="0.9" opacity="0.3" />
              <line x1="81.5" y1="140" x2="91" y2="140" stroke={C.blazerDark} strokeWidth="0.9" opacity="0.2" />
              {/* Small house icon on paper */}
              <path d="M 82 123 L 85.5 120.5 L 89 123 L 89 126 L 82 126 Z" fill={C.blazer} opacity="0.45" />
            </motion.g>

            {/* ════ BLAZER TORSO ════ */}
            <path
              d="M 37 63 L 27 69 L 34 152 C 39 155 50 156 50 156 C 50 156 61 155 66 152 L 73 69 L 63 63 C 57 74 50 75 50 75 C 50 75 43 74 37 63 Z"
              fill="url(#fc-blazer)"
            />
            {/* Lapel left */}
            <path d="M 37 63 C 40 72 44 78 50 75 L 43 82 C 38 82 34 75 35 68 Z" fill={C.blazerDark} />
            {/* Lapel right */}
            <path d="M 63 63 C 60 72 56 78 50 75 L 57 82 C 62 82 66 75 65 68 Z" fill={C.blazerDark} />
            {/* Blouse V-neck between lapels */}
            <path d="M 43 82 L 50 75 L 57 82 L 53 136 L 47 136 Z" fill={C.blouse} />
            {/* Blazer fold shadow */}
            <path d="M 37 76 C 38 108 38 140 38 152" stroke={C.blazerDark} strokeWidth="0.9" fill="none" opacity="0.35" />
            <path d="M 63 76 C 62 108 62 140 62 152" stroke={C.blazerDark} strokeWidth="0.9" fill="none" opacity="0.35" />
            {/* Gold buttons */}
            <circle cx="50" cy="112" r="2.2" fill={C.gold} />
            <circle cx="50" cy="124" r="2.2" fill={C.gold} />
            <circle cx="50" cy="136" r="2.2" fill={C.gold} />
            {/* Breast pocket */}
            <rect x="56" y="86" width="9" height="8" rx="1.5" fill={C.blazerDark} opacity="0.45" />
            <rect x="57.5" y="85" width="6" height="3" rx="1" fill={C.blouse} opacity="0.8" />

            {/* ════ NECK ════ */}
            <path
              d="M 44 49 C 43 58 45 65 46 68 L 54 68 C 55 65 57 58 56 49 Z"
              fill="url(#fc-skin)"
            />
            {/* Neck shadow crease */}
            <path d="M 44 50 C 45 60 46 65 47 68" stroke={C.skinShadow} strokeWidth="0.9" fill="none" opacity="0.22" />
            {/* Necklace */}
            <path d="M 43 52 C 46 58 50 62 50 62 C 50 62 54 58 57 52" stroke={C.gold} strokeWidth="1.3" fill="none" />
            <circle cx="50" cy="62" r="2.4" fill={C.gold} />
            <ellipse cx="50" cy="63.5" rx="1.4" ry="2.3" fill={C.goldDark} />

            {/* ════ HEAD ════ */}
            {/* Ear left */}
            <ellipse cx="32" cy="27" rx="4" ry="5.5" fill={C.skin} />
            <ellipse cx="32" cy="27" rx="2.2" ry="3.2" fill={C.skinShadow} opacity="0.35" />
            {/* Ear right */}
            <ellipse cx="68" cy="27" rx="4" ry="5.5" fill={C.skin} />
            <ellipse cx="68" cy="27" rx="2.2" ry="3.2" fill={C.skinShadow} opacity="0.35" />
            {/* Earrings left */}
            <path d="M 30 32.5 C 29 38 32 41 32 41 C 32 41 35 38 34 32.5 Z" fill={C.gold} />
            <circle cx="32" cy="41.5" r="2.3" fill={C.gold} />
            <circle cx="32" cy="41.5" r="1.1" fill={C.goldDark} />
            {/* Earrings right */}
            <path d="M 66 32.5 C 65 38 68 41 68 41 C 68 41 71 38 70 32.5 Z" fill={C.gold} />
            <circle cx="68" cy="41.5" r="2.3" fill={C.gold} />
            <circle cx="68" cy="41.5" r="1.1" fill={C.goldDark} />

            {/* Head shape */}
            <path
              d="M 50 5 C 72 5 87 16 87 30 C 87 47 73 52 50 53 C 27 52 13 47 13 30 C 13 16 28 5 50 5 Z"
              fill="url(#fc-skin)"
            />
            {/* Under-chin shadow */}
            <ellipse cx="50" cy="52" rx="26" ry="5.5" fill="url(#fc-shadow)" />

            {/* Front hairline */}
            <path
              d="M 13 30 C 13 16 28 5 50 5 C 72 5 87 16 87 30 C 83 20 70 14 50 14 C 30 14 17 20 13 30 Z"
              fill="url(#fc-hair)"
            />
            {/* Side hair strands */}
            <path d="M 16 26 C 15 31 15 37 16 42" stroke={C.hair} strokeWidth="2.8" fill="none" strokeLinecap="round" />
            <path d="M 84 26 C 85 31 85 37 84 42" stroke={C.hair} strokeWidth="2.8" fill="none" strokeLinecap="round" />
            {/* Hair accessory / pin */}
            <rect x="66" y="12" width="9" height="2.5" rx="1.2" fill={C.gold} transform="rotate(-25,70,13)" />
            <rect x="63" y="14" width="6" height="2" rx="1" fill={C.goldDark} opacity="0.7" transform="rotate(-25,66,15)" />

            {/* Bindi */}
            <circle cx="50" cy="19" r="2.9" fill={C.bindi} />
            <circle cx="50" cy="19" r="1.4" fill="#FF8050" opacity="0.6" />

            {/* Eyebrows */}
            <motion.path
              animate={{ y: browRaise }}
              transition={{ duration: 0.3 }}
              d="M 25 25 C 30 21 37 21 42 24"
              stroke={C.hair} strokeWidth="2.3" fill="none" strokeLinecap="round"
            />
            <motion.path
              animate={{ y: browRaise }}
              transition={{ duration: 0.3 }}
              d="M 58 24 C 63 21 70 21 75 25"
              stroke={C.hair} strokeWidth="2.3" fill="none" strokeLinecap="round"
            />

            {/* Eye whites */}
            <ellipse cx="36" cy="31" rx="9"   ry="7"   fill={C.eyeWhite} />
            <ellipse cx="64" cy="31" rx="9"   ry="7"   fill={C.eyeWhite} />
            {/* Iris */}
            <circle cx={36 + px} cy={31 + py} r="4.6"  fill={C.iris} />
            <circle cx={64 + px} cy={31 + py} r="4.6"  fill={C.iris} />
            {/* Pupil */}
            <circle cx={36 + px} cy={31 + py} r="2.6"  fill={C.pupil} />
            <circle cx={64 + px} cy={31 + py} r="2.6"  fill={C.pupil} />
            {/* Eye highlight */}
            <circle cx={37.6 + px} cy={29.4 + py} r="1.5" fill="white" opacity="0.9" />
            <circle cx={65.6 + px} cy={29.4 + py} r="1.5" fill="white" opacity="0.9" />

            {/* Upper eyelash lines */}
            <path d="M 27 26 C 36 23 45 26 45 26" stroke={C.hair} strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M 55 26 C 64 23 73 26 73 26" stroke={C.hair} strokeWidth="1.8" fill="none" strokeLinecap="round" />

            {/* Eyelids (blink — skin coloured overlay, scaleY from centre) */}
            <motion.ellipse
              animate={blinkCtrl}
              cx="36" cy="31" rx="9" ry="7"
              fill={C.skin}
              style={{ transformOrigin: '36px 31px' }}
            />
            <motion.ellipse
              animate={blinkCtrl}
              cx="64" cy="31" rx="9" ry="7"
              fill={C.skin}
              style={{ transformOrigin: '64px 31px' }}
            />

            {/* Nose */}
            <path d="M 48 38 C 46 42 48 46 50 47 C 52 46 54 42 52 38" fill="none" stroke={C.skinShadow} strokeWidth="1.1" />
            <circle cx="50" cy="46" r="1.6" fill={C.skinLight} opacity="0.5" />

            {/* Upper lip */}
            <path
              d={`M ${46 - smileExtra},52 C 52,49 ${54 + smileExtra},52`}
              fill={C.lip}
            />
            {/* Lower lip / mouth (animated) */}
            <motion.path
              animate={{ d: mouthOpen
                ? `M ${46 - smileExtra},52 C ${50},${62 + smileExtra} ${54 + smileExtra},52`
                : `M ${46 - smileExtra},52 C ${50},${59 + smileExtra} ${54 + smileExtra},52`
              }}
              transition={{ duration: 0.08 }}
              fill={C.lipLow}
            />
            {/* Mouth interior (open state only) */}
            {mouthOpen && <ellipse cx="50" cy="56"  rx="5.5" ry="3.5" fill="#3A1008" opacity="0.85" />}
            {mouthOpen && <rect x="45.5" y="53.5" width="9" height="3" rx="1.5" fill="white" opacity="0.9" />}
            {/* Smile creases */}
            <path d={`M ${44 - smileExtra},51 C ${43 - smileExtra},55 ${44 - smileExtra},58`} stroke={C.skinShadow} strokeWidth="0.8" fill="none" />
            <path d={`M ${56 + smileExtra},51 C ${57 + smileExtra},55 ${56 + smileExtra},58`} stroke={C.skinShadow} strokeWidth="0.8" fill="none" />
            {/* Cheek blush */}
            <ellipse cx="22" cy="37" rx="7.5" ry="4.5" fill={C.lip} opacity="0.09" />
            <ellipse cx="78" cy="37" rx="7.5" ry="4.5" fill={C.lip} opacity="0.09" />

            {/* ════ BELT ════ */}
            <rect x="34" y="150" width="32" height="8" rx="2.5" fill={C.blazerDark} opacity="0.9" />
            {/* Belt buckle */}
            <rect x="46" y="151" width="8" height="6" rx="1.2" fill={C.gold} />
            <rect x="47.5" y="152.5" width="5" height="3" rx="0.8" fill={C.goldDark} />

            {/* ════ PENCIL SKIRT ════ */}
            <path
              d="M 34 156 C 31 174 29 192 29 210 L 71 210 C 71 192 69 174 66 156 Z"
              fill="url(#fc-skirt)"
            />
            {/* Skirt highlight / sheen */}
            <path d="M 41 159 C 40 178 40 197 40 210" stroke="rgba(255,255,255,0.14)" strokeWidth="3" fill="none" />
            {/* Skirt hem decorative band */}
            <line x1="29" y1="206" x2="71" y2="206" stroke={C.skirt} strokeWidth="2" opacity="0.55" />
            {/* Skirt centre fold */}
            <path d="M 50 158 L 50 210" stroke={C.skirtMid} strokeWidth="0.7" opacity="0.3" fill="none" />

            {/* ════ LEGS ════ */}
            {/* Left leg */}
            <path
              d="M 35 210 C 34 228 35 244 36 258 C 40 261 45 260 47 258 C 47 244 47 228 46 210 Z"
              fill={C.skin}
            />
            {/* Left leg inner shadow */}
            <path d="M 44 212 C 44 232 44.5 250 45 256" stroke={C.skinShadow} strokeWidth="0.9" fill="none" opacity="0.25" />
            {/* Right leg */}
            <path
              d="M 54 210 C 53 228 53 244 53 258 C 55 260 60 261 64 258 C 65 244 66 228 65 210 Z"
              fill={C.skin}
            />
            {/* Right leg inner shadow */}
            <path d="M 56 212 C 56 232 55.5 250 55 256" stroke={C.skinShadow} strokeWidth="0.9" fill="none" opacity="0.25" />

            {/* ════ HEELED SHOES ════ */}
            {/* Left shoe — toe points slightly outward */}
            <path
              d="M 34 256 C 29 259 25 264 24 266 C 34 269 48 266 48 266 L 47 258 C 42 257 37 256 34 256 Z"
              fill="url(#fc-shoe)"
            />
            {/* Left heel */}
            <rect x="31" y="261" width="5" height="8" rx="1.8" fill={C.shoe} />
            {/* Left shoe toe highlight */}
            <path d="M 25 263 C 32 260 40 261 42 262" stroke={C.shoeHigh} strokeWidth="1" fill="none" opacity="0.5" />
            {/* Right shoe */}
            <path
              d="M 66 256 C 71 259 75 264 76 266 C 66 269 52 266 52 266 L 53 258 C 58 257 63 256 66 256 Z"
              fill="url(#fc-shoe)"
            />
            {/* Right heel */}
            <rect x="64" y="261" width="5" height="8" rx="1.8" fill={C.shoe} />
            {/* Right shoe toe highlight */}
            <path d="M 75 263 C 68 260 60 261 58 262" stroke={C.shoeHigh} strokeWidth="1" fill="none" opacity="0.5" />

            {/* Typing shimmer (right hand glow) */}
            {mood === 'typing' && (
              <motion.circle
                cx="85" cy="158" r="12"
                fill={C.gold} opacity={0}
                animate={{ opacity: [0, 0.22, 0], y: [0, -6, 0] }}
                transition={{ duration: 0.4, repeat: Infinity }}
              />
            )}

          </motion.g>{/* breathing */}
        </motion.g>{/* body / lean */}
      </svg>
    </div>
  );
}
