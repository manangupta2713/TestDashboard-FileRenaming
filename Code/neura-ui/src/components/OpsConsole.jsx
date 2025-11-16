// src/components/OpsConsole.jsx
// Pastel NeuraMax glass card + folder selector + 4-row operations grid + Preview wiring

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

const OP_ROWS = [
  { key: "add_prefix", label: "Add prefix" },
  { key: "remove_prefix", label: "Remove prefix" },
  { key: "add_suffix", label: "Add suffix" },
  { key: "remove_suffix", label: "Remove suffix" },
];

const OpsConsoleContext = createContext(null);
const STEP_NUMBERS = [1, 2, 3, 4];

const getNextAvailableStep = (ops, excludeKey = null) => {
  const used = new Set();
  for (const [key, state] of Object.entries(ops)) {
    if (key === excludeKey) continue;
    if (state.step) used.add(state.step);
  }
  for (const step of STEP_NUMBERS) {
    if (!used.has(step)) return step;
  }
  return null;
};

const collapseStepsAfterRemoval = (ops, removedStep) => {
  if (!removedStep) return ops;
  const next = { ...ops };
  for (const key of Object.keys(next)) {
    const step = next[key].step;
    if (step && step > removedStep) {
      next[key] = { ...next[key], step: step - 1 };
    }
  }
  return next;
};

const useOpsConsole = () => {
  const ctx = useContext(OpsConsoleContext);
  if (!ctx) {
    throw new Error("OpsConsole components must be used within OpsConsoleProvider");
  }
  return ctx;
};

export function OpsConsoleProvider({ children }) {
  const [folderPath, setFolderPath] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [fileCount, setFileCount] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusTone, setStatusTone] = useState("muted"); // "muted" | "ok" | "error"
  const [recentFolders, setRecentFolders] = useState([]);

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
  const [previewData, setPreviewData] = useState(null);

  const [isRunning, setIsRunning] = useState(false);
  const [runStatus, setRunStatus] = useState(null);

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
    setPreviewData(null);
    setRunStatus(null);
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

  const handleOpValueChange = (key, value) => {
    setOps((prev) => {
      const trimmed = (value || "").trim();
      const prevValue = (prev[key].value || "").trim();
      const next = {
        ...prev,
        [key]: { ...prev[key], value },
      };

      if (trimmed && !prev[key].step) {
        const autoStep = getNextAvailableStep(prev, key);
        if (autoStep) {
          next[key] = { ...next[key], step: autoStep };
        }
      } else if (!trimmed && prevValue) {
        const removedStep = prev[key].step;
        next[key] = { ...next[key], step: null };
        return collapseStepsAfterRemoval(next, removedStep);
      }

      return next;
    });
  };

  const handleStepClick = (rowKey, stepNumber) => {
    const trimmed = (ops[rowKey].value || "").trim();
    if (!trimmed) {
      const rowType = rowKey.includes("prefix") ? "prefix" : "suffix";
      return { ok: false, reason: "empty", rowType };
    }

    setOps((prev) => {
      const next = { ...prev };
      const current = next[rowKey];
      const currentStep = current.step;
      if (currentStep === stepNumber) {
        return prev;
      }

      const otherKey = Object.keys(next).find(
        (key) => key !== rowKey && next[key].step === stepNumber
      );

      next[rowKey] = { ...current, step: stepNumber };

      if (otherKey) {
        if (currentStep !== null) {
          next[otherKey] = { ...next[otherKey], step: currentStep };
        } else {
          const replacement = getNextAvailableStep(
            { ...next, [rowKey]: next[rowKey] },
            otherKey
          );
          next[otherKey] = {
            ...next[otherKey],
            step: replacement ?? null,
          };
        }
      }

      return next;
    });

    return { ok: true };
  };

  const buildOperationsPayload = () => {
    const arr = [];
    for (const row of OP_ROWS) {
      const state = ops[row.key];
      const value = (state.value || "").trim();
      if (!state.step || !value) continue;
      arr.push({
        step: state.step,
        type: row.key,
        value,
      });
    }
    arr.sort((a, b) => a.step - b.step);
    return arr;
  };

  const hasConfiguredOps = useMemo(
    () =>
      Object.values(ops).some(
        (o) => o.step !== null && (o.value || "").trim() !== ""
      ),
    [ops]
  );

  const folderReady = !!fileCount && !isChecking;

  const handlePreview = async () => {
    if (!folderReady) {
      setStatusMsg("Select and load a valid folder first.");
      setStatusTone("error");
      return;
    }
    if (!hasConfiguredOps) {
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

  const handleRun = async () => {
    if (!folderReady) {
      setStatusMsg("Select and load a valid folder first.");
      setStatusTone("error");
      return;
    }
    if (!hasConfiguredOps) {
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
    folderReady && hasConfiguredOps && !isPreviewing && !isChecking;
  const canRun = folderReady && hasConfiguredOps && !isRunning && !isChecking;

  const contextValue = {
    folderPath,
    setFolderPath,
    isChecking,
    fileCount,
    statusMsg,
    statusTone,
    recentFolders,
    ops,
    isPreviewing,
    isRunning,
    previewData,
    runStatus,
    handleClipboardFill,
    handleCheckFolder,
    handleOpValueChange,
    handleStepClick,
    handlePreview,
    handleRun,
    canPreview,
    canRun,
    files: previewData?.files || [],
    summary: previewData?.summary || null,
    setStatusMsg,
    setStatusTone,
  };

  return (
    <OpsConsoleContext.Provider value={contextValue}>
      {children}
    </OpsConsoleContext.Provider>
  );
}

export function OpsConsoleMain() {
  const {
    folderPath,
    setFolderPath,
    isChecking,
    fileCount,
    statusMsg,
    statusTone,
    ops,
    handleClipboardFill,
    handleCheckFolder,
    handleOpValueChange,
    handleStepClick,
    canPreview,
    canRun,
    handlePreview,
    handleRun,
    isPreviewing,
    isRunning,
    files,
    summary,
    runStatus,
  } = useOpsConsole();

  const rotateX = 0;
  const rotateY = 0;
  const cardShadow =
    "0 26px 80px rgba(0,0,0,0.85), 0 10px 18px rgba(255,255,255,0.28)";

  const handleMouseMove = () => {};
  const handleMouseLeave = () => {};

  const statusColor =
    statusTone === "ok"
      ? "text-nm_teal"
      : statusTone === "error"
      ? "text-rose-400"
      : "text-slate-400";

  const runStatusColor =
    runStatus?.tone === "ok"
      ? "text-emerald-300"
      : runStatus?.tone === "error"
      ? "text-rose-300"
      : "text-slate-300";

  const isRowActive = (rowKey) => {
    const state = ops[rowKey];
    return state.step !== null && (state.value || "").trim() !== "";
  };

  const [stepHint, setStepHint] = useState(null);

  useEffect(() => {
    if (!stepHint) return;
    const timer = setTimeout(() => setStepHint(null), 1800);
    return () => clearTimeout(timer);
  }, [stepHint]);

  const handleStepPress = (rowKey, n, rowType) => {
    const result = handleStepClick(rowKey, n);
    if (result?.ok === false && result.reason === "empty") {
      const label =
        rowType === "prefix" ? "No prefix added" : "No suffix added";
      setStepHint({ rowKey, message: label });
    }
  };

  return (
    <div className="relative">
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
          <div className="relative z-10 px-6 py-6 md:px-8 md:py-7 flex flex-col gap-8">
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
                  const rowType = row.key.includes("prefix") ? "prefix" : "suffix";
                  return (
                    <motion.div
                      key={row.key}
                      whileHover={{ y: -1 }}
                      transition={{ duration: 0.12, ease: "easeOut" }}
                      className="relative flex items-center gap-3 px-3.5 py-2.5"
                    >
                      <div className="w-32 text-xs md:text-sm font-medium text-slate-50">
                        {row.label}
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={state.value}
                          onChange={(e) => handleOpValueChange(row.key, e.target.value)}
                          placeholder={
                            row.key.includes("prefix") ? "Prefix text..." : "Suffix text..."
                          }
                          className="w-full text-xs md:text-sm px-3 py-2 rounded-xl
                                     bg-black/30 border border-white/10
                                     text-slate-100 placeholder:text-slate-500
                                     focus:outline-none focus:ring-1 focus:ring-nm_teal/70 focus:border-nm_teal/80"
                        />
                      </div>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4].map((n) => {
                            const isActiveStep = state.step === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => handleStepPress(row.key, n, rowType)}
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
                        {stepHint?.rowKey === row.key && (
                          <div className="absolute -top-10 right-4 px-3 py-1 rounded-full text-[10px] font-medium text-slate-100 bg-[#0a1226]/90 border border-[#1e2c4b] shadow-[0_12px_30px_rgba(0,0,0,0.7)]">
                            {stepHint.message}
                          </div>
                        )}
                    </motion.div>
                  );
                })}
              </div>
            </section>

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
      </motion.div>
    </div>
  );
}

export function RecentFoldersPanel() {
  const {
    recentFolders,
    folderPath,
    setFolderPath,
    setStatusMsg,
    setStatusTone,
  } = useOpsConsole();

  if (!recentFolders.length) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="text-[12px] font-semibold tracking-wide text-slate-100 pb-2 mb-3">
        Recent folders
      </div>
      <div className="flex flex-col">
        {recentFolders.map((path, index) => {
          const isCurrent = path === folderPath;
          return (
            <div key={path} className="flex flex-col">
              <button
                onClick={() => {
                  setFolderPath(path);
                  setStatusMsg("Loaded from history. Click 'Check & Load'.");
                  setStatusTone("muted");
                }}
                title={path}
                className={`w-full text-left truncate text-[11px] bg-transparent border-none outline-none px-0 py-0 transition-all duration-150
                  ${
                    isCurrent
                      ? "text-nm_teal font-semibold italic drop-shadow-[0_0_16px_rgba(75,231,203,0.55)]"
                      : "text-slate-200 hover:text-nm_teal hover:italic hover:font-semibold hover:drop-shadow-[0_0_18px_rgba(75,231,203,0.4)]"
                  }`}
              >
                {path}
              </button>
              {index !== recentFolders.length - 1 && (
                <div className="mt-1 mb-2 h-px w-full bg-gradient-to-r from-slate-200/60 via-blue-300/45 to-transparent" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OpsConsoleMain;
