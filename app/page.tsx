"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine, ArrowUpRight, Check, ChevronDown, FileImage, FileVideo,
  ImagePlus, Info, Layers2, Maximize2, ShieldCheck, Sparkles, UploadCloud, X,
} from "lucide-react";

type MediaKind = "image" | "video";
type FileInfo = { file: File; url: string; kind: MediaKind };

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<FileInfo | null>(null);
  const [kind, setKind] = useState<MediaKind>("image");
  const [scale, setScale] = useState("2×");
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => { if (media?.url) URL.revokeObjectURL(media.url); }, [media]);

  const acceptFile = useCallback((file?: File) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return;
    setMedia({ file, url: URL.createObjectURL(file), kind: isImage ? "image" : "video" });
    setKind(isImage ? "image" : "video");
  }, []);

  const clearFile = () => {
    if (media) URL.revokeObjectURL(media.url);
    setMedia(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171816]">
      <header className="topbar">
        <a className="brand" href="#" aria-label="AetherHD home">
          <span className="brand-mark"><Layers2 size={17} strokeWidth={2.2} /></span>
          <span>Aether<span className="brand-light">HD</span></span>
        </a>
        <nav className="top-links">
          <a href="#workspace">Studio</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="top-right"><span className="status-dot" /> <span>Studio preview</span></div>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> IMAGE & VIDEO WORKSPACE</div>
        <h1>Make every detail<br /><span>count.</span></h1>
        <p className="hero-copy">A focused space to prepare your photos and videos for a clearer, higher-resolution finish.</p>
      </section>

      <section id="workspace" className="workspace-wrap">
        <div className="workspace-heading">
          <div>
            <div className="section-kicker">THE STUDIO</div>
            <h2>Your workspace</h2>
          </div>
          <div className="privacy-note"><ShieldCheck size={15} /> Files stay in this browser preview</div>
        </div>

        <div className="studio">
          <div className="studio-main">
            <div className="studio-toolbar">
              <div className="mode-tabs" role="tablist" aria-label="Media type">
                <button className={kind === "image" ? "mode-tab active" : "mode-tab"} onClick={() => { setKind("image"); clearFile(); }}><FileImage size={15} /> Image</button>
                <button className={kind === "video" ? "mode-tab active" : "mode-tab"} onClick={() => { setKind("video"); clearFile(); }}><FileVideo size={15} /> Video</button>
              </div>
              {media && <button className="clear-button" onClick={clearFile}><X size={14} /> Remove file</button>}
            </div>

            {!media ? (
              <button
                className={dragging ? "dropzone dragging" : "dropzone"}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); acceptFile(e.dataTransfer.files[0]); }}
              >
                <input ref={inputRef} type="file" accept={kind === "image" ? "image/*" : "video/*"} hidden onChange={(e) => acceptFile(e.target.files?.[0])} />
                <span className="upload-icon"><UploadCloud size={23} strokeWidth={1.6} /></span>
                <span className="drop-title">Drop your {kind} here</span>
                <span className="drop-sub">or <span className="browse-link">browse files</span> from your device</span>
                <span className="drop-meta">{kind === "image" ? "JPG, PNG, WEBP · Up to 25 MB" : "MP4, MOV, WEBM · Up to 250 MB"}</span>
              </button>
            ) : (
              <div className="preview-stage">
                <div className="preview-label"><span>ORIGINAL</span><span>Preview only</span></div>
                {media.kind === "image"
                  ? <img src={media.url} alt="Uploaded preview" className="media-preview" />
                  : <video src={media.url} controls className="media-preview" />}
                <div className="file-chip">
                  {media.kind === "image" ? <FileImage size={15} /> : <FileVideo size={15} />}
                  <span className="file-name">{media.file.name}</span>
                  <span className="file-size">{formatBytes(media.file.size)}</span>
                </div>
              </div>
            )}
          </div>

          <aside className="settings-panel">
            <div className="panel-title-row"><h3>Output settings</h3><span className="step-number">01</span></div>
            <div className="setting-block">
              <label className="setting-label">Upscale target</label>
              <div className="scale-options">
                {["2×", "4×", "8×"].map((item) => <button key={item} onClick={() => setScale(item)} className={scale === item ? "scale-option selected" : "scale-option"}>{item}{scale === item && <Check size={13} />}</button>)}
              </div>
              <p className="setting-help">Choose the output resolution multiplier.</p>
            </div>
            <div className="setting-divider" />
            <div className="setting-block">
              <label className="setting-label">Enhancement</label>
              <div className="feature-row"><span className="feature-icon"><Sparkles size={16} /></span><span><b>Detail recovery</b><small>AI enhancement engine</small></span><span className="coming-soon">Pending</span></div>
              <div className="feature-row"><span className="feature-icon"><Maximize2 size={16} /></span><span><b>Resolution boost</b><small>Upscaling pipeline</small></span><span className="coming-soon">Pending</span></div>
            </div>
            <div className="engine-notice"><Info size={15} /><span>The processing engine is not connected yet. Your file is only previewed locally; no enhancement is being simulated.</span></div>
            <button className="enhance-button" disabled={!media}><Sparkles size={16} /> Enhancement unavailable <ArrowUpRight size={15} /></button>
            <p className="panel-footnote">No upload or processing happens in this preview.</p>
          </aside>
        </div>
      </section>

      <section id="how-it-works" className="bottom-strip">
        <div><span className="bottom-index">01</span><div><b>Bring your media</b><p>Start with an image or video from your device.</p></div></div>
        <div><span className="bottom-index">02</span><div><b>Choose your output</b><p>Set the resolution target that fits your needs.</p></div></div>
        <div><span className="bottom-index">03</span><div><b>Enhance & export</b><p>Connect a processing engine to unlock exports.</p></div></div>
      </section>

      <footer className="footer"><span>© 2026 AetherHD</span><span>Made for the details.</span></footer>
    </main>
  );
}
