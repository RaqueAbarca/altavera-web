import FoundersSection from "@/components/nosotros/FoundersSection";
import AboutHero from "@/components/nosotros/AboutHero";
import TeamSection from "@/components/nosotros/TeamSection";
import MissionVision from "@/components/nosotros/MissionVision";
import CommitmentSection from "@/components/nosotros/CommitmentSection";
import "./nosotros.css";

export default function NosotrosPage(){
  return(
    <main className="nosotros-page">
      <FoundersSection />
      <AboutHero />
      <TeamSection />
      <MissionVision />
      <CommitmentSection />
    </main>
  );
}
