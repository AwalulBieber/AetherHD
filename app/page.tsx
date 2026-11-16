"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Check, FileImage, FileVideo, Info, Layers2, Maximize2, ShieldCheck, Sparkles, UploadCloud, X, LoaderCircle } from "lucide-react";

type MediaKind = "image" | "video";
type FileInfo = { file: File; url: string; kind: MediaKind };
type JobState = "idle" | "processing" | "done" | "error";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function enhanceImage(file: File, scale: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const source = URL.createObjectURL(file);
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(image.naturalWidth * scale, 8192);
        canvas.height = Math.min(image.naturalHeight * scale, 8192);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Your browser does not support canvas processing.");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.filter = "contrast(1.06) saturate(1.04)";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not export the enhanced image.")), "image/png");
      } catch (error) { reject(error); }
      finally { URL.revokeObjectURL(source); }
    };
    image.onerror = () => { URL.revokeObjectURL(source); reject(new Error("Could not read this image.")); };
    image.src = source;
  });
}

async function enhanceVideo(file: File, scale: number, onProgress: (value: number) => void): Promise<Blob> {
  if (!("MediaRecorder" in window)) throw new Error("Video export is not supported by this browser. Try a recent Chrome browser.");
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const source = URL.createObjectURL(file);
  video.src = source;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Could not read this video."));
  });
  if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > 60) {
    URL.revokeObjectURL(source);
    throw new Error("Video must be 60 seconds or shorter.");
  }
  const width = Math.min(Math.round(video.videoWidth * scale), 3840);
  const height = Math.min(Math.round(video.videoHeight * scale), 2160);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) { URL.revokeObjectURL(source); throw new Error("Canvas is unavailable."); }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const stream = canvas.captureStream(24);
  const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Video encoding failed."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });
  recorder.start(250);
  await video.play();
  const draw = () => {
    if (video.ended || video.paused) return;
    ctx.filter = "contrast(1.04) saturate(1.03)";
    ctx.drawImage(video, 0, 0, width, height);
    onProgress(Math.min(96, Math.round((video.currentTime / video.duration) * 100)));
    requestAnimationFrame(draw);
  };
  draw();
  await new Promise<void>((resolve) => { video.onended = () => resolve(); });
  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  video.pause();
  URL.revokeObjectURL(source);
  return finished;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<FileInfo | null>(null);
  const [kind, setKind] = useState<MediaKind>("image");
  const [scale, setScale] = useState("2");
  const [dragging, setDragging] = useState(false);
  const [jobState, setJobState] = useState<JobState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultName, setResultName] = useState("");

  useEffect(() => () => { if (media?.url) URL.revokeObjectURL(media.url); }, [media]);
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  const clearFile = () => {
    if (jobState === "processing") return;
    setMedia(null); setResultUrl(""); setResultName(""); setError(""); setJobState("idle"); setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = useCallback((file?: File) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { setError("Choose an image or video file."); return; }
    if (file.size > 100 * 1024 * 1024) { setError("File size must be 100 MB or less."); return; }
    const url = URL.createObjectURL(file);
    setMedia({ file, url, kind: isImage ? "image" : "video" });
    setKind(isImage ? "image" : "video"); setError(""); setResultUrl(""); setResultName(""); setJobState("idle"); setProgress(0);
  }, []);

  const enhance = async () => {
    if (!media || jobState === "processing") return;
    setError(""); setResultUrl(""); setJobState("processing"); setProgress(2);
    try {
      const blob = media.kind === "image"
        ? await enhanceImage(media.file, Number(scale))
        : await enhanceVideo(media.file, Number(scale), setProgress);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      const base = media.file.name.replace(/\.[^.]+$/, "");
      setResultName(`${base}-aetherhd-${scale}x.${media.kind === "image" ? "png" : "webm"}`);
      setProgress(100); setJobState("done");
    } catch (err) {
      setJobState("error"); setError(err instanceof Error ? err.message : "Enhancement failed.");
    }
  };

  const busy = jobState === "processing";

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171816]">
      <header className="topbar">
        <a className="brand" href="#" aria-label="AetherHD home"><span className="brand-mark"><Layers2 size={17} strokeWidth={2.2} /></span><span>Aether<span className="brand-light">HD</span></span></a>
        <nav className="top-links"><a href="#workspace">Studio</a><a href="#how-it-works">How it works</a></nav>
        <div className="top-right"><span className="status-dot" /> <span>On-device processing</span></div>
      </header>
      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> IMAGE & VIDEO WORKSPACE</div>
        <h1>Make every detail<br /><span>count.</span></h1>
        <p className="hero-copy">Upscale and refine your media directly on your device. No account, no API fees, no cloud upload.</p>
      </section>
      <section id="workspace" className="workspace-wrap">
        <div className="workspace-heading"><div><div className="section-kicker">THE STUDIO</div><h2>Your workspace</h2></div><div className="privacy-note"><ShieldCheck size={15} /> Files stay on your device</div></div>
        <div className="studio">
          <div className="studio-main">
            <div className="studio-toolbar">
              <div className="mode-tabs" role="tablist" aria-label="Media type">
                <button className={kind === "image" ? "mode-tab active" : "mode-tab"} onClick={() => { if (!busy) { clearFile(); setKind("image"); } }}><FileImage size={15} /> Image</button>
                <button className={kind === "video" ? "mode-tab active" : "mode-tab"} onClick={() => { if (!busy) { clearFile(); setKind("video"); } }}><FileVideo size={15} /> Video</button>
              </div>
              {media && <button className="clear-button" onClick={clearFile} disabled={busy}><X size={14} /> Remove file</button>}
            </div>
            {!media ? (
              <button className={dragging ? "dropzone dragging" : "dropzone"} onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); acceptFile(e.dataTransfer.files[0]); }}>
                <input ref={inputRef} type="file" accept={kind === "image" ? "image/jpeg,image/png,image/webp,image/avif" : "video/mp4,video/quicktime,video/webm"} hidden onChange={(e) => acceptFile(e.target.files?.[0])} />
                <span className="upload-icon"><UploadCloud size={23} strokeWidth={1.6} /></span><span className="drop-title">Drop your {kind} here</span><span className="drop-sub">or <span className="browse-link">browse files</span> from your device</span><span className="drop-meta">{kind === "image" ? "JPG, PNG, WEBP, AVIF · Up to 100 MB" : "MP4, MOV, WEBM · Up to 100 MB · Max 60 sec"}</span>
              </button>
            ) : (
              <div className="preview-stage">
                <div className="preview-label"><span>{resultUrl ? "ENHANCED OUTPUT" : "ORIGINAL"}</span><span>{jobState === "done" ? "Ready to download" : "Source preview"}</span></div>
                {resultUrl ? media.kind === "image" ? <img src={resultUrl} alt="Enhanced output" className="media-preview" /> : <video src={resultUrl} controls className="media-preview" /> : media.kind === "image" ? <img src={media.url} alt="Uploaded preview" className="media-preview" /> : <video src={media.url} controls className="media-preview" />}
                <div className="file-chip">{media.kind === "image" ? <FileImage size={15} /> : <FileVideo size={15} />}<span className="file-name">{media.file.name}</span><span className="file-size">{formatBytes(media.file.size)}</span></div>
              </div>
            )}
            {busy && <div className="progress-wrap"><div className="progress-copy"><span>Processing on this device</span><span>{progress}%</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>}
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
          <aside className="settings-panel">
            <div className="panel-title-row"><h3>Output settings</h3><span className="step-number">01</span></div>
            <div className="setting-block"><label className="setting-label">Upscale target</label><div className="scale-options">{["2", "4", "8"].map((item) => <button key={item} disabled={busy} onClick={() => setScale(item)} className={scale === item ? "scale-option selected" : "scale-option"}>{item}×{scale === item && <Check size={13} />}</button>)}</div><p className="setting-help">Output is capped to practical browser limits.</p></div>
            <div className="setting-divider" />
            <div className="setting-block"><label className="setting-label">Processing engine</label><div className="feature-row"><span className="feature-icon"><Sparkles size={16} /></span><span><b>Image refinement</b><small>High-quality browser canvas</small></span><span className="engine-state">Local</span></div><div className="feature-row"><span className="feature-icon"><Maximize2 size={16} /></span><span><b>Video refinement</b><small>Canvas + browser encoder</small></span><span className="engine-state">Local</span></div></div>
            <div className="engine-notice"><Info size={15} /><span>Free browser-based upscaling. This uses high-quality resizing and light refinement, not generative AI detail reconstruction. Video exports as WebM.</span></div>
            <button className="enhance-button" disabled={!media || busy || jobState === "done"} onClick={enhance}>{busy ? <><LoaderCircle className="spin" size={16} /> Processing...</> : jobState === "done" ? <><Check size={16} /> Enhancement complete</> : <><Sparkles size={16} /> Enhance media</>}</button>
            {jobState === "done" && resultUrl && <a className="download-button" href={resultUrl} download={resultName}><ArrowDownToLine size={15} /> Download enhanced file</a>}
            {jobState === "error" && <button className="retry-button" onClick={enhance}>Try again</button>}
            <p className="panel-footnote">Your file never leaves this browser tab.</p>
          </aside>
        </div>
      </section>
      <section id="how-it-works" className="bottom-strip"><div><span className="bottom-index">01</span><div><b>Bring your media</b><p>Choose an image or a short video from your device.</p></div></div><div><span className="bottom-index">02</span><div><b>Choose your output</b><p>Set the resolution target that fits your needs.</p></div></div><div><span className="bottom-index">03</span><div><b>Enhance & export</b><p>Process locally and download your result.</p></div></div></section>
      <footer className="footer"><span>© 2026 AetherHD</span><span>Made for the details.</span></footer>
    </main>
  );
}
