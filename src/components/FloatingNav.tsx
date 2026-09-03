"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { X, Menu } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Journey", href: "#journey" },
  { label: "Scope", href: "#scope" },
  { label: "Core", href: "#core" },
];

export default function FloatingNav() {
  const { scrollYProgress } = useScroll();
  const [isOpen, setIsOpen] = useState(false);

  // Slides up after first 3% scroll
  const navY = useTransform(scrollYProgress, [0, 0.03], [150, 0]);
  const navOpacity = useTransform(scrollYProgress, [0, 0.03], [0, 1]);

  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Smooth scroll for anchor links
    const links = navRef.current?.querySelectorAll("a[href^='#']");
    links?.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const id = link.getAttribute("href")?.slice(1);
        const target = id ? document.getElementById(id) : null;
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
          setIsOpen(false);
        }
      });
    });
  }, []);

  return (
    <motion.nav
      ref={navRef}
      style={{ y: navY, opacity: navOpacity }}
      className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
    >
      <motion.div
        layout
        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
        className="pointer-events-auto flex flex-col bg-black/85 backdrop-blur-2xl backdrop-saturate-150 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),inset_0_-1px_1px_rgba(0,0,0,0.5),0_10px_40px_rgba(0,0,0,0.5)] rounded-[32px] p-1.5 overflow-hidden"
      >
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: "auto", opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col items-center justify-center pt-8 pb-10 gap-3"
            >
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="font-serif text-[28px] leading-none text-white font-semibold tracking-tight hover:opacity-70 transition-opacity cursor-pointer"
                  style={{ textShadow: "0 2px 10px rgba(0,0,0,0.15)" }}
                >
                  {link.label}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Control Row */}
        <motion.div layout className="flex items-center gap-1.5 w-[320px]">
          {/* Left Logo circle */}
          <div className="w-[46px] h-[46px] rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow-sm bg-black">
             <img src="/Logo.png" alt="V" className="w-full h-full object-cover scale-[1.2]" />
          </div>

          {/* Center Apply button - Pure Black */}
          <button
            onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('open-onboarding')); }}
            className="flex-1 h-[46px] bg-black hover:bg-neutral-800 text-white font-body text-[14px] font-medium rounded-full flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-colors"
          >
            Apply
          </button>

          {/* Right Open/Close button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-[46px] h-[46px] rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-black shrink-0 transition-colors shadow-sm"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </motion.div>
      </motion.div>
    </motion.nav>
  );
}
