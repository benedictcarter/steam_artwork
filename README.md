# Steam Art Studio

A browser editor for composing Steam store and library artwork. React, TypeScript, Vite and Fabric.js; no application backend. Imported artwork and fonts stay in the browser. Hosting serves only application files.

## Run locally

```powershell
npm ci
npm run dev
```

Open the Local URL printed by Vite. `npm run build` produces `dist/`; `npm test` runs document, pixel-export and project-round-trip checks. The render tests use Fabric's optional Node canvas/JSDOM dependencies.

## Workflow

1. Import PNG, JPG or WebP images. Import TTF/OTF/WOFF/WOFF2 fonts individually or in ZIP packs.
2. Drag an asset onto a target (clicking an image does not add it). Targets start transparent. Add editable text from the toolbar.
   To remove an image's background, click the eraser under it, click the background areas to clear, adjust Tolerance, raise Soften edges if a halo remains, tick Auto-crop to trim empty transparent edges, then Save as new asset. The original stays in the library.
3. Move/resize/rotate on canvas or use the inspector. Reorder layers by dragging the layer list or using its arrows. Visibility and locking are per placement.
4. Use Fit/Fill for artboard coverage. Crop fields trim an image placement using original source pixels; Reset restores it without altering the source.
5. Save a `.steamart` project. It is a ZIP containing a versioned manifest and original images/fonts. Open restores the editable document. Browser autosave is recovery convenience, not the portable project file.
6. Export a single PNG or a ZIP of selected targets. Export dimensions are independent of viewport zoom and display pixel density. Transparent backgrounds are retained.

Shortcuts: Ctrl/Cmd+Z undo; Ctrl/Cmd+Shift+Z redo; Ctrl/Cmd+D duplicate; Ctrl/Cmd+C/X/V copy/cut/paste the selected layers (pasting into another target scales the group to fit and centres it); Ctrl/Cmd+S save; Delete remove; arrow keys nudge (Shift = 10px). Pasted clipboard images are imported. Middle-drag pans the workspace. Drag a box or Shift-click to select several layers; drag any of them to move the group. The 3D tilt section leans a layer back or turns it like a door, with true perspective, and Camera distance sets how strong the effect is; the selection box wraps the tilted picture. Corner handles resize evenly along the diagonal; hold Shift to stretch.

Store and library presets follow [Valve's store documentation](https://partner.steamgames.com/doc/store/assets/standard), [library documentation](https://partner.steamgames.com/doc/store/assets/libraryassets), and [artwork rules](https://partner.steamgames.com/doc/store/assets/rules), checked 2026-11-13. The library-logo aspect ratio can be adjusted while keeping a 1280px width or 720px height. Optional page background is available under Manage targets.

## Scope and limits

- This release is the collage/layout layer plus click-to-clear background removal (connected similar colour, softened edges). AI cut-outs, lasso/mask painting and external-editor integration are not included.
- Image source limit: 50 MB/file and 60 megapixels. Expanded font packs: 50 MB. Project imports: 300 MB compressed / 250 MB asset bytes expanded. These are practical initial limits, not Steam limits.
- Steam screenshots, icons, event artwork and bundle-specific presets are outside this release. Store/library text and transparency guidelines remain a human review step.
- Browser storage is specific to this origin/browser and can be cleared. Download `.steamart` files to keep independent copies or move between the local and hosted app.

## Source organization

- `retouch.ts` / `RetouchDialog.tsx`: background removal, saved as a new asset.
- `model.ts`: versioned document, target presets and immutable edits.
- `files.ts`: local imports, font loading, ZIP project files and serialized IndexedDB autosave.
- `render.ts`: shared Fabric object creation and full-resolution export.
- `Artboard.tsx`: interactive canvases, coordinate scaling and Fabric object ownership.
- `useProject.ts`: history and autosave lifecycle.
- `App.tsx`: asset library, workspace, inspector and dialogs.

See [AGENTS.md](AGENTS.md) and [LESSONS_LEARNT.md](LESSONS_LEARNT.md) before changing the editor.
