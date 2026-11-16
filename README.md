# AetherHD

A free, browser-based AI photo enhancement studio built with Next.js.

## Processing

AetherHD keeps the selected photo on the user's device. No paid inference API or source-photo upload is required.

- **Photos:** Real-ESRGAN general x4v3 AI super-resolution runs locally in the browser through ONNX Runtime Web (WASM). The first use downloads the approximately 4.9 MB ONNX model; the browser may cache it for later visits.
- **Photo output sizes:** 2×, 4×, or 8×. The AI model generates 4× detail; other selected sizes are resampled from that output.
- **Privacy:** Source photos are processed locally. The ONNX model is downloaded from Hugging Face and ONNX Runtime's WebAssembly files are loaded from jsDelivr.

## Limitations

AI processing can be slow on phones and lower-powered devices. Output is capped at 8,192 pixels per side and 24 megapixels to reduce browser memory failures. AI may reconstruct plausible texture rather than perfectly recover details that were absent from the original photo.

## Development

```bash
npm install
npm run dev
```

## Model and runtime credits

- Real-ESRGAN general x4v3 ONNX weights: BSD-3-Clause, based on the Real-ESRGAN project.
- ONNX Runtime Web: MIT.
