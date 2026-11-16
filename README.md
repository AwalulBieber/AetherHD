# AetherHD

A free, browser-based image and video enhancement studio built with Next.js.

## Processing

AetherHD keeps the selected photo or video on the user's device. No paid inference API or server upload is required.

- **Photos:** Real-ESRGAN general x4v3 AI super-resolution runs locally in the browser through ONNX Runtime Web (WASM). The first use downloads the approximately 4.9 MB ONNX model; the browser may cache it for later visits. The AI model reconstructs plausible texture and detail, so results are not guaranteed to match the original scene perfectly.
- **Photo output sizes:** 2×, 4×, or 8×. The AI model itself generates 4× detail; other selected sizes are resampled from that output.
- **Videos:** Browser canvas resizing and MediaRecorder encoding. Exports WebM and does not preserve the original audio track.
- **Privacy:** Source media is processed locally. The ONNX model is downloaded from Hugging Face and ONNX Runtime's WebAssembly files are loaded from jsDelivr.

## Limitations

AI processing can be slow on phones and lower-powered devices. Output is capped at 8,192 pixels per side and 24 megapixels to reduce browser memory failures. Video remains non-AI resizing, is limited to 60 seconds, and may not be supported by every browser.

## Development

```bash
npm install
npm run dev
```

## Model and runtime credits

- Real-ESRGAN general x4v3 ONNX weights: BSD-3-Clause, based on the Real-ESRGAN project.
- ONNX Runtime Web: MIT.
