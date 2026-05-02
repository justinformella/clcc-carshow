import Header from "@/components/Header";
import { KonamiListener } from "@/components/EightBitEasterEgg";
import Hero from "@/components/Hero";
import HeroSponsors from "@/components/HeroSponsors";
import AboutCharitySection from "@/components/AboutCharitySection";
import ScheduleAwards from "@/components/ScheduleAwards";
import SpectatorBanner from "@/components/SpectatorBanner";
import WeatherPolicy from "@/components/WeatherPolicy";
import FAQ from "@/components/FAQ";
import Gallery from "@/components/Gallery";
import SponsorsSection from "@/components/SponsorsSection";
import CommunityBanner from "@/components/CommunityBanner";
import ArcadeBanner from "@/components/ArcadeBanner";
import Footer from "@/components/Footer";
import StickyRegisterBar from "@/components/StickyRegisterBar";

export default function Home() {
  return (
    <>
      <Header />
      <KonamiListener />
      <StickyRegisterBar />
      <Hero />
      <HeroSponsors />
      <AboutCharitySection />
      <ScheduleAwards />
      <SpectatorBanner />
      <CommunityBanner />
      <ArcadeBanner />
      <WeatherPolicy />
      <FAQ />
      <SponsorsSection />
      <Gallery />
      <Footer />
    </>
  );
}
