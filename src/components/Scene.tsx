"use client";

import { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, MeshTransmissionMaterial, Float } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function GlassObject() {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetRotation = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates from -1 to 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      // Target rotation based on mouse
      targetRotation.current.x = y * 0.8;
      targetRotation.current.y = x * 0.8;
    };

    window.addEventListener("mousemove", handleMouseMove);
    
    // Scroll Integration via GSAP Context to avoid killing other triggers
    const ctx = gsap.context(() => {
      if (meshRef.current) {
        // Create a timeline linked to the overall scroll of the page
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: document.body,
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
          }
        });

        // As we scroll, bring the object very close to the camera and rotate it heavily
        tl.to(meshRef.current.position, {
          z: 6, // Moves towards camera
          y: -2,
          ease: "power2.inOut",
        }, 0);

        tl.to(meshRef.current.rotation, {
          z: Math.PI * 2,
          ease: "none",
        }, 0);
      }
    });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      ctx.revert();
    };
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Base slow rotation
      meshRef.current.rotation.x += delta * 0.15;
      meshRef.current.rotation.y += delta * 0.2;
      
      // Add mouse inertia distortion smoothly
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, meshRef.current.rotation.x + targetRotation.current.x, 0.05);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, meshRef.current.rotation.y + targetRotation.current.y, 0.05);
    }
  });

  return (
    <Float speed={2.5} rotationIntensity={1.5} floatIntensity={2}>
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[1.4, 0.45, 256, 64]} />
        <MeshTransmissionMaterial
          backside
          samples={4}
          thickness={1.5}
          chromaticAberration={1.5}
          anisotropy={0.3}
          distortion={0.6}
          distortionScale={0.4}
          temporalDistortion={0.2}
          ior={1.5}
          color="#ffffff"
          attenuationDistance={1}
          attenuationColor="#ffffff"
        />
      </mesh>
    </Float>
  );
}

export default function Scene() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={2} />
        <directionalLight position={[-10, -10, -5]} intensity={1.5} color="#38bdf8" />
        <directionalLight position={[0, -10, 0]} intensity={1} color="#818cf8" />
        <GlassObject />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
