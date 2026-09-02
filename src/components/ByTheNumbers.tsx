"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STATS = [
  { value: 10, suffix: "L+", prefix: "₹", label: "Real Funding Raised" },
  { value: 2, suffix: "", prefix: "", label: "Systems Built & Deployed" },
  { value: 0, suffix: "%", prefix: "", label: "Demo Projects. Ever." },
  { value: 100, suffix: "%", prefix: "", label: "Still Running on Campus Today" },
];

export default function ByTheNumbers() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // GSAP: counter animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      STATS.forEach((stat, idx) => {
        const el = document.getElementById(`stat-value-${idx}`);
        if (!el) return;
        const counter = { val: 0 };
        gsap.to(counter, {
          val: stat.value,
          duration: 2.5,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" },
          onUpdate: () => {
            el.textContent = `${stat.prefix}${Math.round(counter.val)}${stat.suffix}`;
          },
        });
      });

      // Video scrub
      const video = videoRef.current;
      if (video) {
        video.pause();
        const initVideo = () => {
          ScrollTrigger.create({
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5,
            onUpdate: (self) => {
              if (video.duration && isFinite(video.duration)) {
                requestAnimationFrame(() => {
                  video.currentTime = self.progress * video.duration;
                });
              }
            },
          });
        };
        if (video.readyState >= 1) initVideo();
        else video.addEventListener("loadedmetadata", initVideo, { once: true });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dashboard-bg.jpg" alt="" className="w-full h-full object-cover" />
        <video
          ref={videoRef}
          src="/dashboard-ui.mp4"
          muted playsInline preload="auto"
          className="absolute inset-0 w-full h-full object-cover opacity-0"
          onLoadedData={(e) => { (e.target as HTMLVideoElement).style.opacity = "1"; }}
        />
        {/* Strong overlay so text is readable */}
        <div className="absolute inset-0 bg-primary-container/90" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-transparent to-primary/60" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-16">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-mint-glare/60 uppercase block mb-4">
            By The Numbers
          </span>
          <h2
            className="font-hero font-bold text-surface leading-tight tracking-tight"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", letterSpacing: "-0.04em" }}
          >
            The proof is in<br />
            <span className="font-script font-normal text-secondary" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", letterSpacing: "normal" }}>
              the deployment.
            </span>
          </h2>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-surface/10 rounded-2xl overflow-hidden border border-surface/10">
          {STATS.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="text-center py-12 px-6 bg-charcoal-stone/20 backdrop-blur-sm"
            >
              <div
                id={`stat-value-${idx}`}
                className="font-hero font-bold text-surface mb-4 leading-none"
                style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)", letterSpacing: "-0.05em" }}
              >
                {stat.prefix}{stat.value}{stat.suffix}
              </div>
              <div className="font-mono text-[10px] md:text-xs font-bold tracking-[0.15em] text-mint-glare uppercase leading-relaxed">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
