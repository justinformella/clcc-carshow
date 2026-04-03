"use client";

import { useEffect, useRef } from "react";

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let game: Phaser.Game | null = null;

    import("phaser").then((Phaser) => {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: containerRef.current!,
        backgroundColor: "#0d0d1a",
        pixelArt: true,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [],
      });
    });

    return () => {
      if (game) game.destroy(true);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", maxWidth: "800px", aspectRatio: "800/600" }}
    />
  );
}
