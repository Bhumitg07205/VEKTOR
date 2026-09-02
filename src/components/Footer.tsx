"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import BetaOnboardingModal from "./BetaOnboardingModal";

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export default function Footer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState("");

  const footerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "center center"]
  });

  const textY = useTransform(scrollYProgress, [0, 1], ["40px", "0px"]);
  const textOpacity = useTransform(scrollYProgress, [0.3, 1], [0, 1]);

  useEffect(() => {
    const handleOpen = () => setIsModalOpen(true);
    window.addEventListener('open-onboarding', handleOpen);
    return () => window.removeEventListener('open-onboarding', handleOpen);
  }, []);

  return (
    <footer ref={footerRef} className="relative bg-[#0d160f] overflow-hidden pt-40 pb-10 px-6 md:px-16 flex flex-col items-center text-center border-t border-secondary/10">

      {/* Ambient glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-secondary/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(#38A251 1px, transparent 1px), linear-gradient(90deg, #38A251 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Main content */}
      <div className="w-full max-w-5xl mx-auto mb-32 relative z-10 flex flex-col items-center">
        <motion.div style={{ y: textY, opacity: textOpacity }} className="w-full relative">
          
          {/* Headline */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-16 relative">
            <h2
              className="font-hero font-medium text-white tracking-tight"
              style={{ fontSize: "clamp(3.5rem, 8vw, 6.5rem)" }}
            >
              Enter the
            </h2>
            <span
              className="font-script text-secondary relative"
              style={{ fontSize: "clamp(5rem, 12vw, 9rem)", top: "10px" }}
            >
              Core
            </span>
          </div>

          {/* Center Form & Arrows */}
          <div className="relative w-full max-w-md mx-auto mb-10">
            {/* Left Arrow */}
            <div className="absolute -left-20 md:-left-40 top-[-40px] hidden sm:flex flex-col items-end opacity-80">
              <svg width="60" height="70" viewBox="0 0 60 70" fill="none" className="text-secondary/70 -rotate-12 translate-x-4">
                <path d="M50 10C40 30 10 20 15 50" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M5 40C12 45 15 50 15 50C15 50 20 42 28 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div className="font-script text-2xl text-white/70 -rotate-12 whitespace-nowrap mt-2 mr-6">
                Only the<br/>obsessed
              </div>
            </div>

            {/* Right Arrow */}
            <div className="absolute -right-16 md:-right-36 top-[-30px] hidden sm:flex flex-col items-start opacity-80">
              <svg width="60" height="70" viewBox="0 0 60 70" fill="none" className="text-secondary/70 rotate-[20deg] -translate-x-4 scale-x-[-1]">
                <path d="M50 10C40 30 10 20 15 50" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M5 40C12 45 15 50 15 50C15 50 20 42 28 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div className="font-script text-2xl text-white/70 rotate-6 whitespace-nowrap mt-2 ml-4">
                Pure execution
              </div>
            </div>

            {/* Input pill */}
            <form 
              onSubmit={(e) => { e.preventDefault(); setIsModalOpen(true); }}
              className="w-full bg-white rounded-full p-1.5 flex items-center shadow-[0_0_40px_rgba(56,162,81,0.15)] relative z-10 transition-transform duration-300 hover:scale-[1.02]"
            >
              <input 
                type="email" 
                placeholder="Your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-absolute-black px-6 font-body text-base placeholder:text-gray-400"
              />
              <button type="submit" className="bg-[#1a1a1a] hover:bg-black text-white px-8 py-3.5 rounded-full font-body font-bold text-sm transition-colors duration-200 shadow-md whitespace-nowrap">
                Request Access
              </button>
            </form>
          </div>

          {/* Subtext */}
          <div className="font-mono text-xs font-bold tracking-[0.2em] text-secondary/60 uppercase">
            APPLICATIONS ARE STRICTLY FILTERED.
          </div>

        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="w-full max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
        <div className="flex items-center gap-5">
          <span className="font-mono font-bold tracking-[0.22em] uppercase text-white/80 text-sm">VEKTOR</span>
          <span className="w-px h-4 bg-white/20" />
          <span className="text-white/50 text-sm font-body">© {new Date().getFullYear()}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-white/50">
          <a
            href="mailto:team@vektor.yourcollegedomain"
            className="hover:text-secondary transition-colors duration-200"
          >
            team@vektor.[domain]
          </a>
          <a href="#" className="hover:text-secondary transition-colors duration-200 flex items-center gap-1.5 cursor-pointer">
            <InstagramIcon />
            Instagram
          </a>
          <a href="#" className="hover:text-secondary transition-colors duration-200 flex items-center gap-1.5 cursor-pointer">
            <LinkedinIcon />
            LinkedIn
          </a>
        </div>
      </div>

      {/* The Onboarding Modal */}
      <BetaOnboardingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialEmail={email}
      />
    </footer>
  );
}
