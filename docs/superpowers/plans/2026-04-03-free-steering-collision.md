# Free Steering & Collision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add free lateral steering, car-to-car collisions, barrier penalties, and road perspective shift to the arcade drag race.

**Architecture:** Lateral physics (laneX, lateralVel) added to PlayerState/OpponentState alongside existing forward physics. RaceScene handles steering input, repositions sprites each frame, and runs collision checks. Road renderer accepts a vanishOffset to shift perspective. Particle effects use Phaser's built-in emitter.

**Tech Stack:** Phaser 3 (existing), TypeScript, canvas 2D (road renderer)

---

### Task 1: Add lateral physics to PlayerState

**Files:**
- Modify: `components/arcade/physics.ts:140-207`

- [ ] **Step 1: Add lateral properties to PlayerState**

Add these properties after the existing declarations (after line 153):

```typescript
  // Lateral steering
  laneX = 0;        // -1.0 (left edge) to +1.0 (right edge), 0 = center
  lateralVel = 0;   // current lateral velocity
  onGrass = false;   // true when |laneX| > 1.0
```

- [ ] **Step 2: Add lateral update method to PlayerState**

Add this method after the existing `update()` method (after line 207):

```typescript
  updateSteering(steerLeft: boolean, steerRight: boolean) {
    const LATERAL_ACCEL = 0.04;
    const LATERAL_FRICTION = 0.92;
    const MAX_LATERAL_VEL = 0.08;

    // Apply steering input
    if (steerLeft) this.lateralVel -= LATERAL_ACCEL;
    if (steerRight) this.lateralVel += LATERAL_ACCEL;

    // Friction (always decays toward zero)
    this.lateralVel *= LATERAL_FRICTION;

    // Clamp
    this.lateralVel = Math.max(-MAX_LATERAL_VEL, Math.min(MAX_LATERAL_VEL, this.lateralVel));

    // Update position
    this.laneX += this.lateralVel;

    // Grass check
    this.onGrass = Math.abs(this.laneX) > 1.0;

    // Grass penalty — rubber-band force pushes back toward road
    if (this.onGrass) {
      this.speed *= 0.97; // 3% drag per frame while on grass
      const pushBack = this.laneX > 0 ? -0.01 : 0.01;
      this.lateralVel += pushBack;
    }

    // Hard clamp — can't go infinitely off road
    this.laneX = Math.max(-1.3, Math.min(1.3, this.laneX));
  }
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add components/arcade/physics.ts
git commit -m "feat: add lateral steering physics to PlayerState"
```

---

### Task 2: Add lateral physics to OpponentState

**Files:**
- Modify: `components/arcade/physics.ts:210-250`

- [ ] **Step 1: Add lateral properties to OpponentState**

Add these properties after existing declarations (after line 218):

```typescript
  // Lateral steering AI
  laneX = 0;
  lateralVel = 0;
  targetLaneX = 0;
  onGrass = false;
  private lastPlayerLaneX = 0;
  private blockingDelay = 0; // frames until blocking target updates
```

- [ ] **Step 2: Add lateral update method to OpponentState**

Add this method after the existing `update()` method:

```typescript
  updateSteering(playerLaneX: number, playerPos: number) {
    const LATERAL_ACCEL = 0.04;
    const LATERAL_FRICTION = 0.92;
    const MAX_LATERAL_VEL = 0.048; // 60% of player max

    // Update blocking delay (300ms = 18 frames at 60fps)
    this.blockingDelay = Math.max(0, this.blockingDelay - 1);

    // Base oscillation
    const elapsedMs = this.frames * (1000 / 60);
    const baseLane = Math.sin(elapsedMs * 0.0005 * Math.PI * 2 / 4) * 0.2;

    // Blocking: when close race, drift toward player's lane
    const delta = Math.abs(this.pos - playerPos);
    if (delta < 80 && this.blockingDelay <= 0) {
      this.targetLaneX = playerLaneX; // mirror player's position
      this.blockingDelay = 18; // re-evaluate after 300ms
    } else if (delta >= 80) {
      this.targetLaneX = baseLane;
    }

    // Clamp target to road bounds
    this.targetLaneX = Math.max(-0.95, Math.min(0.95, this.targetLaneX));

    // Steer toward target
    const diff = this.targetLaneX - this.laneX;
    if (Math.abs(diff) > 0.02) {
      this.lateralVel += (diff > 0 ? LATERAL_ACCEL : -LATERAL_ACCEL) * 0.6;
    }

    // Friction
    this.lateralVel *= LATERAL_FRICTION;
    this.lateralVel = Math.max(-MAX_LATERAL_VEL, Math.min(MAX_LATERAL_VEL, this.lateralVel));

    // Update position
    this.laneX += this.lateralVel;
    this.onGrass = Math.abs(this.laneX) > 1.0;
    if (this.onGrass) {
      this.speed *= 0.97;
      this.lateralVel += this.laneX > 0 ? -0.01 : 0.01;
    }
    this.laneX = Math.max(-1.3, Math.min(1.3, this.laneX));
  }
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add components/arcade/physics.ts
git commit -m "feat: add lateral steering AI to OpponentState"
```

---

### Task 3: Add collision detection function

**Files:**
- Modify: `components/arcade/physics.ts` (add at end of file)

- [ ] **Step 1: Add collision detection export**

Add this function at the end of the file:

```typescript
export type CollisionResult = {
  carTocar: boolean;
  playerOnGrass: boolean;
  opponentOnGrass: boolean;
};

export function checkCollision(
  player: PlayerState,
  opponent: OpponentState,
  cooldownFrames: number
): { result: CollisionResult; newCooldown: number } {
  const result: CollisionResult = {
    carTocar: false,
    playerOnGrass: player.onGrass,
    opponentOnGrass: opponent.onGrass,
  };

  let newCooldown = Math.max(0, cooldownFrames - 1);

  // Car-to-car: lateral within 0.25, depth within 30 units, cooldown expired
  const lateralDist = Math.abs(player.laneX - opponent.laneX);
  const depthDist = Math.abs(player.pos - opponent.pos);
  if (lateralDist < 0.25 && depthDist < 30 && cooldownFrames <= 0) {
    result.carTocar = true;
    newCooldown = 12; // 200ms at 60fps

    // Bounce apart
    const bounceForce = 0.12;
    if (player.laneX < opponent.laneX) {
      player.lateralVel = -bounceForce;
      opponent.lateralVel = bounceForce;
    } else {
      player.lateralVel = bounceForce;
      opponent.lateralVel = -bounceForce;
    }

    // Both lose 10% forward speed
    player.speed *= 0.90;
    opponent.speed *= 0.90;
  }

  return { result, newCooldown };
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add components/arcade/physics.ts
git commit -m "feat: add car-to-car and barrier collision detection"
```

---

### Task 4: Add vanishOffset to road renderer

**Files:**
- Modify: `components/arcade/road.ts:149-155`

- [ ] **Step 1: Add vanishOffset parameter to drawRoad**

Change the function signature from:

```typescript
export function drawRoad(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  roadOffset: number,
  colors: RoadColors = DEFAULT_COLORS
) {
  const horizonY = Math.floor(height * 0.35);
  const vanishX = width / 2;
```

To:

```typescript
export function drawRoad(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  roadOffset: number,
  colors: RoadColors = DEFAULT_COLORS,
  vanishOffset: number = 0
) {
  const horizonY = Math.floor(height * 0.35);
  const vanishX = width / 2 + vanishOffset;
```

- [ ] **Step 2: Widen road for desktop**

In the same function, change the road width constants:

```typescript
  const isDesktop = width >= 768;
  const roadWidthBottom = width * (isDesktop ? 1.30 : 1.10);
  const roadWidthTop = width * 0.08;
  const shoulderWidthBottom = width * (isDesktop ? 0.08 : 0.10);
  const shoulderWidthTop = 2;
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add components/arcade/road.ts
git commit -m "feat: add vanishOffset to road renderer, widen road on desktop"
```

---

### Task 5: Wire steering input in RaceScene

**Files:**
- Modify: `components/arcade/scenes/RaceScene.ts`

- [ ] **Step 1: Add steering state properties**

After the existing `private accelHeld = false;` line, add:

```typescript
  private steerLeft = false;
  private steerRight = false;
  private collisionCooldown = 0;
  private playerCarSprite!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private dashImage: Phaser.GameObjects.Image | null = null;
```

- [ ] **Step 2: Add steering keyboard listeners**

In the `create()` method, after the existing accel input listeners (after the `pointerup` line), add:

```typescript
    this.input.keyboard!.on("keydown-LEFT", () => { this.steerLeft = true; });
    this.input.keyboard!.on("keyup-LEFT", () => { this.steerLeft = false; });
    this.input.keyboard!.on("keydown-RIGHT", () => { this.steerRight = true; });
    this.input.keyboard!.on("keyup-RIGHT", () => { this.steerRight = false; });
    this.input.keyboard!.on("keydown-A", () => { this.steerLeft = true; });
    this.input.keyboard!.on("keyup-A", () => { this.steerLeft = false; });
    this.input.keyboard!.on("keydown-D", () => { this.steerRight = true; });
    this.input.keyboard!.on("keyup-D", () => { this.steerRight = false; });
```

- [ ] **Step 3: Reset steering state in create() cleanup**

In the reset state section at the top of `create()`, add after `this.accelHeld = false;`:

```typescript
    this.steerLeft = false;
    this.steerRight = false;
    this.collisionCooldown = 0;
```

- [ ] **Step 4: Store reference to player car sprite**

Where the player car sprite is created (the `pImg` variable inside the load callback), assign it to `this.playerCarSprite`:

Change:
```typescript
          const pImg = this.add.image(playerRoad.rightLaneX, playerY, pKey).setDepth(7);
```
To:
```typescript
          const pImg = this.add.image(playerRoad.rightLaneX, playerY, pKey).setDepth(7);
          this.playerCarSprite = pImg;
```

And for the fallback rectangle, change:
```typescript
      this.add.rectangle(playerRoad.rightLaneX, playerY, 80, 40, 0xdc2626).setDepth(7);
```
To:
```typescript
      this.playerCarSprite = this.add.rectangle(playerRoad.rightLaneX, playerY, 80, 40, 0xdc2626).setDepth(7);
```

- [ ] **Step 5: Increase car sprite sizes on desktop**

Where the player car display size is set, change:
```typescript
          pImg.setDisplaySize(140, 85);
```
To:
```typescript
          const isDesktop = width >= 768;
          pImg.setDisplaySize(isDesktop ? 200 : 140, isDesktop ? 120 : 85);
```

And where the opponent car display size is set, change:
```typescript
            .setDisplaySize(80, 50).setDepth(5);
```
To:
```typescript
            .setDisplaySize(width >= 768 ? 110 : 80, width >= 768 ? 65 : 50).setDepth(5);
```

- [ ] **Step 6: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add components/arcade/scenes/RaceScene.ts
git commit -m "feat: add steering input, car sprite refs, desktop sizing"
```

---

### Task 6: Wire lateral physics and collision into update loop

**Files:**
- Modify: `components/arcade/scenes/RaceScene.ts` (update method)
- Import: `checkCollision` from physics.ts

- [ ] **Step 1: Add checkCollision import**

Change the import line:
```typescript
import { RaceCar, PlayerState, OpponentState } from "../physics";
```
To:
```typescript
import { RaceCar, PlayerState, OpponentState, checkCollision } from "../physics";
```

- [ ] **Step 2: Add lateral updates to the racing phase**

In the `update()` method, after the existing `this.opponentState.update();` line, add:

```typescript
      // Lateral steering physics
      if (this.phase === "racing") {
        this.playerState.updateSteering(this.steerLeft, this.steerRight);
        this.opponentState.updateSteering(this.playerState.laneX, this.playerState.pos);

        // Collision detection
        const { result, newCooldown } = checkCollision(
          this.playerState, this.opponentState, this.collisionCooldown
        );
        this.collisionCooldown = newCooldown;

        if (result.carTocar) {
          this.cameras.main.shake(100, 0.008);
          // TODO Task 8: particle effects here
        }
      }
```

- [ ] **Step 3: Reposition player car sprite each frame**

In the `update()` method, in the visual updates section (after the scenery loop), add:

```typescript
    // Reposition player car based on laneX
    if (this.playerCarSprite && (this.phase === "racing" || this.phase === "finished")) {
      const dashTopY = height * 0.55;
      const playerScreenY = dashTopY - 15;
      const row = playerScreenY - horizonY;
      const t = row / (height - horizonY);
      const perspective = t * t;
      const roadW = width * (0.08 + (1.30 - 0.08) * perspective);
      const carX = width / 2 + this.playerState.laneX * (roadW * 0.35);
      this.playerCarSprite.setPosition(carX, playerScreenY);

      // Wobble when on grass
      if (this.playerState.onGrass) {
        this.playerCarSprite.setRotation(Math.sin(this.time.now * 0.02) * 0.05);
      } else {
        this.playerCarSprite.setRotation(0);
      }
    }
```

- [ ] **Step 4: Update road draw call with vanish offset**

Change the `drawRoadFrame` method:

```typescript
  private drawRoadFrame() {
    const ctx = this.roadTexture.getContext();
    const vanishOffset = this.playerState ? this.playerState.laneX * this.scale.width * -0.10 : 0;
    drawRoad(ctx, this.roadTexture.width, this.roadTexture.height, this.roadOffset, this.trackSkin, vanishOffset);
    this.roadTexture.refresh();
  }
```

- [ ] **Step 5: Update opponent positioning to use laneX**

In the opponent sprite positioning section, where `leftLaneX` is calculated from road perspective, modify the X calculation. Find the line:
```typescript
        const leftLaneX = width / 2 - roadW * 0.22;
```
And change it to:
```typescript
        const leftLaneX = width / 2 + this.opponentState.laneX * (roadW * 0.35);
```

Do this for BOTH the `delta2 >= 0` block and the `delta2 < 0` block (replace all `leftLaneX` calculations with the laneX-based one).

- [ ] **Step 6: Tilt dashboard with steering**

Find the dashboard image setup. After the `dash.setAlpha(0.6);` line, store the reference:
```typescript
          this.dashImage = dash;
```

Then in the update loop, after the player car repositioning, add:
```typescript
    // Dashboard tilt with steering
    if (this.dashImage) {
      this.dashImage.setRotation(this.playerState ? this.playerState.laneX * -0.025 : 0);
    }
```

- [ ] **Step 7: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add components/arcade/scenes/RaceScene.ts
git commit -m "feat: wire lateral physics, collision, and visual updates into race loop"
```

---

### Task 7: Add particle effects for collisions

**Files:**
- Modify: `components/arcade/scenes/RaceScene.ts`

- [ ] **Step 1: Create particle textures in create()**

In the `create()` method, after the scenery creation, add:

```typescript
    // Collision particle textures
    if (!this.textures.exists("spark-particle")) {
      const sc = document.createElement("canvas");
      sc.width = 4; sc.height = 4;
      const sctx = sc.getContext("2d")!;
      sctx.fillStyle = "#ffaa00";
      sctx.fillRect(0, 0, 4, 4);
      this.textures.addCanvas("spark-particle", sc);
    }
    if (!this.textures.exists("grass-particle")) {
      const gc = document.createElement("canvas");
      gc.width = 3; gc.height = 3;
      const gctx = gc.getContext("2d")!;
      gctx.fillStyle = "#2a6a2a";
      gctx.fillRect(0, 0, 3, 3);
      this.textures.addCanvas("grass-particle", gc);
    }
```

- [ ] **Step 2: Replace the collision TODO with spark emitter**

In the update loop where the collision is detected (the `if (result.carTocar)` block), replace:
```typescript
        if (result.carTocar) {
          this.cameras.main.shake(100, 0.008);
          // TODO Task 8: particle effects here
        }
```
With:
```typescript
        if (result.carTocar) {
          this.cameras.main.shake(100, 0.008);
          // Spark burst at collision point
          const sparkX = width / 2 + ((this.playerState.laneX + this.opponentState.laneX) / 2) * width * 0.3;
          const sparkY = height * 0.45;
          for (let i = 0; i < 10; i++) {
            const spark = this.add.rectangle(
              sparkX + (Math.random() - 0.5) * 20,
              sparkY + (Math.random() - 0.5) * 15,
              3 + Math.random() * 3, 3 + Math.random() * 3,
              Math.random() > 0.5 ? 0xffaa00 : 0xff6600
            ).setDepth(15);
            this.tweens.add({
              targets: spark,
              x: spark.x + (Math.random() - 0.5) * 80,
              y: spark.y + (Math.random() - 0.5) * 60,
              alpha: 0,
              duration: 200 + Math.random() * 150,
              onComplete: () => spark.destroy(),
            });
          }
        }

        // Grass debris when player on grass
        if (result.playerOnGrass && this.playerCarSprite && Math.random() < 0.3) {
          const debrisX = this.playerCarSprite.x;
          const debrisY = this.playerCarSprite.y;
          for (let i = 0; i < 4; i++) {
            const debris = this.add.rectangle(
              debrisX + (Math.random() - 0.5) * 30,
              debrisY,
              2 + Math.random() * 2, 2 + Math.random() * 2,
              0x2a6a2a
            ).setDepth(6);
            this.tweens.add({
              targets: debris,
              x: debris.x + (Math.random() - 0.5) * 40,
              y: debris.y - 20 - Math.random() * 30,
              alpha: 0,
              duration: 300 + Math.random() * 200,
              onComplete: () => debris.destroy(),
            });
          }
        }
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add components/arcade/scenes/RaceScene.ts
git commit -m "feat: add spark and grass debris particle effects on collision"
```

---

### Task 8: Update road width in RaceScene positioning math

**Files:**
- Modify: `components/arcade/scenes/RaceScene.ts`

- [ ] **Step 1: Update all road width references to match new desktop width**

Search for `0.08 + (1.10 - 0.08)` in RaceScene.ts and replace with `0.08 + (1.30 - 0.08)` for desktop. These are in:
- `roadAtY` helper
- Opponent positioning (both ahead and behind blocks)
- Scenery positioning

For the `roadAtY` helper, change:
```typescript
      const roadW = width * (0.08 + (1.10 - 0.08) * perspective);
```
To:
```typescript
      const isDesktop = width >= 768;
      const roadW = width * (0.08 + ((isDesktop ? 1.30 : 1.10) - 0.08) * perspective);
```

Apply the same pattern to all occurrences in opponent positioning and scenery.

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add components/arcade/scenes/RaceScene.ts
git commit -m "feat: widen road and car sprites on desktop for steering room"
```

---

### Task 9: Integration test — play through a full race

**Files:** None (manual testing)

- [ ] **Step 1: Test steering**

Open `http://localhost:3002/arcade`, select a car, start a race. While holding Space to accelerate:
- Press Left/Right arrows — car should slide smoothly across the road
- Release keys — car should drift back toward straight
- Road perspective should shift slightly with steering direction
- Dashboard should tilt subtly

- [ ] **Step 2: Test grass penalty**

Steer all the way to the edge until the car goes onto the grass:
- Speed should drop noticeably
- Car should wobble (slight rotation)
- Green debris particles should appear
- Car should rubber-band back toward the road

- [ ] **Step 3: Test car-to-car collision**

Steer into the opponent's lane when they're nearby:
- Both cars should bounce apart
- Screen should shake briefly
- Spark particles should appear at collision point
- Both cars should lose speed momentarily

- [ ] **Step 4: Test opponent AI**

During a close race, observe the opponent:
- Should weave gently when far away
- Should drift toward your lane to block when close
- Should not drive completely off the road

- [ ] **Step 5: Test finish screen**

Complete a race — verify the finish overlay, car images, times, and buttons all still work correctly with the new steering system.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration test fixes for steering and collision"
```
