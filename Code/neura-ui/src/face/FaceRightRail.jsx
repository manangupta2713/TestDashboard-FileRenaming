export default function FaceRightRail({
  anchors,
  systemNotes,
  tip,
  recentLogs,
  step1Status,
  step2Status,
  cropStatus,
}) {
  const stateTone = (status) => {
    if (!status) return "text-white/60";
    if (status.state === "completed") return "text-emerald-300";
    if (status.state === "running") return "text-amber-300";
    if (status.state === "failed" || status.error) return "text-rose-400";
    return "text-white/70";
  };

  return (
    <aside className="rounded-[32px] border border-white/15 bg-black/30 backdrop-blur-xl shadow-[0_25px_70px_rgba(0,0,0,0.45)] p-6 space-y-5">
      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Anchor thresholds</p>
        <div className="space-y-3">
          {anchors.map((anchor) => (
            <div
              key={anchor.label}
              className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-white">{anchor.label}</p>
                <p className="text-[11px] text-white/60 mt-0.5">
                  MIN {anchor.min} · STRICT {anchor.strict}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold tracking-[0.25em] uppercase bg-gradient-to-r from-amber-300 to-orange-200 text-black">
                Calibrated
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <section className="space-y-3 text-sm text-white/80">
        <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Live jobs</p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Step 1</span>
            <span className={stateTone(step1Status)}>{step1Status ? step1Status.state : "idle"}</span>
          </div>
          <div className="flex justify-between">
            <span>Step 2</span>
            <span className={stateTone(step2Status)}>{step2Status ? step2Status.state : "idle"}</span>
          </div>
          <div className="flex justify-between">
            <span>Cropper</span>
            <span className={stateTone(cropStatus)}>{cropStatus ? cropStatus.state : "idle"}</span>
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <section className="space-y-3 text-sm text-white/80">
        <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">System brief</p>
        <ul className="space-y-2">
          {systemNotes.map((note) => (
            <li key={note} className="flex gap-2">
              <span className="text-amber-300">•</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-[12px] text-white/70">
          {tip}
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <section className="space-y-3 text-sm text-white/80">
        <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Recent logs</p>
        <div className="max-h-48 overflow-y-auto pr-1 space-y-2 text-[12px]">
          {recentLogs.length === 0 ? (
            <p className="text-white/40">Runs will stream log lines here.</p>
          ) : (
            recentLogs.map((line, index) => (
              <p key={`${line}-${index}`} className="border-l border-amber-200/40 pl-2 leading-snug">
                {recentLogs.length - index}. {line}
              </p>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}
