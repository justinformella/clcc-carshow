import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CLCC Car Show | 8-Bit Edition",
  description:
    "Crystal Lake Cars & Caffeine — 8-Bit Edition. May 17, 2026 in Downtown Crystal Lake.",
};

export default function Layout8Bit({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .page-8bit {
          background-color: #0d0d1a;
          min-height: 100vh;
          font-family: 'Press Start 2P', monospace;
          color: #ffffff;
          position: relative;
        }
        .page-8bit::after {
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
      <div className="page-8bit">{children}</div>
    </>
  );
}
