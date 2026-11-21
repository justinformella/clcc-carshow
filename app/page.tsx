import type { Metadata } from "next";
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
import SaveTheDate from "@/components/SaveTheDate";

export const revalidate = 60;

// Off-season placeholder. Flip to false to restore the full homepage
// (2026 recap: winners, gallery, sponsors) once 2027 registration opens.
const SHOW_SAVE_THE_DATE = true;

export const metadata: Metadata = SHOW_SAVE_THE_DATE
  ? {
      title: "Save the Date: May 16, 2027 | Crystal Lake Cars & Caffeine",
      description:
        "Save the date! The Crystal Lake Cars & Caffeine Charity Car Show returns to Historic Downtown Crystal Lake on Sunday, May 16, 2027 (rain date May 23). 100% of net proceeds go to the Crystal Lake Food Pantry.",
      openGraph: {
        title: "Save the Date: Sunday, May 16, 2027",
        description:
          "Crystal Lake Cars & Caffeine Charity Car Show in Historic Downtown Crystal Lake. 100% of net proceeds go to the Crystal Lake Food Pantry.",
        images: [
          {
            url: "/images/2027/og-save-the-date.jpg",
            width: 1200,
            height: 630,
            alt: "Save the Date: Crystal Lake Charity Car Show, Sunday, May 16, 2027",
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Save the Date: Sunday, May 16, 2027",
        description:
          "Crystal Lake Cars & Caffeine Charity Car Show in Historic Downtown Crystal Lake.",
        images: ["/images/2027/og-save-the-date.jpg"],
      },
    }
  : {};

export default function Home() {
  if (SHOW_SAVE_THE_DATE) {
    return (
      <SaveTheDate />
    );
  }

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
