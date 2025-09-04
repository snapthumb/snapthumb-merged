/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";

/** Snapthumb — App.tsx (feature-rich, fully patched & rendered) */

type Mode = "screenshot" | "video";

type ExportPreset = { label: string; w: number; h: number };

type OverlayState = {
  src?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  shadow: number;
  keepAspect: boolean;
  snap: boolean;
};

type ProjectState = {
  mode: Mode;
  exportW: number;
  exportH: number;
  gridOn: boolean;
  gridSize: number;
  safeZonesOn: boolean;
  bgColor: string;

  
  transparentBg: boolean;
  jpegQuality: number;
baseImage?: string;
  baseName?: string;

  videoUrl?: string;
  videoName?: string;
  videoDuration: number;
  videoTime: number;
  videoReady: boolean;

  overlay: OverlayState;
};

type HistoryState = { past: ProjectState[]; present: ProjectState; future: ProjectState[] };

const DEFAULT_PRESETS: ExportPreset[] = [
  { label: "1280×720 (HD)", w: 1280, h: 720 },
  { label: "1920×1080 (FHD)", w: 1920, h: 1080 },
  { label: "3840×2160 (4K)", w: 3840, h: 2160 },
];

const LOCAL_KEY = "snapthumb.project.v3";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const snapTo = (v: number, step: number) => (step > 0 ? Math.round(v / step) * step : v);

function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms = 400) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  };
}

/** ✅ deepClone helper (avoids structuredClone for Vercel/node compat) */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/* --------------------------- Initial State --------------------------- */

function initialProject(): ProjectState {
  return {
    mode: "screenshot",
    exportW: 1920,
    exportH: 1080,
    gridOn: true,
    gridSize: 20,
    safeZonesOn: true,
    bgColor: "#000000",
    
    transparentBg: false,
    jpegQuality: 0.92,
baseImage: undefined,
    baseName: undefined,
    videoUrl: undefined,
    videoName: undefined,
    videoDuration: 0,
    videoTime: 0,
    videoReady: false,
    overlay: {
      src: undefined,
      x: 200,
      y: 200,
      w: 500,
      h: 200,
      rotation: 0,
      opacity: 1,
      shadow: 12,
      keepAspect: true,
      snap: true,
    },
  };
}

/** ✅ TS-safe loader (narrow null before JSON.parse) */
function loadProjectFromStorage(): ProjectState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ProjectState>;
    parsed.videoUrl = undefined;
    parsed.videoReady = false;
    const base = initialProject();
    const merged: ProjectState = {
      ...base,
      ...parsed,
      overlay: { ...base.overlay, ...(parsed.overlay || {}) },
      videoUrl: undefined,
      videoReady: false,
    };
    return merged;
  } catch {
    return null;
  }
}

/* ----------------------------- App ----------------------------- */

export default function App() {
  const [history, setHistory] = useState<HistoryState>(() => {
    const loaded = loadProjectFromStorage() ?? initialProject();
    return { past: [], present: loaded, future: [] };
  });

  const state = history.present;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const baseImgRef = useRef<HTMLImageElement | null>(null);
  const overlayImgRef = useRef<HTMLImageElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const commit = useCallback((next: ProjectState, clearFuture = true) => {
    setHistory((h) => {
      const MAX = 40;
      const newPast = [...h.past, h.present].slice(-MAX);
      return { past: newPast, present: next, future: clearFuture ? [] : h.future };
    });
  }, []);

  const mutate = useCallback(
    (fn: (draft: ProjectState) => void, clearFuture = true) => {
      const next = deepClone(state);
      fn(next);
      commit(next, clearFuture);
    },
    [state, commit]
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      const newPast = h.past.slice(0, -1);
      const newFuture = [h.present, ...h.future];
      return { past: newPast, present: previous, future: newFuture };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      const newFuture = h.future.slice(1);
      const newPast = [...h.past, h.present];
      return { past: newPast, present: next, future: newFuture };
    });
  }, []);

  const autosave = useMemo(
    () =>
      debounce((s: ProjectState) => {
        try {
          const toStore: ProjectState = { ...s, videoUrl: undefined, videoReady: false };
          localStorage.setItem(LOCAL_KEY, JSON.stringify(toStore));
        } catch {}
      }, 500),
    []
  );
  useEffect(() => {
    autosave(state);
  }, [state, autosave]);

  /* ------------------ Stage scale ------------------ */

  const { scale: stageScale } = useStageBounds(state.exportW, state.exportH);

  /* ------------------ Drag handling (move/resize/rotate) ------------------ */

  const dragState = useRef<{
    kind: "move" | "nw" | "ne" | "sw" | "se" | "rotate" | null;
    startX: number;
    startY: number;
    start: OverlayState | null;
    cxCss: number;
    cyCss: number;
    baseRotation: number;
    startAngle: number;
  }>({ kind: null, startX: 0, startY: 0, start: null, cxCss: 0, cyCss: 0, baseRotation: 0, startAngle: 0 });

  const startDrag = useCallback(
    (kind: "move" | "nw" | "ne" | "sw" | "se" | "rotate", e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);

      const start = deepClone(state.overlay);
      let cxCss = 0, cyCss = 0, baseRotation = start.rotation, startAngle = 0;
      const rect = stageRef.current?.getBoundingClientRect();
      if (rect) {
        cxCss = rect.left + (start.x + start.w / 2) * stageScale;
        cyCss = rect.top + (start.y + start.h / 2) * stageScale;
        startAngle = Math.atan2(e.clientY - cyCss, e.clientX - cxCss);
      }

      dragState.current = {
        kind,
        startX: e.clientX,
        startY: e.clientY,
        start,
        cxCss,
        cyCss,
        baseRotation,
        startAngle,
      };
    },
    [state.overlay, stageScale]
  );

  const onDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current.kind || !dragState.current.start) return;
      const dxCss = e.clientX - dragState.current.startX;
      const dyCss = e.clientY - dragState.current.startY;
      const dx = dxCss / stageScale;
      const dy = dyCss / stageScale;

      mutate((d: ProjectState) => {
        const o = d.overlay;
        const s = dragState.current.start!;
        const snap = s.snap ? d.gridSize : 0;

        if (dragState.current.kind === "move") {
          o.x = s.snap ? snapTo(s.x + dx, snap) : s.x + dx;
          o.y = s.snap ? snapTo(s.y + dy, snap) : s.y + dy;
        } else {
          const k = dragState.current.kind;
          if (k === "nw" || k === "ne" || k === "sw" || k === "se") {
            let nx = s.x, ny = s.y, nw = s.w, nh = s.h;
            const aspect = s.w / s.h || 1;

            if (k === "se") {
              nw = s.w + dx; nh = s.keepAspect ? nw / aspect : s.h + dy;
            } else if (k === "ne") {
              nw = s.w + dx; nh = s.keepAspect ? nw / aspect : s.h - dy; ny = s.y + (s.h - nh);
            } else if (k === "sw") {
              nw = s.w - dx; nh = s.keepAspect ? nw / aspect : s.h + dy; nx = s.x + (s.w - nw);
            } else if (k === "nw") {
              nw = s.w - dx; nh = s.keepAspect ? nw / aspect : s.h - dy;
              nx = s.x + (s.w - nw); ny = s.y + (s.h - nh);
            }

            nw = Math.max(20, nw);
            nh = Math.max(20, nh);
            if (s.snap) {
              nx = snapTo(nx, snap); ny = snapTo(ny, snap);
              nw = Math.max(20, snapTo(nw, snap)); nh = Math.max(20, snapTo(nh, snap));
            }
            o.x = nx; o.y = ny; o.w = nw; o.h = nh;
          } else if (k === "rotate") {
            const angNow = Math.atan2(e.clientY - dragState.current.cyCss, e.clientX - dragState.current.cxCss);
            let deg = dragState.current.baseRotation + (angNow - dragState.current.startAngle) * (180 / Math.PI);
            // Optional snapping when "Snap" toggle is on: snap to 15°
            if (s.snap) {
              deg = Math.round(deg / 15) * 15;
            }
            o.rotation = clamp(deg, -360, 360);
          }
        }
      }, false);
    },
    [mutate, stageScale]
  );

  const endDrag = useCallback((e: React.PointerEvent) => {
    if ((e.target as Element).hasPointerCapture(e.pointerId)) {
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
    dragState.current.kind = null;
    dragState.current.start = null;
    commit(history.present, true);
  }, [commit, history.present]);

  /* ---------------- Video handling ---------------- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      mutate((d) => { d.videoDuration = v.duration || 0; d.videoReady = true; }, false);
    };
    const onTimeUpdate = () => {
      mutate((d) => { d.videoTime = v.currentTime || 0; }, false);
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [mutate, state.videoUrl]);

  const seekVideo = useCallback(
    (t: number) => {
      const v = videoRef.current; if (!v) return;
      v.currentTime = clamp(t, 0, Math.max(0, state.videoDuration));
    },
    [state.videoDuration]
  );

  const captureFrameToBackground = useCallback(() => {
    const v = videoRef.current;
    if (!v || !state.videoReady) return;
    const canvas = document.createElement("canvas");
    canvas.width = state.exportW; canvas.height = state.exportH;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    ctx.fillStyle = state.bgColor || "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const vw = v.videoWidth || 1;
    const vh = v.videoHeight || 1;
    const scale = Math.max(canvas.width / vw, canvas.height / vh);
    const dw = vw * scale; const dh = vh * scale;
    const dx = (canvas.width - dw) / 2; const dy = (canvas.height - dh) / 2;
    try {
      ctx.drawImage(v, dx, dy, dw, dh);
      const dataUrl = canvas.toDataURL("image/png");
      mutate((d) => {
        d.baseImage = dataUrl;
        d.baseName = `${d.videoName || "frame"}@${Math.round(d.videoTime * 1000)}ms.png`;
      });
    } catch {}
  }, [mutate, state.videoReady, state.exportW, state.exportH, state.bgColor, state.videoName, state.videoTime]);

  /* ---------------- File pickers & drops ---------------- */
  const handleDropStage = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        mutate((d) => {
          d.mode = "video";
          d.videoUrl = url;
          d.videoName = file.name;
          d.videoTime = 0;
          d.videoDuration = 0;
          d.videoReady = false;
        });
      } else if (file.type.startsWith("image/")) {
        const dataUrl = await fileToDataUrl(file);
        mutate((d) => {
          if (!d.baseImage) {
            d.baseImage = dataUrl;
            d.baseName = file.name;
          } else {
            d.overlay.src = dataUrl;
            d.overlay.w = Math.round(d.exportW * 0.4);
            d.overlay.h = Math.round(d.overlay.w * 0.5);
            d.overlay.x = Math.round((d.exportW - d.overlay.w) / 2);
            d.overlay.y = Math.round((d.exportH - d.overlay.h) / 2);
          }
        });
      }
    },
    [mutate]
  );

  const onPickBackground = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const dataUrl = await fileToDataUrl(file);
      mutate((d) => { d.baseImage = dataUrl; d.baseName = file.name; });
    },
    [mutate]
  );

  const onPickOverlay = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const dataUrl = await fileToDataUrl(file);
      mutate((d) => {
        d.overlay.src = dataUrl;
        d.overlay.w = Math.round(d.exportW * 0.4);
        d.overlay.h = Math.round(d.overlay.w * 0.5);
        d.overlay.x = Math.round((d.exportW - d.overlay.w) / 2);
        d.overlay.y = Math.round((d.exportH - d.overlay.h) / 2);
      });
    },
    [mutate]
  );

  const onPickVideo = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) return;
      const url = URL.createObjectURL(file);
      mutate((d) => {
        d.mode = "video";
        d.videoUrl = url;
        d.videoName = file.name;
        d.videoTime = 0;
        d.videoDuration = 0;
        d.videoReady = false;
      });
    },
    [mutate]
  );

  /* ---------------- Export ---------------- */
  const exportPng = useCallback(async () => {
    const canvas =
      exportCanvasRef.current || (exportCanvasRef.current = document.createElement("canvas"));
    canvas.width = state.exportW; canvas.height = state.exportH;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    ctx.fillStyle = state.bgColor || "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state.baseImage) {
      await drawImageCover(ctx, state.baseImage, canvas.width, canvas.height);
    }

    if (state.overlay.src) {
      const o = state.overlay;
      const img = await loadImage(state.overlay.src);
      ctx.save();
      ctx.globalAlpha = clamp(o.opacity, 0, 1);
      ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
      ctx.rotate((o.rotation * Math.PI) / 180);
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = clamp(o.shadow, 0, 60);
      ctx.drawImage(img, -o.w / 2, -o.h / 2, o.w, o.h);
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL("image/png");
    const base = (state.baseName || "snapthumb").replace(/\.[a-zA-Z0-9]+$/, "");
    downloadDataUrl(`${base}_${state.exportW}x${state.exportH}.png`, dataUrl);
  }, [state]);
  const copyPng = useCallback(async () => {
    const canvas =
      exportCanvasRef.current || (exportCanvasRef.current = document.createElement("canvas"));
    canvas.width = state.exportW; canvas.height = state.exportH;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    if (!state.transparentBg) {
      ctx.fillStyle = state.bgColor || "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (state.baseImage) {
      const img = await loadImage(state.baseImage);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    if (state.overlay.src) {
      const o = state.overlay;
      const img = await loadImage(o.src!);
      ctx.save();
      ctx.globalAlpha = clamp(o.opacity, 0, 1);
      ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
      ctx.rotate((o.rotation * Math.PI) / 180);
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = clamp(o.shadow, 0, 60);
      ctx.drawImage(img, -o.w / 2, -o.h / 2, o.w, o.h);
      ctx.restore();
    }
    try {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("Clipboard blob failed");
      // @ts-ignore
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      alert("Copied PNG to clipboard ✅");
    } catch (err) {
      try {
        const dataUrl = canvas.toDataURL("image/png");
        await navigator.clipboard.writeText(dataUrl);
        alert("Copied PNG data URL (fallback).");
      } catch {
        alert("Clipboard copy failed.");
      }
    }
  }, [state]);

  const exportJpeg = useCallback(async () => {
    const canvas =
      exportCanvasRef.current || (exportCanvasRef.current = document.createElement("canvas"));
    canvas.width = state.exportW; canvas.height = state.exportH;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    // JPEG has no alpha; if transparentBg is true, force black
    ctx.fillStyle = state.transparentBg ? "#000" : (state.bgColor || "#000");
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (state.baseImage) {
      const img = await loadImage(state.baseImage);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    if (state.overlay.src) {
      const o = state.overlay;
      const img = await loadImage(o.src!);
      ctx.save();
      ctx.globalAlpha = clamp(o.opacity, 0, 1);
      ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
      ctx.rotate((o.rotation * Math.PI) / 180);
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = clamp(o.shadow, 0, 60);
      ctx.drawImage(img, -o.w / 2, -o.h / 2, o.w, o.h);
      ctx.restore();
    }
    const base = (state.baseName || "snapthumb").replace(/\.[a-zA-Z0-9]+$/, "");
    const dataUrl = canvas.toDataURL("image/jpeg", clamp(state.jpegQuality ?? 0.92, 0.01, 1));
    downloadDataUrl(`${base}_${state.exportW}x${state.exportH}.jpg`, dataUrl);
  }, [state]);


  const setPreset = useCallback(
    (p: ExportPreset) => {
      mutate((d) => {
        d.exportW = p.w; d.exportH = p.h;
        d.overlay.x = clamp(d.overlay.x, -d.exportW, d.exportW);
        d.overlay.y = clamp(d.overlay.y, -d.exportH, d.exportH);
      });
    },
    [mutate]
  );

  const clearProject = useCallback(() => {
    mutate((d) => {
      const keep = d.bgColor, gridOn = d.gridOn, gridSize = d.gridSize, safe = d.safeZonesOn;
      const w = d.exportW, h = d.exportH;
      Object.assign(d, initialProject());
      d.bgColor = keep; d.gridOn = gridOn; d.gridSize = gridSize; d.safeZonesOn = safe;
      d.exportW = w; d.exportH = h;
    });
  }, [mutate]);

  const removeOverlay = useCallback(() => {
    mutate((d) => { d.overlay.src = undefined; });
  }, [mutate]);

  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) { redo(); } else { undo(); }
        return;
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo(); return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","[","]"].includes(e.key)) {
        e.preventDefault();
        mutate((d) => {
          const o = d.overlay;
          if (e.key === "ArrowLeft") o.x -= step;
          if (e.key === "ArrowRight") o.x += step;
          if (e.key === "ArrowUp") o.y -= step;
          if (e.key === "ArrowDown") o.y += step;
          if (e.key === "[") o.rotation = clamp(o.rotation - (e.shiftKey ? 15 : 1), -360, 360);
          if (e.key === "]") o.rotation = clamp(o.rotation + (e.shiftKey ? 15 : 1), -360, 360);
        }, false);
        return;
      }
      if (e.key.toLowerCase() === "g") { mutate((d)=>void(d.gridOn=!d.gridOn), false); return; }
      if (e.key.toLowerCase() === "s") { mutate((d)=>void(d.safeZonesOn=!d.safeZonesOn), false); return; }
      if (e.key.toLowerCase() === "k") { mutate((d)=>void(d.overlay.keepAspect=!d.overlay.keepAspect), false); return; }
      if (e.key.toLowerCase() === "n") { mutate((d)=>void(d.overlay.snap=!d.overlay.snap), false); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mutate, undo, redo]);

  /* ------------------- Render ------------------- */
  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100">
      {/* Top bar */}
      <div className="sticky top-0 z-30 w-full border-b border-neutral-800 bg-neutral-900/80 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-4">
          <div className="flex flex-wrap items-center gap-2 py-2">
            <div className="mr-3 select-none font-semibold tracking-wide">
              Snapthumb
            </div>

            <Segmented
              value={state.mode}
              onChange={(m) => mutate((d) => void (d.mode = m))}
              options={[
                { label: "Screenshot", value: "screenshot" },
                { label: "Video", value: "video" },
              ]}
            />

            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-400">Export</label>
              <select
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm"
                value={`${state.exportW}x${state.exportH}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split("x").map(Number);
                  setPreset({ label: "", w, h });
                }}
              >
                {DEFAULT_PRESETS.map((p) => (
                  <option key={p.label} value={`${p.w}x${p.h}`}>{p.label}</option>
                ))}
                <option value={`${state.exportW}x${state.exportH}`}>Custom ({state.exportW}×{state.exportH})</option>
              </select>
              <NumberBox label="W" value={state.exportW} min={320} max={7680} step={10}
                onChange={(v) => mutate((d) => void (d.exportW = v))} />
              <NumberBox label="H" value={state.exportH} min={240} max={4320} step={10}
                onChange={(v) => mutate((d) => void (d.exportH = v))} />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Switch label="Grid" checked={state.gridOn}
                onChange={(v) => mutate((d) => void (d.gridOn = v))} />
              <NumberBox label="Cell" value={state.gridSize} min={5} max={200} step={5}
                onChange={(v) => mutate((d) => void (d.gridSize = v))} />
              <Switch label="Safe Zones" checked={state.safeZonesOn}
                onChange={(v) => mutate((d) => void (d.safeZonesOn = v))} />
            </div>

            <div className="flex items-center gap-2">
              <button className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
                onClick={exportPng}>Export PNG</button>
              <button className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
                onClick={exportJpeg}>Export JPEG</button>
              <button className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
                onClick={copyPng}>Copy</button>
              <button className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-40"
                onClick={captureFrameToBackground}
                disabled={state.mode !== "video" || !state.videoReady}
                title={state.videoReady ? "Capture current frame as background" : "Load & seek video first"}>
                Capture Frame
              </button>
              <button className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
                onClick={clearProject} title="Clear images, keep current export size and toggles">New</button>
              <button className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-40"
                onClick={undo} disabled={history.past.length === 0}>Undo</button>
              <button className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-40"
                onClick={redo} disabled={history.future.length === 0}>Redo</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[1fr_320px]">
        {/* Left: Stage */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FileButton label="Pick Background" accept="image/*" onPick={onPickBackground} />
            <FileButton label="Pick Overlay" accept="image/*" onPick={onPickOverlay} />
            <FileButton label="Pick Video" accept="video/*" onPick={onPickVideo}
              disabled={state.mode !== "video"}
              title={state.mode !== "video" ? "Switch to Video mode first" : ""} />
            <div className="text-xs text-neutral-400">Tip: drag & drop files directly onto the stage.</div>
          </div>

          <div
            ref={stageRef}
            className="relative mx-auto touch-none select-none overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900"
            style={{ width: Math.round(state.exportW * stageScale), height: Math.round(state.exportH * stageScale) }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropStage}
          >
            <StageBackground
              exportW={state.exportW}
              exportH={state.exportH}
              scale={stageScale}
              baseImage={state.baseImage}
              bgColor={state.bgColor}
              baseImgRef={baseImgRef}
            />

            {state.gridOn && (
              <GridOverlay w={state.exportW} h={state.exportH} scale={stageScale} cell={state.gridSize} />
            )}

            {state.safeZonesOn && (
              <SafeZoneOverlay w={state.exportW} h={state.exportH} scale={stageScale} />
            )}

            {state.overlay.src && (
              <OverlayView
                overlay={state.overlay}
                scale={stageScale}
                imgRef={overlayImgRef}
                onStartDrag={startDrag}
                onDrag={onDrag}
                onEndDrag={endDrag}
              />
            )}

            {state.mode === "video" && state.videoUrl && (
              <video
                ref={videoRef}
                src={state.videoUrl}
                className="pointer-events-none absolute left-2 top-2 h-0 w-0 opacity-0"
                preload="metadata"
                playsInline
                crossOrigin="anonymous"
              />
            )}
          </div>

          {state.mode === "video" && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
                {state.videoName ? <span className="text-neutral-300">{state.videoName}</span> : <span className="text-neutral-500">No video loaded</span>}
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0.01, state.videoDuration)}
                step={0.01}
                value={state.videoTime}
                onChange={(e) => seekVideo(Number(e.target.value))}
                className="w-64 accent-neutral-300"
              />
              <TimeBadge time={state.videoTime} /> / <TimeBadge time={state.videoDuration} />
              <button
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-40"
                onClick={() => {
                  const v = videoRef.current; if (!v) return;
                  if (v.paused) v.play().catch(() => {}); else v.pause();
                }}
                disabled={!state.videoUrl}
              >
                Play/Pause
              </button>
            </div>
          )}
        </div>

        {/* Right: Panels */}
        <div className="sticky top-[56px] h-fit space-y-4">
          <Panel title="Background">
            <div className="space-y-2">
              <ColorBox label="Fallback" value={state.bgColor}
                onChange={(v) => mutate((d) => void (d.bgColor = v))} />
              <div className="text-xs text-neutral-400">
                Background color shows behind the base image (letterboxing) and before capture.
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs hover:bg-neutral-800"
                onClick={() => mutate((d) => { d.overlay.x = (d.exportW - d.overlay.w)/2; d.overlay.y = (d.exportH - d.overlay.h)/2; })}>
                Center
              </button>
              <button className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs hover:bg-neutral-800"
                onClick={() => mutate((d) => { d.overlay.rotation = 0; })}>
                Reset Rotation
              </button>
            </div>
          </Panel>

          <Panel
            title="Overlay"
            right={
              <button className="text-xs text-neutral-400 hover:text-neutral-200 disabled:opacity-40"
                onClick={removeOverlay} disabled={!state.overlay.src}>
                Remove
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <NumberBox label="X" value={Math.round(state.overlay.x)} step={1}
                onChange={(v) => mutate((d) => void (d.overlay.x = v))} />
              <NumberBox label="Y" value={Math.round(state.overlay.y)} step={1}
                onChange={(v) => mutate((d) => void (d.overlay.y = v))} />
              <NumberBox label="W" value={Math.round(state.overlay.w)} min={10} step={1}
                onChange={(v) => mutate((d) => void (d.overlay.w = Math.max(10, v)))} />
              <NumberBox label="H" value={Math.round(state.overlay.h)} min={10} step={1}
                onChange={(v) => mutate((d) => void (d.overlay.h = Math.max(10, v)))} />
              <NumberBox label="Rot" value={Math.round(state.overlay.rotation)} min={-360} max={360} step={1}
                onChange={(v) => mutate((d) => void (d.overlay.rotation = v))} />
              <NumberBox label="Opacity" value={Math.round(state.overlay.opacity * 100)} min={0} max={100} step={1}
                onChange={(v) => mutate((d) => void (d.overlay.opacity = clamp(v / 100, 0, 1)))} suffix="%" />
              <NumberBox label="Shadow" value={state.overlay.shadow} min={0} max={60} step={1}
                onChange={(v) => mutate((d) => void (d.overlay.shadow = v))} />
              <Switch label="Aspect Lock" checked={state.overlay.keepAspect}
                onChange={(v) => mutate((d) => void (d.overlay.keepAspect = v))} />
              <Switch label="Snap" checked={state.overlay.snap}
                onChange={(v) => mutate((d) => void (d.overlay.snap = v))} />
            </div>
            <div className="mt-2 flex gap-2">
              <button className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs hover:bg-neutral-800"
                onClick={() => mutate((d) => { d.overlay.x = (d.exportW - d.overlay.w)/2; d.overlay.y = (d.exportH - d.overlay.h)/2; })}>
                Center
              </button>
              <button className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs hover:bg-neutral-800"
                onClick={() => mutate((d) => { d.overlay.rotation = 0; })}>
                Reset Rotation
              </button>
            </div>
          </Panel>

          <Panel title="Shortcuts">
            <ul className="list-disc pl-5 text-sm text-neutral-300">
              <li>Undo/Redo: ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z</li>
              <li>Drag & drop: first image → background, next image → overlay; videos in Video mode</li>
              <li>Resize from corners; hold <em>Snap</em> to snap rotation to 15°</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- UI Components ------------------------------- */

function Panel({
  title,
  right,
  children,
}: PropsWithChildren<{ title: string; right?: React.ReactNode }>) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-neutral-200">{title}</div>
        {right}
      </div>
      <div>{children}</div>
    </div>
  );
}

function FileButton({
  label,
  accept,
  onPick,
  disabled,
  title,
}: {
  label: string;
  accept: string;
  onPick: (file: File) => void | Promise<void>;
  disabled?: boolean;
  title?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <button
        className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-40"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title={title}
      >
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.currentTarget.value = "";
        }}
      />
    </>
  );
}

function NumberBox({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm">
      <span className="min-w-[2.25rem] text-neutral-400">{label}</span>
      <input
        type="number"
        className="w-20 bg-transparent text-neutral-100 outline-none"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {suffix && <span className="text-neutral-500">{suffix}</span>}
    </label>
  );
}

function ColorBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-sm">
      <span className="text-neutral-400">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-12 cursor-pointer rounded border border-neutral-700 bg-neutral-800 p-0"
      />
    </label>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1">
      <span className="text-sm text-neutral-300">{label}</span>
      <span
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition
          ${checked ? "bg-neutral-300" : "bg-neutral-700"}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-neutral-950 transition
            ${checked ? "translate-x-5" : "translate-x-1"}`}
        />
      </span>
    </label>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 text-sm">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 transition ${
              active ? "bg-neutral-200 text-neutral-900" : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TimeBadge({ time }: { time: number }) {
  const s = Math.floor(time % 60).toString().padStart(2, "0");
  const m = Math.floor(time / 60).toString().padStart(2, "0");
  return <span className="rounded-md bg-neutral-800 px-2 py-1 text-xs">{m}:{s}</span>;
}

/* ------------------------------ Stage elements ------------------------------ */

function useStageBounds(exportW: number, exportH: number) {
  const [containerW, setContainerW] = useState<number>(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setContainerW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const maxW = Math.min(1200, containerW - 40);
  const scale = Math.min(1, maxW / exportW);
  return { scale };
}

function StageBackground({
  exportW,
  exportH,
  scale,
  baseImage,
  bgColor,
  baseImgRef,
}: {
  exportW: number;
  exportH: number;
  scale: number;
  baseImage?: string;
  bgColor: string;
  baseImgRef: React.MutableRefObject<HTMLImageElement | null>;
}) {
  return (
    <div
      className="absolute left-0 top-0"
      style={{ width: exportW * scale, height: exportH * scale, background: bgColor }}
    >
      {baseImage && (
        <img
          ref={baseImgRef}
          src={baseImage}
          alt="base"
          className="h-full w-full object-cover"
          draggable={false}
        />
      )}
    </div>
  );
}

function GridOverlay({ w, h, scale, cell }: { w: number; h: number; scale: number; cell: number }) {
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const lines: JSX.Element[] = [];
  for (let i = 1; i < cols; i++) {
    const x = Math.round(i * cell * scale);
    lines.push(<div key={`v${i}`} className="absolute top-0 h-full border-l border-neutral-700/40" style={{ left: x }} />);
  }
  for (let j = 1; j < rows; j++) {
    const y = Math.round(j * cell * scale);
    lines.push(<div key={`h${j}`} className="absolute left-0 w-full border-t border-neutral-700/40" style={{ top: y }} />);
  }
  return <div className="pointer-events-none absolute inset-0">{lines}</div>;
}

function SafeZoneOverlay({ w, h, scale }: { w: number; h: number; scale: number }) {
  const inset = 0.05;
  const left = Math.round(w * inset * scale);
  const top = Math.round(h * inset * scale);
  const right = Math.round(w * (1 - inset) * scale);
  const bottom = Math.round(h * (1 - inset) * scale);

  const thirdX1 = Math.round((w / 3) * scale);
  const thirdX2 = Math.round((2 * w / 3) * scale);
  const thirdY1 = Math.round((h / 3) * scale);
  const thirdY2 = Math.round((2 * h / 3) * scale);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute rounded-md border border-emerald-400/60"
        style={{
          left, top, width: right - left, height: bottom - top,
          boxShadow: "0 0 0 9999px rgba(16,16,16,0.25) inset",
        }}
      />
      <div className="absolute top-0 h-full border-l border-emerald-400/30" style={{ left: thirdX1 }} />
      <div className="absolute top-0 h-full border-l border-emerald-400/30" style={{ left: thirdX2 }} />
      <div className="absolute left-0 w-full border-t border-emerald-400/30" style={{ top: thirdY1 }} />
      <div className="absolute left-0 w-full border-t border-emerald-400/30" style={{ top: thirdY2 }} />
    </div>
  );
}

function OverlayView({
  overlay,
  scale,
  imgRef,
  onStartDrag,
  onDrag,
  onEndDrag,
}: {
  overlay: OverlayState;
  scale: number;
  imgRef: React.MutableRefObject<HTMLImageElement | null>;
  onStartDrag: (k: "move" | "nw" | "ne" | "sw" | "se" | "rotate", e: React.PointerEvent) => void;
  onDrag: (e: React.PointerEvent) => void;
  onEndDrag: (e: React.PointerEvent) => void;
}) {
  const style: React.CSSProperties = {
    left: overlay.x * scale,
    top: overlay.y * scale,
    width: overlay.w * scale,
    height: overlay.h * scale,
    transform: `rotate(${overlay.rotation}deg)`,
    transformOrigin: "center center",
    opacity: overlay.opacity,
    filter: overlay.shadow > 0 ? `drop-shadow(0 0 ${Math.round(overlay.shadow)}px rgba(0,0,0,0.8))` : "none",
  };
  const handleStyle =
    "absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-200 bg-neutral-100";
  return (
    <div className="absolute z-10" style={style} onPointerMove={onDrag} onPointerUp={onEndDrag}>
      <img
        ref={imgRef}
        src={overlay.src}
        alt="overlay"
        className="h-full w-full cursor-move select-none rounded-md"
        draggable={false}
        onPointerDown={(e) => onStartDrag("move", e)}
      />
      {/* Corner handles */}
      <div className={`${handleStyle} left-0 top-0 cursor-nwse-resize`} onPointerDown={(e) => onStartDrag("nw", e)} />
      <div className={`${handleStyle} left-full top-0 cursor-nesw-resize`} onPointerDown={(e) => onStartDrag("ne", e)} />
      <div className={`${handleStyle} left-0 top-full cursor-nesw-resize`} onPointerDown={(e) => onStartDrag("sw", e)} />
      <div className={`${handleStyle} left-full top-full cursor-nwse-resize`} onPointerDown={(e) => onStartDrag("se", e)} />
      {/* Rotate handle */}
      <div
        className="absolute left-1/2 top-0 z-20 h-3 w-3 -translate-x-1/2 -translate-y-6 rounded-full border border-neutral-200 bg-neutral-100 cursor-crosshair"
        onPointerDown={(e) => onStartDrag("rotate", e)}
        title="Rotate"
      />
      {/* Bounding box */}
      <div className="pointer-events-none absolute inset-0 rounded-md border border-neutral-200/60" />
    </div>
  );
}

/* ------------------------------- Image helpers ------------------------------- */

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

async function drawImageCover(
  ctx: CanvasRenderingContext2D,
  src: string,
  W: number,
  H: number
) {
  const img = await loadImage(src);
  const sw = img.width;
  const sh = img.height;
  const scale = Math.max(W / sw, H / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}
