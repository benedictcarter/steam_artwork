# Steam Art Studio implementation

- Approved stack: browser-first React + TypeScript + Fabric.js, built with Vite. Core scope is import → compose → portable save/reopen → exact-size export. Asset retouching is a later extension; GIMP integration is not requested.
- Read [LESSONS_LEARNT.md](LESSONS_LEARNT.md). Update these concise project notes after significant work; append only incident-backed lessons.
- Keep source assets immutable and layers/artboards independent. Keep the versioned project model separate from Fabric. All object construction goes through `render.ts` so editor and exports agree.
- Imported media/fonts and autosaves stay local. Never add uploads, telemetry, cloud project storage, or external font dependencies without a product reason and user authorization.
- Validate with `npm test` and `npm run build`. Inspect browser composition for visual changes; layout math is not visual acceptance. Tests use Fabric's optional Node canvas backend for actual encoded PNG pixels.
- Preset sizes are checked against Valve's official documentation; preserve flexible library-logo proportions and separate hero/logo content rules.
- `.openai/hosting.json` identifies the private Site. Preserve its audience. Save/push exact source before deployment, using the Sites workflow. Never force-push without permission.
- Send a one-line phone PushNotification when ready for user input if available; do not claim delivery when unavailable.
