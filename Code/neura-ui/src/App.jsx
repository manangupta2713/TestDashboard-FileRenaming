// src/App.jsx
import { useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import OpsConsole, {
  OpsConsoleProvider,
  RecentFoldersPanel,
} from "./components/OpsConsole";
import DatasetActionsDashboard from "./dataset/DatasetActionsDashboard";
import FaceDashboard from "./face/FaceDashboard";
import FaceRightRail from "./face/FaceRightRail";

const DASH_LIST = [
  {
    key: "rename",
    label: "File Renaming",
    hint: "Smart prefixes & suffixes",
    title: "NeuraMax Smart Renamer",
    subtitle: "Pastel Boohoo NeuraMax · Glass dashboard · Single-folder safe renaming",
    gradient: "from-nm_teal via-nm_yellow to-nm_pink",
  },
  {
    key: "dataset",
    label: "Dataset Actions",
    hint: "Caption atelier & utilities",
    title: "NeuraMax Dataset Agent",
    subtitle: "Warm atelier · Caption tooling · CSV-ready reports",
    gradient: "from-[#ffb88c] via-[#ff9051] to-[#f6745f]",
  },
  {
    key: "faces",
    label: "Face Studio",
    hint: "Similarity sweeps & cropper",
    title: "NeuraMax Face Studio",
    subtitle: "Maroon nebula · InsightFace automation · Elegant MDB flow",
    gradient: "from-[#5c1d20] via-[#3b0f14] to-[#120405]",
  },
];

const FACE_ANCHORS = [
  { label: "Face 1", min: 0.5663, strict: 0.5773 },
  { label: "Face 2", min: 0.5721, strict: 0.5851 },
  { label: "Face 3", min: 0.5611, strict: 0.5744 },
];

const FACE_SYSTEM_NOTES = [
  "GPU mode uses InsightFace r100 via ONNX CUDA.",
  "Logs mirror the FastAPI job manager; adapters arriving next sprint.",
  "Right rail updates live as the SvelteKit job poller streams state.",
];

const FACE_TIP =
  "While InsightFace jobs are simulated right now, the UI already enforces the exact payloads the scripts expect (folders, thresholds, calibration CSVs).";

export default function App() {
  const [activeDash, setActiveDash] = useState("rename");
  const isDarkTheme = activeDash !== "dataset";
  const contentHeightClass =
    activeDash === "faces" ? "min-h-[1180px]" : "min-h-[720px]";
  const [faceRailData, setFaceRailData] = useState({
    step1Status: null,
    step2Status: null,
    cropStatus: null,
    recentLogs: [],
  });

  const gradients = useMemo(
    () => ({
      rename: (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#050816] via-[#061222] to-[#160b28]" />
          <Motion.div
            key="rename-bg-1"
            className="pointer-events-none absolute left-0 top-0 h-[32rem] w-[32rem] rounded-full bg-[#050819] blur-3xl"
            initial={{ x: "-50%", y: "-50%", scale: 1 }}
            animate={{ scale: [1, 1.04, 1], x: "-50%", y: "-50%" }}
            transition={{ duration: 28, repeat: Infinity, repeatType: "mirror" }}
          />
          <Motion.div
            key="rename-bg-2"
            className="pointer-events-none absolute left-0 top-0 h-[6rem] w-[6rem] rounded-full bg-[#1c2a55] opacity-70 blur-2xl"
            initial={{ x: "-50%", y: "-50%", scale: 1 }}
            animate={{ scale: [1, 1.08, 1], x: "-50%", y: "-50%" }}
            transition={{ duration: 22, repeat: Infinity, repeatType: "mirror" }}
          />
          <Motion.div
            key="rename-bg-3"
            className="pointer-events-none absolute right-0 bottom-0 h-[22rem] w-[22rem] rounded-full bg-gradient-to-tr from-[#14091f] via-[#4c238a] to-[#0f0517] blur-3xl opacity-55"
            initial={{ x: "50%", y: "50%", scale: 1 }}
            animate={{ scale: [1, 1.05, 1], x: "50%", y: "50%" }}
            transition={{ duration: 30, repeat: Infinity, repeatType: "mirror" }}
          />
          <Motion.div
            key="rename-bg-4"
            className="pointer-events-none absolute right-0 bottom-0 h-[4.5rem] w-[4.5rem] rounded-full bg-white/18 blur-2xl"
            initial={{ x: "50%", y: "50%", scale: 1 }}
            animate={{ scale: [1, 1.08, 1], x: "50%", y: "50%" }}
            transition={{ duration: 18, repeat: Infinity, repeatType: "mirror" }}
          />
        </>
      ),
      dataset: (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#f6dcc3] via-[#f2cbb0] to-[#f4deb8]" />
          <Motion.div
            key="dataset-bg-1"
            className="pointer-events-none absolute left-[-10%] top-[-5%] h-[30rem] w-[30rem] rounded-full bg-[#ffb88c] blur-[160px]"
            animate={{ rotate: [0, 5, 0] }}
            transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
          />
          <Motion.div
            key="dataset-bg-2"
            className="pointer-events-none absolute right-[-5%] bottom-[-5%] h-[30rem] w-[30rem] rounded-full bg-[#c1583d] blur-[150px] opacity-85"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 24, repeat: Infinity, repeatType: "mirror" }}
          />
        </>
      ),
      faces: (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#1c0509] via-[#24070c] to-[#0a0203]" />
          <Motion.div
            key="faces-bg-1"
            className="pointer-events-none absolute left-[-5%] top-[-5%] h-[28rem] w-[28rem] rounded-full bg-[#5c1d20]/50 blur-[150px]"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 26, repeat: Infinity, repeatType: "mirror" }}
          />
          <Motion.div
            key="faces-bg-2"
            className="pointer-events-none absolute right-[-10%] bottom-[-10%] h-[32rem] w-[32rem] rounded-full bg-[#ff784f]/30 blur-[180px]"
            animate={{ rotate: [0, 8, 0] }}
            transition={{ duration: 32, repeat: Infinity, repeatType: "mirror" }}
          />
        </>
      ),
    }),
    []
  );

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden ${
        isDarkTheme ? "bg-nm_bg text-slate-50" : "bg-[#f4ede1] text-slate-700"
      }`}
    >
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <Motion.div
            key={activeDash}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0"
          >
            {gradients[activeDash]}
          </Motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 min-h-screen flex justify-center px-6 lg:px-12 pt-6 pb-12">
        <div className="w-full max-w-[1600px] flex gap-10">
          <aside
            className={`hidden lg:flex w-72 flex-col self-start rounded-3xl backdrop-blur-xl p-6 shadow-[0_25px_70px_rgba(0,0,0,0.22)] ${
              isDarkTheme
                ? "bg-white/15 border border-white/30"
                : "bg-white/85 border border-slate-500/40"
            }`}
            style={{ height: "1280px" }}
          >
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400 mb-6">
              Dashboards
            </p>
            <Motion.ul
              variants={{
                visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
                hidden: {},
              }}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-4"
            >
              {DASH_LIST.map((dash) => (
                <Motion.li
                  key={dash.key}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 },
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveDash(dash.key)}
                    className={`w-full rounded-2xl px-4 py-3 text-left transition-all ${
                      dash.key === activeDash
                        ? isDarkTheme
                          ? "bg-white text-slate-900 shadow-lg shadow-black/20"
                          : "bg-white text-slate-900 shadow-lg shadow-black/20"
                        : isDarkTheme
                        ? "bg-white/5 text-slate-200 hover:bg-white/10"
                        : "bg-white/40 text-slate-700 hover:bg-white/60"
                    }`}
                  >
                    <div className="text-sm font-semibold">{dash.label}</div>
                    <div
                      className={`text-xs ${
                        dash.key === activeDash ? "opacity-90 font-semibold not-italic" : "opacity-60 italic"
                      }`}
                    >
                      {dash.hint}
                    </div>
                  </button>
                </Motion.li>
              ))}
            </Motion.ul>
          </aside>

          <div className={`flex-1 flex flex-col ${isDarkTheme ? "gap-10" : "gap-6"}`}>
            <header className="flex justify-center w-full">
              <Motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full"
              >
                <div
                className={`rounded-card px-6 py-4 md:px-8 md:py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between relative overflow-hidden ${
                    isDarkTheme
                      ? "bg-[rgba(10,15,30,0.9)] backdrop-blur-3xl text-slate-100 shadow-[0_22px_60px_rgba(0,0,0,0.85)] border border-white/5"
                      : "bg-white/85 text-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.12)] border border-slate-500/40"
                  }`}
                >
                  {!isDarkTheme && (
                    <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  )}
                  <div className="relative">
                    <h1
                      className={`text-2xl md:text-[1.7rem] font-semibold tracking-tight bg-gradient-to-r ${DASH_LIST.find((d) => d.key === activeDash)?.gradient} bg-clip-text text-transparent drop-shadow-[0_0_22px_rgba(0,0,0,0.25)]`}
                    >
                      {DASH_LIST.find((d) => d.key === activeDash)?.title}
                    </h1>
                    <p
                      className={`text-xs md:text-sm mt-1 ${
                        isDarkTheme ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {DASH_LIST.find((d) => d.key === activeDash)?.subtitle}
                    </p>
                  </div>
                  <div
                    className={`mt-2 md:mt-0 flex items-center text-[11px] gap-2 ${
                      isDarkTheme ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    <span
                    className={`inline-flex h-2 w-2 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.9)] ${
                        isDarkTheme ? "bg-emerald-400" : "bg-[#ff9051]"
                      }`}
                    />
                    <span>Backend: localhost:8000</span>
                  </div>
                </div>
              </Motion.div>
            </header>

            <div
              className={`w-full relative flex flex-col items-center ${contentHeightClass}`}
            >
              <OpsConsoleProvider>
                <div className={activeDash === "rename" ? "w-full" : "hidden w-full"}>
                  <OpsConsole />
                  <aside
                    className={`${
                      activeDash === "rename" ? "hidden 2xl:block" : "hidden"
                    } absolute top-0 right-[-20rem] w-[18rem]`}
                  >
                    <RecentFoldersPanel />
                  </aside>
                  <aside
                    className={`${activeDash === "rename" ? "2xl:hidden" : "hidden"} mt-8 w-full`}
                  >
                    <RecentFoldersPanel />
                  </aside>
                </div>
              </OpsConsoleProvider>
              <div className={activeDash === "dataset" ? "w-full" : "hidden w-full"}>
                <DatasetActionsDashboard />
              </div>
              <div className={activeDash === "faces" ? "w-full" : "hidden w-full"}>
                <FaceDashboard
                  onStatusUpdate={(payload) =>
                    setFaceRailData((prev) => ({
                      ...prev,
                      ...payload,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <aside className="hidden xl:block w-[22rem]">
            {activeDash === "faces" ? (
              <FaceRightRail
                anchors={FACE_ANCHORS}
                systemNotes={FACE_SYSTEM_NOTES}
                tip={FACE_TIP}
                recentLogs={faceRailData.recentLogs}
                step1Status={faceRailData.step1Status}
                step2Status={faceRailData.step2Status}
                cropStatus={faceRailData.cropStatus}
              />
            ) : (
              <div className="opacity-0 select-none">.</div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
