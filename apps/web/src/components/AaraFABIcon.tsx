'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AaraFABIconProps {
  size?: number;
  isOpen?: boolean;
}

/**
 * AaraFABIcon — The Tome of Habitat.
 * Highly symbolic illustration: House on Book with Tree and Roots.
 */
export function AaraFABIcon({ size = 80, isOpen = false }: AaraFABIconProps) {
  return (
    <div className="relative flex items-center justify-center p-1" style={{ width: size, height: size }}>
      {/* Mystical Glow */}
      {!isOpen && (
        <motion.div
          animate={{
            opacity: [0.4, 0.7, 0.4],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl"
        />
      )}
      
      {/* The Core Icon Image */}
      <motion.img
        src="/images/aara_icon.png"
        alt="AARA Icon"
        className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
        animate={isOpen ? { scale: 0.9, opacity: 0.8 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}

export default AaraFABIcon;
