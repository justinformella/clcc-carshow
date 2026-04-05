# Free Steering & Collision System — Design Spec

**Date:** 2026-04-03
**Status:** Approved

## Overview

Add free lateral steering to the arcade drag race, turning it from a straight-line acceleration game into a road-position game with car-to-car collisions and barrier penalties. The player car moves smoothly left/right across the road, the road perspective shifts slightly with steering, and the opponent AI actively tries to block.

## Player Steering

- **Input:** Left/right arrow keys (or A/D). Mobile: left/right screen-half taps or device tilt.
- **Lateral position:** Stored as `laneX` ranging from -1.0 (left road edge) to +1.0 (right road edge). 0.0 = center.
- **Momentum model:** Steering input applies lateral acceleration. Releasing keys decelerates back toward straight. Car doesn't teleport — it slides smoothly.
  - Lateral acceleration: `0.04` per frame when key held
  - Lateral friction: `0.92` per frame (decays toward zero when key released)
  - Max lateral velocity: clamped to `±0.08`
- **Road perspective shift:** When `laneX != 0`, the road vanishing point offsets by `laneX * width * 0.10` pixels. Creates the NFS illusion of steering through the view.

## Opponent AI

- **Base behavior:** Follows a target lane position that oscillates gently (sine wave, amplitude ±0.2, period ~4 seconds).
- **Blocking mode:** When player is within 80 distance units (close race), the opponent's target lane shifts toward the player's `laneX` with a 300ms reaction delay. The opponent drifts at 60% of max lateral speed toward the blocking position.
- **Grass-aware:** If blocking would push the opponent off-road, it stops at the road edge.
- **Same momentum model** as player for lateral movement (acceleration + friction).

## Collision System

### Car-to-car (side-swipe)
- **Trigger:** Both cars' lateral positions are within 0.25 of each other AND depth positions are within 30 units.
- **Effect:**
  - Both cars' lateral velocities reverse and amplify (bounce apart)
  - Both lose 10% forward speed
  - 200ms collision cooldown (prevent rapid re-triggers)
  - Screen shake (100ms, intensity 0.008)
  - Sparks particle burst at collision point
  - Impact sound effect

### Barrier hit (grass/road edge)
- **Trigger:** `|laneX| > 1.0` (car is off the road surface, on grass/shoulder).
- **Effect:**
  - Forward speed reduced by 30% while on grass (continuous drag)
  - Lateral velocity pushed back toward road center (rubber-band force)
  - Car sprite wobbles (slight rotation oscillation for ~500ms)
  - Rumble/crunch sound effect
  - Grass debris particle burst

## Road & Car Sizing (Desktop)

- **Road bottom width:** Increase from 110% to 130% of screen width. The road should feel like a wide highway with room to maneuver. On narrower viewports (< 768px), keep at 110%.
- **Player car sprite:** Increase from 140×85 to 200×120 display size on desktop. Scale down proportionally on mobile.
- **Opponent car sprite:** Increase from 160×88 (at full scale) to 220×120 at full scale on desktop.
- These sizes give more visual weight to the cars and make side-swipe collisions more dramatic and readable.

## Visual Changes

### Player car sprite
- Currently fixed at `playerRoad.rightLaneX`. Now repositioned each frame based on `laneX`:
  - `playerX = roadCenter + laneX * (roadW / 2 - carHalfWidth)`
  - Y position unchanged (just above dashboard)

### Road renderer
- `drawRoad()` gains a `vanishOffset` parameter (pixels to shift the vanishing point left/right)
- All road geometry calculations offset `vanishX` by this amount
- `drawBackground()` unchanged (static mountains/trees don't shift)

### Opponent car
- Existing depth-based positioning now also factors in opponent's `laneX` to determine screen X
- Uses `roadAtY()` helper with lane offset applied

### Particle effects
- **Sparks:** 8-12 small yellow/orange rectangles, short lifespan (200ms), scattered from collision point
- **Grass debris:** 6-8 small green rectangles, launched upward with gravity, from car's base when on grass
- Use Phaser's built-in particle emitter system

### Dashboard
- Slight rotation tilt (±1.5 degrees) based on `laneX` to reinforce the steering feel

## Physics Integration

- `PlayerState` gains: `laneX`, `lateralVel`, `onGrass` properties
- `OpponentState` gains: `laneX`, `lateralVel`, `targetLaneX` properties
- Lateral physics runs in the same `update()` loop, independent of forward speed physics
- Collision checks run after both cars' positions are updated each frame
- Forward speed grass penalty is multiplicative: `speed *= 0.70` each frame while `onGrass`

## Controls Summary

| Input | Action |
|-------|--------|
| Space / Up / Tap | Accelerate (unchanged) |
| Left arrow / A | Steer left |
| Right arrow / D | Steer right |
| Mobile left half | Steer left |
| Mobile right half | Steer right |

## Files Modified

- `components/arcade/physics.ts` — add `laneX`, `lateralVel`, lateral update methods, collision detection
- `components/arcade/scenes/RaceScene.ts` — steering input, visual repositioning, particle effects, road offset
- `components/arcade/road.ts` — `vanishOffset` parameter for `drawRoad()`

## Out of Scope (Future)

- Curved roads / actual turns
- Drifting mechanic with boost
- Car damage model / health bar
- Multiple opponent cars
