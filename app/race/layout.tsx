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
  return <>{children}</>;
}
