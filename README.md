# BREACH

A wave-based first-person shooter with NPC combatants, in a single HTML file.

No libraries, no CDN, no build step, no image or audio assets. Every texture, enemy
sprite and sound effect is generated procedurally in JavaScript at load time.

**Play it:** open `index.html` in any modern browser. That's the whole install.

<!-- Add a screenshot here: ![BREACH](screenshot.png) -->

## Controls

| Key | Action |
|-----|--------|
| `W` `A` `S` `D` | Move |
| Mouse | Look (pointer lock) |
| Click | Fire |
| `Shift` | Sprint |
| `R` | Reload |
| `1` / `2` / `Q` | Switch weapon |
| `Esc` | Pause / release cursor |

## The hostiles

Three NPC types, each with distinct behaviour:

- **Grunt** — fast rusher. Its melee swing is telegraphed with a 0.28 s wind-up, so
  backing out of reach beats the hit.
- **Gunner** — fires projectiles from range and retreats when you close the distance.
- **Brute** — 170 HP, slow, hits hard.

They share a breadth-first flow field recomputed from the player's tile four times a
second, so they path *around* geometry instead of grinding into it. Corner-cutting is
blocked and squad members apply mutual separation, so a group spreads out instead of
stacking into a single sprite.

An NPC goes alert on line of sight, on taking damage, or on hearing gunfire within 15
units. Unalerted ones sweep toward your area with random drift; when they lose you they
search your last known position, then fall back to patrol.

## The engine

A DDA raycaster writing into a 32-bit pixel buffer:

- Textured walls with a per-column depth buffer
- Floor and ceiling cast in a single mirrored pass
- Sprites depth-tested per column, with alpha blending and hit tinting
- Distance fog with an ambient floor, plus dynamic muzzle-flash room lighting
- Mouse look with pointer lock; pitch via horizon shift

Renders at an internal resolution of 400 lines, upscaled with nearest-neighbour for a
crisp retro look. Measured at **2.98 ms/frame** at 711×400 with 9 NPCs on screen.

Weapons, NPC stats and the arena layout are all data at the top of the file — the map is
built from `fill` / `outline` / `carve` calls, so it is easy to redraw.

## Verified

Hitscan damage, NPC melee and projectile damage, reload arithmetic, health and ammo
pickups, wave progression, the death screen and full state reset on restart were each
exercised in-browser. A 90-second headless soak driven by a bot reached wave 4 with 22
kills, no NPC stuck in geometry and no entity leaks.
