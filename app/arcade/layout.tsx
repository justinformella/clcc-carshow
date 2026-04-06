import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CLCC Arcade — Redline Motor Condos | Crystal Lake Cars & Caffeine",
  description:
    "Drag race, cruise, hit the dyno, and detail your ride in retro 8-bit style. Pick from real registered show cars at Crystal Lake Cars & Caffeine.",
  openGraph: {
    title: "CLCC Arcade — Redline Motor Condos",
    description:
      "Drag race, cruise, hit the dyno, and detail your ride in retro 8-bit arcade style.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CLCC Arcade — Redline Motor Condos",
    description:
      "Drag race, cruise, hit the dyno, and detail your ride in retro 8-bit arcade style.",
  },
};

export default function RaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <style>{`
        .race-8bit {
          background-color: #0d0d1a;
          min-height: 100vh;
          font-family: 'Press Start 2P', monospace;
          color: #ffffff;
          position: relative;
        }
        .race-8bit::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.07) 2px,
            rgba(0, 0, 0, 0.07) 4px
          );
        }
      `}</style>
      <div className="race-8bit">{children}</div>
    </>
  );
}
