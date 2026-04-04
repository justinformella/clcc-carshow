import Phaser from "phaser";
import { TrackData } from "../track";
import { lakefrontTrack } from "../tracks/lakefront";

const TRACKS: TrackData[] = [lakefrontTrack];
const TOTAL_SLOTS = 3;

export class TrackSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "TrackSelectScene" });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0d0d1a");

    // Header
    this.add.text(width / 2, 20, "CLCC ARCADE", {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#aaaaaa", letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, 44, "CHOOSE YOUR TRACK", {
      fontFamily: "'Press Start 2P'", fontSize: "20px", color: "#ffd700",
    }).setOrigin(0.5);

    // Card layout
    const cardW = Math.min(340, (width - 80) / Math.min(TOTAL_SLOTS, 3));
    const cardH = 120;
    const totalW = TOTAL_SLOTS * cardW + (TOTAL_SLOTS - 1) * 20;
    const startX = (width - totalW) / 2 + cardW / 2;
    const cardY = height / 2 - 20;

    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const x = startX + i * (cardW + 20);
      const track = TRACKS[i] || null;
      this.createTrackCard(track, x, cardY, cardW, cardH);
    }

    // Back button
    const backText = this.add.text(width / 2, height - 50, "PICK DIFFERENT CAR", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#555555",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backText.on("pointerover", () => backText.setColor("#aaaaaa"));
    backText.on("pointerout", () => backText.setColor("#555555"));
    backText.on("pointerdown", () => this.scene.start("SelectScene"));
  }

  private createTrackCard(track: TrackData | null, x: number, y: number, cardW: number, cardH: number) {
    if (!track) {
      // Coming soon placeholder
      const bg = this.add.rectangle(x, y, cardW, cardH, 0x0d0d1a)
        .setStrokeStyle(1, 0x333333);
      this.add.text(x, y - 10, "COMING", {
        fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#333333",
      }).setOrigin(0.5);
      this.add.text(x, y + 8, "SOON", {
        fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#333333",
      }).setOrigin(0.5);
      // suppress unused warning
      void bg;
      return;
    }

    // Background card
    const bg = this.add.rectangle(x, y, cardW, cardH, 0x0d1a2e)
      .setStrokeStyle(2, 0x444444)
      .setInteractive({ useHandCursor: true });

    // Track name
    this.add.text(x, y - cardH / 2 + 14, track.name, {
      fontFamily: "'Press Start 2P'", fontSize: "16px", color: "#ffd700",
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(x, y - cardH / 2 + 34, track.subtitle, {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#aaaaaa",
      wordWrap: { width: cardW - 16 }, align: "center",
    }).setOrigin(0.5);

    // Mini track preview (60px tall area)
    const previewW = 80;
    const previewH = 60;
    const previewX = x - cardW / 2 + previewW / 2 + 8;
    const previewY = y + 16;

    this.drawMiniTrack(track, previewX, previewY, previewW, previewH);

    // Target time
    const mins = Math.floor(track.targetTimeSec / 60);
    const secs = track.targetTimeSec % 60;
    const timeStr = `TARGET: ${mins}:${secs.toString().padStart(2, "0")}`;
    this.add.text(x + 8, previewY + previewH / 2 - 6, timeStr, {
      fontFamily: "'Press Start 2P'", fontSize: "9px", color: "#444444",
    }).setOrigin(0.5);

    // Hover / click
    bg.on("pointerover", () => bg.setStrokeStyle(2, 0xffd700));
    bg.on("pointerout", () => bg.setStrokeStyle(2, 0x444444));
    bg.on("pointerdown", () => {
      this.registry.set("selectedTrack", track);
      this.scene.start("MatchupScene");
    });
  }

  private drawMiniTrack(track: TrackData, cx: number, cy: number, previewW: number, previewH: number) {
    const wps = track.waypoints;
    if (wps.length < 2) return;

    // Find bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const wp of wps) {
      if (wp.x < minX) minX = wp.x;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.y < minY) minY = wp.y;
      if (wp.y > maxY) maxY = wp.y;
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scaleX = (previewW - 8) / rangeX;
    const scaleY = (previewH - 8) / rangeY;
    const scale = Math.min(scaleX, scaleY);

    const toScreen = (wp: { x: number; y: number }) => ({
      sx: cx - previewW / 2 + 4 + (wp.x - minX) * scale,
      sy: cy - previewH / 2 + 4 + (wp.y - minY) * scale,
    });

    // Draw lines between waypoints
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x4488ff, 0.8);
    graphics.beginPath();
    const first = toScreen(wps[0]);
    graphics.moveTo(first.sx, first.sy);
    for (let i = 1; i < wps.length; i++) {
      const p = toScreen(wps[i]);
      graphics.lineTo(p.sx, p.sy);
    }
    graphics.strokePath();

    // Green dot at start
    const start = toScreen(wps[0]);
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillCircle(start.sx, start.sy, 2);

    // Red dot at end
    const end = toScreen(wps[wps.length - 1]);
    graphics.fillStyle(0xff0000, 1);
    graphics.fillCircle(end.sx, end.sy, 2);
  }
}
