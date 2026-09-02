"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const NAV_LINKS = [
  { label: "Journey", href: "#journey" },
  { label: "Scope", href: "#scope" },
  { label: "Core", href: "#core" },
];

export default function FloatingNav() {
  const { scrollYProgress } = useScroll();

  // Slides up after first 3% scroll
  const navY = useTransform(scrollYProgress, [0, 0.03], [80, 0]);
  const navOpacity = useTransform(scrollYProgress, [0, 0.03], [0, 1]);

  // Active section tracking
  const navRef = useRef<HTMLDivElement>(null);

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
      <div className="flex items-center gap-3 bg-charcoal-stone/95 backdrop-blur-2xl border border-surface/[0.08] rounded-full px-3 py-2.5 shadow-[0_8px_40px_rgba(0,0,0,0.4)] pointer-events-auto">

        {/* Brand mark */}
        <div className="h-8 flex items-center justify-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.png" alt="VEKTOR" className="h-full w-auto object-contain" />
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-4 bg-surface/10 mx-1" />

        {/* Nav links */}
        <div className="hidden sm:flex items-center">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-body text-[13px] font-medium text-surface/50 hover:text-surface px-3 py-1.5 rounded-full hover:bg-surface/[0.08] transition-all duration-200 cursor-pointer"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-surface/10 mx-1" />

        {/* Apply CTA */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('open-onboarding')); }}
          className="inline-flex items-center gap-2 bg-surface text-charcoal-stone font-body text-[13px] font-bold px-4 py-2 rounded-full hover:bg-mint-glare transition-colors duration-200 cursor-pointer shadow-sm"
        >
          Apply
          <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </motion.nav>
  );
}
