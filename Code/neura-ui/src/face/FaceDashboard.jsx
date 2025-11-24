import { useEffect, useState } from "react";

const DEFAULT_DEV_FACE_STUDIO_URL = "http://127.0.0.1:5174";
const withEmbedParam = (url) => (url.includes("?") ? `${url}&embed=1` : `${url}?embed=1`);

const FACE_STUDIO_URL = import.meta.env.DEV
  ? withEmbedParam(import.meta.env.VITE_FACE_STUDIO_DEV_URL || DEFAULT_DEV_FACE_STUDIO_URL)
  : withEmbedParam("/face-studio/index.html");

export default function FaceDashboard({ onStatusUpdate }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const handler = (event) => {
      if (!event.data || event.data.type !== "face-status") return;
      onStatusUpdate?.(event.data.payload);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onStatusUpdate]);

  return (
    <div className="flex flex-col w-full min-h-[1152px]">
      <div className="flex-1 min-h-[1152px] rounded-[34px] border border-white/10 bg-black/30 shadow-[0_40px_140px_rgba(0,0,0,0.45)] overflow-hidden relative">
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-200/70 backdrop-blur-sm">
            <div className="h-10 w-10 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs tracking-[0.35em] uppercase">Loading Face Studio</p>
          </div>
        )}
        <iframe
          title="NeuraMax Face Studio"
          src={FACE_STUDIO_URL}
          onLoad={() => setIsLoaded(true)}
          className="w-full min-h-[1152px] border-0 bg-transparent"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
