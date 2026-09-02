"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Lock scrolling while loading
    document.body.style.overflow = "hidden";
    
    // Simulate loading time (you can adjust this)
    const timer = setTimeout(() => {
      setIsLoading(false);
      document.body.style.overflow = "unset";
    }, 2000);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 1, ease: "easeInOut", delay: 0.3 } 
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#17965F] overflow-hidden"
        >
          {/* Subtle Grain Overlay for texture */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")'
            }}
          />

          {/* Logo Animation with Dramatic Zoom Through */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ 
              scale: 60, 
              opacity: 0,
              filter: "blur(10px)",
              transition: { duration: 1.2, ease: [0.76, 0, 0.24, 1] } 
            }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center gap-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/Logo.png" 
              alt="VEKTOR" 
              className="h-16 md:h-24 w-auto object-contain drop-shadow-2xl" 
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
