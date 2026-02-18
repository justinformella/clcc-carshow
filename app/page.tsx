import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AboutCharitySection from "@/components/AboutCharitySection";
import ScheduleAwards from "@/components/ScheduleAwards";
import SpectatorBanner from "@/components/SpectatorBanner";
import WeatherPolicy from "@/components/WeatherPolicy";
import FAQ from "@/components/FAQ";
import Gallery from "@/components/Gallery";
import SponsorsSection from "@/components/SponsorsSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <AboutCharitySection />
      <ScheduleAwards />
      <SpectatorBanner />
      <WeatherPolicy />
      <FAQ />
      <Gallery />
      <SponsorsSection />
      <Footer />
    </>
  );
}
