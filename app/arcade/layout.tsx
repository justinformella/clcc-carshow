import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CLCC Car Show Race Mode | Crystal Lake Cars & Caffeine",
  description:
    "Race registered show cars in a retro arcade-style drag race. Pick your ride, hold to accelerate, and see who crosses the finish line first.",
  openGraph: {
    title: "CLCC Car Show Race Mode",
    description:
      "Race registered show cars in a retro arcade-style drag race at Crystal Lake Cars & Caffeine.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CLCC Car Show Race Mode | CLCC",
    description:
      "Race registered show cars in a retro arcade-style drag race.",
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
