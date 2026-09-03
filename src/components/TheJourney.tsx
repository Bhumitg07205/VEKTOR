"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STEPS = [
  {
    year: "2026",
    title: "The Vision Takes Shape",
    desc: "We didn't just start a project; we launched a full-scale initiative to solve real infrastructure challenges on our campus.",
    note: "origin",
  },
  {
    year: "2026",
    title: "Parking Infrastructure: Deployed",
    desc: "Secured ₹8,00,000 in funding. Fully built, tested, and live. Now delivering a seamless parking experience for all faculty members.",
    note: "₹8L funded",
  },
  {
    year: "2026",
    title: "Security System: In Development",
    desc: "Backed by ₹2,00,000. Our Visitor Pass Management system is currently under making. Not fully built yet, but preparing to upgrade campus security.",
    note: "₹2L funded",
  },
  {
    year: "2026",
    title: "An Elite Team Emerges",
    desc: "This isn't just another Thapar society. We are a high-performing team that executes relentlessly and shines at the absolute top.",
    note: "top tier",
  },
];

export default function TheJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  // Scroll-progress for the line animation
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 80%", "end 60%"],
  });
  const lineScaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // GSAP: stagger each step in as we scroll
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".journey-step").forEach((el, i) => {
        gsap.from(el, {
          opacity: 0,
          x: -40,
          duration: 1.2,
          ease: "expo.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
          delay: i * 0.05,
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="journey" ref={sectionRef} className="py-32 px-6 md:px-16 bg-surface relative overflow-hidden">
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-charcoal-stone) 1px, transparent 1px), linear-gradient(90deg, var(--color-charcoal-stone) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section header */}
        <div className="mb-20">
          <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-deep-forest uppercase block mb-5">
            The Origin
          </span>
          <h2
            className="font-hero font-bold text-absolute-black leading-[1.0] tracking-tight"
            style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)", letterSpacing: "-0.04em" }}
          >
            The Journey
          </h2>
        </div>

        {/* Timeline */}
        <div className="relative pl-6 md:pl-20">
          {/* Rail */}
          <div className="absolute left-[11px] md:left-[27px] top-2 bottom-2 w-[2px] bg-outline-variant/40" />

          {/* Animated fill */}
          <motion.div
            ref={lineRef}
            style={{ scaleY: lineScaleY }}
            className="absolute left-[11px] md:left-[27px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-deep-forest to-secondary origin-top"
          />

          <div className="space-y-20">
            {STEPS.map((step, idx) => (
              <div key={idx} className="journey-step relative">
                {/* Dot */}
                <div className="absolute -left-[18px] md:-left-[34px] top-1.5 w-[14px] h-[14px] rounded-full bg-surface border-[3px] border-deep-forest shadow-[0_0_0_4px_rgba(14,137,90,0.12)]" />

                <div className="flex flex-col md:flex-row md:items-start md:gap-12">
                  <div className="flex-1">
                    {/* Year tag */}
                    <span className="font-mono text-[10px] font-bold tracking-[0.15em] text-outline uppercase block mb-3">
                      {step.year}
                    </span>
                    <h3
                      className="font-body font-bold text-absolute-black mb-4 leading-tight"
                      style={{ fontSize: "clamp(1.4rem, 3vw, 2.25rem)" }}
                    >
                      {step.title}
                    </h3>
                    <p className="font-body text-lg text-on-surface-variant leading-relaxed max-w-lg">
                      {step.desc}
                    </p>
                  </div>

                  {/* Handwritten annotation */}
                  <div className="mt-4 md:mt-1 shrink-0">
                    <span
                      className="font-script text-2xl text-secondary inline-block"
                      style={{ transform: "rotate(-4deg)" }}
                    >
                      {step.note}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
