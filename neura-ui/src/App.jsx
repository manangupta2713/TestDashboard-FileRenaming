// src/App.jsx
import { motion } from "framer-motion";
import OpsConsole, {
  OpsConsoleProvider,
  RecentFoldersPanel,
} from "./components/OpsConsole";

export default function App() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-nm_bg text-slate-50">
      {/* Soft gradient background across full screen */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#050816] via-[#061222] to-[#160b28]" />

      {/* Top-left: midnight navy + subtle blue core */}
      <motion.div
        className="pointer-events-none absolute left-0 top-0 h-[32rem] w-[32rem]
                   rounded-full bg-[#050819] blur-3xl"
        initial={{ x: "-50%", y: "-50%", scale: 1 }}
        animate={{ scale: [1, 1.04, 1], x: "-50%", y: "-50%" }}
        transition={{ duration: 28, repeat: Infinity, repeatType: "mirror" }}
      />
      <motion.div
        className="pointer-events-none absolute left-0 top-0 h-[6rem] w-[6rem]
                   rounded-full bg-[#1c2a55] opacity-70 blur-2xl"
        initial={{ x: "-50%", y: "-50%", scale: 1 }}
        animate={{ scale: [1, 1.08, 1], x: "-50%", y: "-50%" }}
        transition={{ duration: 22, repeat: Infinity, repeatType: "mirror" }}
      />

      {/* Bottom-right: violet/pink + soft white core */}
      <motion.div
        className="pointer-events-none absolute right-0 bottom-0 h-[22rem] w-[22rem]
                   rounded-full bg-gradient-to-tr from-[#14091f] via-[#4c238a] to-[#0f0517]
                   blur-3xl opacity-55"
        initial={{ x: "50%", y: "50%", scale: 1 }}
        animate={{ scale: [1, 1.05, 1], x: "50%", y: "50%" }}
        transition={{ duration: 30, repeat: Infinity, repeatType: "mirror" }}
      />
      <motion.div
        className="pointer-events-none absolute right-0 bottom-0 h-[4.5rem] w-[4.5rem]
                   rounded-full bg-white/18 blur-2xl"
        initial={{ x: "50%", y: "50%", scale: 1 }}
        animate={{ scale: [1, 1.08, 1], x: "50%", y: "50%" }}
        transition={{ duration: 18, repeat: Infinity, repeatType: "mirror" }}
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center px-6 pt-6 pb-8">
        <OpsConsoleProvider>
          <div className="w-full max-w-7xl flex flex-col flex-1 gap-8">
            <header className="flex justify-center w-full">
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-5xl"
              >
                <div
                  className="rounded-card px-6 py-4 md:px-8 md:py-4
                             bg-[rgba(10,15,30,0.85)] backdrop-blur-3xl
                             shadow-[0_22px_60px_rgba(0,0,0,0.85)]
                             flex flex-col gap-2 md:flex-row md:items-center md:justify-between
                             relative overflow-hidden"
                >
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-1/2 bg-gradient-to-b from-white/12 to-transparent" />
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

            <div className="w-full relative flex flex-col items-center">
              <div className="w-full max-w-5xl">
                <OpsConsole />
              </div>
              <aside className="hidden lg:block absolute top-0 right-[-18rem] w-[18rem]">
                <RecentFoldersPanel />
              </aside>
              <aside className="lg:hidden mt-8 w-full">
                <RecentFoldersPanel />
              </aside>
            </div>
          </div>
        </OpsConsoleProvider>
      </div>
    </div>
  );
}
