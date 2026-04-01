import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HeroSponsors from "@/components/HeroSponsors";
import AboutCharitySection from "@/components/AboutCharitySection";
import ScheduleAwards from "@/components/ScheduleAwards";
import SpectatorBanner from "@/components/SpectatorBanner";
import WeatherPolicy from "@/components/WeatherPolicy";
import FAQ from "@/components/FAQ";
import Gallery from "@/components/Gallery";
import SponsorsSection from "@/components/SponsorsSection";
import Footer from "@/components/Footer";
import StickyRegisterBar from "@/components/StickyRegisterBar";

export default function Home() {
  return (
    <>
      <Header />
      <StickyRegisterBar />
      <Hero />
      <HeroSponsors />
      <AboutCharitySection />
      <ScheduleAwards />
      <SpectatorBanner />
      <WeatherPolicy />
      <FAQ />
      <SponsorsSection />
      <Gallery />
      <Footer />
    </>
  );
}
