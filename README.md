# AetherHD

A minimal image and video enhancement studio built with Next.js.

## AI processing

- Images: Replicate `nightmareai/real-esrgan` for AI upscaling and optional face enhancement.
- Videos: Replicate `bria/video-increase-resolution` for video upscaling with audio preservation.
- Uploads: Vercel Blob client uploads, so large media does not pass through the Vercel Function request body.

## Required environment variables

Configure these on the Vercel project before running production processing:

- `REPLICATE_API_TOKEN` — API token from Replicate. Keep it server-side.
- `BLOB_READ_WRITE_TOKEN` — created automatically when a Vercel Blob store is connected to the project.

Create a **public** Vercel Blob store for the project because the Replicate models need to fetch the temporary source URL. Source blobs are deleted after the prediction reaches a terminal state. While processing, the source URL is temporarily accessible to anyone who has the link.

## Limits and cost

- Maximum source size: 100 MB.
- Video duration: maximum 60 seconds for the selected BRIA model.
- Replicate usage is billed separately. Check the current model pricing before processing.
- The UI supports 2×, 4×, and 8× targets; actual output dimensions are subject to each model's maximum output resolution.

## Development

```bash
npm install
npm run dev
```
