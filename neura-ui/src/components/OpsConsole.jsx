// src/components/OpsConsole.jsx
// Pastel NeuraMax glass card + folder selector + 4-row operations grid + Preview wiring

import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

const OP_ROWS = [
  { key: "add_prefix", label: "Add prefix" },
  { key: "remove_prefix", label: "Remove prefix" },
  { key: "add_suffix", label: "Add suffix" },
  { key: "remove_suffix", label: "Remove suffix" },
];

export default function OpsConsole() {
  const [folderPath, setFolderPath] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [fileCount, setFileCount] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusTone, setStatusTone] = useState("muted"); // "muted" | "ok" | "error"
  const [recentFolders, setRecentFolders] = useState([]);

  // Load recent folders on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("nm_recent_folders");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentFolders(parsed);
        }
      }
    } catch (_) {
      // ignore
    }
  }, []);

  const [ops, setOps] = useState(() => {
    const initial = {};
    OP_ROWS.forEach((row) => {
      initial[row.key] = { value: "", step: null };
    });
    return initial;
  });

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { files: [...], summary: {...} } or null

  const [isRunning, setIsRunning] = useState(false);
  const [runStatus, setRunStatus] = useState(null); // { tone: 'ok'|'error', msg: string } | null

  // --- Main card presentation: no tilt, static silver shadow ---
  const rotateX = 0;
  const rotateY = 0;

  // Tight, classy silver glow + deep black shadow
  const cardShadow =
    "0 26px 80px rgba(0,0,0,0.85), 0 10px 18px rgba(255,255,255,0.28)";

  const handleMouseMove = () => {
    // no-op: tilt disabled for now
  };

  const handleMouseLeave = () => {
    // no-op
  };

  const isRowActive = (rowKey) => {
    const state = ops[rowKey];
    return state.step !== null && (state.value || "").trim() !== "";
  };

  // ---------- Folder logic ----------

  const handleClipboardFill = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFolderPath(text.trim());
        setStatusMsg("Pasted from clipboard. Click “Check & Load”.");
        setStatusTone("muted");
      } else {
        setStatusMsg("Clipboard is empty.");
        setStatusTone("error");
      }
    } catch (err) {
      console.error(err);
      setStatusMsg("Clipboard access denied. Paste manually (Ctrl+V).");
      setStatusTone("error");
    }
  };

  const handleCheckFolder = async () => {
    const path = folderPath.trim();
    if (!path) {
      setStatusMsg("Paste or type a folder path first.");
      setStatusTone("error");
      return;
    }

    setIsChecking(true);
    setStatusMsg("Checking folder with backend…");
    setStatusTone("muted");
    setFileCount(null);
    setPreviewData(null); // reset preview when changing workspace
    setRunStatus(null);   // clear previous run status
    rememberFolder(path);

    try {
      const resp = await axios.post(`${API_BASE}/preview`, {
        folder: path,
        operations: [],
      });
      const count = resp.data?.files?.length ?? 0;
      setFileCount(count);
      setStatusMsg(
        count === 0
          ? "Connected, but this folder has 0 files."
          : `Connected · ${count} file${count === 1 ? "" : "s"} detected.`
      );
      setStatusTone(count === 0 ? "muted" : "ok");
    } catch (err) {
      console.error(err);
      setFileCount(null);
      setPreviewData(null);
      if (err.response?.status === 404) {
        setStatusMsg("Folder not found. Check the path and try again.");
      } else {
        setStatusMsg(
          "Could not reach backend or folder. Is FastAPI running on 127.0.0.1:8000?"
        );
      }
      setStatusTone("error");
    } finally {
      setIsChecking(false);
    }
  };

  
  const rememberFolder = (path) => {
    const trimmed = path.trim();
    if (!trimmed) return;

    setRecentFolders((prev) => {
      const without = prev.filter((p) => p !== trimmed);
      const next = [trimmed, ...without].slice(0, 5);
      try {
        localStorage.setItem("nm_recent_folders", JSON.stringify(next));
      } catch (_) {
        // ignore
      }
      return next;
    });
  };

  const folderReady = !!fileCount && !isChecking;

  const statusColor =
    statusTone === "ok"
      ? "text-nm_teal"
      : statusTone === "error"
      ? "text-rose-400"
      : "text-slate-400";

  // ---------- Operations grid state ----------

  const handleOpValueChange = (key, value) => {
    setOps((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
  };

  // click a step circle: only one row per step; clicking again deselects
  const handleStepClick = (rowKey, stepNumber) => {
    setOps((prev) => {
      const next = { ...prev };

      // Remove this step from any other row
      for (const k of Object.keys(next)) {
        if (k !== rowKey && next[k].step === stepNumber) {
          next[k] = { ...next[k], step: null };
        }
      }

      const current = next[rowKey].step;
      next[rowKey] = {
        ...next[rowKey],
        step: current === stepNumber ? null : stepNumber,
      };

      return next;
    });
  };

  // ---------- Preview wiring ----------

  const buildOperationsPayload = () => {
    const arr = [];
    for (const row of OP_ROWS) {
      const state = ops[row.key];
      const value = (state.value || "").trim();
      if (!state.step || !value) continue; // ignore unconfigured rows
      arr.push({
        step: state.step,
        type: row.key, // add_prefix / remove_prefix / add_suffix / remove_suffix
        value,
      });
    }
    // let backend also sort, but we can sort client-side for clarity
    arr.sort((a, b) => a.step - b.step);
    return arr;
  };

  const hasConfiguredOps = () =>
    Object.values(ops).some(
      (o) => o.step !== null && (o.value || "").trim() !== ""
    );

  const handlePreview = async () => {
    if (!folderReady) {
      setStatusMsg("Select and load a valid folder first.");
      setStatusTone("error");
      return;
    }
    if (!hasConfiguredOps()) {
      setStatusMsg("Configure at least one operation (text + step) before preview.");
      setStatusTone("error");
      return;
    }

    const operations = buildOperationsPayload();
    setIsPreviewing(true);
    setStatusMsg("Running preview…");
    setStatusTone("muted");
    setRunStatus(null);

    try {
      const resp = await axios.post(`${API_BASE}/preview`, {
        folder: folderPath.trim(),
        operations,
      });
      setPreviewData(resp.data);
      setStatusMsg("Preview ready.");
      setStatusTone("ok");
    } catch (err) {
      console.error(err);
      setPreviewData(null);
      if (err.response?.status === 404) {
        setStatusMsg("Folder not found while previewing. Check the path again.");
      } else {
        setStatusMsg("Preview error. Check backend logs and try again.");
      }
      setStatusTone("error");
    } finally {
      setIsPreviewing(false);
    }
  };

  // ---------- Run wiring ----------
  const handleRun = async () => {
    if (!folderReady) {
      setStatusMsg("Select and load a valid folder first.");
      setStatusTone("error");
      return;
    }
    if (!hasConfiguredOps()) {
      setStatusMsg("Configure at least one operation (text + step) before running.");
      setStatusTone("error");
      return;
    }

    const operations = buildOperationsPayload();
    setIsRunning(true);
    setRunStatus({ tone: "muted", msg: "Running rename operations…" });

    try {
      const resp = await axios.post(`${API_BASE}/run`, {
        folder: folderPath.trim(),
        operations,
      });

      const runSummary = resp.data?.summary;
      if (runSummary) {
        setRunStatus({
          tone: "ok",
          msg: `Run completed · Renamed: ${runSummary.renamed}, Unchanged: ${runSummary.unchanged}, Collisions: ${runSummary.collisions}`,
        });
      } else {
        setRunStatus({
          tone: "ok",
          msg: "Run completed.",
        });
      }

      setStatusMsg("Run completed.");
      setStatusTone("ok");

      // Optional: refresh preview after run
      try {
        const previewResp = await axios.post(`${API_BASE}/preview`, {
          folder: folderPath.trim(),
          operations,
        });
        setPreviewData(previewResp.data);
      } catch (innerErr) {
        console.error("Preview refresh after run failed:", innerErr);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        setRunStatus({
          tone: "error",
          msg: "Run error: folder not found. Check the path again.",
        });
      } else {
        setRunStatus({
          tone: "error",
          msg: "Run error. Check backend logs and try again.",
        });
      }
      setStatusMsg("Run error.");
      setStatusTone("error");
    } finally {
      setIsRunning(false);
    }
  };

  const canPreview =
    folderReady && hasConfiguredOps() && !isPreviewing && !isChecking;

  const canRun =
    folderReady && hasConfiguredOps() && !isRunning && !isChecking;

  const summary = previewData?.summary;
  const files = previewData?.files || [];

  const runStatusColor =
    runStatus?.tone === "ok"
      ? "text-emerald-300"
      : runStatus?.tone === "error"
      ? "text-rose-300"
      : "text-slate-300";

  // ------------------------------------------------------------------

  return (
    <div className="relative">
      <div className="relative flex items-start justify-center gap-8">
      <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 18, mass: 0.6 }}
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative h-full w-full"
        >
          <motion.div
            className="relative z-10 rounded-card overflow-visible
                      bg-nm_panel backdrop-blur-3xl
                      border border-white/7"
            style={{ rotateX, rotateY, boxShadow: cardShadow }}
          >
            {/* main content */}
            <div className="relative z-10 px-6 py-6 md:px-8 md:py-7 flex flex-col gap-8">
              {/* Workspace / Folder Selection */}
              <section className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h2 className="text-base md:text-lg font-semibold text-slate-50">
                      Workspace
                    </h2>
                    <p className="text-[11px] md:text-xs text-slate-300 mt-1">
                      Copy a folder path from Explorer, then validate it against the backend.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97, y: 0 }}
                      onClick={handleClipboardFill}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full
                                 bg-black/45 border border-white/15
                                 text-[11px] font-medium text-slate-100
                                 hover:bg-black/70 hover:border-nm_teal/70 hover:text-nm_teal
                                 shadow-[0_10px_28px_rgba(0,0,0,0.65)]"
                    >
                      <span>📋</span>
                      <span>Use clipboard</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={!isChecking ? { scale: 1.03, y: -1 } : {}}
                      whileTap={!isChecking ? { scale: 0.97, y: 0 } : {}}
                      disabled={isChecking}
                      onClick={handleCheckFolder}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold
                        ${
                          isChecking
                            ? "bg-slate-500 text-slate-100 cursor-wait"
                            : "bg-gradient-to-r from-[#FFC1EB] via-nm_pink to-[#FF5FB6] text-slate-900 shadow-[0_14px_40px_rgba(0,0,0,0.9)]"
                        }`}
                    >
                      {isChecking ? "Checking…" : "Check & Load"}
                    </motion.button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      placeholder="E:\\ComfyUI_windows_portable\\ComfyUI\\output\\Working\\..."
                      className="flex-1 text-xs md:text-sm px-3.5 py-2.5 rounded-2xl
                                 bg-black/50 border border-white/15
                                 text-slate-100 placeholder:text-slate-500
                                 focus:outline-none focus:ring-1 focus:ring-nm_teal focus:border-nm_teal"
                    />
                    {fileCount !== null && (
                      <div className="text-[11px] text-slate-900 whitespace-nowrap px-3 py-1 rounded-full bg-nm_teal/85">
                        {fileCount} file{fileCount === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                  {statusMsg && (
                    <div className={`text-[11px] mt-0.5 ${statusColor}`}>{statusMsg}</div>
                  )}
                </div>
              </section>

              {/* Operations grid */}
              <section className="space-y-3">
                <h2 className="text-base md:text-lg font-semibold text-slate-50">
                  Operations & Order
                </h2>
                <p className="text-[11px] md:text-xs text-slate-300">
                  Assign steps 1–4 to operations. Each step number can be used only once.
                </p>

                <div className="mt-2 rounded-2xl bg-transparent space-y-[1px]">
                  {OP_ROWS.map((row) => {
                    const state = ops[row.key];
                    const active = isRowActive(row.key);
                    return (
                      <motion.div
                        key={row.key}
                        whileHover={{ y: -1 }}
                        transition={{ duration: 0.12, ease: "easeOut" }}
                        className={`flex items-center gap-3 px-3.5 py-2.5
                          ${
                            active
                              ? "bg-white/5 shadow-[0_12px_32px_rgba(0,0,0,0.85)]"
                              : "bg-transparent hover:bg-white/3"
                          }`}
                      >
                        {/* Label */}
                        <div className="w-32 text-xs md:text-sm font-medium text-slate-50">
                          {row.label}
                        </div>

                        {/* Input */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={state.value}
                            onChange={(e) => handleOpValueChange(row.key, e.target.value)}
                            placeholder={
                              row.key.includes("prefix") ? "Prefix text..." : "Suffix text..."
                            }
                            className="w-full text-xs md:text-sm px-3 py-2 rounded-xl
                                       bg-black/25 border border-white/12
                                       text-slate-100 placeholder:text-slate-500
                                       focus:outline-none focus:ring-1 focus:ring-nm_teal focus:border-nm_teal"
                          />
                        </div>

                        {/* Step badges 1–4 */}
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4].map((n) => {
                            const isActiveStep = state.step === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => handleStepClick(row.key, n)}
                                className={`h-7 w-7 rounded-full text-[11px] font-semibold
                                  flex items-center justify-center
                                  transition-all duration-150
                                  ${
                                    isActiveStep
                                      ? "bg-nm_teal text-slate-900 border border-white/40 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_0_14px_rgba(75,231,203,0.9)]"
                                      : "bg-black/45 text-slate-300 border border-white/10 hover:border-nm_teal/60 hover:text-nm_teal hover:bg-black/20"
                                  }`}
                              >
                                {n}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* Preview section */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-semibold text-slate-50">
                    Preview
                  </h2>
                  {summary && (
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/40">
                        Renamed: {summary.renamed}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-200 border border-slate-400/30">
                        Unchanged: {summary.unchanged}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-200 border border-amber-400/40">
                        Collisions fixed: {summary.collisions}
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 max-h-64 overflow-hidden flex flex-col">
                  {files.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-[11px] md:text-xs text-slate-400 px-4 py-6">
                      No preview yet. Configure operations and click{" "}
                      <span className="mx-1 font-semibold">Preview</span>.
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto">
                      <table className="min-w-full text-[11px] md:text-xs border-collapse">
                        <thead className="sticky top-0 bg-black/70 backdrop-blur">
                          <tr className="text-slate-300">
                            <th className="text-left px-3 py-2 font-medium border-b border-white/10">
                              Original name
                            </th>
                            <th className="text-left px-3 py-2 font-medium border-b border-white/10">
                              New name
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {files.map((f, idx) => (
                            <tr
                              key={`${f.original}-${idx}`}
                              className={`${
                                idx % 2 === 0 ? "bg-black/20" : "bg-black/10"
                              } hover:bg-nm_teal/8 transition-colors`}
                            >
                              <td className="px-3 py-1.5 text-slate-300 align-top">
                                {f.original}
                              </td>
                              <td className="px-3 py-1.5 text-slate-50 align-top">
                                {f.new}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              {/* Action buttons + run status */}
              <section className="mt-2 flex flex-col gap-2 pt-2">
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={canPreview ? handlePreview : undefined}
                    className={`px-4 py-2 rounded-full text-[11px] font-semibold border
                      ${
                        canPreview
                          ? "border-nm_teal/70 text-nm_teal bg-black/45 hover:bg-black/70 hover:border-nm_teal shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
                          : "border-slate-700 text-slate-500 bg-black/30 cursor-not-allowed"
                      }`}
                  >
                    {isPreviewing ? "Previewing…" : "Preview"}
                  </button>
                  <motion.button
                    type="button"
                    onClick={canRun ? handleRun : undefined}
                    whileHover={canRun ? { scale: 1.04, y: -1 } : {}}
                    whileTap={canRun ? { scale: 0.97, y: 0 } : {}}
                    className={`px-6 py-2.5 rounded-full text-[11px] md:text-xs font-semibold
                      ${
                        canRun
                          ? "bg-gradient-to-r from-nm_teal via-nm_yellow to-nm_pink text-slate-900 cursor-pointer shadow-[0_22px_70px_rgba(0,0,0,1)] hover:shadow-[0_26px_80px_rgba(0,0,0,1.05)]"
                          : "bg-slate-700 text-slate-400 cursor-not-allowed shadow-[0_10px_32px_rgba(0,0,0,0.8)]"
                      }`}
                  >
                    {isRunning ? "Running…" : "Run"}
                  </motion.button>
                </div>

                {runStatus && (
                  <div className={`text-[11px] text-right ${runStatusColor}`}>
                    {runStatus.msg}
                  </div>
                )}
              </section>
            </div>
          </motion.div>
          {/* Floating Recents Panel */}
          {recentFolders.length > 0 && (
            <div
              className="
                hidden lg:flex flex-col
                absolute top-6 left-full ml-12
                w-[19rem]
              "
            >
              <div
                className="
                  text-[12px] font-semibold tracking-wide text-slate-100
                  pb-2 mb-3
                  border-b border-dashed border-white/30
                "
              >
                Recent folders
              </div>

              <div className="flex flex-col">
                {recentFolders.map((path, index) => {
                  const isCurrent = path === folderPath;

                  return (
                    <div
                      key={path}
                      className={
                        index > 0
                          ? "border-t border-dashed border-white/18 pt-1.5 mt-1.5"
                          : ""
                      }
                    >
                      <button
                        onClick={() => {
                          setFolderPath(path);
                          setStatusMsg(
                            "Loaded from history. Click 'Check & Load'."
                          );
                          setStatusTone("muted");
                        }}
                        title={path}
                        className={
                          "w-full text-left truncate text-[11px] px-0 py-0 " +
                          "bg-transparent border-none outline-none transition-all " +
                          (isCurrent
                            ? "text-nm_teal font-semibold italic shadow-[0_0_16px_rgba(75,231,203,0.55)]"
                            : "text-slate-200 hover:text-nm_teal hover:shadow-[0_0_14px_rgba(255,255,255,0.28)]")
                        }
                      >
                        {path}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
