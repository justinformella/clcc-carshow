"use client";

import { useEffect, useRef } from "react";
import { RaceCar } from "./types";

type Props = {
  selectedCar?: RaceCar;
};

export default function PhaserGame({ selectedCar }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let game: Phaser.Game | null = null;

    Promise.all([
      import("phaser"),
      import("@/components/games/scenes/BootScene"),
      import("@/components/games/scenes/TitleScene"),
      import("@/components/games/scenes/SelectScene"),
      import("@/components/games/scenes/TrackSelectScene"),
      import("@/components/games/scenes/MatchupScene"),
      import("@/components/games/scenes/RaceScene"),
    ]).then(([Phaser, { BootScene }, { TitleScene }, { SelectScene }, { TrackSelectScene }, { MatchupScene }, { RaceScene }]) => {
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
        scene: [BootScene, TitleScene, SelectScene, TrackSelectScene, MatchupScene, RaceScene],
      });

      game.registry.set("supabaseUrl", process.env.NEXT_PUBLIC_SUPABASE_URL || "");

      if (selectedCar) {
        game.registry.set("playerCar", selectedCar);
        game.registry.set("skipToTrackSelect", true);
      }
    });

    return () => {
      if (game) game.destroy(true);
    };
  }, [selectedCar]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
