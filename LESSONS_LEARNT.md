# Lessons learnt

## Match Fabric origins to document coordinates

During the first browser composition check (2026-11-13), images and text were displaced and clipped despite correct stored sizes. Fabric 7 defaults origins to the centre; our X/Y describes top-left. Set both origins explicitly in the shared object factory. Type checking and layout math tests did not reveal the mismatch; the rendered composition did.

## Share source bytes, not Fabric-owned image elements

The first pixel export tests (2026-11-13) failed on a second render of a reused image. Disposing a Fabric canvas disposes its image elements, so a global HTMLImageElement cache returned an invalid image to the next export. Give every FabricImage its own decoded element while sharing immutable source bytes in the project. Dispose replaced/canceled render objects too; removing them from a canvas is not disposal.

## Clipboard layers need real copy/paste events

The initial Ctrl+C/V handlers only maintained an in-memory layer, leaving the actual clipboard empty/stale; browser testing could not paste it and external image paste could be swallowed. Use copy/cut events to populate text/plain with the layer marker, and paste events to choose between incoming files and layer data. Leave text inputs and Fabric's text-editing textarea to the browser.
