import Phaser from "phaser";
import { RaceCar } from "../physics";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    const { width, height } = this.scale;

    // Loading bar
    const barW = 300;
    const barH = 16;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    this.add.rectangle(width / 2, barY, barW + 4, barH + 4, 0x333333);
    const fill = this.add.rectangle(barX + 2, barY, 0, barH, 0xffd700).setOrigin(0, 0.5);

    this.add.text(width / 2, barY - 30, "LOADING...", {
      fontFamily: "'Press Start 2P'",
      fontSize: "10px",
      color: "#aaaaaa",
    }).setOrigin(0.5);

    this.load.on("progress", (value: number) => {
      fill.setSize(barW * value, barH);
    });
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2, "LOADING CARS...", {
      fontFamily: "'Press Start 2P'",
      fontSize: "10px",
      color: "#ffd700",
    }).setOrigin(0.5);

    // Fetch car data from API
    fetch("/api/race")
      .then((r) => r.json())
      .then((data) => {
        const cars: RaceCar[] = (data.cars || []).map((c: Record<string, unknown>) => ({
          ...c,
          pixelArt: c.pixelArt || null,
          pixelDash: c.pixelDash || null,
          pixelRear: c.pixelRear || null,
          aiImage: c.aiImage || null,
        }));

        // Store cars in the registry so all scenes can access them
        this.registry.set("cars", cars);
        this.scene.start("TitleScene");
      })
      .catch(() => {
        this.registry.set("cars", []);
        this.scene.start("TitleScene");
      });
  }
}
