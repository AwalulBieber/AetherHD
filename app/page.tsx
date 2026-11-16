"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  ArrowDownToLine, Check, FileImage, FileVideo, Info, Layers2,
  Maximize2, ShieldCheck, Sparkles, UploadCloud, X, LoaderCircle,
} from "lucide-react";

type MediaKind = "image" | "video";
type FileInfo = { file: File; url: string; kind: MediaKind };
type JobState = "idle" | "uploading" | "processing" | "done" | "error";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  useEffect(() => () => { if (media?.url) URL.revokeObjectURL(media.url); }, [media]);

  const clearFile = () => {
    if (jobState === "uploading" || jobState === "processing") return;
    if (media) URL.revokeObjectURL(media.url);
    setMedia(null);
    setResultUrl("");
    setError("");
    setJobState("idle");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = useCallback((file?: File) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Choose a supported image or video file.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("File size must be 100 MB or less.");
      return;
    }
    if (isVideo) {
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.onloadedmetadata = () => {
        URL.revokeObjectURL(probe.src);
        if (probe.duration > 60) {
          setError("Video duration must be 60 seconds or less for this enhancement model.");
          return;
        }
        setMedia({ file, url: URL.createObjectURL(file), kind: "video" });
        setKind("video");
        setError("");
        setResultUrl("");
        setJobState("idle");
      };
      probe.onerror = () => { URL.revokeObjectURL(probe.src); setMedia({ file, url: URL.createObjectURL(file), kind: "video" }); setKind("video"); setError(""); setResultUrl(""); setJobState("idle"); };
      probe.src = URL.createObjectURL(file);
      return;
    }
    setMedia({ file, url: URL.createObjectURL(file), kind: "image" });
    setKind("image");
    setError("");
    setResultUrl("");
    setJobState("idle");
  }, []);

  const enhance = async () => {
    if (!media || jobState === "uploading" || jobState === "processing") return;
    setError("");
    setResultUrl("");
    try {
      setJobState("uploading");
      setProgress(4);
      const blob = await upload(media.file.name, media.file, {
        access: "public",
        handleUploadUrl: "/api/media/upload",
        multipart: media.kind === "video" || media.file.size > 8 * 1024 * 1024,
        contentType: media.file.type,
        onUploadProgress: ({ percentage }) => setProgress(Math.max(4, Math.round(percentage * 0.55))),
      });

      setJobState("processing");
      setProgress(58);
      const start = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputUrl: blob.url, kind: media.kind, scale: Number(scale) }),
      });
      const startData = await start.json();
      if (!start.ok) throw new Error(startData.error || "Could not start enhancement.");
      const predictionId = startData.id as string;

      let finished = false;
      let checks = 0;
      while (!finished) {
        checks += 1;
        if (checks > 240) throw new Error("This job is taking too long. Check Replicate for its status and try again later.");
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const statusResponse = await fetch(`/api/enhance?id=${encodeURIComponent(predictionId)}&source=${encodeURIComponent(blob.url)}`);
        const statusData = await statusResponse.json();
        if (!statusResponse.ok) throw new Error(statusData.error || "Could not check enhancement status.");
        if (statusData.status === "succeeded" && statusData.outputUrl) {
          setResultUrl(statusData.outputUrl);
          setProgress(100);
          setJobState("done");
          finished = true;
        } else if (statusData.status === "failed" || statusData.status === "canceled") {
          throw new Error(statusData.error || "The enhancement job did not complete.");
        } else {
          setProgress((current) => Math.min(94, current + 3));
        }
      }
    } catch (err) {
      setJobState("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const busy = jobState === "uploading" || jobState === "processing";

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171816]">
      <header className="topbar">
        <a className="brand" href="#" aria-label="AetherHD home">
          <span className="brand-mark"><Layers2 size={17} strokeWidth={2.2} /></span>
          <span>Aether<span className="brand-light">HD</span></span>
        </a>
        <nav className="top-links"><a href="#workspace">Studio</a><a href="#how-it-works">How it works</a></nav>
        <div className="top-right"><span className="status-dot" /> <span>AI engine connected in app</span></div>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> IMAGE & VIDEO WORKSPACE</div>
        <h1>Make every detail<br /><span>count.</span></h1>
        <p className="hero-copy">A focused space to prepare your photos and videos for a clearer, higher-resolution finish.</p>
      </section>

      <section id="workspace" className="workspace-wrap">
        <div className="workspace-heading">
          <div><div className="section-kicker">THE STUDIO</div><h2>Your workspace</h2></div>
          <div className="privacy-note"><ShieldCheck size={15} /> Temporary cloud processing</div>
        </div>

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
              <button
                className={dragging ? "dropzone dragging" : "dropzone"}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); acceptFile(e.dataTransfer.files[0]); }}
              >
                <input ref={inputRef} type="file" accept={kind === "image" ? "image/jpeg,image/png,image/webp,image/avif" : "video/mp4,video/quicktime,video/webm"} hidden onChange={(e) => acceptFile(e.target.files?.[0])} />
                <span className="upload-icon"><UploadCloud size={23} strokeWidth={1.6} /></span>
                <span className="drop-title">Drop your {kind} here</span>
                <span className="drop-sub">or <span className="browse-link">browse files</span> from your device</span>
                <span className="drop-meta">{kind === "image" ? "JPG, PNG, WEBP, AVIF · Up to 100 MB" : "MP4, MOV, WEBM · Up to 100 MB · Max 60 sec"}</span>
              </button>
            ) : (
              <div className="preview-stage">
                <div className="preview-label"><span>{resultUrl ? "ENHANCED OUTPUT" : "ORIGINAL"}</span><span>{jobState === "done" ? "Ready to download" : "Source preview"}</span></div>
                {resultUrl ? (
                  media.kind === "image"
                    ? <img src={resultUrl} alt="Enhanced output" className="media-preview" />
                    : <video src={resultUrl} controls className="media-preview" />
                ) : media.kind === "image"
                  ? <img src={media.url} alt="Uploaded preview" className="media-preview" />
                  : <video src={media.url} controls className="media-preview" />}
                <div className="file-chip">
                  {media.kind === "image" ? <FileImage size={15} /> : <FileVideo size={15} />}
                  <span className="file-name">{media.file.name}</span>
                  <span className="file-size">{formatBytes(media.file.size)}</span>
                </div>
              </div>
            )}
            {busy && <div className="progress-wrap"><div className="progress-copy"><span>{jobState === "uploading" ? "Uploading source file" : "AI enhancement in progress"}</span><span>{progress}%</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>}
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>

          <aside className="settings-panel">
            <div className="panel-title-row"><h3>Output settings</h3><span className="step-number">01</span></div>
            <div className="setting-block">
              <label className="setting-label">Upscale target</label>
              <div className="scale-options">
                {["2", "4", "8"].map((item) => <button key={item} disabled={busy} onClick={() => setScale(item)} className={scale === item ? "scale-option selected" : "scale-option"}>{item}×{scale === item && <Check size={13} />}</button>)}
              </div>
              <p className="setting-help">Choose the output resolution multiplier.</p>
            </div>
            <div className="setting-divider" />
            <div className="setting-block">
              <label className="setting-label">Enhancement engine</label>
              <div className="feature-row"><span className="feature-icon"><Sparkles size={16} /></span><span><b>Detail recovery</b><small>Real-ESRGAN image model</small></span><span className="engine-state">Ready</span></div>
              <div className="feature-row"><span className="feature-icon"><Maximize2 size={16} /></span><span><b>Video resolution</b><small>BRIA video upscaler</small></span><span className="engine-state">Ready</span></div>
            </div>
            <div className="engine-notice"><Info size={15} /><span>Estimated model cost: photos about $0.002 each; video about $0.05 per output second. A 60-second video can cost about $3. Uploaded source files are temporary.</span></div>
            <button className="enhance-button" disabled={!media || busy || jobState === "done"} onClick={enhance}>
              {busy ? <><LoaderCircle className="spin" size={16} /> {jobState === "uploading" ? "Uploading..." : "Enhancing..."}</> : jobState === "done" ? <><Check size={16} /> Enhancement complete</> : <><Sparkles size={16} /> Enhance media</>}
            </button>
            {jobState === "done" && resultUrl && <a className="download-button" href={resultUrl} target="_blank" rel="noreferrer" download><ArrowDownToLine size={15} /> Download enhanced file</a>}
            {jobState === "error" && <button className="retry-button" onClick={enhance}>Try again</button>}
            <p className="panel-footnote">Your file is uploaded only when you start enhancement.</p>
          </aside>
        </div>
      </section>

      <section id="how-it-works" className="bottom-strip">
        <div><span className="bottom-index">01</span><div><b>Bring your media</b><p>Choose an image or a short video from your device.</p></div></div>
        <div><span className="bottom-index">02</span><div><b>Choose your output</b><p>Set the resolution target that fits your needs.</p></div></div>
        <div><span className="bottom-index">03</span><div><b>Enhance & export</b><p>Run the AI model and download your result.</p></div></div>
      </section>
      <footer className="footer"><span>© 2026 AetherHD</span><span>Made for the details.</span></footer>
    </main>
  );
}
