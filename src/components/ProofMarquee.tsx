"use client";

import { motion } from "framer-motion";

const ITEMS = [
  "₹8,00,000 FUNDED",
  "SMART PARKING — LIVE",
  "₹2,00,000 FUNDED",
  "CAMPUS SECURITY — LIVE",
  "SELECTIVE INTAKE ONLY",
  "BUILT WITH ADMINISTRATION",
  "ZERO DEMO PROJECTS",
  "100% DEPLOYED",
];

const text = ITEMS.join("   ·   ") + "   ·   ";

export default function ProofMarquee() {
  return (
    <div className="relative w-full bg-charcoal-stone border-y border-surface/10 py-4 overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-charcoal-stone to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-charcoal-stone to-transparent z-10 pointer-events-none" />

      {/* Marquee container */}
      <div className="flex whitespace-nowrap overflow-hidden">
        <motion.div
          className="flex shrink-0 gap-0"
          animate={{ x: [0, "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
        >
          <span className="font-mono text-sm md:text-base font-bold tracking-[0.1em] text-surface/90 px-4">
            {text}
          </span>
          <span className="font-mono text-sm md:text-base font-bold tracking-[0.1em] text-surface/90 px-4">
            {text}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
