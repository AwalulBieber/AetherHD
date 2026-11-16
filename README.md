# AetherHD

A free, browser-based image and video refinement studio built with Next.js.

## Processing

AetherHD processes selected files locally in the browser. Files are not uploaded to a server and no paid API keys are required.

- Images: high-quality canvas resizing with light contrast and saturation refinement. Exports PNG.
- Videos: canvas-based resizing and browser MediaRecorder encoding. Exports WebM.
- Upscale choices: 2×, 4×, and 8×. Browser output dimensions are capped to practical limits.

## Important limitations

This free mode is not generative AI super-resolution. It cannot reconstruct real detail that is absent from the source. Video export depends on browser MediaRecorder support and may not preserve the original audio track. Large files and high upscale factors can use substantial device memory and processing power.

## Development

```bash
npm install
npm run dev
```
