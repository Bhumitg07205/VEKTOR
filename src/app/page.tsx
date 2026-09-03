import FloatingNav from "@/components/FloatingNav";
import HeroSection from "@/components/HeroSection";
import ProofMarquee from "@/components/ProofMarquee";
import TheJourney from "@/components/TheJourney";
import OurScope from "@/components/OurScope";
import ByTheNumbers from "@/components/ByTheNumbers";
import TheCore from "@/components/TheCore";
import SelectionProcess from "@/components/SelectionProcess";
import Footer from "@/components/Footer";
import Preloader from "@/components/Preloader";

export default function Home() {
  return (
    <main className="relative">
      {/* 
        Wrapping these components in static divs isolates them. 
        Preloader uses AnimatePresence which mutates the DOM when it unmounts. 
        If it sits directly inside <main> alongside other complex components, 
        it corrupts React's sibling pointers and causes the 'insertBefore' crash! 
      */}
      <div><Preloader /></div>
      <div><FloatingNav /></div>
      <HeroSection />
      <ProofMarquee />
      <TheJourney />
      <OurScope />
      <ByTheNumbers />
      <TheCore />
      <SelectionProcess />
      <Footer />
    </main>
  );
}
