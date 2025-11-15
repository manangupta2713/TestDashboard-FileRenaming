// src/App.jsx
import { motion } from "framer-motion";
import OpsConsole from "./components/OpsConsole";

export default function App() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-nm_bg text-slate-50">
      {/* Soft gradient background across full screen */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#050816] via-[#061222] to-[#160b28]" />

      {/* Top-left: midnight navy + small white core anchored at corner */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-[32rem] w-[32rem]
                   -translate-x-1/2 -translate-y-1/2 rounded-full
                   bg-[#050819] blur-3xl"
      />
      <div
        className="pointer-events-none absolute left-0 top-0 h-[7rem] w-[7rem]
                   -translate-x-1/2 -translate-y-1/2 rounded-full
                   bg-white/45 blur-2xl"
      />

      {/* Bottom-right: violet/pink + small white core anchored at corner */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 h-[26rem] w-[26rem]
                   translate-x-1/2 translate-y-1/2 rounded-full
                   bg-gradient-to-tr from-[#2a103e] via-[#8a47f5] to-[#170b28]
                   blur-3xl"
      />
      <div
        className="pointer-events-none absolute right-0 bottom-0 h-[7rem] w-[7rem]
                   translate-x-1/2 translate-y-1/2 rounded-full
                   bg-white/60 blur-2xl"
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar / title region – 75% width centered */}
        <header className="px-6 pt-6 pb-4 flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-[75vw] max-w-5xl"
          >
            <div
              className="rounded-card px-6 py-4 md:px-8 md:py-4
                         bg-[rgba(10,15,30,0.85)] backdrop-blur-3xl
                         shadow-[0_22px_60px_rgba(0,0,0,0.85)]
                         flex flex-col gap-2 md:flex-row md:items-center md:justify-between
                         relative overflow-hidden"
            >
              {/* soft inner highlight at top */}
              <div className="pointer-events-none absolute inset-x-4 top-0 h-1/2 bg-gradient-to-b from-white/12 to-transparent" />
              {/* faint bottom edge light */}
              <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <div>
                <h1
                  className="text-2xl md:text-[1.7rem] font-semibold tracking-tight
                            bg-gradient-to-r from-nm_teal via-nm_yellow to-nm_pink
                            bg-clip-text text-transparent
                            drop-shadow-[0_0_25px_rgba(79,209,197,0.55)]"
                >
                  NeuraMax Smart Renamer
                </h1>
                <p className="text-xs md:text-sm text-slate-300 mt-1">
                  <span className="font-semibold text-slate-100/90">Pastel NeuraMax</span>
                  <span className="mx-1">·</span>
                  <span className="italic text-slate-300/90">Glass dashboard</span>
                  <span className="mx-1">·</span>
                  <span className="text-slate-300/80">Single-folder safe renaming</span>
                </p>
              </div>
              <div className="mt-2 md:mt-0 flex items-center text-[11px] text-slate-400 gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                <span>Backend: localhost:8000</span>
              </div>
            </div>
          </motion.div>
        </header>

        {/* Main content – 75% width centered */}
        <main className="flex-1 flex px-6 pb-8 justify-center mt-1">
          <div className="w-[75vw] max-w-5xl flex">
            <OpsConsole />
          </div>
        </main>
      </div>
    </div>
  );
}
