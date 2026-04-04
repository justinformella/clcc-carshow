import Phaser from "phaser";
import type { TrackData } from "./track";

/** Convert a CSS hex string like "#cc4444" or "cc4444" to a Phaser number. */
function hexToNum(hex: string): number {
  return parseInt(hex.replace(/^#/, ""), 16);
}

export function renderTrack(
  scene: Phaser.Scene,
  track: TrackData
): {
  roadGraphics: Phaser.GameObjects.Graphics;
  sceneryObjects: Phaser.GameObjects.GameObject[];
} {
  const palette = track.palette;
  const { width, height } = scene.scale;

  // 1. Ground fill — full-size rectangle in grass color, depth 0
  const groundGraphics = scene.add.graphics();
  groundGraphics.fillStyle(palette.grass, 1);
  groundGraphics.fillRect(0, 0, width, height);
  groundGraphics.setDepth(0);

  // 2. Road surface — polygons per segment, depth 1
  const roadGraphics = scene.add.graphics();
  roadGraphics.setDepth(1);

  if (track.roadSegments && track.roadSegments.length > 0) {
    roadGraphics.fillStyle(palette.road, 1);
    for (const segment of track.roadSegments) {
      if (!segment || segment.length < 3) continue;
      roadGraphics.beginPath();
      roadGraphics.moveTo(segment[0].x, segment[0].y);
      for (let i = 1; i < segment.length; i++) {
        roadGraphics.lineTo(segment[i].x, segment[i].y);
      }
      roadGraphics.closePath();
      roadGraphics.fillPath();
    }
  }

  // 3. Center line dashes along waypoints, depth 2
  const dashGraphics = scene.add.graphics();
  dashGraphics.setDepth(2);
  dashGraphics.lineStyle(3, palette.roadLine, 1);

  if (track.waypoints && track.waypoints.length >= 2) {
    const wps = track.waypoints;
    // draw every other segment as a dash
    for (let i = 0; i < wps.length - 1; i += 2) {
      dashGraphics.beginPath();
      dashGraphics.moveTo(wps[i].x, wps[i].y);
      dashGraphics.lineTo(wps[i + 1].x, wps[i + 1].y);
      dashGraphics.strokePath();
    }
  }

  // 4. Finish line — checkerboard, rotated to match finish line angle, depth 3
  const finishGraphics = scene.add.graphics();
  finishGraphics.setDepth(3);

  if (track.finishLine) {
    const fl = track.finishLine;
    const squareSize = 10;
    const rows = 2;
    const cols = Math.ceil(fl.width / squareSize);
    const totalW = cols * squareSize;
    const totalH = rows * squareSize;

    // draw at origin then position/rotate via container
    const container = scene.add.container(fl.x, fl.y);
    container.setDepth(3);

    const checkerGraphics = scene.add.graphics();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isBlack = (row + col) % 2 === 0;
        checkerGraphics.fillStyle(isBlack ? 0x000000 : 0xffffff, 1);
        checkerGraphics.fillRect(
          col * squareSize - totalW / 2,
          row * squareSize - totalH / 2,
          squareSize,
          squareSize
        );
      }
    }

    container.add(checkerGraphics);
    if (typeof fl.angle === "number") {
      container.setRotation(fl.angle);
    }
  }

  // 5. Scenery objects
  const sceneryObjects: Phaser.GameObjects.GameObject[] = [];

  if (track.scenery) {
    for (const obj of track.scenery) {
      const { x, y, type, width: w = 40, height: h = 40, label, color } = obj;

      switch (type) {
        case "tree": {
          // shadow ellipse depth 4
          const shadow = scene.add.graphics();
          shadow.setDepth(4);
          shadow.fillStyle(0x000000, 0.3);
          shadow.fillEllipse(x + 6, y + 8, w * 1.1, h * 0.6);
          sceneryObjects.push(shadow);

          // canopy circle depth 5
          const canopy = scene.add.graphics();
          canopy.setDepth(5);
          canopy.fillStyle(0x228b22, 1);
          canopy.fillCircle(x, y, Math.min(w, h) / 2);
          sceneryObjects.push(canopy);
          break;
        }

        case "building": {
          // building rectangle depth 4
          const bldg = scene.add.graphics();
          bldg.setDepth(4);
          bldg.fillStyle(0x888888, 1);
          bldg.fillRect(x - w / 2, y - h / 2, w, h);
          sceneryObjects.push(bldg);

          // windows depth 5
          const windows = scene.add.graphics();
          windows.setDepth(5);
          windows.fillStyle(0xffd700, 0.4);
          const winSize = 5;
          const cols = Math.floor((w - 8) / (winSize + 4));
          const rows = Math.floor((h - 8) / (winSize + 4));
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              windows.fillRect(
                x - w / 2 + 4 + c * (winSize + 4),
                y - h / 2 + 4 + r * (winSize + 4),
                winSize,
                winSize
              );
            }
          }
          sceneryObjects.push(windows);

          // optional label text depth 5
          if (label) {
            const labelText = scene.add.text(x, y + h / 2 + 4, label, {
              fontSize: "8px",
              color: "#ffffff",
            }).setOrigin(0.5, 0).setDepth(5);
            sceneryObjects.push(labelText);
          }
          break;
        }

        case "lamp": {
          // pole depth 4
          const lamp = scene.add.graphics();
          lamp.setDepth(4);
          lamp.fillStyle(0x888888, 1);
          lamp.fillRect(x - 2, y - h / 2, 4, h);

          // glow circle depth 4
          lamp.fillStyle(0xffd700, 0.15);
          lamp.fillCircle(x, y - h / 2, 14);
          sceneryObjects.push(lamp);
          break;
        }

        case "water": {
          const water = scene.add.graphics();
          water.setDepth(1);
          water.fillStyle(0x1e90ff, 0.7);
          water.fillRect(x - w / 2, y - h / 2, w, h);
          sceneryObjects.push(water);
          break;
        }

        case "bench": {
          const bench = scene.add.graphics();
          bench.setDepth(4);
          bench.fillStyle(0x8b6914, 1);
          bench.fillRect(x - w / 2, y - h / 2, w, h);
          sceneryObjects.push(bench);
          break;
        }

        case "pier": {
          const pier = scene.add.graphics();
          pier.setDepth(4);
          pier.fillStyle(0xc8a96e, 1);
          pier.fillRect(x - w / 2, y - h / 2, w, h);
          sceneryObjects.push(pier);
          break;
        }

        case "awning": {
          const awning = scene.add.graphics();
          awning.setDepth(5);
          awning.fillStyle(color ? hexToNum(color) : 0xcc4444, 0.8);
          awning.fillRect(x - w / 2, y - h / 2, w, h);
          const stripeGfx = scene.add.graphics();
          stripeGfx.setDepth(5);
          stripeGfx.fillStyle(0xffffff, 0.15);
          for (let sx = 0; sx < w; sx += 8) {
            stripeGfx.fillRect(x - w / 2 + sx, y - h / 2, 4, h);
          }
          sceneryObjects.push(awning, stripeGfx);
          break;
        }

        case "parked-car": {
          const pcar = scene.add.graphics();
          pcar.setDepth(4);
          pcar.fillStyle(color ? hexToNum(color) : 0x444466, 1);
          pcar.fillRoundedRect(x - w / 2, y - h / 2, w, h, 3);
          const windshield = scene.add.graphics();
          windshield.setDepth(5);
          windshield.fillStyle(0x88bbdd, 0.5);
          windshield.fillRect(x - w / 4, y - h / 2 + 2, w / 2, h * 0.25);
          sceneryObjects.push(pcar, windshield);
          break;
        }

        case "traffic-light": {
          const tlPole = scene.add.graphics();
          tlPole.setDepth(5);
          tlPole.fillStyle(0x333333, 1);
          tlPole.fillRect(x - 2, y - h, 4, h);
          tlPole.fillStyle(0x222222, 1);
          tlPole.fillRect(x - 5, y - h - 16, 10, 16);
          tlPole.fillStyle(0xff0000, 0.8);
          tlPole.fillCircle(x, y - h - 12, 2);
          tlPole.fillStyle(0xffff00, 0.8);
          tlPole.fillCircle(x, y - h - 8, 2);
          tlPole.fillStyle(0x00ff00, 0.8);
          tlPole.fillCircle(x, y - h - 4, 2);
          sceneryObjects.push(tlPole);
          break;
        }

        case "gas-station": {
          const canopy = scene.add.graphics();
          canopy.setDepth(4);
          canopy.fillStyle(color ? hexToNum(color) : 0xeeeeee, 0.9);
          canopy.fillRect(x - w / 2, y - h / 2, w, h);
          canopy.fillStyle(0x888888, 1);
          canopy.fillRect(x - w / 2 + 4, y - h / 2, 4, h);
          canopy.fillRect(x + w / 2 - 8, y - h / 2, 4, h);
          const glowGfx = scene.add.graphics();
          glowGfx.setDepth(4);
          glowGfx.fillStyle(0xffffff, 0.12);
          glowGfx.fillRect(x - w / 2, y + h / 2, w, h * 0.6);
          sceneryObjects.push(canopy, glowGfx);
          break;
        }

        case "power-pole": {
          const pole = scene.add.graphics();
          pole.setDepth(4);
          pole.fillStyle(0x6b4226, 1);
          pole.fillRect(x - 2, y - h, 4, h);
          pole.fillRect(x - 12, y - h, 24, 3);
          sceneryObjects.push(pole);
          break;
        }

        default: {
          const generic = scene.add.graphics();
          generic.setDepth(4);
          generic.fillStyle(0x777777, 1);
          generic.fillRect(x - w / 2, y - h / 2, w, h);
          sceneryObjects.push(generic);
          break;
        }
      }
    }
  }

  return { roadGraphics, sceneryObjects };
}
