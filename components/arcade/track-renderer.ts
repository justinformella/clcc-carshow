import Phaser from "phaser";
import type { TrackData } from "./track";

function hexToNum(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color;
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
  groundGraphics.fillStyle(hexToNum(palette.grass), 1);
  groundGraphics.fillRect(0, 0, width, height);
  groundGraphics.setDepth(0);

  // 2. Road surface — polygons per segment, depth 1
  const roadGraphics = scene.add.graphics();
  roadGraphics.setDepth(1);

  if (track.road && track.road.segments) {
    roadGraphics.fillStyle(hexToNum(palette.road), 1);
    for (const segment of track.road.segments) {
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
  dashGraphics.lineStyle(3, hexToNum(palette.roadLine), 1);

  if (track.road && track.road.waypoints && track.road.waypoints.length >= 2) {
    const wps = track.road.waypoints;
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
      container.setRotation(Phaser.Math.DegToRad(fl.angle));
    }
  }

  // 5. Scenery objects
  const sceneryObjects: Phaser.GameObjects.GameObject[] = [];

  if (track.scenery) {
    for (const obj of track.scenery) {
      const { x, y, type, color, width: w = 40, height: h = 40, detail } = obj;

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
          canopy.fillStyle(color ? hexToNum(color) : 0x228b22, 1);
          canopy.fillCircle(x, y, Math.min(w, h) / 2);
          sceneryObjects.push(canopy);
          break;
        }

        case "building": {
          // building rectangle depth 4
          const bldg = scene.add.graphics();
          bldg.setDepth(4);
          bldg.fillStyle(color ? hexToNum(color) : 0x888888, 1);
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

          // optional detail label depth 5
          if (detail) {
            const label = scene.add.text(x, y + h / 2 + 4, detail, {
              fontSize: "8px",
              color: "#ffffff",
            }).setOrigin(0.5, 0).setDepth(5);
            sceneryObjects.push(label);
          }
          break;
        }

        case "lamp": {
          // pole depth 4
          const lamp = scene.add.graphics();
          lamp.setDepth(4);
          lamp.fillStyle(color ? hexToNum(color) : 0x888888, 1);
          lamp.fillRect(x - 2, y - h / 2, 4, h);

          // glow circle depth 4
          lamp.fillStyle(0xffd700, 0.15);
          lamp.fillCircle(x, y - h / 2, 14);
          sceneryObjects.push(lamp);
          break;
        }

        case "sign": {
          // sign rectangle depth 5
          const sign = scene.add.graphics();
          sign.setDepth(5);
          sign.fillStyle(color ? hexToNum(color) : 0x228b22, 1);
          sign.fillRect(x - w / 2, y - h / 2, w, h);
          sceneryObjects.push(sign);

          // detail text depth 6
          if (detail) {
            const signText = scene.add.text(x, y, detail, {
              fontSize: "8px",
              color: "#ffffff",
            }).setOrigin(0.5).setDepth(6);
            sceneryObjects.push(signText);
          }
          break;
        }

        case "water": {
          const water = scene.add.graphics();
          water.setDepth(1);
          water.fillStyle(color ? hexToNum(color) : 0x1e90ff, 0.7);
          water.fillRect(x - w / 2, y - h / 2, w, h);
          sceneryObjects.push(water);
          break;
        }

        case "bench": {
          const bench = scene.add.graphics();
          bench.setDepth(4);
          bench.fillStyle(color ? hexToNum(color) : 0x8b6914, 1);
          bench.fillRect(x - w / 2, y - h / 2, w, h);
          sceneryObjects.push(bench);
          break;
        }

        case "pier": {
          const pier = scene.add.graphics();
          pier.setDepth(4);
          pier.fillStyle(color ? hexToNum(color) : 0xc8a96e, 1);
          pier.fillRect(x - w / 2, y - h / 2, w, h);
          sceneryObjects.push(pier);
          break;
        }

        case "fence": {
          const fence = scene.add.graphics();
          fence.setDepth(4);
          fence.fillStyle(color ? hexToNum(color) : 0xaaaaaa, 0.6);
          fence.fillRect(x - w / 2, y - h / 2, w, h);
          sceneryObjects.push(fence);
          break;
        }

        default: {
          const generic = scene.add.graphics();
          generic.setDepth(4);
          generic.fillStyle(color ? hexToNum(color) : 0x777777, 1);
          generic.fillRect(x - w / 2, y - h / 2, w, h);
          sceneryObjects.push(generic);
          break;
        }
      }
    }
  }

  return { roadGraphics, sceneryObjects };
}
