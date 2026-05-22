import Header from "@/components/Header";
import { KonamiListener } from "@/components/EightBitEasterEgg";
import Hero from "@/components/Hero";
import HeroSponsors from "@/components/HeroSponsors";
import AboutCharitySection from "@/components/AboutCharitySection";
import Winners from "@/components/Winners";
import FAQ from "@/components/FAQ";
import Gallery from "@/components/Gallery";
import SponsorsSection from "@/components/SponsorsSection";
import CommunityBanner from "@/components/CommunityBanner";
import ArcadeBanner from "@/components/ArcadeBanner";
import Footer from "@/components/Footer";

export const revalidate = 60;

export default function Home() {
  return (
    <>
      <Header />
      <KonamiListener />
      <Hero />
      <HeroSponsors />
      <Winners />
      <AboutCharitySection />
      <CommunityBanner />
      <ArcadeBanner />
      <FAQ />
      <SponsorsSection />
      <Gallery />
      <Footer />
    </>
  );
}
