"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("@/components/arcade/PhaserGame"), { ssr: false });

export default function ArcadePage() {
  return <PhaserGame />;
}
