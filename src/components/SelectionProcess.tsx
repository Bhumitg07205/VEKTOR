"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";

const BENEFITS = [
  { num: "01", title: "Real Ownership", desc: "You work on the next funded, deployed project — not a mock assignment or a hackathon side-quest." },
  { num: "02", title: "Direct Mentorship", desc: "Learn straight from the founders of two funded, campus-deployed systems. Not a senior-year TA." },
  { num: "03", title: "Administration Access", desc: "Work alongside the same Thapar administration that funds and greenlights our projects." },
  { num: "04", title: "A Portfolio That Proves It", desc: "Walk out with real, live work — not a GitHub repo nobody ever funded or used." },
];

export default function SelectionProcess() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Giant text animation
  const revealScale = useTransform(scrollYProgress, [0, 0.3], [0.5, 1.1]);
  const revealY = useTransform(scrollYProgress, [0, 0.3], ["10vh", "-5vh"]);

  return (
    <section ref={sectionRef} className="relative bg-surface" style={{ minHeight: "350vh" }}>
      
      {/* ── Sticky Background Area ── */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center z-10 border-t border-outline-variant/20">
        
        {/* Subtle noise */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "128px",
          }}
        />

        {/* Header Text */}
        <div className="absolute top-24 left-0 right-0 text-center z-20 pointer-events-none">
          <p className="font-body text-base md:text-lg text-charcoal-stone/60 mb-2">
            we don&apos;t take everyone.
          </p>
          <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-deep-forest uppercase block mb-8">
            Membership
          </span>
          <h3 className="font-hero font-bold text-absolute-black" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)", letterSpacing: "-0.03em" }}>
            We don&apos;t mass hire.
          </h3>
        </div>

        {/* GIANT "WE SELECT" watermark (Behind everything else, but scales up) */}
        <motion.div
          style={{ scale: revealScale, y: revealY }}
          className="absolute z-10 pointer-events-none select-none flex items-center justify-center w-full h-full"
        >
          <h2
            className="font-hero font-bold text-absolute-black/90 leading-[0.8] text-center"
            style={{ fontSize: "clamp(6rem, 24vw, 300px)", letterSpacing: "-0.06em" }}
          >
            WE<br />SELECT.
          </h2>
        </motion.div>

        {/* Bottom floating annotations */}
        <div className="absolute bottom-16 left-8 md:left-24 z-20 pointer-events-none">
          <p className="font-script text-2xl md:text-3xl text-secondary opacity-80" style={{ transform: "rotate(-2deg)" }}>
            real ownership only works in small numbers.
          </p>
        </div>
        <div className="absolute bottom-24 right-8 md:right-24 z-20 pointer-events-none">
          <p className="font-script text-xl md:text-2xl text-secondary opacity-80" style={{ transform: "rotate(-5deg)" }}>
            if you&apos;re in, you ship.
          </p>
        </div>
      </div>

      {/* ── Scrolling Foreground Content (Cards) ── */}
      <div className="relative z-30 pt-[100vh] pb-32 max-w-7xl mx-auto px-6 md:px-16">
        
        {/* We use a spacer to let the user enjoy the scaled up text before cards arrive */}
        <div className="h-[50vh]" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start relative">
          
          {/* Left Column (Sticky CTA) */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 lg:pb-32">
            <div className="bg-surface/60 backdrop-blur-md border border-surface/30 p-8 rounded-3xl shadow-xl">
              <h4 className="font-hero font-bold text-absolute-black text-2xl mb-4">
                We Don&apos;t Run Open Drives.
              </h4>
              <p className="font-body text-base text-charcoal-stone leading-relaxed mb-8">
                Every cycle, we pick a handful of juniors because real ownership only works in small numbers. If you&apos;re in, you&apos;re on the next funded build.
              </p>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('open-onboarding'));
                }}
                className="inline-flex items-center gap-3 px-8 py-4 text-sm font-bold text-surface bg-absolute-black rounded-full hover:bg-deep-forest transition-colors duration-300 shadow-lg"
              >
                Apply to Be Selected
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column (Cards overlapping the text) */}
          <div className="lg:col-span-7 space-y-6 lg:pb-64">
            {BENEFITS.map((b, idx) => (
              <motion.div
                key={b.num}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ margin: "-15%" }}
                transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.1 }}
                className="bg-surface/70 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-8 md:p-10 shadow-2xl hover:bg-surface/90 transition-all duration-300"
              >
                <div className="flex items-start gap-6">
                  <span className="font-mono text-xs font-bold text-outline tracking-widest mt-1 shrink-0">
                    {b.num}
                  </span>
                  <div>
                    <h5 className="font-hero font-bold text-absolute-black text-xl mb-3">{b.title}</h5>
                    <p className="font-body text-charcoal-stone leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>

    </section>
  );
}
