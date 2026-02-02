# Cyber Breakout — Implementation Plan (Claude Code Plan Mode)

## Decisions
- Canvas size: 480×640 (portrait)
- Brick layout: Classic rows (6 rows × 10 cols)
- Brick durability: 1–3 hits with color coding
- Paddle collision: angle based on hit position
- Power-ups: Multi-ball, Paddle Expand, Slow Motion
- Audio: Web Audio API (synthesized)
- Controls: keyboard + touch drag paddle + on-screen left/right buttons
- File structure: plain HTML/CSS/JS (single app.js)

## Core systems
### Game loop
- `requestAnimationFrame` render loop + fixed timestep update based on `deltaTime`.
- Pause/resume and "ball attached to paddle" state pre-launch.

### Physics & collisions
- Ball moves with velocity; wall bounces; bottom = lose life.
- Paddle collision: reflect angle based on relative hit position on paddle.
- Brick collision: detect overlap; reduce durability; remove at 0.

### Brick layout system
- Level definition data structure (grid dims, spacing, brick size).
- Render bricks with neon colors reflecting durability.

### Power-ups
- Chance to spawn on brick destroy.
- Falling pickup; collected by paddle.
- Effects:
  - Multi-ball: split current balls into 3 (new angles)
  - Paddle Expand: widen paddle 50% for ~10s
  - Slow Motion: reduce ball speed ~40% for ~8s
- Toggle power-ups on/off via button.

### Audio
- Web Audio API synth SFX:
  - paddle hit, brick hit/destroy
  - power-up spawn/collect
  - lose life, win, game over
- Mute toggle persisted to localStorage; audio init on first user gesture.

## Step-by-step checklist
1) Paddle + input (keyboard, touch buttons, drag)
2) Ball attach/launch + wall/bottom collisions
3) Paddle angle reflection
4) Bricks: load level, render, durability + collision
5) Game flow: lives, win/lose, pause
6) Power-ups: spawn, fall, collect, timers, toggle
7) Audio: synth sounds + mute persistence
8) Polish: glow, trails, HUD/status text, edge cases

## Notes for future expansion
- Add more levels by swapping `levelData` arrays.
- Add alternative layouts (pyramid/checker) and special bricks.
