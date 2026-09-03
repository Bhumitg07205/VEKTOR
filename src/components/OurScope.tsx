"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Zap, ShieldCheck } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const PROJECTS = [
  {
    id: "parking",
    num: "01",
    title: ["Smart", "Parking"],
    category: "Hardware & IoT",
    year: "2023",
    tagline: "No more circling. Every spot, tracked.",
    desc: "Geomagnetic sensors under every slot. ANPR cameras at every gate. A real-time dashboard that tells you where to park — before you even enter campus.",
    funding: "₹8L",
    impact: "3,000+",
    impactLabel: "daily users",
    stack: ["React", "Node.js", "Python", "MQTT"],
    video: "/thproject1.mp4",
    icon: Zap,
    themeBg: "#050806",
  },
  {
    id: "security",
    num: "02",
    title: ["Gate", "Security"],
    category: "Computer Vision",
    year: "2024",
    tagline: "Every entry. Every exit. Authorized.",
    desc: "Face-authenticated gates at every campus entry and exit. One integrated system — authorization, threat detection, access logs. Nobody walks in unless approved.",
    funding: "₹2L",
    impact: "24×7",
    impactLabel: "coverage",
    stack: ["OpenCV", "TensorFlow", "PostgreSQL", "Next.js"],
    video: "/thproject2.mp4",
    icon: ShieldCheck,
    themeBg: "#07090b",
  },
];

export default function OurScope() {
  const headerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleCaseStudyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowPopup(true);

    // Slight delay to ensure DOM is updated before animating
    setTimeout(() => {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" });
      gsap.fromTo(popupRef.current,
        { scale: 0.8, opacity: 0, y: 40 },
        { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.5)", delay: 0.1 }
      );
    }, 10);
  };

  const closePopup = () => {
    gsap.to(popupRef.current, { scale: 0.8, opacity: 0, y: 40, duration: 0.3, ease: "power2.in" });
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.3, ease: "power2.in", delay: 0.1, onComplete: () => setShowPopup(false) });
  };

  useEffect(() => {
    if (!pinRef.current) return;

    const ctx = gsap.context((self) => {
      // ── 1. HEADER REVEAL ──
      if (headerRef.current) {
        gsap.from(headerRef.current.querySelectorAll(".sr"), {
          y: 40,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
          },
        });
      }

      // ── DOM SELECTION ──
      const panels = self.selector!('.project-panel');
      if (panels.length < 2) return;

      const p1 = panels[0];
      const p2 = panels[1];
      const q1 = gsap.utils.selector(p1);
      const q2 = gsap.utils.selector(p2);

      // ── 2. PROJECT 1 TEXT ENTRY (Cinematic 3D) ──
      gsap.fromTo(q1('.anim-up'),
        { z: 500, scale: 1.5, opacity: 0, y: 150, filter: "blur(10px)" },
        {
          z: 0, scale: 1, opacity: 1, y: 0, filter: "blur(0px)", stagger: 0.06, duration: 1.5, ease: "expo.out",
          scrollTrigger: {
            trigger: pinRef.current,
            start: "top 75%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // ── 3. SCRUB WIPE (P1 -> P2) ──
      const masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          start: "top top",
          end: "+=150%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        }
      });

      masterTl.addLabel("wipe");

      // P1 TEXT Exits (Cinematic 3D - flies forward into camera)
      // FIX: Added immediateRender: false to prevent this tween from fighting with the Entry tween on load
      masterTl.fromTo(q1('.anim-up'),
        { z: 0, scale: 1, opacity: 1, y: 0, filter: "blur(0px)" },
        { z: 600, scale: 2, opacity: 0, y: -100, filter: "blur(20px)", stagger: 0.05, duration: 1.5, ease: "power3.in", immediateRender: false },
        "wipe"
      );

      // P2 Wipes In
      masterTl.fromTo(p2,
        { top: "100%", borderRadius: "40px", boxShadow: "0 -40px 80px rgba(0,0,0,0.9)" },
        { top: "0%", borderRadius: "0px", duration: 1.5, ease: "power3.inOut" },
        "wipe"
      );

      // P2 TEXT Enters (Cinematic 3D)
      masterTl.fromTo(q2('.anim-up'),
        { z: 500, scale: 1.5, opacity: 0, y: 150, filter: "blur(10px)" },
        { z: 0, scale: 1, opacity: 1, y: 0, filter: "blur(0px)", stagger: 0.06, duration: 1.5, ease: "expo.out" },
        "wipe+=0.5"
      );

    }, pinRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="scope" className="bg-[#050806] rounded-t-[40px] -mt-[40px] pt-12 relative z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">

      {/* ── STATIC HEADER ── */}
      <div ref={headerRef} className="max-w-[1440px] mx-auto px-8 md:px-16 lg:px-24 pt-20 pb-4 relative z-30">
        <p className="sr font-mono text-[11px] text-secondary/60 tracking-[0.4em] uppercase mb-4">
          002 — Selected Work
        </p>
        <h2 className="sr font-hero font-bold text-white leading-[0.9] tracking-[-0.04em] mb-2" style={{ fontSize: "clamp(3.5rem, 8vw, 7rem)" }}>
          What we
        </h2>
        <h2 className="sr font-script text-secondary/40 leading-[1] ml-2 md:ml-6" style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}>
          actually shipped.
        </h2>
        <div className="sr h-px bg-white/10 mt-10 w-full max-w-sm" />
      </div>

      {/* ── PINNED ARENA ── */}
      <div ref={pinRef} className="h-screen w-full relative overflow-hidden bg-[#050806]">

        {PROJECTS.map((project, i) => {
          const Icon = project.icon;
          return (
            <div
              key={project.id}
              className="project-panel absolute w-full h-full flex items-center justify-center pt-4 pb-12"
              style={{
                backgroundColor: project.themeBg,
                zIndex: i,
                top: i === 0 ? "0%" : "100%",
                left: 0,
                right: 0,
                perspective: "2000px",
              }}
            >
              {/* CRITICAL FIX: Restored transformStyle: "preserve-3d" ONLY to the grid and text columns.
                  This ensures the text flies in actual 3D space, but leaves the video untouched so it doesn't lag! */}
              <div className="w-full max-w-[1440px] mx-auto px-5 md:px-16 lg:px-24 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 lg:gap-20 items-center relative z-10 h-full overflow-y-auto lg:overflow-visible custom-scrollbar" style={{ transformStyle: "preserve-3d" }}>

                {/* ── LEFT: TEXT (3D ENABLED) ── */}
                <div className="flex flex-col justify-center mt-4 lg:mt-0" style={{ transformStyle: "preserve-3d" }}>

                  <div className="anim-up flex items-center gap-4 mb-4 md:mb-6">
                    <span className="font-mono text-sm text-white font-bold tracking-[0.2em]">{project.num}</span>
                    <span className="w-10 h-px bg-white/20" />
                    <span className="flex items-center gap-2 font-mono text-[10px] text-white/50 tracking-[0.15em] uppercase">
                      <Icon size={12} className="text-white/70" />
                      {project.category}
                    </span>
                  </div>

                  <div className="mb-4 md:mb-6" style={{ transformStyle: "preserve-3d" }}>
                    <h2 className="anim-up font-hero font-bold text-white leading-[0.92] tracking-[-0.03em] pb-1" style={{ fontSize: "clamp(3rem, 7vw, 6.5rem)" }}>
                      {project.title[0]}
                    </h2>
                    <h2 className="anim-up font-hero font-bold text-secondary leading-[0.92] tracking-[-0.03em] pb-2" style={{ fontSize: "clamp(3rem, 7vw, 6.5rem)" }}>
                      {project.title[1]}
                    </h2>
                  </div>

                  <p className="anim-up font-script text-white/50 text-2xl md:text-4xl mb-4 md:mb-8 -rotate-2 ml-2">
                    {project.tagline}
                  </p>

                  <p className="anim-up font-body text-white/60 text-[13px] md:text-base leading-[1.6] md:leading-[1.85] max-w-md mb-6 md:mb-10">
                    {project.desc}
                  </p>

                  <div className="anim-up flex items-center gap-6 md:gap-8 mb-6 md:mb-10">
                    <div>
                      <div className="font-hero font-bold text-white text-2xl md:text-4xl leading-none">{project.funding}</div>
                      <div className="font-mono text-[8px] md:text-[9px] text-white/30 tracking-[0.2em] uppercase mt-1 md:mt-2">Funded</div>
                    </div>
                    <div className="w-px h-10 md:h-12 bg-white/10" />
                    <div>
                      <div className="font-hero font-bold text-white text-2xl md:text-4xl leading-none">{project.impact}</div>
                      <div className="font-mono text-[8px] md:text-[9px] text-white/30 tracking-[0.2em] uppercase mt-1 md:mt-2">{project.impactLabel}</div>
                    </div>
                  </div>

                  <div className="anim-up flex flex-wrap items-center gap-4">
                    {project.stack.map((t) => (
                      <span key={t} className="px-3 py-1.5 rounded-full text-[11px] font-mono text-white/40 border border-white/10 bg-white/[0.03] backdrop-blur-md">
                        {t}
                      </span>
                    ))}
                    <a href="#" onClick={handleCaseStudyClick} className="group ml-auto inline-flex items-center gap-3 cursor-pointer pl-4">
                      <span className="font-body text-sm font-semibold text-white/70 group-hover:text-white transition-colors duration-300">
                        View Case Study
                      </span>
                      <span className="w-10 h-10 rounded-full bg-white/5 border border-white/20 flex items-center justify-center group-hover:bg-white transition-all duration-300">
                        <ArrowUpRight size={16} className="text-white group-hover:text-black transition-colors" />
                      </span>
                    </a>
                  </div>
                </div>

                {/* ── RIGHT: VIDEO (3D DISABLED FOR PERFORMANCE) ── */}
                <div className="w-full flex items-center justify-center relative pb-12 lg:pb-0">
                  <video
                    src={project.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-auto rounded-[24px] shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/10 bg-black"
                  />
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* ── BOTTOM TRANSITION ── */}
      <div className="h-40 bg-gradient-to-b from-[#07090b] to-surface relative z-10" />

      {/* ── CASE STUDY POPUP ── */}
      {showPopup && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 opacity-0"
          onClick={closePopup}
        >
          <div
            ref={popupRef}
            className="bg-surface border border-black/10 rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-[0_20px_80px_rgba(0,0,0,0.2)] relative text-center opacity-0 scale-90"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closePopup}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors text-black"
            >
              ✕
            </button>

            <div className="mb-6 mx-auto flex w-16 h-16 rounded-full bg-secondary/10 items-center justify-center">
              <Zap className="text-secondary" size={32} />
            </div>

            <h3 className="font-hero font-bold text-absolute-black text-3xl md:text-5xl mb-4 leading-tight">
              Oops!
            </h3>

            <p className="font-body text-black/70 text-lg md:text-xl mb-8 leading-relaxed">
              To know about this, learn, & apply your brains, you need to apply in Vektor.<br />
              <span className="text-deep-forest font-semibold block mt-4 text-2xl font-script">Join the Vektor team!</span>
            </p>

            <button
              onClick={(e) => {
                e.preventDefault();
                closePopup();
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('open-onboarding'));
                }, 300);
              }}
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-black text-white font-body font-bold text-sm tracking-wide uppercase hover:scale-105 transition-transform"
            >
              Apply Now
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
