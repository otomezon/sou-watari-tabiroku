# 層渡りの旅録 v4.8.0 — 8方向移動

Minor release: 8-way movement for the player and monsters.

- Player movement now supports up, down, left, right, and all four diagonals.
- Monsters use 8-way pathfinding and can attack from diagonal adjacency. The aggro radius is measured in eight-way step distance.
- Each diagonal step costs exactly one player/enemy action, same as a cardinal step.
- Diagonal movement cannot cut a wall corner: both orthogonally adjacent side tiles must be walkable.
- Touch D-pad is now a 3×3 layout with eight directions surrounding the wait button.
- Monster action cadence and per-hit damage values are unchanged. Diagonal attack reach means rooms may produce contact and incoming attacks sooner.
- Save schema remains v11; no migration is required.

## Verification
- Node tests: 115/115 pass.
- Layout tests: 11/11 pass.
- Dedicated diagonal movement checks: 10/10 pass.
- Browser TypeScript compile: pass.
- Standalone preview build: pass.
- Physical iOS/Android touch QA and human playtest: not yet performed.
