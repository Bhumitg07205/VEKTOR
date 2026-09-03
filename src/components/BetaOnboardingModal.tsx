"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { useGLTF, useAnimations, OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { addApplicant, updateApplicant, findApplicantByEmail, uploadResumeFile, getQueueStats } from "@/lib/firebase/db";

// 3D Model Component
function AnimalModel({ animal, userName, isCard = false }: { animal: string, userName: string, isCard?: boolean }) {
  const { scene, animations } = useGLTF(`/${animal}.glb`);
  const { actions } = useAnimations(animations, scene);

  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const firstAction = actions[Object.keys(actions)[0]];
      if (firstAction) {
        firstAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.5).play();
      }
    }
  }, [actions]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = "/origami_certificate.webp";
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#111111";
      ctx.textAlign = "center";
      ctx.font = "italic bold 60px serif";
      ctx.fillText(userName || "Pioneer", canvas.width * 0.45, canvas.height * 0.52);

      const texture = new THREE.CanvasTexture(canvas);
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;

      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.9,
            metalness: 0.1,
            color: 0xffffff,
            side: THREE.DoubleSide,
          });
        }
      });
    };
  }, [scene, userName, animal]);

  let scale = 1;
  let position: [number, number, number] = [0, 0, 0];

  if (animal === "rhino") {
    // The share card canvas is tiny and square, so it needs different scaling/positioning
    scale = isCard ? 1.6 : 2.2;
    position = isCard ? [0, -0.9, 0] : [0, -1.2, 0];
  } else if (animal === "goldfish") {
    scale = isCard ? 1.8 : 2.5;
    position = isCard ? [0, -2.0, 0] : [0, -3.5, 0];
  } else if (animal === "angelfish") {
    scale = isCard ? 1.8 : 2.5;
    position = isCard ? [0, -2.0, 0] : [0, -3.5, 0];
  }

  return (
    <primitive object={scene} scale={scale} position={position} />
  );
}

interface BetaOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail: string;
}

export default function BetaOnboardingModal({ isOpen, onClose, initialEmail }: BetaOnboardingModalProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [emailValue, setEmailValue] = useState(initialEmail || "");
  const [formData, setFormData] = useState({
    name: "",
    regNo: "",
    year: "",
    branch: "",
    whyJoin: "",
    mobile: "",
    status: "Pending",
    resume: null as File | null,
  });

  const [animal, setAnimal] = useState<"rhino" | "goldfish" | "angelfish">("rhino");

  // Interactive evaluation state
  const [evalState, setEvalState] = useState<'idle' | 'typing' | 'sending' | 'sent'>('idle');
  const [evalText, setEvalText] = useState("");
  const [submittedDocId, setSubmittedDocId] = useState<string | null>(null);
  const [queueStats, setQueueStats] = useState({ normalCount: 0, priorityCount: 0 });

  const fetchStats = async () => {
    const stats = await getQueueStats();
    setQueueStats(stats);
  };

  // Sync initialEmail prop
  useEffect(() => {
    if (initialEmail) {
      setEmailValue(initialEmail);
    }
  }, [initialEmail]);

  const getAnimalForUser = (identifier: string): "rhino" | "goldfish" | "angelfish" => {
    if (!identifier) return "rhino";
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
    }
    const animals: ("rhino" | "goldfish" | "angelfish")[] = ["rhino", "goldfish", "angelfish"];
    return animals[Math.abs(hash) % animals.length];
  };

  const checkAndHydrateUser = async (email: string) => {
    setIsCheckingExisting(true);
    try {
      const existing = await findApplicantByEmail(email);
      if (existing) {
        setFormData({
          name: existing.name || "",
          regNo: existing.regNo || "",
          year: existing.year || "",
          branch: existing.branch || "",
          whyJoin: existing.whyJoin || "",
          mobile: existing.mobile || "",
          status: existing.status || "Pending",
          resume: null,
        });
        setSubmittedDocId(existing.id);
        if (existing.isPriority) {
          setEvalState('sent');
          setEvalText(existing.evaluationRequest || "");
        }
        setAnimal(getAnimalForUser(email));
        // Direct open to the card instead of the form!
        setIsFlipped(true);
      }
    } catch (err) {
      console.error("Error finding existing application:", err);
    } finally {
      setIsCheckingExisting(false);
    }
  };

  // Check if applicant already exists when modal opens or email is present
  useEffect(() => {
    if (isOpen) {
      fetchStats();
      const emailToCheck = (initialEmail || emailValue || "").trim().toLowerCase();
      if (emailToCheck && emailToCheck.includes("@")) {
        checkAndHydrateUser(emailToCheck);
      }
    } else {
      // Reset flip when modal completely closes
      setIsFlipped(false);
      setShowShareModal(false);
      setEvalState('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialEmail]);


  const handleEmailBlur = () => {
    const clean = emailValue.trim().toLowerCase();
    if (clean && clean.includes("@")) {
      checkAndHydrateUser(clean);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const effectiveEmail = (emailValue || initialEmail || "").trim().toLowerCase();

    // Double check if existing record exists
    const existing = await findApplicantByEmail(effectiveEmail);
    if (existing) {
      setFormData({
        name: existing.name || "",
        regNo: existing.regNo || "",
        year: existing.year || "",
        branch: existing.branch || "",
        whyJoin: existing.whyJoin || "",
        mobile: existing.mobile || "",
        status: existing.status || "Pending",
        resume: null,
      });
      setSubmittedDocId(existing.id);
      if (existing.isPriority) {
        setEvalState('sent');
        setEvalText(existing.evaluationRequest || "");
      }
      setAnimal(getAnimalForUser(effectiveEmail));
      setIsFlipped(true);
      setIsSubmitting(false);
      return;
    }

    setAnimal(getAnimalForUser(effectiveEmail));
    setIsFlipped(true);

    try {
      let uploadedResumeUrl = "";
      if (formData.resume) {
        uploadedResumeUrl = await uploadResumeFile(formData.resume, formData.regNo || effectiveEmail || formData.name);
      }

      const id = await addApplicant({
        name: formData.name,
        regNo: formData.regNo,
        year: formData.year,
        branch: formData.branch,
        mobile: formData.mobile,
        email: effectiveEmail,
        whyJoin: formData.whyJoin,
        status: "Pending",
        appliedDate: new Date().toISOString(),
        isPriority: false,
        resumeUrl: uploadedResumeUrl || "",
      });
      setSubmittedDocId(id);

      // Trigger Welcome/Registered Email
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: effectiveEmail,
            applicantName: formData.name,
            status: 'Registered',
            customNote: ''
          })
        });
      } catch (emailErr) {
        console.error("Failed to trigger registration email:", emailErr);
      }
    } catch (err) {
      console.error("Failed to save application to Firestore", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPriorityActive = evalState === 'sent';

  const generateTradingCard = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Updated to match the dark premium theme
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 80px sans-serif";
    ctx.fillText(formData.name || "Pioneer", canvas.width / 2, 900);

    ctx.fillStyle = "#888888";
    ctx.font = "30px sans-serif";
    ctx.fillText("has applied to the most exclusive", canvas.width / 2, 1000);
    ctx.fillText("engineering collective in the world.", canvas.width / 2, 1050);

    ctx.font = "bold 30px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#666666";
    ctx.fillText(isPriorityActive ? "CORE.PRIORITY_QUEUE" : "CORE.PENDING", 100, 120);

    ctx.textAlign = "right";
    ctx.fillStyle = isPriorityActive ? "#eab308" : "#22c55e";
    ctx.fillText(isPriorityActive ? "#PRIORITY-01" : "#20600", canvas.width - 100, 120);

    const dataUrl = canvas.toDataURL("image/webp", 0.9);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `VEKTOR_Card_${formData.name || "Pioneer"}.webp`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl perspective-[2500px] p-2 md:p-6"
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.9, type: "spring", bounce: 0.12 }}
          className="relative w-full h-full max-w-[1400px] max-h-[95vh] min-h-[600px]"
          style={{ transformStyle: "preserve-3d", WebkitTransformStyle: "preserve-3d" }}
        >
          {/* FRONT: FORM */}
          <div
            className="absolute inset-0 rounded-[2rem] shadow-2xl"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(0deg)", pointerEvents: isFlipped ? "none" : "auto" }}
          >
            <div className="absolute inset-0 bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col md:flex-row">
            <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white z-50 transition-colors">✕</button>

            <div className="w-full md:w-3/5 p-6 md:p-20 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-white/5 bg-[#0a0a0a] relative overflow-hidden text-center shrink-0">
              <h2 className="font-hero text-5xl md:text-[5rem] text-white leading-[1.1] tracking-tight mb-2 md:mb-4 relative z-10">
                Prove Your<br /><span className="text-gray-400">Authority.</span>
              </h2>
              <p className="text-gray-400 font-body text-lg max-w-sm relative z-10 mt-4">
                Enter the core. Only the disciplined, the obsessed, and the elite are chosen.
              </p>

              {/* Disclaimer badge */}
              <div className="mt-8 relative z-10 border border-white/20 px-6 py-2 rounded-full bg-white/5 backdrop-blur-md">
                <p className="font-body text-xs text-gray-300 uppercase tracking-widest font-bold">
                  <span className="text-[#22c55e] mr-2">✓</span> We welcome all branches & specializations
                </p>
              </div>

              {/* Decorative arrows */}
              <div className="absolute bottom-[10%] left-[5%] pointer-events-none opacity-90 hidden md:flex flex-col items-center">
                <svg width="100" height="80" viewBox="0 0 100 80" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="-rotate-12 ml-10">
                  <path d="M 10 70 Q 50 40 90 20" />
                  <path d="M 90 20 L 70 20 M 90 20 L 80 40" />
                </svg>
                <span className="font-script text-[2.5rem] text-gray-300 rotate-12 mt-2">The Backbone</span>
              </div>

              <div className="absolute top-[30%] right-[2%] pointer-events-none opacity-90 hidden md:flex flex-col items-center">
                <svg width="80" height="120" viewBox="0 0 80 120" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 70 10 Q 20 60 40 110" />
                  <path d="M 40 110 L 20 100 M 40 110 L 55 95" />
                </svg>
                <span className="font-script text-[2rem] text-gray-300 -rotate-12 mt-4 ml-6">Only the obsessed</span>
              </div>
            </div>

            <div className="w-full md:w-2/5 p-6 md:p-16 flex flex-col justify-start md:justify-center overflow-y-auto custom-scrollbar bg-black relative z-20">
              {isCheckingExisting ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-400 text-xs uppercase tracking-widest font-mono">Checking Membership Core...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-md mx-auto">
                  <input
                    type="text"
                    placeholder="Full Name (Mandatory)"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-transparent border-b border-white/20 py-3 text-white font-body placeholder:text-gray-600 focus:outline-none focus:border-white transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Email Address (Mandatory)"
                    required
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    onBlur={handleEmailBlur}
                    className="w-full bg-transparent border-b border-white/20 py-3 text-white font-body placeholder:text-gray-600 focus:outline-none focus:border-white transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Roll No / Registration Number (Mandatory)"
                    required
                    value={formData.regNo}
                    onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                    className="w-full bg-transparent border-b border-white/20 py-3 text-white font-body placeholder:text-gray-600 focus:outline-none focus:border-white transition-colors"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Branch"
                      required
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full bg-transparent border-b border-white/20 py-3 text-white font-body placeholder:text-gray-600 focus:outline-none focus:border-white transition-colors"
                    />
                    <select
                      required
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full bg-transparent border-b border-white/20 py-3 text-gray-400 font-body focus:outline-none focus:border-white transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Year?</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                    </select>
                  </div>
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full bg-transparent border-b border-white/20 py-3 text-white font-body placeholder:text-gray-600 focus:outline-none focus:border-white transition-colors"
                  />
                  <textarea
                    placeholder="Why would you like to join?"
                    required
                    rows={2}
                    value={formData.whyJoin}
                    onChange={(e) => setFormData({ ...formData, whyJoin: e.target.value })}
                    className="w-full bg-transparent border-b border-white/20 py-3 text-white font-body placeholder:text-gray-600 focus:outline-none focus:border-white transition-colors resize-none"
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-500 text-xs font-body uppercase tracking-wider">Upload Resume (PDF / DOC)</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setFormData({ ...formData, resume: e.target.files?.[0] || null })}
                      className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 bg-white hover:bg-gray-200 text-black px-8 py-3.5 rounded-full font-body font-bold tracking-wide uppercase text-sm transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] w-full flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </button>
                </form>
              )}
            </div>
            </div>
          </div>

          {/* BACK: SUCCESS */}
          <div
            className="absolute inset-0 rounded-[2rem] shadow-2xl"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", pointerEvents: isFlipped ? "auto" : "none" }}
          >
            <div className="absolute inset-0 bg-[#FBFAF9] rounded-[2rem] overflow-hidden flex flex-col md:flex-row">
            {/* Dark Left Side for 3D Model */}
            <div className="w-full md:w-3/5 relative bg-[#131413] min-h-[40vh] md:min-h-0">
              <Canvas camera={{ position: [0, 0, 8], fov: 40 }} className="cursor-grab active:cursor-grabbing">
                <ambientLight intensity={1.5} />
                <directionalLight position={[10, 10, 5]} intensity={3} color="#ffffff" />
                <directionalLight position={[-10, -10, -5]} intensity={1} color="#555555" />

                {isFlipped && !showShareModal && (
                  <AnimalModel animal={animal} userName={formData.name} />
                )}

                <ContactShadows position={[0, -1.8, 0]} opacity={0.8} scale={12} blur={2} far={5} color="#000000" />
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1.5} minPolarAngle={Math.PI / 2.1} maxPolarAngle={Math.PI / 2.1} makeDefault />
              </Canvas>

              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]"></div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="absolute top-[10%] md:top-[15%] left-6 md:left-10 text-white/50 flex flex-col items-start pointer-events-none z-20"
              >
                <span className="font-script text-3xl md:text-4xl text-[#FBFAF9] -rotate-6 mb-2 drop-shadow-lg">You win, We win.</span>
                <svg width="60" height="60" viewBox="0 0 100 100" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-10 mt-2 md:w-[80px] md:h-[80px]">
                  <path d="M 20 20 C 50 20 80 50 80 80" />
                  <path d="M 80 80 L 60 70 M 80 80 L 90 60" />
                </svg>
              </motion.div>
            </div>

            {/* Light Right Side for Details */}
            <div className="w-full md:w-2/5 p-6 md:p-14 flex flex-col justify-start md:justify-center items-center text-center relative z-10 bg-[#FBFAF9] overflow-y-auto">
              <div className="w-full flex justify-end gap-4 mb-6 md:absolute md:top-8 md:right-8 md:mb-0">
                <button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 text-[#717974] hover:text-[#1A1C1C] transition-colors font-body text-[10px] md:text-xs font-bold tracking-widest uppercase">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] md:w-4 md:h-4"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                  Share Card
                </button>
                <button onClick={onClose} className="text-[#717974] hover:text-[#1A1C1C] transition-colors ml-2 md:ml-4 text-sm font-bold">✕</button>
              </div>

              <p className="font-body text-[#717974] mb-2 mt-8 md:mt-10 uppercase tracking-widest text-xs font-bold w-full max-w-[70%] mx-auto">
                Status: <span className="text-secondary">{formData.status}</span>, {formData.name}
              </p>

              {formData.status === 'Accepted' ? (
                <div className="my-3 flex flex-col items-center">
                  <div className="bg-green-500/10 border border-green-500/30 text-green-600 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 shadow-sm">
                    <span>✨</span> Welcome to the Core
                  </div>
                  <h2 className="font-hero text-6xl md:text-[6rem] text-[#1A1C1C] leading-none mb-2 drop-shadow-sm text-green-600">
                    SELECTED
                  </h2>
                  <p className="font-body text-base text-[#414944] uppercase tracking-wider font-bold">Position Secured</p>
                </div>
              ) : isPriorityActive ? (
                <div className="my-3 flex flex-col items-center">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 shadow-sm">
                    <span>⭐️</span> Priority Queue Active
                  </div>
                  <h2 className="font-hero text-6xl md:text-[6.5rem] text-[#1A1C1C] leading-none mb-2 drop-shadow-sm text-yellow-600">
                    #{String(44 + queueStats.priorityCount).padStart(2, '0')}
                  </h2>
                  <p className="font-body text-base text-[#414944] uppercase tracking-wider font-bold">Priority Line Position</p>
                </div>
              ) : (
                <>
                  <h2 className="font-hero text-6xl md:text-[7rem] text-[#1A1C1C] leading-none mb-2 drop-shadow-sm">
                    {(107 + queueStats.normalCount).toLocaleString()}
                  </h2>
                  <p className="font-body text-base text-[#414944] mb-6 uppercase tracking-wider font-semibold">Pioneers Ahead</p>
                </>
              )}

              {/* STYLISH SPAM NOTE */}
              <div className="mt-2 mb-6 px-4 py-3 bg-[#1A1C1C]/5 border border-[#1A1C1C]/10 rounded-2xl w-full flex items-start gap-3 text-left shadow-sm">
                <span className="text-lg opacity-80 mt-0.5">📨</span>
                <div>
                  <p className="font-body text-xs font-bold text-[#1A1C1C] uppercase tracking-wider mb-0.5">Check your inbox</p>
                  <p className="font-body text-[11px] text-[#717974] leading-relaxed">
                    We&apos;ve dispatched your confirmation. If you don&apos;t see it, peek into your <span className="font-bold text-[#1A1C1C]">Spam</span> folder—sometimes exclusivity gets filtered by default.
                  </p>
                </div>
              </div>

              {formData.status !== 'Accepted' && (
                <div className="flex flex-col items-center w-full max-w-sm mt-4 p-6 border border-[#E9E8E7] rounded-3xl bg-white shadow-sm transition-all duration-300">
                {evalState === 'idle' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center">
                    <p className="font-body text-xs text-[#262424] mb-4 font-semibold text-center leading-relaxed">
                      Have exceptional proof of work? Skip the line with an expedited review.
                    </p>
                    <button
                      onClick={() => setEvalState('typing')}
                      className="bg-[#262424] hover:bg-black text-[#FBFAF9] px-8 py-3 rounded-full font-body font-bold transition-transform hover:scale-105 shadow-md text-xs uppercase tracking-wider w-full"
                    >
                      Request Priority Evaluation
                    </button>
                  </motion.div>
                )}

                {evalState === 'typing' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                    <p className="font-body text-[11px] text-[#717974] mb-2 font-bold uppercase tracking-widest">Prove Your Authority</p>
                    <textarea
                      autoFocus
                      placeholder="Share your GitHub, notable projects, or achievements..."
                      value={evalText}
                      onChange={(e) => setEvalText(e.target.value)}
                      className="w-full bg-[#FBFAF9] border border-[#E9E8E7] rounded-xl p-3 text-xs font-body text-[#262424] placeholder:text-gray-400 focus:outline-none focus:border-[#262424] focus:ring-1 focus:ring-[#262424] transition-all resize-none mb-3"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEvalState('idle')}
                        className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-black uppercase tracking-wider transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          setEvalState('sending');
                          try {
                            if (submittedDocId) {
                              await updateApplicant(submittedDocId, {
                                isPriority: true,
                                evaluationRequest: evalText,
                              });
                            }
                          } catch (err) {
                            console.error("Failed to update priority request", err);
                          }
                          setEvalState('sent');
                        }}
                        disabled={evalText.trim().length === 0}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all shadow-md"
                      >
                        Submit Priority Case
                      </button>
                    </div>
                  </motion.div>
                )}

                {evalState === 'sending' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="font-body text-xs font-bold text-[#262424] uppercase tracking-widest">Encrypting Request to Core...</p>
                  </motion.div>
                )}

                {evalState === 'sent' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full flex flex-col items-center justify-center py-3">
                    <div className="w-10 h-10 bg-yellow-500/10 text-yellow-600 rounded-full flex items-center justify-center mb-2">
                      <span>⭐️</span>
                    </div>
                    <p className="font-body text-xs font-bold text-[#262424] uppercase tracking-widest mb-1">Priority Case Received</p>
                    <p className="font-body text-[11px] text-[#717974] text-center leading-normal">
                      Your profile has been elevated to the front of the queue. Evaluation response guaranteed within 24 hours.
                    </p>
                  </motion.div>
                )}
              </div>
              )}
            </div>
            </div>

          </div>
        </motion.div>
      </motion.div>

      {/* SHARE MODAL OVERLAY */}
      {showShareModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-[400px] flex flex-col items-center relative"
          >
            {/* THE TRADING CARD */}
            <div className="w-full aspect-[3/4] bg-gradient-to-b from-[#1A1C1C] to-[#0a0a0a] rounded-[2rem] p-8 border border-white/10 flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] group">

              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

              {/* Header */}
              <div className="flex justify-between items-start text-[10px] font-mono text-gray-500 font-bold z-10 tracking-widest uppercase">
                <span className={formData.status === 'Accepted' ? "text-green-400" : isPriorityActive || formData.status === 'Reviewing' || formData.status === 'Expedited' ? "text-yellow-400" : "text-white/70"}>
                  CORE.{formData.status ? formData.status.toUpperCase() : "PENDING"}
                </span>
                <span className={formData.status === 'Accepted' ? "text-green-400 font-bold" : isPriorityActive ? "text-yellow-400 font-bold" : "text-[#22c55e]"}>
                  {formData.status === 'Accepted' ? "#SELECTED" : isPriorityActive ? `#PRIORITY-${String(44 + queueStats.priorityCount).padStart(2, '0')}` : `#${(107 + queueStats.normalCount).toLocaleString()}`}
                </span>
              </div>

              {/* 3D Model Canvas */}
              <div className="flex-1 flex items-center justify-center z-10 my-4 relative w-full rounded-2xl overflow-hidden shadow-inner">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none"></div>

                <div className="w-full h-full absolute inset-0">
                  <Canvas camera={{ position: [0, 0, 5], fov: 45 }} className="cursor-grab active:cursor-grabbing">
                    <ambientLight intensity={1.5} />
                    <directionalLight position={[10, 10, 5]} intensity={3} color="#ffffff" />
                    <AnimalModel animal={animal} userName={formData.name} isCard={true} />
                    <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2.5} minPolarAngle={Math.PI / 2.1} maxPolarAngle={Math.PI / 2.1} makeDefault />
                  </Canvas>
                </div>
              </div>

              {/* Footer text */}
              <div className="text-center z-10 mb-8 mt-2">
                <h3 className="font-hero text-4xl text-white mb-3 tracking-wide drop-shadow-md">{formData.name || "Pioneer"}</h3>
                <p className="font-body text-[11px] text-gray-400 max-w-[240px] mx-auto leading-relaxed">
                  has applied to the most exclusive engineering collective in the world.
                </p>
              </div>

              {/* Footer labels */}
              <div className="flex justify-between items-end font-bold text-[10px] uppercase tracking-widest text-gray-600 z-10">
                <span className="text-white/50">VEKTOR</span>
                <span className={formData.status === 'Accepted' ? "text-green-400 border border-green-400/30 px-2 py-1 rounded bg-green-400/10" : isPriorityActive || formData.status === 'Reviewing' || formData.status === 'Expedited' ? "text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded bg-yellow-400/10" : "text-white/50 border border-white/20 px-2 py-1 rounded"}>
                  STATUS: {formData.status ? formData.status.toUpperCase() : "PENDING"}
                </span>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex gap-3 mt-8 w-full px-2">
              <button onClick={() => alert("Copied to clipboard!")} className="flex-1 bg-[#1A1C1C] hover:bg-black text-white border border-white/10 py-4 rounded-full font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg hover:border-white/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                Copy Link
              </button>
              <button onClick={generateTradingCard} className="flex-1 bg-white hover:bg-gray-200 text-black py-4 rounded-full font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download
              </button>
              <button onClick={() => setShowShareModal(false)} className="w-[52px] h-[52px] bg-[#1A1C1C] border border-white/10 hover:border-white/30 text-white rounded-full flex items-center justify-center transition-all shadow-lg flex-shrink-0">
                ✕
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
