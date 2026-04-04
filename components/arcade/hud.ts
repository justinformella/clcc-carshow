import Phaser from "phaser";
import { CarState } from "./topdown-physics";
import { TrackData, raceProgress } from "./track";
import { RaceCar } from "./types";

// ---------------------------------------------------------------------------
// Colour constants
// ---------------------------------------------------------------------------

const GOLD = "#FFD700";
const WHITE = "#FFFFFF";
const GREY = "#AAAAAA";
const RED = "#FF4444";

// Car dot colours on minimap (index 0 = player)
const DOT_COLORS = [0xffd700, 0xff4444, 0x4488ff, 0x44cc44];

// ---------------------------------------------------------------------------
// Ordinal helper
// ---------------------------------------------------------------------------

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

// ---------------------------------------------------------------------------
// RaceHUD
// ---------------------------------------------------------------------------

export class RaceHUD {
  private scene: Phaser.Scene;
  private track: TrackData;

  // HUD element references
  private positionText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

  private minimapBg!: Phaser.GameObjects.Rectangle;
  private minimapGfx!: Phaser.GameObjects.Graphics;

  private cockpitBg!: Phaser.GameObjects.Rectangle;
  private speedText!: Phaser.GameObjects.Text;
  private tachGfx!: Phaser.GameObjects.Graphics;
  private gearText!: Phaser.GameObjects.Text;

  // Minimap geometry – computed once in create()
  private mmX!: number;  // top-left X of minimap in screen coords
  private mmY!: number;  // top-left Y of minimap in screen coords
  private mmSize = 120;
  private mmPad = 6;     // inner padding inside the bg rect

  constructor(scene: Phaser.Scene, track: TrackData) {
    this.scene = scene;
    this.track = track;
  }

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  create(): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    // ---- 1. Position indicator (top-left) -----------------------------------
    this.positionText = this.scene.add
      .text(12, 12, "1st / 4", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "14px",
        color: GOLD,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(200);

    // ---- 2. Timer (top-center) ----------------------------------------------
    this.timerText = this.scene.add
      .text(W / 2, 12, "0.00", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "14px",
        color: WHITE,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(200);

    // ---- 3. Minimap (top-right) ---------------------------------------------
    const mmMargin = 12;
    this.mmX = W - this.mmSize - mmMargin;
    this.mmY = mmMargin;

    this.minimapBg = this.scene.add
      .rectangle(
        this.mmX - 4,
        this.mmY - 4,
        this.mmSize + 8,
        this.mmSize + 8,
        0x000000,
        0.55
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(199);

    this.minimapGfx = this.scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(200);

    // ---- 4. Cockpit overlay (bottom 12%) ------------------------------------
    const cockpitH = Math.round(H * 0.12);
    const cockpitY = H - cockpitH;

    this.cockpitBg = this.scene.add
      .rectangle(0, cockpitY, W, cockpitH, 0x111111, 0.72)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(198);

    const textMidY = cockpitY + cockpitH / 2;

    this.speedText = this.scene.add
      .text(W / 2, textMidY, "0 MPH", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "16px",
        color: GOLD,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(200);

    // Tach graphics – positioned left of speed text (reserved for future use)
    this.tachGfx = this.scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(200);

    this.gearText = this.scene.add
      .text(W / 2 + 100, textMidY, "", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "12px",
        color: GREY,
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(200);

    // Draw static minimap track path once
    this._drawMinimapTrack();
  }

  // -------------------------------------------------------------------------
  // update — called every frame from RaceScene
  // -------------------------------------------------------------------------

  update(player: CarState, allCars: CarState[], elapsedMs: number): void {
    const total = allCars.length;

    // --- Position ---
    const playerProgress = raceProgress(this.track, player.x, player.y);
    let ahead = 0;
    for (const car of allCars) {
      if (car === player) continue;
      if (raceProgress(this.track, car.x, car.y) > playerProgress) ahead++;
    }
    const pos = ahead + 1;
    this.positionText.setText(`${ordinal(pos)} / ${total}`);

    // --- Timer ---
    const secs = elapsedMs / 1000;
    this.timerText.setText(secs.toFixed(2));

    // --- Speed ---
    const mph = Math.round(player.mph);
    this.speedText.setText(`${mph} MPH`);

    // --- Minimap ---
    this._updateMinimap(allCars);
  }

  // -------------------------------------------------------------------------
  // showFinishPosition — call once when race ends
  // -------------------------------------------------------------------------

  showFinishPosition(position: number, total: number): void {
    const color = position === 1 ? GOLD : RED;
    this.positionText.setText(`${ordinal(position)} / ${total}`);
    this.positionText.setColor(color);
    this.positionText.setFontSize(20);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** Draw the static track path on the minimap background layer. */
  private _drawMinimapTrack(): void {
    if (!this.track.waypoints.length) return;

    const { scale, offsetX, offsetY } = this._minimapTransform();

    // Draw path as grey polyline
    this.minimapGfx.lineStyle(1, 0x888888, 0.8);
    this.minimapGfx.beginPath();

    const first = this.track.waypoints[0];
    this.minimapGfx.moveTo(
      this.mmX + offsetX + first.x * scale,
      this.mmY + offsetY + first.y * scale
    );
    for (let i = 1; i < this.track.waypoints.length; i++) {
      const wp = this.track.waypoints[i];
      this.minimapGfx.lineTo(
        this.mmX + offsetX + wp.x * scale,
        this.mmY + offsetY + wp.y * scale
      );
    }
    // Close the loop back to start
    this.minimapGfx.lineTo(
      this.mmX + offsetX + first.x * scale,
      this.mmY + offsetY + first.y * scale
    );

    this.minimapGfx.strokePath();
  }

  /** Redraws car dots on the minimap each frame. */
  private _updateMinimap(allCars: CarState[]): void {
    // Clear previous dots (keep track path drawn beneath by re-drawing everything)
    this.minimapGfx.clear();

    // Redraw track path
    this._drawMinimapTrack();

    const { scale, offsetX, offsetY } = this._minimapTransform();

    // Draw a dot for each car; index 0 is the player
    for (let i = 0; i < allCars.length; i++) {
      const car = allCars[i];
      const color = DOT_COLORS[i] ?? 0xffffff;
      const radius = i === 0 ? 4 : 3;

      const dotX = this.mmX + offsetX + car.x * scale;
      const dotY = this.mmY + offsetY + car.y * scale;

      this.minimapGfx.fillStyle(color, 1);
      this.minimapGfx.fillCircle(dotX, dotY, radius);
    }
  }

  /**
   * Computes the scale + offset to fit all track waypoints inside the
   * minimap square (with inner padding).
   */
  private _minimapTransform(): { scale: number; offsetX: number; offsetY: number } {
    const wps = this.track.waypoints;
    if (!wps.length) return { scale: 1, offsetX: 0, offsetY: 0 };

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const wp of wps) {
      if (wp.x < minX) minX = wp.x;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.y < minY) minY = wp.y;
      if (wp.y > maxY) maxY = wp.y;
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const drawSize = this.mmSize - this.mmPad * 2;
    const scale = Math.min(drawSize / rangeX, drawSize / rangeY);

    // Centre the scaled track inside the minimap
    const scaledW = rangeX * scale;
    const scaledH = rangeY * scale;
    const offsetX = this.mmPad + (drawSize - scaledW) / 2 - minX * scale;
    const offsetY = this.mmPad + (drawSize - scaledH) / 2 - minY * scale;

    return { scale, offsetX, offsetY };
  }
}
