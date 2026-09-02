import FloatingNav from "@/components/FloatingNav";
import HeroSection from "@/components/HeroSection";
import ProofMarquee from "@/components/ProofMarquee";
import TheJourney from "@/components/TheJourney";
import OurScope from "@/components/OurScope";
import ByTheNumbers from "@/components/ByTheNumbers";
import TheCore from "@/components/TheCore";
import SelectionProcess from "@/components/SelectionProcess";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative">
      <FloatingNav />
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
