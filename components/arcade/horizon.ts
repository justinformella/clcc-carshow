/**
 * Draws a pixel art horizon onto a canvas — blocky trees/buildings
 * that will scroll slowly behind the road for parallax depth.
 */
export function createHorizonTexture(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0d0d2a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < canvas.width; x += 25) {
    const type = (x * 7) % 5;
    if (type < 2) {
      const h = 15 + ((x * 3) % 25);
      const w = 15 + ((x * 5) % 10);
      ctx.fillStyle = (x * 11) % 3 === 0 ? "#151530" : "#121225";
      ctx.fillRect(x, canvas.height - h, w, h);
      ctx.fillStyle = "#ffd70044";
      for (let wy = canvas.height - h + 4; wy < canvas.height - 4; wy += 6) {
        for (let wx = x + 3; wx < x + w - 3; wx += 5) {
          if (Math.random() > 0.4) {
            ctx.fillRect(wx, wy, 2, 3);
          }
        }
      }
    } else {
      const h = 10 + ((x * 7) % 15);
      ctx.fillStyle = "#0a1a0a";
      ctx.fillRect(x + 5, canvas.height - h, 12, h);
      ctx.fillStyle = "#0d2a0d";
      ctx.fillRect(x, canvas.height - h - 6, 22, 8);
    }
  }

  return canvas;
}
