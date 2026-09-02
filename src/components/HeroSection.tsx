"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STATES = [
  {
    line1: "Stop playing with demos.",
    line2: "start shipping reality.",
  },
  {
    line1: "No mockups. No hackathons.",
    line2: "real systems running 24/7.",
  },
  {
    line1: "Funded by the college.",
    line2: "VEKTOR.",
  },
];

/**
 * SplitWord 
 * No overflow: hidden, NO clip path, NO padding bottoms. 
 * Just pure spans. We will animate opacity, y, and blur.
 * This guarantees zero clipping of fonts ever.
 */
const SplitWord = ({
  text,
  wordClass = "word",
}: {
  text: string;
  wordClass?: string;
}) => (
  <span style={{ display: "inline" }}>
    {text.split(" ").map((word, i) => (
      <span
        key={i}
        className={`${wordClass} inline-block`}
        style={{ willChange: "transform, opacity", opacity: 0 }}
      >
        {word}&nbsp;
      </span>
    ))}
  </span>
);

const FRAME_COUNT = 240;
const currentFrame = (index: number) => 
  `/newhero-sequence/frame_${(index + 1).toString().padStart(4, '0')}.webp`;

export default function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgWrapperRef = useRef<HTMLDivElement>(null);

  const state0Ref = useRef<HTMLDivElement>(null);
  const state1Ref = useRef<HTMLDivElement>(null);
  const state2Ref = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Preload images
  useEffect(() => {
    // We only strictly need to preload the first few frames to show immediately, 
    // the rest will be fetched as they scroll, or we can preload all if we want.
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = currentFrame(i);
    }
  }, []);

  useGSAP(() => {
    const isMobile = window.innerWidth < 768;

    // ── CANVAS SETUP ──────────────────────────────────────────────────────
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const images: HTMLImageElement[] = [];

    if (canvas && context) {
      // Load first frame immediately
      const firstImg = new Image();
      firstImg.src = currentFrame(0);
      firstImg.onload = () => {
        canvas.width = firstImg.width;
        canvas.height = firstImg.height;
        context.drawImage(firstImg, 0, 0);
      };

      // Create image objects for all frames so we can draw them instantly on update
      for (let i = 0; i < FRAME_COUNT; i++) {
        const img = new Image();
        img.src = currentFrame(i);
        images.push(img);
      }
    }

    // ── LOAD-IN ──────────────────────────────────────────────────────────
    gsap.fromTo(
      ".hero-badge",
      { y: -30, opacity: 0, filter: "blur(8px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.2, ease: "power3.out", delay: 0.2 }
    );

    gsap.fromTo(
      state0Ref.current?.querySelectorAll(".word") || [],
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.1, stagger: 0.06, ease: "power3.out", delay: 0.4 }
    );
    gsap.fromTo(
      state0Ref.current?.querySelectorAll(".script-word") || [],
      { y: 40, opacity: 0, filter: "blur(10px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.3, stagger: 0.07, ease: "power3.out", delay: 0.65 }
    );

    // ── SCROLL TIMELINE ───────────────────────────────────────────────────
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: isMobile ? "+=3000" : "+=4500",
        scrub: 1.0, // Tighter scrub for canvas
        pin: true,
        anticipatePin: 1,
      },
    });

    // Animate canvas frames
    tl.to({ frame: 0 }, {
      frame: FRAME_COUNT - 1,
      snap: "frame",
      ease: "none",
      duration: 10,
      onUpdate: function() {
        if (!canvas || !context) return;
        const frameIndex = Math.round(this.targets()[0].frame);
        if (images[frameIndex]) {
          context.drawImage(images[frameIndex], 0, 0);
        }
      }
    }, 0);

    // Background: zoom in → then shrink + round at end
    tl.to(bgWrapperRef.current, { scale: 1.12, ease: "none", duration: 8 }, 0);
    tl.to(bgWrapperRef.current, { scale: 0.9, borderRadius: "36px", ease: "power3.inOut", duration: 2 }, 8);
    tl.to(overlayRef.current, { opacity: 0.88, ease: "none", duration: 8 }, 0);
    tl.to(gridRef.current, { opacity: 0.55, ease: "none", duration: 8 }, 0);

    // ── STATE 0 EXIT ──
    tl.fromTo(state0Ref.current?.querySelectorAll(".word") || [], 
      { y: 0, opacity: 1, filter: "blur(0px)", immediateRender: false },
      { y: -50, opacity: 0, filter: "blur(4px)", stagger: 0.03, duration: 0.9, ease: "power2.inOut" },
      1.5
    );
    tl.fromTo(state0Ref.current?.querySelectorAll(".script-word") || [],
      { y: 0, opacity: 1, filter: "blur(0px)", immediateRender: false },
      { y: -40, opacity: 0, filter: "blur(10px)", duration: 0.8, ease: "power2.inOut" },
      1.6
    );

    // ── STATE 1 ENTER ──
    tl.fromTo(
      state1Ref.current?.querySelectorAll(".word") || [],
      { y: 50, opacity: 0, filter: "blur(4px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", stagger: 0.05, duration: 1.1, ease: "power3.out" },
      3.0
    );
    tl.fromTo(
      state1Ref.current?.querySelectorAll(".script-word") || [],
      { y: 40, opacity: 0, filter: "blur(10px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", stagger: 0.06, duration: 1.2, ease: "power3.out" },
      3.2
    );

    // ── STATE 1 EXIT ──
    tl.to(state1Ref.current?.querySelectorAll(".word") || [], {
      y: -50, opacity: 0, filter: "blur(4px)",
      stagger: 0.025, duration: 0.9, ease: "power2.inOut",
    }, 5.8);
    tl.to(state1Ref.current?.querySelectorAll(".script-word") || [], {
      y: -40, opacity: 0, filter: "blur(10px)",
      duration: 0.8, ease: "power2.inOut",
    }, 5.9);

    // ── STATE 2 ENTER ──
    tl.fromTo(
      state2Ref.current?.querySelectorAll(".script-word") || [],
      { y: 40, opacity: 0, filter: "blur(10px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", stagger: 0.07, duration: 1.3, ease: "power3.out" },
      7.2
    );
    tl.fromTo(
      state2Ref.current?.querySelectorAll(".word") || [],
      { y: 50, opacity: 0, filter: "blur(8px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", stagger: 0.08, duration: 1.5, ease: "expo.out" },
      7.5
    );

    // Watermark + CTA
    tl.fromTo(
      watermarkRef.current,
      { opacity: 0, scale: 0.7 },
      { opacity: 0.05, scale: 1, duration: 2, ease: "power2.out" },
      7.5
    );
    tl.fromTo(
      ".hero-cta",
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" },
      8.4
    );
  }, { scope: containerRef });

  return (
    <section
      ref={containerRef}
      className="relative bg-black w-full"
      style={{ height: "100vh" }}
    >
      <div className="absolute inset-0 w-full h-full">

        {/* ── MASTER BACKGROUND ── */}
        <div
          ref={bgWrapperRef}
          className="absolute inset-0 z-0 origin-center will-change-transform overflow-hidden bg-black"
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover scale-[1.05]"
          />
          {/* Bottom gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/95 pointer-events-none" />

          {/* Tech grid */}
          <div
            ref={gridRef}
            className="absolute inset-0 z-[1] pointer-events-none opacity-15"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)`,
              backgroundSize: "72px 72px",
              maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            }}
          />

          {/* Vignette overlay */}
          <div
            ref={overlayRef}
            className="absolute inset-0 z-[2] pointer-events-none"
            style={{
              opacity: 0.35,
              background:
                "radial-gradient(circle at 50% 40%, transparent 0%, rgba(0,0,0,0.75) 100%), linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 35%, rgba(0,0,0,0.5) 75%, #000 100%)",
            }}
          />
        </div>

        {/* ── TOP BADGE ── */}
        <div className="absolute top-8 md:top-10 left-0 right-0 flex justify-center z-40 pointer-events-none">
          <div className="hero-badge flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse shadow-[0_0_10px_rgba(56,162,81,0.9)]" />
            <span className="font-mono text-[9px] md:text-[11px] font-bold tracking-[0.22em] text-white/85 uppercase">
              VEKTOR &middot; System Online
            </span>
          </div>
        </div>

        {/* ── TEXT LAYERS ── */}
        <div className="absolute inset-0 flex items-center justify-center z-30 px-4 md:px-10 text-center pointer-events-none overflow-visible">

          {/* STATE 0 */}
          <div ref={state0Ref} className="absolute w-full max-w-[88rem] flex flex-col items-center overflow-visible">
            <h1
              className="font-hero font-bold text-white leading-[1.0] text-[clamp(2.5rem,11vw,10rem)] tracking-tight"
              style={{ textShadow: "0 8px 40px rgba(0,0,0,0.8)" }}
            >
              <SplitWord text={STATES[0].line1} wordClass="word" />
            </h1>
            <div className="font-script text-secondary leading-[1.0] text-[clamp(1.8rem,8.5vw,7.5rem)] mt-2 md:mt-4 -rotate-2 overflow-visible">
              <SplitWord text={STATES[0].line2} wordClass="script-word" />
            </div>
          </div>

          {/* STATE 1 */}
          <div ref={state1Ref} className="absolute w-full max-w-[88rem] flex flex-col items-center overflow-visible">
            <h1
              className="font-hero font-bold text-white leading-[1.0] text-[clamp(2.5rem,10vw,9.5rem)] tracking-tight"
              style={{ textShadow: "0 8px 40px rgba(0,0,0,0.8)" }}
            >
              <SplitWord text={STATES[1].line1} wordClass="word" />
            </h1>
            <div className="font-script text-secondary leading-[1.0] text-[clamp(1.8rem,8.5vw,7.5rem)] mt-2 md:mt-4 -rotate-1 overflow-visible">
              <SplitWord text={STATES[1].line2} wordClass="script-word" />
            </div>
          </div>

          {/* STATE 2 */}
          <div ref={state2Ref} className="absolute w-full max-w-[100rem] flex flex-col items-center overflow-visible">
            <div className="font-script text-secondary leading-[1.0] text-[clamp(1.8rem,6.5vw,5.5rem)] mb-1 md:mb-4 -rotate-3 overflow-visible">
              <SplitWord text={STATES[2].line1} wordClass="script-word" />
            </div>
            <h1
              className="font-hero font-black text-white leading-[0.9] text-[clamp(3.5rem,18vw,16rem)] tracking-tighter uppercase"
              style={{ textShadow: "0 20px 80px rgba(0,0,0,0.95)" }}
            >
              <SplitWord text={STATES[2].line2} wordClass="word" />
            </h1>
            <div className="hero-cta mt-10 md:mt-16 pointer-events-auto">
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('open-onboarding')); }}
                className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-black font-body text-sm md:text-[15px] font-extrabold rounded-full overflow-hidden transition-all duration-500 hover:scale-[1.03] shadow-[0_0_50px_rgba(255,255,255,0.12)] hover:shadow-[0_0_80px_rgba(255,255,255,0.35)]"
              >
                <span className="relative z-10 group-hover:text-white transition-colors duration-500">ENTER VEKTOR</span>
                <div className="absolute inset-0 bg-black scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
              </a>
            </div>
          </div>

        </div>

        {/* ── WATERMARK ── */}
        <div ref={watermarkRef} className="absolute inset-0 flex items-center justify-center z-[15] pointer-events-none overflow-hidden">
          <h1 className="font-hero font-bold text-white leading-none select-none tracking-tighter mix-blend-overlay text-[clamp(18rem,50vw,800px)] whitespace-nowrap">
            VKTR
          </h1>
        </div>

      </div>
    </section>
  );
}
