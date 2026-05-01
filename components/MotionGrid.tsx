'use client';
import { motion } from 'framer-motion';

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
export const item = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0 },
};

export function MotionGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

export function MotionItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}
