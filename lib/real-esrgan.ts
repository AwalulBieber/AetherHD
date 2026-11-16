"use client";

const MODEL_URL = "https://huggingface.co/jonathanst29/tinier-upscale-models/resolve/main/realesr-general-x4v3.onnx";
const TILE_SIZE = 256;
const OVERLAP = 16;
const MAX_OUTPUT_PIXELS = 24_000_000;

type ProgressCallback = (value: number) => void;

let sessionPromise: Promise<import("onnxruntime-web").InferenceSession> | null = null;

async function getSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import("onnxruntime-web");
      ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
      ort.env.wasm.numThreads = 1;
      return ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
    })().catch((error) => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

export async function enhanceImageWithAI(
  file: File,
  scale: number,
  onProgress: ProgressCallback,
): Promise<Blob> {
  const image = await createImageBitmap(file);
  const width = image.width;
  const height = image.height;
  const outputWidth = width * scale;
  const outputHeight = height * scale;

  if (outputWidth > 8192 || outputHeight > 8192 || outputWidth * outputHeight > MAX_OUTPUT_PIXELS) {
    image.close();
    throw new Error("Output is too large for safe browser processing. Try a smaller upscale target or a lower-resolution image.");
  }

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) {
    image.close();
    throw new Error("Your browser cannot prepare this image for AI processing.");
  }
  sourceContext.drawImage(image, 0, 0);
  image.close();

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) throw new Error("Your browser cannot create the output image.");

  const session = await getSession();
  const ort = await import("onnxruntime-web");
  const columns = Math.ceil(width / TILE_SIZE);
  const rows = Math.ceil(height / TILE_SIZE);
  const totalTiles = columns * rows;
  let completed = 0;

  for (let y = 0; y < height; y += TILE_SIZE) {
    for (let x = 0; x < width; x += TILE_SIZE) {
      const endX = Math.min(width, x + TILE_SIZE);
      const endY = Math.min(height, y + TILE_SIZE);
      const tileX = Math.max(0, x - OVERLAP);
      const tileY = Math.max(0, y - OVERLAP);
      const tileEndX = Math.min(width, endX + OVERLAP);
      const tileEndY = Math.min(height, endY + OVERLAP);
      const tileWidth = tileEndX - tileX;
      const tileHeight = tileEndY - tileY;
      const pixels = sourceContext.getImageData(tileX, tileY, tileWidth, tileHeight).data;
      const input = new Float32Array(3 * tileWidth * tileHeight);
      const planeSize = tileWidth * tileHeight;

      for (let index = 0; index < planeSize; index++) {
        input[index] = pixels[index * 4] / 255;
        input[planeSize + index] = pixels[index * 4 + 1] / 255;
        input[planeSize * 2 + index] = pixels[index * 4 + 2] / 255;
      }

      const tensor = new ort.Tensor("float32", input, [1, 3, tileHeight, tileWidth]);
      const result = await session.run({ [session.inputNames[0]]: tensor });
      const output = result[session.outputNames[0]];
      const outputHeight4 = tileHeight * 4;
      const outputWidth4 = tileWidth * 4;
      const outputData = output.data as Float32Array;
      const outputPlane = outputWidth4 * outputHeight4;
      const rgba = new Uint8ClampedArray(outputPlane * 4);

      for (let index = 0; index < outputPlane; index++) {
        rgba[index * 4] = Math.max(0, Math.min(255, Math.round(outputData[index] * 255)));
        rgba[index * 4 + 1] = Math.max(0, Math.min(255, Math.round(outputData[outputPlane + index] * 255)));
        rgba[index * 4 + 2] = Math.max(0, Math.min(255, Math.round(outputData[outputPlane * 2 + index] * 255)));
        rgba[index * 4 + 3] = 255;
      }

      const tileCanvas = document.createElement("canvas");
      tileCanvas.width = outputWidth4;
      tileCanvas.height = outputHeight4;
      const tileContext = tileCanvas.getContext("2d");
      if (!tileContext) throw new Error("Could not assemble the AI output.");
      tileContext.putImageData(new ImageData(rgba, outputWidth4, outputHeight4), 0, 0);

      const cropX = (x - tileX) * 4;
      const cropY = (y - tileY) * 4;
      const cropWidth = (endX - x) * 4;
      const cropHeight = (endY - y) * 4;
      outputContext.drawImage(
        tileCanvas,
        cropX, cropY, cropWidth, cropHeight,
        x * scale, y * scale, (endX - x) * scale, (endY - y) * scale,
      );

      completed += 1;
      onProgress(Math.round((completed / totalTiles) * 100));
      tileCanvas.width = 0;
      tileCanvas.height = 0;
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob((blob) => {
      outputCanvas.width = 0;
      outputCanvas.height = 0;
      if (blob) resolve(blob);
      else reject(new Error("Could not export the AI-enhanced image."));
    }, "image/png");
  });
}
