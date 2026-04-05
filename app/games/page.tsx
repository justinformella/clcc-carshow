"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("@/components/games/PhaserGame"), { ssr: false });

export default function ArcadePage() {
  return <PhaserGame />;
}
