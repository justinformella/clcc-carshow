import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CharitySection from "@/components/CharitySection";
import SpectatorBanner from "@/components/SpectatorBanner";
import RegistrationSection from "@/components/RegistrationSection";
import AboutSection from "@/components/AboutSection";
import ScheduleAwards from "@/components/ScheduleAwards";
import SponsorsSection from "@/components/SponsorsSection";
import WeatherPolicy from "@/components/WeatherPolicy";
import FAQ from "@/components/FAQ";
import Gallery from "@/components/Gallery";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <CharitySection />
      <SpectatorBanner />
      <RegistrationSection />
      <AboutSection />
      <ScheduleAwards />
      <SponsorsSection />
      <WeatherPolicy />
      <FAQ />
      <Gallery />
      <Footer />
    </>
  );
}
