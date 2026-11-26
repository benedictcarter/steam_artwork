# Done

- 2026-11-26 · Images join a target only by dragging; clicking no longer adds them · `App.tsx` asset tile.
- 2026-11-26 · Every new target starts transparent · `model.ts` presets.
- 2026-11-26 · Background removal: click areas to clear connected similar colour, live tolerance, saved as a new asset · `retouch.ts`, `RetouchDialog.tsx`.
- 2026-11-26 · Auto-crop in the asset editor: trims to the smallest rectangle holding every visible pixel, live size readout · `retouch.ts`, `RetouchDialog.tsx`.
- 2026-11-26 · Select several layers (box or Shift-click), move them together, copy into another target scaled to fit and centred; same-target paste duplicates with an offset · `Artboard.tsx`, `App.tsx`, `model.ts` fitLayers.
- 2026-11-26 · 3D tilt: Tilt back, Turn and Camera distance sliders give a layer true perspective (far edge shrinks, near edge grows), live, one undo per drag, matches export · `perspective.ts`, `render.ts`.
- 2026-11-26 · Soften edges in the asset editor: fades a 2-pixel band past the cleared area by colour distance and takes the old background colour out of it, so cut-outs lose their halo · `retouch.ts`, `RetouchDialog.tsx`.
- 2026-11-26 · A tilted layer's selection box wraps the tilted picture; resizing it resizes the flat layer to match · `perspective.ts` tiltedBox/flatSize, `render.ts`, `model.ts`.
- 2026-11-26 · Corner handles scale evenly along the diagonal (Shift still stretches freely) · `controls.ts`.
- 2026-11-26 · Fixed: moving or resizing several selected layers crashed the page ("Maximum call stack size exceeded") · `Artboard.tsx`.
