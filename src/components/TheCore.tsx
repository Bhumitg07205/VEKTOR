"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const FOUNDERS = [
  { name: "Bhumit Gupta", role: "President & Vision Lead", desc: "Sets the absolute direction. Owns the final outcome.", img: "/Bhumit.jpg", email: "bgupta1_be23@thapar.edu" },
  { name: "Siddharth Sharma", role: "Chief Technology Officer & Strategy", desc: "The force that ensures the vision actually gets executed.", img: "/Siddharth.png", email: "ssharma16_be23@thapar.edu" },
  { name: "Pranjal Garg", role: "Chief Design Officer", desc: "Architects the system. Makes it look like it belongs in the future.", img: "/pranjal.png", email: "pgarg6_be23@thapar.edu" },
  { name: "Manraj Singh", role: "Chief Operations Officer", desc: "The engine. Keeps every single moving part in perfect sync.", img: "/manraj.jpeg", email: "msingh6_be23@thapar.edu" },
];

const MENTORS = [
  { name: "Neeru Jindal", role: "Associate Head OF ECED", desc: "The catalyst. She is everything to us—backed the vision before it even existed.", img: "/Neeru.png" },
  { name: "Amanpreet Singh", role: "Technical Mentor", desc: "The architectural guiding hand that helped turn our raw concepts into a deployed reality.", img: "/Amanpreet.jpg" },
  { name: "Gurbinder Singh", role: "Registrar & Head", desc: "The supreme administrative authority and foundation of the initiative.", img: "/Gurbinder.png" },
  { name: "NP Singh", role: "Head of Commercial, Thapar", desc: "The absolute backbone of our resources and foundational supporter.", img: "" },
  { name: "Abhinav Sharma", role: "Head of Administration", desc: "Turns high-level approvals into immediate on-ground action.", img: "/Abhinav%20Sharma.jpg" },
];

function PortraitCard({ member, idx, large = false }: { member: typeof FOUNDERS[0]; idx: number; large?: boolean }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!cardRef.current || !imgRef.current) return;
    const ctx = gsap.context(() => {
      // Entrance animation
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 60,
        rotation: Math.random() * 4 - 2,
        duration: 1.2,
        ease: "back.out(1.2)",
        scrollTrigger: {
          trigger: cardRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        delay: idx * 0.15,
      });

      // Hover Parallax/Crazy Effect
      const card = cardRef.current;
      const img = imgRef.current;
      
      if (card && img) {
        card.addEventListener("mouseenter", () => {
          gsap.to(img, { scale: 1.15, rotation: Math.random() * 6 - 3, duration: 0.6, ease: "power3.out" });
          gsap.to(card, { y: -10, duration: 0.4, ease: "power2.out", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" });
        });
        card.addEventListener("mouseleave", () => {
          gsap.to(img, { scale: 1.0, rotation: 0, duration: 0.6, ease: "power3.out" });
          gsap.to(card, { y: 0, duration: 0.4, ease: "power2.out", boxShadow: "none" });
        });
      }
    });
    return () => ctx.revert();
  }, [idx]);

  return (
    <a
      href={`mailto:${member.email}`}
      ref={cardRef}
      className="group block cursor-pointer"
      style={{ perspective: "1000px" }}
    >
      <div
        className={`relative w-full bg-surface-container rounded-3xl overflow-hidden mb-7 border border-outline-variant/30 group-hover:border-secondary transition-colors duration-500`}
        style={{ aspectRatio: large ? "4/5" : "1/1", transformStyle: "preserve-3d" }}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-[#f0f0f0] pointer-events-none -z-10">
          <span
            className="font-hero font-bold text-charcoal-stone/15"
            style={{ fontSize: "clamp(4rem, 12vw, 8rem)", letterSpacing: "-0.06em" }}
          >
            {member.name.split(' ').map(n => n[0]).join('')}
          </span>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={member.img}
          alt={member.name}
          className="absolute inset-0 z-20 w-full h-full object-cover object-top origin-center will-change-transform filter contrast-[1.05]"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />

        <div className="absolute z-30 inset-0 bg-gradient-to-t from-charcoal-stone/90 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none mix-blend-multiply" />
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-secondary opacity-0 group-hover:opacity-100 transition-all duration-500 scale-0 group-hover:scale-100 z-40 shadow-[0_0_10px_rgba(56,162,81,1)]" />

        <div className="absolute z-30 inset-x-0 bottom-0 p-4 sm:p-6 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out">
           <span className="text-white font-mono text-[8px] sm:text-[10px] tracking-widest uppercase flex items-center gap-2">
             Connect <span className="text-secondary">→</span>
           </span>
        </div>
      </div>

      <h3
        className="font-body font-extrabold text-absolute-black mb-1 md:mb-1.5 leading-tight group-hover:text-secondary transition-colors duration-300"
        style={{ fontSize: "clamp(1rem, 2.5vw, 1.7rem)" }}
      >
        {member.name}
      </h3>
      <div className="font-mono text-[8px] md:text-[10px] font-bold text-deep-forest uppercase tracking-[0.12em] mb-2 md:mb-3 leading-tight">
        {member.role}
      </div>
      <p className="font-body text-[13px] md:text-base text-on-surface-variant leading-relaxed line-clamp-3 md:line-clamp-none">
        {member.desc}
      </p>
    </a>
  );
}

export default function TheCore() {
  const sectionRef = useRef<HTMLElement>(null);
  const mentorContainerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const { scrollYProgress: mentorScroll } = useScroll({
    target: mentorContainerRef,
    offset: ["start 90%", "start 10%"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [-50, 100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [150, -50]);
  
  const mentorWidth = useTransform(mentorScroll, [0, 1], ["90%", "100%"]);
  const mentorBorderRadius = useTransform(mentorScroll, [0, 1], ["4rem", "0rem"]);

  return (
    <section id="core" ref={sectionRef} className="py-32 bg-surface relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(var(--color-charcoal-stone) 1.5px, transparent 1.5px)",
          backgroundSize: "30px 30px",
        }}
      />

      {/* Decorative Scribbles (Framer Motion Parallax) */}
      <motion.div style={{ y: y1 }} className="absolute top-20 left-10 md:left-32 pointer-events-none z-0 hidden md:block opacity-80">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-secondary/80 drop-shadow-md">
          <path d="M10.5 90.5C35 85 85 65 105 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <path d="M85 15C95 18 102 20 105 20C105 20 102 28 100 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <div className="font-script text-3xl text-deep-forest/80 -rotate-12 translate-x-4 -translate-y-4 shadow-sm">
          Unmatched Synergy
        </div>
      </motion.div>

      <motion.div style={{ y: y2 }} className="absolute top-[40%] right-10 md:right-24 pointer-events-none z-0 hidden md:block opacity-80">
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-secondary/80 drop-shadow-md -scale-x-100">
          <path d="M10 80C40 90 70 60 90 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <path d="M70 15C82 18 88 20 90 20C90 20 88 28 85 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <div className="font-script text-3xl text-deep-forest/80 rotate-12 -translate-x-12 translate-y-4 shadow-sm">
          Absolute Mastery
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 md:px-16 relative z-10">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
          className="mb-24 md:text-center relative z-20"
        >
          <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-deep-forest uppercase block mb-5">
            Leadership
          </span>
          <h2
            className="font-hero font-bold text-absolute-black leading-[1.0] tracking-tight mb-6"
            style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)", letterSpacing: "-0.04em" }}
          >
            The Core
          </h2>
          <p className="font-body text-xl md:text-2xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            Yes, hierarchy follows. We are disciplined. <br />
            <span className="font-script text-secondary text-4xl mt-2 inline-block">Execution over everything.</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-24 md:mb-40 relative z-20">
          {FOUNDERS.map((f, i) => (
            <PortraitCard key={f.name} member={f} idx={i} large />
          ))}
        </div>
      </div>

      <div ref={mentorContainerRef} className="w-full flex justify-center relative z-20 mt-10">
        <motion.div
          style={{ width: mentorWidth, borderRadius: mentorBorderRadius }}
          className="bg-[#070707] px-6 py-20 md:p-32 overflow-hidden border border-white/5 shadow-2xl relative"
        >
          
          {/* Subtle cinematic glowing orb */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-secondary/15 rounded-full blur-[120px] pointer-events-none z-0" />
          
          {/* Decorative Scribbles with Parallax inside the dark section */}
          <div className="absolute top-10 left-4 md:left-20 pointer-events-none z-10 opacity-80 hidden md:block">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-secondary drop-shadow-[0_0_15px_rgba(56,162,81,0.5)]">
              <path d="M10.5 90.5C35 85 85 65 105 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              <path d="M85 15C95 18 102 20 105 20C105 20 102 28 100 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <div className="font-script text-3xl md:text-4xl text-white/90 -rotate-12 translate-x-4 -translate-y-4 shadow-sm">
              Supreme Authority
            </div>
          </div>

          <div className="absolute bottom-10 right-4 md:right-20 pointer-events-none z-10 opacity-80 hidden md:block">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-secondary drop-shadow-[0_0_15px_rgba(56,162,81,0.5)] -scale-x-100">
              <path d="M10 80C40 90 70 60 90 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              <path d="M70 15C82 18 88 20 90 20C90 20 88 28 85 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <div className="font-script text-3xl md:text-4xl text-white/90 rotate-12 -translate-x-12 translate-y-4 shadow-sm">
              The Backbone
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-24 md:text-center relative z-20"
          >
            <span className="font-script text-5xl md:text-7xl text-secondary block mb-6 drop-shadow-[0_0_20px_rgba(56,162,81,0.3)]">Guided By</span>
            <p className="font-body text-white/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              The faculty and administration who backed the vision with immense power and unwavering trust.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 max-w-6xl mx-auto relative z-20">
            {MENTORS.map((mentor, idx) => (
              <motion.div
                key={mentor.name}
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: idx * 0.1, ease: "easeOut" }}
                className="flex flex-row items-center sm:items-start gap-4 sm:gap-8 bg-white/[0.04] border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-10 hover:bg-white/[0.08] hover:border-secondary/50 hover:shadow-[0_30px_60px_-15px_rgba(56,162,81,0.25)] transition-all duration-500 group backdrop-blur-sm"
              >
                <div className="w-20 h-20 sm:w-32 sm:h-32 shrink-0 rounded-full overflow-hidden bg-black/50 border-2 border-white/10 group-hover:border-secondary relative transition-colors duration-500 shadow-2xl">
                  <div className="w-full h-full relative overflow-hidden rounded-full shadow-inner transition-transform duration-700 group-hover:scale-110">
                    
                    <div className="absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-700 opacity-100">
                      <span className="font-hero text-2xl sm:text-4xl font-bold text-white/20 select-none tracking-tighter">
                        {mentor.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>

                    {mentor.img && mentor.img.length > 0 && (
                      <img
                        src={mentor.img}
                        alt={mentor.name}
                        className="absolute inset-0 w-full h-full object-cover z-20 filter contrast-110 saturate-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                  </div>
                </div>
                <div className="text-left pt-1 sm:pt-2">
                  <h4 className="font-body text-xl sm:text-3xl font-extrabold text-white mb-1 sm:mb-2 group-hover:text-secondary transition-colors duration-300 tracking-tight">{mentor.name}</h4>
                  <div className="font-mono text-[9px] sm:text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-2 sm:mb-4">{mentor.role}</div>
                  <p className="font-body text-[13px] sm:text-base text-white/60 leading-snug sm:leading-relaxed group-hover:text-white/80 transition-colors duration-300">{mentor.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

