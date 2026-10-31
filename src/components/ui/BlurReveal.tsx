import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface BlurRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  yOffset?: number;
}

const LUXURY_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function BlurReveal({
  children,
  className = '',
  delay = 0,
  duration = 1.35,
  yOffset = 12,
}: BlurRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        filter: 'blur(14px)',
        scale: 0.985,
        y: yOffset,
      }}
      whileInView={{
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1,
        y: 0,
      }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{
        duration,
        delay,
        ease: LUXURY_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}
