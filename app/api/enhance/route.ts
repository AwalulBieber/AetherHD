import { del } from "@vercel/blob";
import Replicate from "replicate";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

function isAllowedBlobUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function extractOutputUrl(output: unknown): string | null {
  if (typeof output === "string" && output.startsWith("https://")) return output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const found = extractOutputUrl(item);
      if (found) return found;
    }
  }
  if (output && typeof output === "object") {
    const value = output as Record<string, unknown>;
    for (const key of ["url", "output", "video", "image"]) {
      const found = extractOutputUrl(value[key]);
      if (found) return found;
    }
  }
  return null;
}

export async function POST(request: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN is not configured on the server." }, { status: 503 });
  }
  try {
    const body = await request.json();
    const { inputUrl, kind, scale } = body as { inputUrl?: unknown; kind?: unknown; scale?: unknown };
    if (!isAllowedBlobUrl(inputUrl)) {
      return NextResponse.json({ error: "Invalid source file URL." }, { status: 400 });
    }
    if (kind !== "image" && kind !== "video") {
      return NextResponse.json({ error: "Unsupported media type." }, { status: 400 });
    }
    if (![2, 4, 8].includes(Number(scale))) {
      return NextResponse.json({ error: "Upscale target must be 2×, 4×, or 8×." }, { status: 400 });
    }

    const input = kind === "image"
      ? { image: inputUrl, scale: Number(scale), face_enhance: true }
      : { video_url: inputUrl, desired_increase: Number(scale), preserve_audio: true, output_container_and_codec: "mp4_h264" };

    const prediction = await replicate.predictions.create({
      model: kind === "image" ? "nightmareai/real-esrgan" : "bria/video-increase-resolution",
      input,
    });
    return NextResponse.json({ id: prediction.id, status: prediction.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start the enhancement job." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN is not configured on the server." }, { status: 503 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const source = url.searchParams.get("source");
  if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid prediction ID." }, { status: 400 });
  }
  try {
    const prediction = await replicate.predictions.get(id);
    const outputUrl = prediction.status === "succeeded" ? extractOutputUrl(prediction.output) : null;
    if (["succeeded", "failed", "canceled"].includes(prediction.status) && isAllowedBlobUrl(source)) {
      await del(source).catch(() => undefined);
    }
    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      outputUrl,
      error: prediction.error ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not retrieve enhancement status." },
      { status: 500 },
    );
  }
}
