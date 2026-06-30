'use client';

/**
 * ElementHighlight — Portal overlay that renders a pulsing glow ring
 * around any registered DOM element while Aara is interacting with it.
 *
 * Rendered into document.body via createPortal so z-index stacking never
 * conflicts with page modals. The ring tracks the element's bounding rect
 * using a ResizeObserver so it stays accurate on scroll/resize.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAaraContext } from '@/context/AaraContext';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ElementHighlight() {
  const { highlightedElementId, getElement } = useAaraContext();
  const [rect, setRect] = useState<Rect | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [mounted, setMounted] = useState(false);

  // SSR guard — portals only work client-side
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!highlightedElementId) {
      setRect(null);
      return;
    }

    const reg = getElement(highlightedElementId);
    if (!reg?.ref.current) {
      setRect(null);
      return;
    }

    const el = reg.ref.current;

    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height });
    };

    measure();

    observerRef.current = new ResizeObserver(measure);
    observerRef.current.observe(el);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure, { passive: true });

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [highlightedElementId, getElement]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {rect && (
        <motion.div
          key={highlightedElementId}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            pointerEvents: 'none',
            zIndex: 9998,
          }}
        >
          {/* Outer pulsing ring */}
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-2xl border-2 border-amber-400/70"
            style={{ boxShadow: '0 0 20px 4px rgba(245,158,11,0.35), 0 0 0 2px rgba(245,158,11,0.15)' }}
          />

          {/* Inner fill shimmer */}
          <motion.div
            animate={{ opacity: [0.04, 0.1, 0.04] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-1 rounded-xl bg-amber-400"
          />

          {/* Corner accent dots */}
          {[
            'top-0 left-0',
            'top-0 right-0',
            'bottom-0 left-0',
            'bottom-0 right-0',
          ].map((pos) => (
            <motion.div
              key={pos}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              className={`absolute w-2 h-2 rounded-full bg-amber-400 ${pos} -translate-x-1/2 translate-y-0`}
              style={{ boxShadow: '0 0 8px 2px rgba(245,158,11,0.5)' }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
