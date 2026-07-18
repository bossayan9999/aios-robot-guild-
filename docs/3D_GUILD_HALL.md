# AIOS 3D Guild Hall

Build: `2026.07.18-hall1`

## What this release adds

- Original procedural Three.js guild hall; no copied game artwork or characters.
- Five selectable specialist robots tied to Router, Planner, Builder, Tester and Reviewer mission stages.
- Active robots travel between their station and the central forge.
- The handoff packet follows verified mission progress.
- The central artifact grows from 0–100% mission progress.
- Drag-to-orbit, wheel or W/S zoom and keyboard A/D rotation.
- Overview and Follow Robot camera modes.
- Low, Balanced and Cinematic graphics presets.
- Pause control and reduced-motion compatibility.
- Mobile defaults to Low graphics and exposes touch-safe controls.

## Safety contract

The 3D scene only visualizes state already held by the React application. It has no network calls and cannot run commands, approve actions, modify a repository or deploy code. Existing owner approval and sandbox boundaries remain authoritative.

## Owner test

1. Open **Robot Guild**.
2. Select each robot from the five-stage strip and confirm the ring and Follow Robot camera move to that specialist.
3. Drag inside the scene to orbit. Use the wheel or W/S to zoom.
4. Switch Graphics between Low, Balanced and Cinematic.
5. Create and approve a safe Health Quest.
6. Confirm the active robot changes with every mission event, the packet advances and the central forge grows.
7. Confirm an incomplete mission does not add Forge XP or Guild Tokens.
8. On a phone, confirm the 3D controls scroll horizontally and the dashboard does not clip.

## Verification

- `npm run lint`
- `npm test`
- `npm run build`

The release adds a product contract that prevents the visualizer from adding `fetch()` calls and requires mission linkage, mobile quality modes and the explanatory safety label.

## Next visual milestone

Replace procedural primitives with original, optimized `.glb` robot and environment models. Store large assets in R2, load them progressively, retain Low graphics as the mobile fallback and keep mission state in the existing guarded backend.
