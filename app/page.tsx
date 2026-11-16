"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Check, FileImage, Info, Layers2, Maximize2, ShieldCheck, Sparkles, UploadCloud, X, LoaderCircle } from "lucide-react";
import { enhanceImageWithAI } from "../lib/real-esrgan";

type JobState = "idle" | "processing" | "done" | "error";
type ImageFile = { file: File; url: string };

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<ImageFile | null>(null);
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
    setMedia(null);
    setResultUrl("");
    setResultName("");
    setError("");
    setJobState("idle");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = useCallback((file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pilih file gambar JPG, PNG, WEBP, atau AVIF.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("Ukuran file maksimal 100 MB.");
      return;
    }
    setMedia({ file, url: URL.createObjectURL(file) });
    setError("");
    setResultUrl("");
    setResultName("");
    setJobState("idle");
    setProgress(0);
  }, []);

  const enhance = async () => {
    if (!media || jobState === "processing") return;
    setError("");
    setResultUrl("");
    setJobState("processing");
    setProgress(1);
    try {
      const blob = await enhanceImageWithAI(media.file, Number(scale), setProgress);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      const base = media.file.name.replace(/\.[^.]+$/, "");
      setResultName(`${base}-aetherhd-${scale}x.png`);
      setProgress(100);
      setJobState("done");
    } catch (err) {
      setJobState("error");
      setError(err instanceof Error ? err.message : "Peningkatan foto gagal.");
    }
  };

  const busy = jobState === "processing";

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171816]">
      <header className="topbar">
        <a className="brand" href="#" aria-label="AetherHD home"><span className="brand-mark"><Layers2 size={17} strokeWidth={2.2} /></span><span>Aether<span className="brand-light">HD</span></span></a>
        <nav className="top-links"><a href="#workspace">Studio</a><a href="#how-it-works">How it works</a></nav>
        <div className="top-right"><span className="status-dot" /> <span>On-device AI</span></div>
      </header>
      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> AI PHOTO ENHANCEMENT</div>
        <h1>Make every detail<br /><span>count.</span></h1>
        <p className="hero-copy">Upscale and refine your photos with AI, directly on your device. No account, no API fees, no cloud upload.</p>
      </section>
      <section id="workspace" className="workspace-wrap">
        <div className="workspace-heading"><div><div className="section-kicker">THE STUDIO</div><h2>Your workspace</h2></div><div className="privacy-note"><ShieldCheck size={15} /> Photos stay on your device</div></div>
        <div className="studio">
          <div className="studio-main">
            <div className="studio-toolbar">
              <div className="mode-tabs"><span className="mode-tab active"><FileImage size={15} /> Photo</span></div>
              {media && <button className="clear-button" onClick={clearFile} disabled={busy}><X size={14} /> Remove photo</button>}
            </div>
            {!media ? (
              <button className={dragging ? "dropzone dragging" : "dropzone"} onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); acceptFile(e.dataTransfer.files[0]); }}>
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => acceptFile(e.target.files?.[0])} />
                <span className="upload-icon"><UploadCloud size={23} strokeWidth={1.6} /></span><span className="drop-title">Drop your photo here</span><span className="drop-sub">or <span className="browse-link">browse files</span> from your device</span><span className="drop-meta">JPG, PNG, WEBP, AVIF · Up to 100 MB</span>
              </button>
            ) : (
              <div className="preview-stage">
                <div className="preview-label"><span>{resultUrl ? "ENHANCED OUTPUT" : "ORIGINAL PHOTO"}</span><span>{jobState === "done" ? "Ready to download" : "Source preview"}</span></div>
                <img src={resultUrl || media.url} alt={resultUrl ? "AI-enhanced photo" : "Uploaded photo"} className="media-preview" />
                <div className="file-chip"><FileImage size={15} /><span className="file-name">{media.file.name}</span><span className="file-size">{formatBytes(media.file.size)}</span></div>
              </div>
            )}
            {busy && <div className="progress-wrap"><div className="progress-copy"><span>Running Real-ESRGAN AI locally</span><span>{progress}%</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>}
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
          <aside className="settings-panel">
            <div className="panel-title-row"><h3>Output settings</h3><span className="step-number">01</span></div>
            <div className="setting-block"><label className="setting-label">Upscale target</label><div className="scale-options">{["2", "4", "8"].map((item) => <button key={item} disabled={busy} onClick={() => setScale(item)} className={scale === item ? "scale-option selected" : "scale-option"}>{item}×{scale === item && <Check size={13} />}</button>)}</div><p className="setting-help">AI detail generation uses a 4× model.</p></div>
            <div className="setting-divider" />
            <div className="setting-block"><label className="setting-label">Processing engine</label><div className="feature-row"><span className="feature-icon"><Sparkles size={16} /></span><span><b>Real-ESRGAN AI</b><small>Neural photo super-resolution</small></span><span className="engine-state">Local</span></div><div className="feature-row"><span className="feature-icon"><Maximize2 size={16} /></span><span><b>Smart tiling</b><small>Processes large photos in sections</small></span><span className="engine-state">On</span></div></div>
            <div className="engine-notice"><Info size={15} /><span>AI processing runs on your device. The first use downloads the 4.9 MB model. Performance depends on your phone or computer.</span></div>
            <button className="enhance-button" disabled={!media || busy || jobState === "done"} onClick={enhance}>{busy ? <><LoaderCircle className="spin" size={16} /> Processing...</> : jobState === "done" ? <><Check size={16} /> Enhancement complete</> : <><Sparkles size={16} /> Enhance photo</>}</button>
            {jobState === "done" && resultUrl && <a className="download-button" href={resultUrl} download={resultName}><ArrowDownToLine size={15} /> Download enhanced photo</a>}
            {jobState === "error" && <button className="retry-button" onClick={enhance}>Try again</button>}
            <p className="panel-footnote">Your photo never leaves this browser tab.</p>
          </aside>
        </div>
      </section>
      <section id="how-it-works" className="bottom-strip"><div><span className="bottom-index">01</span><div><b>Bring your photo</b><p>Choose a picture from your device.</p></div></div><div><span className="bottom-index">02</span><div><b>Choose your output</b><p>Select the resolution target you need.</p></div></div><div><span className="bottom-index">03</span><div><b>Enhance & export</b><p>Run AI locally and download the result.</p></div></div></section>
      <footer className="footer"><span>© 2026 AetherHD</span><span>Made for the details.</span></footer>
    </main>
  );
}
