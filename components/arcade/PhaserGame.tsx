"use client";

import { useEffect, useRef } from "react";

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let game: Phaser.Game | null = null;

    Promise.all([
      import("phaser"),
      import("@/components/arcade/scenes/BootScene"),
      import("@/components/arcade/scenes/TitleScene"),
      import("@/components/arcade/scenes/SelectScene"),
      import("@/components/arcade/scenes/MatchupScene"),
      import("@/components/arcade/scenes/RaceScene"),
    ]).then(([Phaser, { BootScene }, { TitleScene }, { SelectScene }, { MatchupScene }, { RaceScene }]) => {
      // Use actual screen size so text renders crisp at native resolution
      const w = containerRef.current!.clientWidth;
      const h = containerRef.current!.clientHeight;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: w,
        height: h,
        parent: containerRef.current!,
        backgroundColor: "#0d0d1a",
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [BootScene, TitleScene, SelectScene, MatchupScene, RaceScene],
      });

      // Pass env vars into the game registry so scenes can use them
      game.registry.set("supabaseUrl", process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    });

    return () => {
      if (game) game.destroy(true);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
