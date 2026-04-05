import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CLCC Arcade | Crystal Lake Cars & Caffeine",
  description: "Race registered show cars in a retro arcade-style drag race powered by Phaser.",
  openGraph: {
    title: "CLCC Arcade",
    description: "Race registered show cars in a retro arcade drag race.",
    type: "website",
  },
};

export default function ArcadeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <style>{`
        .arcade-page {
          background-color: #0d0d1a;
          min-height: 100vh;
          font-family: 'Press Start 2P', monospace;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
      `}</style>
      <div className="arcade-page">{children}</div>
    </>
  );
}
