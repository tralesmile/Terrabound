# Art bible (code-drawn, zero binary assets)

Identity: the Hollow, a dead machine-planet. Rust and steel, cyan machine light, amber suit. Warm light against cold dark.

Rules
- Light comes from the top-left. Each material has a 4-5 shade ramp (outline, shadow, base, light, glint). Never pure black; darkest is the outline `#161a24`.
- Characters and enemies: 1 px dark outline, silhouette first (must read as a solid shape at 1x), one glowing accent (visor, eye, rotor light).
- Sprites are palette-indexed string maps in `src/render/sprites.ts`; every row is padded to the sprite width. Tests check dimensions.
- Dithering: only 2-tone checker on large flat areas; no gradients.
- Player 16x24 art px, crawler 16x10, flyer 14x10. Facing right in the map; mirrored for left.
- Gallery: open `/?e2e=1&gallery=1` to see every tile, the player frames and enemies at 4x. e2e saves `e2e/out/10-gallery.png`; review it after any art change.
