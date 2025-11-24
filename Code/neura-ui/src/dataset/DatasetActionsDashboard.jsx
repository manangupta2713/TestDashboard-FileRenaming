import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  ChakraProvider,
  Divider,
  Flex,
  Grid,
  HStack,
  IconButton,
  Text,
  VStack,
  extendTheme,
  useToast,
} from "@chakra-ui/react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { ArrowBackIcon, ArrowForwardIcon, RepeatIcon } from "@chakra-ui/icons";

const API_BASE = "http://127.0.0.1:8000";
const IMG_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"];

const theme = extendTheme({
  fonts: {
    heading: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
  },
  colors: {
    clay: "#f4deb8",
    charcoal: "#1f1b24",
    accent: "#ff9051",
    muted: "#5e6064",
  },
});

const mainCardClasses =
  "relative z-10 rounded-card overflow-visible bg-white/85 backdrop-blur-3xl border border-slate-500/40 shadow-[0_25px_70px_rgba(0,0,0,0.12)] w-full";

const CAPTION_OP_ROWS = [
  { key: "add_prefix", label: "Add prefix" },
  { key: "remove_prefix", label: "Remove prefix" },
  { key: "add_suffix", label: "Add suffix" },
  { key: "remove_suffix", label: "Remove suffix" },
];
const CAPTION_STEP_NUMBERS = [1, 2, 3, 4];
const DATASET_RECENTS_KEY = "nm_recent_folders_dsa";
const readStoredDatasetRecents = () => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const stored = window.localStorage.getItem(DATASET_RECENTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // swallow storage errors
  }
  return [];
};

const buildInitialCaptionOps = () => {
  const initial = {};
  CAPTION_OP_ROWS.forEach((row) => {
    initial[row.key] = { value: "", step: null };
  });
  return initial;
};

const getNextAvailableCaptionStep = (ops, excludeKey = null) => {
  const used = new Set();
  Object.entries(ops).forEach(([key, state]) => {
    if (key === excludeKey) return;
    if (state.step) used.add(state.step);
  });
  for (const step of CAPTION_STEP_NUMBERS) {
    if (!used.has(step)) return step;
  }
  return null;
};

const collapseCaptionStepsAfterRemoval = (ops, removedStep) => {
  if (!removedStep) return ops;
  const next = { ...ops };
  Object.keys(next).forEach((key) => {
    const step = next[key].step;
    if (step && step > removedStep) {
      next[key] = { ...next[key], step: step - 1 };
    }
  });
  return next;
};

const getItemKey = (item) => {
  if (!item) return "";
  return item.id || item.path || item.filename || item.caption || "";
};

const summarizePreviewRows = (rows = []) => {
  const total = rows.length;
  let changed = 0;
  rows.forEach((row) => {
    if ((row?.caption || "") !== (row?.preview || "")) {
      changed += 1;
    }
  });
  return { total, changed, unchanged: total - changed };
};

function SummaryPill({ label, value, tone = "muted" }) {
  const baseClasses =
    "px-3 py-1 rounded-full text-[10px] font-semibold border flex items-center gap-1";
  const palette =
    tone === "accent"
      ? "bg-[#ffede0] border-[#ffcaa7] text-[#c86e36]"
      : "bg-[#f2f4f7] border-slate-200 text-slate-600";
  return (
    <div className={`${baseClasses} ${palette}`}>
      <span className="tracking-[0.2em] uppercase">{label}</span>
      <span className="text-[11px]">{value}</span>
    </div>
  );
}

const DatasetRecentsContext = createContext(null);

function DatasetRecentsProvider({ children }) {
  const [recentFolders, setRecentFolders] = useState(readStoredDatasetRecents);
  const [handler, setHandler] = useState(null);
  const [sidecarLogs, setSidecarLogsState] = useState([]);

  const publishSidecarLogs = useCallback((lines) => {
    setSidecarLogsState(Array.isArray(lines) ? lines.slice(-5) : []);
  }, []);

  const rememberFolder = useCallback((path) => {
    const trimmed = (path || "").trim();
    if (!trimmed) return;
    setRecentFolders((prev) => {
      const next = [trimmed, ...prev.filter((p) => p !== trimmed)].slice(0, 5);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(DATASET_RECENTS_KEY, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecentFolders([]);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(DATASET_RECENTS_KEY);
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const registerHistoryHandler = useCallback((fn) => {
    setHandler(() => (typeof fn === "function" ? fn : null));
    return () => setHandler(null);
  }, []);

  const applyFolderFromHistory = useCallback(
    (path) => {
      if (!path || typeof handler !== "function") return false;
      handler(path);
      return true;
    },
    [handler]
  );

  const value = useMemo(
    () => ({
      recentFolders,
      rememberFolder,
      clearRecents,
      registerHistoryHandler,
      applyFolderFromHistory,
      hasActiveHandler: typeof handler === "function",
      sidecarLogs,
      setSidecarLogs: publishSidecarLogs,
    }),
    [
      recentFolders,
      rememberFolder,
      clearRecents,
      registerHistoryHandler,
      applyFolderFromHistory,
      handler,
      sidecarLogs,
      publishSidecarLogs,
    ]
  );

  return <DatasetRecentsContext.Provider value={value}>{children}</DatasetRecentsContext.Provider>;
}

function useDatasetRecents() {
  const ctx = useContext(DatasetRecentsContext);
  if (!ctx) {
    throw new Error("Dataset recents context missing");
  }
  return ctx;
}

function AutoGrowInput({ value, onChange }) {
  const safeValue = value ?? "";

  return (
    <textarea
      value={safeValue}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      style={{
        width: "100%",
        minHeight: "120px",
        maxHeight: "220px",
        overflow: "hidden",
        resize: "none",
        borderRadius: "18px",
        border: "1px solid rgba(31,27,36,0.1)",
        padding: "16px",
        background: "rgba(255,255,255,0.95)",
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.9rem",
        boxShadow: "0 18px 50px rgba(31,27,36,0.1)",
      }}
    />
  );
}

function ModuleShell({ title, subtitle, children }) {
  return (
    <Motion.div
      style={{ height: "100%" }}
      initial={{ opacity: 0.95, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <VStack spacing={5} align="stretch" padding="8px" height="100%">
        {title ? (
          <Box>
            <Text fontSize="lg" fontWeight="600" color="charcoal">
              {title}
            </Text>
            {subtitle ? (
              <>
                <Text fontSize="sm" color="muted" fontStyle="italic">
                  {subtitle}
                </Text>
                <Divider mt={3} borderColor="rgba(31,27,36,0.12)" />
              </>
            ) : null}
          </Box>
        ) : null}
        <Box flex="1" display="flex" flexDirection="column" gap="20px">
          {children}
        </Box>
      </VStack>
    </Motion.div>
  );
}

function useLogs(capacity = 5) {
  const [logLines, setLogLines] = useState([]);
  const pushLog = (lines = []) => {
    if (!lines || !lines.length) return;
    setLogLines((prev) => {
      const merged = [...prev, ...lines];
      return merged.slice(-capacity);
    });
  };
  const clearLogs = () => setLogLines([]);
  return [logLines, pushLog, clearLogs];
}

function FocusPaginator({ count, index, onPrev, onNext }) {
  return (
    <HStack spacing={2.5}>
      <IconButton
        aria-label="Previous"
        icon={<ArrowBackIcon />}
        size="xs"
        onClick={onPrev}
        isDisabled={count === 0}
        bg="charcoal"
        color="white"
        borderRadius="full"
        boxShadow="0 8px 18px rgba(31,27,36,0.35)"
        _hover={{ bg: "accent", transform: "translateY(-2px)" }}
        transition="all 0.2s ease"
      />
      <Text
        fontSize={count === 0 ? "xs" : "xs"}
        color="muted"
        fontStyle={count === 0 ? "italic" : "normal"}
      >
        {count === 0 ? "No entries" : `${index + 1} / ${count}`}
      </Text>
      <IconButton
        aria-label="Next"
        icon={<ArrowForwardIcon />}
        size="xs"
        onClick={onNext}
        isDisabled={count === 0}
        bg="charcoal"
        color="white"
        borderRadius="full"
        boxShadow="0 8px 18px rgba(31,27,36,0.35)"
        _hover={{ bg: "accent", transform: "translateY(-2px)" }}
        transition="all 0.2s ease"
      />
    </HStack>
  );
}

function CaptionModule() {
  const toast = useToast();
  const [folder, setFolder] = useState("");
  const [recursive, setRecursive] = useState(false);
  const [makeBackup, setMakeBackup] = useState(false);
  const [entries, setEntries] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState(null);
  const [csvPath, setCsvPath] = useState("");
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [logs, pushLog, clearLogs] = useLogs();
  const [ops, setOps] = useState(buildInitialCaptionOps);
  const [stepHint, setStepHint] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewSummary, setPreviewSummary] = useState(null);
  const [selectionMap, setSelectionMap] = useState({});
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [runStatus, setRunStatus] = useState(null);
  const { rememberFolder, registerHistoryHandler, setSidecarLogs } = useDatasetRecents();

  const currentEntry = entries[currentIndex] || null;

  useEffect(() => {
    const unregister = registerHistoryHandler((path) => {
      setFolder(path);
    });
    return unregister;
  }, [registerHistoryHandler]);

  useEffect(() => {
    setSidecarLogs(logs);
  }, [logs, setSidecarLogs]);

  useEffect(() => {
    return () => setSidecarLogs([]);
  }, [setSidecarLogs]);

  const isRowActive = (rowKey) => {
    const state = ops[rowKey];
    return state.step !== null && (state.value || "").trim() !== "";
  };

  const handleOpValueChange = (rowKey, value) => {
    setOps((prev) => {
      const trimmed = (value || "").trim();
      const prevValue = (prev[rowKey].value || "").trim();
      const next = {
        ...prev,
        [rowKey]: { ...prev[rowKey], value },
      };

      if (trimmed && !prev[rowKey].step) {
        const autoStep = getNextAvailableCaptionStep(prev, rowKey);
        if (autoStep) {
          next[rowKey] = { ...next[rowKey], step: autoStep };
        }
      } else if (!trimmed && prevValue) {
        const removedStep = prev[rowKey].step;
        next[rowKey] = { ...next[rowKey], step: null };
        return collapseCaptionStepsAfterRemoval(next, removedStep);
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
          const replacement = getNextAvailableCaptionStep(
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

  const handleStepPress = (rowKey, stepNumber, rowType) => {
    const result = handleStepClick(rowKey, stepNumber);
    if (result?.ok === false && result.reason === "empty") {
      setStepHint({
        rowKey,
        message: rowType === "prefix" ? "No prefix added" : "No suffix added",
      });
    }
  };

  useEffect(() => {
    if (!stepHint) return;
    const timer = setTimeout(() => setStepHint(null), 1800);
    return () => clearTimeout(timer);
  }, [stepHint]);

  const operationsPayload = useMemo(() => {
    const arr = [];
    CAPTION_OP_ROWS.forEach((row) => {
      const value = (ops[row.key].value || "").trim();
      const step = ops[row.key].step;
      if (!step || !value) return;
      arr.push({
        step,
        type: row.key,
        value,
      });
    });
    arr.sort((a, b) => a.step - b.step);
    return arr;
  }, [ops]);

  const hasConfiguredOps = operationsPayload.length > 0;

  const handleClipboardFill = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFolder(text.trim());
        toast({ status: "info", description: "Folder path pasted from clipboard." });
      } else {
        toast({ status: "warning", description: "Clipboard is empty." });
      }
    } catch {
      toast({ status: "error", description: "Clipboard access denied. Paste manually." });
    }
  };

  const handleReset = () => {
    setFolder("");
    setRecursive(false);
    setMakeBackup(false);
    setEntries([]);
    setCurrentIndex(0);
    setSummary(null);
    setCsvPath("");
    setUndoStack([]);
    setRedoStack([]);
    clearLogs();
    setOps(buildInitialCaptionOps());
    setPreviewRows([]);
    setSelectionMap({});
    setPreviewSummary(null);
    setRunStatus(null);
    toast({ status: "info", description: "Caption Atelier reset." });
  };

  const handleLoad = async () => {
    if (!folder.trim()) {
      toast({ status: "error", description: "Enter a folder path." });
      return;
    }
    setPending(true);
    try {
      const resp = await axios.post(`${API_BASE}/dataset/captions/load`, {
        folder,
        recursive,
      });
      setEntries(resp.data.rows || []);
      setCurrentIndex(0);
      setSummary(null);
      setCsvPath("");
      pushLog([`Loaded ${resp.data.count || 0} captions.`]);
      rememberFolder(folder);
      setPreviewRows([]);
      setSelectionMap({});
      setPreviewSummary(null);
      setRunStatus(null);
    } catch (err) {
      toast({ status: "error", description: err?.response?.data?.detail || "Load failed" });
    } finally {
      setPending(false);
    }
  };

  const updateEntryCaption = (text) => {
    setEntries((prev) => {
      if (!currentEntry) return prev;
      const next = [...prev];
      next[currentIndex] = { ...currentEntry, caption: text };
      return next;
    });
  };

  const applyPreviewRows = useCallback((rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) {
      setPreviewRows([]);
      setSelectionMap({});
      setPreviewSummary(null);
      return;
    }
    setPreviewRows(safeRows);
    setSelectionMap((prev) => {
      const next = {};
      safeRows.forEach((row) => {
        const key = getItemKey(row);
        next[key] = Object.prototype.hasOwnProperty.call(prev, key) ? prev[key] : true;
      });
      return next;
    });
    setPreviewSummary(summarizePreviewRows(safeRows));
  }, []);

  const handlePreview = async () => {
    if (!folder.trim()) {
      toast({ status: "error", description: "Set a folder first." });
      return;
    }
    if (!entries.length) {
      toast({ status: "error", description: "Load captions before previewing." });
      return;
    }
    if (!hasConfiguredOps) {
      toast({ status: "error", description: "Configure at least one operation before previewing." });
      return;
    }
    setIsPreviewing(true);
    setRunStatus(null);
    try {
      const resp = await axios.post(`${API_BASE}/dataset/captions/preview`, {
        entries,
        prefix: "",
        suffix: "",
        operations: operationsPayload,
      });
      applyPreviewRows(resp.data?.previews || []);
      toast({ status: "success", description: "Preview ready." });
    } catch (err) {
      applyPreviewRows([]);
      toast({ status: "error", description: err?.response?.data?.detail || "Preview failed." });
    } finally {
      setIsPreviewing(false);
    }
  };

  const isRowSelected = useCallback(
    (row) => selectionMap[getItemKey(row)] !== false,
    [selectionMap]
  );

  const selectedCount = useMemo(() => {
    if (!previewRows.length) return 0;
    return previewRows.reduce(
      (acc, row) => (isRowSelected(row) ? acc + 1 : acc),
      0
    );
  }, [previewRows, isRowSelected]);

  const allSelected = previewRows.length > 0 && selectedCount === previewRows.length;
  const partiallySelected =
    previewRows.length > 0 && selectedCount > 0 && selectedCount < previewRows.length;
  const canPreview = entries.length > 0 && hasConfiguredOps && !isPreviewing && !pending;
  const canRun = entries.length > 0 && hasConfiguredOps && !pending;

  const toggleRowSelection = (row, value) => {
    const key = getItemKey(row);
    setSelectionMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleSelectAll = (checked) => {
    setSelectionMap(() => {
      const next = {};
      previewRows.forEach((row) => {
        next[getItemKey(row)] = checked;
      });
      return next;
    });
  };

  const handleRun = async () => {
    if (!folder.trim()) {
      toast({ status: "error", description: "Set a folder first." });
      return;
    }
    if (!entries.length) {
      toast({ status: "error", description: "Load captions first." });
      return;
    }
    if (!hasConfiguredOps) {
      toast({ status: "error", description: "Configure at least one operation before running." });
      return;
    }
    if (previewRows.length > 0 && selectedCount === 0) {
      toast({ status: "error", description: "Select at least one file in the preview before running." });
      return;
    }
    setPending(true);
    setRunStatus({ tone: "muted", msg: "Running caption blend…" });
    const selectedKeys = new Set(
      previewRows
        .filter((row) => selectionMap[getItemKey(row)] !== false)
        .map((row) => getItemKey(row))
    );
    const entriesPayload =
      previewRows.length > 0 && selectedKeys.size > 0
        ? entries.filter((entry) => selectedKeys.has(getItemKey(entry)))
        : entries;
    if (!entriesPayload.length) {
      setPending(false);
      setRunStatus({ tone: "error", msg: "No eligible entries selected for run." });
      toast({ status: "error", description: "No eligible entries selected for run." });
      return;
    }
    try {
      const resp = await axios.post(`${API_BASE}/dataset/captions/run`, {
        folder,
        recursive,
        dry_run: false,
        make_backup: makeBackup,
        entries: entriesPayload,
        operations: operationsPayload,
      });
      setSummary(resp.data.summary);
      setCsvPath(resp.data.csv_path);
      pushLog(resp.data.log);
      setRunStatus({
        tone: "ok",
        msg: `Run completed · Changed ${resp.data.summary?.changed ?? 0}, Skipped ${resp.data.summary?.skipped ?? 0}`,
      });
      if (resp.data.snapshot_id) {
        setUndoStack((prev) => [...prev.slice(-2), resp.data.snapshot_id]);
        setRedoStack([]);
      }
    } catch (err) {
      setRunStatus({
        tone: "error",
        msg: "Run failed. Check folder and backend logs.",
      });
      toast({ status: "error", description: err?.response?.data?.detail || "Run failed" });
    } finally {
      setPending(false);
    }
  };

  const handleRestore = async (mode) => {
    const stack = mode === "before" ? undoStack : redoStack;
    if (!stack.length) {
      toast({ status: "info", description: "Nothing to restore." });
      return;
    }
    const token = stack[stack.length - 1];
    const nextStack = stack.slice(0, -1);
    setPending(true);
    try {
      await axios.post(`${API_BASE}/dataset/captions/snapshot/restore`, {
        folder,
        snapshot_id: token,
        mode,
      });
      pushLog([mode === "before" ? "Undo applied." : "Redo applied."]);
      if (mode === "before") {
        setUndoStack(nextStack);
        setRedoStack((prev) => [...prev, token].slice(-3));
      } else {
        setRedoStack(nextStack);
        setUndoStack((prev) => [...prev, token].slice(-3));
      }
      await handleLoad();
    } catch (err) {
      toast({ status: "error", description: err?.response?.data?.detail || "Restore failed" });
    } finally {
      setPending(false);
    }
  };

  return (
    <ModuleShell title="" subtitle="">
      <Box mb={2}>
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <IconButton
                aria-label="Reset"
                icon={<RepeatIcon />}
                onClick={handleReset}
                isDisabled={pending}
                variant="ghost"
                color="charcoal"
                size="sm"
                _hover={{ bg: "rgba(255,144,81,0.15)" }}
              />
              <button
                type="button"
                onClick={() => setRecursive((prev) => !prev)}
                aria-label="Caption module recursive toggle"
                className={`px-4 py-2 rounded-full text-[11px] font-semibold border transition-all ${
                  recursive
                    ? "bg-[#ff9051] text-white border-[#e07b40]"
                    : "bg-white text-[#b15b2c] border-[#f6c197]"
                }`}
              >
                Recursive
              </button>
              <button
                type="button"
                onClick={() => setMakeBackup((prev) => !prev)}
                className={`px-4 py-2 rounded-full text-[11px] font-semibold border transition-all ${
                  makeBackup
                    ? "bg-[#ff9051] text-white border-[#e07b40]"
                    : "bg-white text-[#b15b2c] border-[#f6c197]"
                }`}
              >
                Backup
              </button>
            </div>
            <button
              type="button"
              onClick={handleClipboardFill}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-semibold bg-white text-[#b15b2c] border border-[#f6c197] shadow-[0_8px_22px_rgba(0,0,0,0.08)] hover:bg-[#ffe7d6] transition"
            >
              <span className="text-lg leading-none text-[#ff9051]" aria-hidden="true">
                📋
              </span>
              Clipboard
            </button>
          </div>
          <div className="flex items-stretch gap-0">
            <input
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="Folder path"
              aria-label="Caption folder path"
              className="flex-1 text-xs px-4 py-2.5 rounded-l-[999px] border border-r-0 border-[rgba(31,27,36,0.2)] bg-white/95 text-slate-700 placeholder:text-slate-400 shadow-[0_10px_26px_rgba(31,27,36,0.08)] focus:outline-none focus:ring-2 focus:ring-[#ff9051]/70"
            />
            <button
              type="button"
              onClick={handleLoad}
              disabled={pending}
              className={`-ml-px px-5 py-3 rounded-r-[999px] text-[11px] font-semibold border border-[#ff9051] transition-all ${
                pending
                  ? "bg-slate-400 text-white cursor-wait"
                  : "bg-[#1f1b24] text-white hover:bg-[#2b2730]"
              }`}
            >
              {pending ? "Loading…" : "Load Folder"}
            </button>
          </div>
        </div>
      </Box>

      <div className="space-y-5">
        <section className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
            <span className="text-sm font-semibold text-slate-800">
              Prefix / Suffix Operations
            </span>
            <span className="text-[11px] text-slate-500 italic">
              Assign steps 1–4 to operations. Each step number can be used only once.
            </span>
          </div>
          <div className="space-y-1">
            {CAPTION_OP_ROWS.map((row) => {
              const rowType = row.key.includes("prefix") ? "prefix" : "suffix";
              const state = ops[row.key];
              return (
                <div
                  key={row.key}
                  className={`relative flex flex-col lg:flex-row lg:items-center gap-3 px-2.5 py-1.5 rounded-2xl ${
                    isRowActive(row.key) ? "bg-[#fff7f0]/60" : ""
                  }`}
                >
                  <div className="text-[13px] font-semibold text-slate-700 lg:w-32">{row.label}</div>
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={state.value}
                      onChange={(e) => handleOpValueChange(row.key, e.target.value)}
                      placeholder={rowType === "prefix" ? "Prefix text..." : "Suffix text..."}
                      className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#ff9051]"
                    />
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    {CAPTION_STEP_NUMBERS.map((n) => {
                      const isActive = state.step === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => handleStepPress(row.key, n, rowType)}
                          aria-pressed={isActive}
                          className={`h-7 w-7 rounded-full text-[11px] font-semibold transition border ${
                            isActive
                              ? "bg-[#ff9051] text-white border-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.45),0_0_14px_rgba(255,150,110,0.8)]"
                              : "bg-white text-slate-500 border-slate-200 hover:border-[#ff9051]"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  {stepHint?.rowKey === row.key && (
                    <div className="absolute -top-6 right-4 px-3 py-1 rounded-full text-[10px] font-medium text-white bg-slate-900/80 shadow">
                      {stepHint.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="pt-4 border-t border-slate-200/70 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Filename
            </span>
            <span className="text-sm font-semibold text-slate-700 truncate max-w-[60%]">
              {currentEntry?.filename || "—"}
            </span>
            <div className="ml-auto">
              <FocusPaginator
                count={entries.length}
                index={currentIndex}
                onPrev={() =>
                  setCurrentIndex((idx) =>
                    entries.length === 0 ? 0 : (idx - 1 + entries.length) % entries.length
                  )
                }
                onNext={() =>
                  setCurrentIndex((idx) =>
                    entries.length === 0 ? 0 : (idx + 1) % entries.length
                  )
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[90px,1fr] gap-3 items-start">
            <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-1">
              Caption
            </span>
            <div className="flex-1">
              <AutoGrowInput value={currentEntry?.caption || ""} onChange={updateEntryCaption} />
            </div>
          </div>
        </section>

        <section className="pt-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <SummaryPill label="Changed" value={previewSummary?.changed ?? 0} tone="accent" />
              <SummaryPill label="Unchanged" value={previewSummary?.unchanged ?? 0} />
              <SummaryPill
                label="Selected"
                value={previewRows.length ? selectedCount : 0}
                tone="muted"
              />
            </div>
            {summary && (
              <div className="flex flex-wrap gap-2">
                <SummaryPill label="Run changed" value={summary.changed ?? 0} tone="accent" />
                <SummaryPill label="Skipped" value={summary.skipped ?? 0} />
                <SummaryPill label="Backups" value={summary.backups ?? 0} />
              </div>
            )}
          </div>
          {summary && csvPath && (
            <p className="text-[11px] text-slate-500">
              CSV: <span className="font-semibold text-[#c86e36]">{csvPath}</span>
            </p>
          )}
          <div className="overflow-auto max-h-[320px] shadow-[0_12px_32px_rgba(31,27,36,0.08)] rounded-2xl">
            <table className="min-w-[720px] text-sm">
              <thead className="bg-[#fff1e4] text-[10px] uppercase tracking-[0.25em] text-[#c86e36] sticky top-0">
                <tr>
                  <th className="w-10 py-2 pl-3 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = partiallySelected;
                        }
                      }}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border border-[#f6c9a8] text-[#ff9051] focus:ring-0"
                    />
                  </th>
                  <th className="py-2 pr-3 text-left text-[10px]">File</th>
                  <th className="py-2 pr-3 text-left text-[10px]">Current caption</th>
                  <th className="py-2 pr-3 text-left text-[10px]">Preview</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center text-[11px] text-slate-500 py-6"
                    >
                      Run Preview to see proposed caption updates.
                    </td>
                  </tr>
                )}
                {previewRows.map((row, idx) => {
                  const selected = isRowSelected(row);
                  return (
                    <tr
                      key={getItemKey(row) || idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-[#fff9f4]"}
                    >
                      <td className="py-3 pl-3 align-top">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => toggleRowSelection(row, e.target.checked)}
                          className="h-4 w-4 rounded border border-[#f6c9a8] text-[#ff9051] focus:ring-0"
                        />
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <div className="text-[12px] font-semibold text-slate-800">
                          {row.filename || "—"}
                        </div>
                        <div className="text-[10px] text-slate-400">{row.id || row.path}</div>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <p className="text-[12px] text-slate-500 whitespace-pre-wrap">
                          {row.caption || "—"}
                        </p>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <p className="text-[12px] text-slate-800 font-medium whitespace-pre-wrap">
                          {row.preview || "—"}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="mt-3 flex flex-col items-end gap-1">
        {runStatus && (
          <p
            className={`text-[11px] ${
              runStatus.tone === "error"
                ? "text-rose-500"
                : runStatus.tone === "muted"
                ? "text-slate-500"
                : "text-[#c86e36]"
            }`}
          >
            {runStatus.msg}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <IconButton
            aria-label="Undo snapshot"
            icon={<ArrowBackIcon />}
            onClick={() => handleRestore("before")}
            variant="ghost"
            size="sm"
            _hover={{ bg: "rgba(255,144,81,0.15)" }}
          />
          <IconButton
            aria-label="Redo snapshot"
            icon={<ArrowForwardIcon />}
            onClick={() => handleRestore("after")}
            variant="ghost"
            size="sm"
            _hover={{ bg: "rgba(255,144,81,0.15)" }}
          />
          <button
            type="button"
            disabled={!canPreview}
            onClick={canPreview ? handlePreview : undefined}
            className={`px-5 py-2 rounded-full text-[11px] font-semibold border transition-all ${
              !canPreview
                ? "border-slate-200 text-slate-400 bg-white cursor-not-allowed"
                : "border-[#f6c9a8] text-[#c86e36] bg-white hover:bg-[#fff4ec] shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
            }`}
          >
            {isPreviewing ? "Previewing…" : "Preview"}
          </button>
          <Motion.button
            type="button"
            onClick={canRun ? handleRun : undefined}
            whileHover={canRun ? { scale: 1.04, y: -1 } : {}}
            whileTap={canRun ? { scale: 0.97, y: 0 } : {}}
            disabled={!canRun}
            className={`px-6 py-2.5 rounded-full text-[11px] font-semibold ${
              !canRun
                ? "bg-slate-400 text-white cursor-not-allowed shadow-[0_10px_32px_rgba(0,0,0,0.3)]"
                : "bg-gradient-to-r from-[#ffb88c] via-[#ff9051] to-[#f6745f] text-slate-900 shadow-[0_22px_70px_rgba(0,0,0,0.25)] hover:shadow-[0_26px_80px_rgba(0,0,0,0.3)]"
            }`}
          >
            {pending ? "Running…" : "Run"}
          </Motion.button>
        </div>
      </div>
    </ModuleShell>
  );
}

function CopyCaptionsModule() {
  const toast = useToast();
  const [src, setSrc] = useState("");
  const [dest, setDest] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [overwrite, setOverwrite] = useState(false);
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState(null);
  const [csvPath, setCsvPath] = useState("");
  const [logs, pushLog, clearLogs] = useLogs();
  const { rememberFolder, registerHistoryHandler } = useDatasetRecents();
  const [lastFocus, setLastFocus] = useState("src");

  useEffect(() => {
    const unregister = registerHistoryHandler((path) => {
      if (lastFocus === "dest") {
        setDest(path);
      } else {
        setSrc(path);
      }
    });
    return unregister;
  }, [registerHistoryHandler, lastFocus]);

  const handleReset = () => {
    setSrc("");
    setDest("");
    setDryRun(true);
    setOverwrite(false);
    setSummary(null);
    setCsvPath("");
    clearLogs();
  };

  const handleRun = async () => {
    if (!src.trim() || !dest.trim()) {
      toast({ status: "error", description: "Set both SRC and DEST paths." });
      return;
    }
    setPending(true);
    try {
      const resp = await axios.post(`${API_BASE}/dataset/captions/copy`, {
        src,
        dest,
        dry_run: dryRun,
        allow_overwrite: overwrite,
      });
      setSummary(resp.data.summary);
      setCsvPath(resp.data.csv_path);
      pushLog(resp.data.log);
      rememberFolder(src);
      rememberFolder(dest);
    } catch (err) {
      toast({ status: "error", description: err?.response?.data?.detail || "Copy failed" });
    } finally {
      setPending(false);
    }
  };

  return (
    <ModuleShell
      title="Caption Courier"
      subtitle="Mirror captions from a source drop into any destination tree."
    >
      <Grid templateColumns="1fr 1fr" gap={6}>
        <VStack align="stretch" spacing={4}>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <IconButton
                aria-label="Reset courier"
                icon={<RepeatIcon />}
                onClick={handleReset}
                variant="ghost"
                size="sm"
                color="charcoal"
                _hover={{ bg: "rgba(255,144,81,0.15)" }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDryRun((prev) => !prev)}
                  className={`px-4 py-2 rounded-full text-[11px] font-semibold border transition-all ${
                    dryRun
                      ? "bg-[#ff9051] text-white border-[#e07b40]"
                      : "bg-white text-[#b15b2c] border-[#f6c197]"
                  }`}
                >
                  Dry run
                </button>
                <button
                  type="button"
                  onClick={() => setOverwrite((prev) => !prev)}
                  className={`px-4 py-2 rounded-full text-[11px] font-semibold border transition-all ${
                    overwrite
                      ? "bg-[#ff9051] text-white border-[#e07b40]"
                      : "bg-white text-[#b15b2c] border-[#f6c197]"
                  }`}
                >
                  Allow overwrite
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <input
                placeholder="Source folder"
                value={src}
                onChange={(e) => setSrc(e.target.value)}
                onFocus={() => setLastFocus("src")}
                className="w-full text-xs px-4 py-2.5 rounded-2xl border border-[rgba(31,27,36,0.15)] bg-white/95 text-slate-700 placeholder:text-slate-400 shadow-[0_10px_26px_rgba(31,27,36,0.08)] focus:outline-none focus:ring-2 focus:ring-[#ff9051]/70"
              />
              <input
                placeholder="Destination folder"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                onFocus={() => setLastFocus("dest")}
                className="w-full text-xs px-4 py-2.5 rounded-2xl border border-[rgba(31,27,36,0.15)] bg-white/95 text-slate-700 placeholder:text-slate-400 shadow-[0_10px_26px_rgba(31,27,36,0.08)] focus:outline-none focus:ring-2 focus:ring-[#ff9051]/70"
              />
            </div>
          </div>
          <Button
            onClick={handleRun}
            isLoading={pending}
            bg="charcoal"
            color="white"
            borderRadius="20px"
            boxShadow="0 18px 45px rgba(31,27,36,0.35)"
            _hover={{ bg: "accent", transform: "translateY(-2px)" }}
            transition="all 0.25s ease"
          >
            Run Copy
          </Button>
        </VStack>
        <VStack align="stretch" spacing={4}>
          <Box>
            <Text fontSize="xs" color="muted" fontWeight="600">
              Summary
            </Text>
            <Box mt={2} p="12px" borderRadius="16px" bg="rgba(31,27,36,0.04)" border="1px solid rgba(31,27,36,0.1)">
              <Text fontSize="lg" color="charcoal">
                {summary
                  ? `Copied ${summary.copied} · Skipped ${summary.skipped_exist} · Missing ${summary.missing_in_src}`
                  : "—"}
              </Text>
            </Box>
          </Box>
          <Box>
            <Text fontSize="xs" color="muted" fontWeight="600">
              CSV
            </Text>
            <Box mt={2} p="12px" borderRadius="16px" bg="rgba(255,144,81,0.08)" border="1px solid rgba(31,27,36,0.08)">
              <Text fontSize="sm" color="accent">
                {csvPath || "—"}
              </Text>
            </Box>
          </Box>
        <Box>
          <Text fontSize="xs" color="muted" fontWeight="600">
            Recent log
          </Text>
            <Box
              mt={2}
              bg="rgba(31,27,36,0.04)"
              borderRadius="18px"
              p="12px"
              minHeight="80px"
            >
              <VStack align="stretch" spacing={1}>
                {logs.length === 0 && <Text color="muted">No log entries yet.</Text>}
                {logs.map((line, idx) => (
                  <Text key={`${line}-${idx}`} fontSize="sm" color="charcoal">
                    {line}
                  </Text>
                ))}
              </VStack>
            </Box>
          </Box>
        </VStack>
      </Grid>
    </ModuleShell>
  );
}

function MakeBlankModule() {
  const toast = useToast();
  const [folder, setFolder] = useState("");
  const [recursive, setRecursive] = useState(true);
  const [dryRun, setDryRun] = useState(true);
  const [selectedExts, setSelectedExts] = useState(IMG_EXTS);
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState(null);
  const [csvPath, setCsvPath] = useState("");
  const [logs, pushLog, clearLogs] = useLogs();
  const { rememberFolder, registerHistoryHandler } = useDatasetRecents();

  useEffect(() => {
    const unregister = registerHistoryHandler((path) => {
      setFolder(path);
    });
    return unregister;
  }, [registerHistoryHandler]);

  const handleReset = () => {
    setFolder("");
    setRecursive(true);
    setDryRun(true);
    setSelectedExts(IMG_EXTS);
    setSummary(null);
    setCsvPath("");
    clearLogs();
  };

  const toggleExt = (ext) => {
    setSelectedExts((prev) =>
      prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext]
    );
  };

  const handleRun = async () => {
    if (!folder.trim()) {
      toast({ status: "error", description: "Enter a folder path." });
      return;
    }
    setPending(true);
    try {
      const resp = await axios.post(`${API_BASE}/dataset/captions/make_blank`, {
        folder,
        recursive,
        dry_run: dryRun,
        extensions: selectedExts,
      });
      setSummary(resp.data.summary);
      setCsvPath(resp.data.csv_path);
      pushLog(resp.data.log);
      rememberFolder(folder);
    } catch (err) {
      toast({ status: "error", description: err?.response?.data?.detail || "Run failed" });
    } finally {
      setPending(false);
    }
  };

  return (
    <ModuleShell
      title="Blank TXT Forge"
      subtitle="Ensure every image gets a sister caption file, ready for annotation."
    >
      <Grid templateColumns="1fr 1fr" gap={6}>
        <VStack align="stretch" spacing={4}>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <IconButton
                aria-label="Reset blank forge"
                icon={<RepeatIcon />}
                onClick={handleReset}
                variant="ghost"
                size="sm"
                color="charcoal"
                _hover={{ bg: "rgba(255,144,81,0.15)" }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRecursive((prev) => !prev)}
                  aria-label="Blank forge recursive toggle"
                  className={`px-4 py-2 rounded-full text-[11px] font-semibold border transition-all ${
                    recursive
                      ? "bg-[#ff9051] text-white border-[#e07b40]"
                      : "bg-white text-[#b15b2c] border-[#f6c197]"
                  }`}
                >
                  Recursive
                </button>
                <button
                  type="button"
                  onClick={() => setDryRun((prev) => !prev)}
                  className={`px-4 py-2 rounded-full text-[11px] font-semibold border transition-all ${
                    dryRun
                      ? "bg-[#ff9051] text-white border-[#e07b40]"
                      : "bg-white text-[#b15b2c] border-[#f6c197]"
                  }`}
                >
                  Dry run
                </button>
              </div>
            </div>
            <input
              placeholder="Folder path"
              aria-label="Blank TXT folder path"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full text-xs px-4 py-2.5 rounded-2xl border border-[rgba(31,27,36,0.15)] bg-white/95 text-slate-700 placeholder:text-slate-400 shadow-[0_10px_26px_rgba(31,27,36,0.08)] focus:outline-none focus:ring-2 focus:ring-[#ff9051]/70"
            />
          </div>
          <Box>
            <Text fontSize="xs" color="muted">
              Extensions
            </Text>
            <HStack flexWrap="wrap" spacing={2}>
              {IMG_EXTS.map((ext) => (
                <Button
                  key={ext}
                  size="xs"
                  borderRadius="full"
                  variant={selectedExts.includes(ext) ? "solid" : "outline"}
                  bg={selectedExts.includes(ext) ? "charcoal" : "transparent"}
                  color={selectedExts.includes(ext) ? "white" : "charcoal"}
                  onClick={() => toggleExt(ext)}
                >
                  {ext}
                </Button>
              ))}
            </HStack>
          </Box>
          <Button
            onClick={handleRun}
            isLoading={pending}
            bg="charcoal"
            color="white"
            borderRadius="20px"
            boxShadow="0 18px 45px rgba(31,27,36,0.35)"
            _hover={{ bg: "accent", transform: "translateY(-2px)" }}
            transition="all 0.25s ease"
          >
            Forge Files
          </Button>
        </VStack>
        <VStack align="stretch" spacing={4}>
          <Box>
            <Text fontSize="xs" color="muted" fontWeight="600">
              Summary
            </Text>
            <Box
              mt={2}
              p="12px"
              borderRadius="16px"
              bg="rgba(31,27,36,0.04)"
              border="1px solid rgba(31,27,36,0.1)"
            >
              <Text fontSize="lg" color="charcoal">
                {summary ? `Created ${summary.created} · Existing ${summary.already_exists}` : "—"}
              </Text>
            </Box>
          </Box>
          <Box>
            <Text fontSize="xs" color="muted" fontWeight="600">
              CSV
            </Text>
            <Box
              mt={2}
              p="12px"
              borderRadius="16px"
              bg="rgba(255,144,81,0.08)"
              border="1px solid rgba(31,27,36,0.08)"
            >
              <Text fontSize="sm" color="accent">
                {csvPath || "—"}
              </Text>
            </Box>
          </Box>
        <Box>
          <Text fontSize="xs" color="muted" fontWeight="600">
            Recent log
          </Text>
          <Box
            mt={2}
            bg="rgba(31,27,36,0.04)"
            borderRadius="18px"
            p="12px"
            minHeight="80px"
            border="1px solid rgba(31,27,36,0.1)"
          >
            <VStack align="stretch" spacing={1}>
              {logs.length === 0 && (
                <Text color="muted" fontSize="xs" fontStyle="italic">
                  No log entries yet.
                </Text>
              )}
              {logs.map((line, idx) => (
                <Text key={`${line}-${idx}`} fontSize="sm" color="charcoal">
                  {line}
                </Text>
              ))}
            </VStack>
          </Box>
        </Box>
      </VStack>
      </Grid>
    </ModuleShell>
  );
}

const modules = [
  {
    key: "caption",
    label: "Caption Atelier",
    hint: "Prefix & suffix sweeps with preview + backups",
    description: "Prefix & suffix blends with undo snapshots.",
    component: CaptionModule,
  },
  {
    key: "copy",
    label: "Caption Courier",
    hint: "Sync captions between sibling folders safely",
    description: "Copy captions between sibling drops safely.",
    component: CopyCaptionsModule,
  },
  {
    key: "blank",
    label: "Blank TXT Forge",
    hint: "Generate empty caption shells for fresh drops",
    description: "Create empty TXT shells for fresh renders.",
    component: MakeBlankModule,
  },
];

function DatasetRecentFoldersPanel() {
  const { recentFolders, applyFolderFromHistory, clearRecents, hasActiveHandler } = useDatasetRecents();
  const toast = useToast();

  if (!recentFolders.length) {
    return (
      <div className="rounded-2xl bg-white/80 border border-slate-400/40 px-4 py-3 text-[11px] text-slate-600">
        Folder history will appear here after you load a dataset path.
      </div>
    );
  }

  const handleSelect = (path) => {
    const filled = applyFolderFromHistory(path);
    if (!filled) {
      toast({
        status: "warning",
        description: "Open a dataset module to target before picking from history.",
        duration: 2200,
      });
    } else {
      toast({
        status: "info",
        description: "Folder applied from history.",
        duration: 1500,
      });
    }
  };

  return (
    <div className="rounded-2xl bg-white/90 border border-slate-400/40 px-4 py-4 space-y-3">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
        <span>Recent folders</span>
        <button
          type="button"
          aria-label="Clear recent folders"
          onClick={clearRecents}
          className="text-[10px] uppercase tracking-wide text-slate-400 hover:text-slate-600 transition"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-col space-y-2">
        {recentFolders.map((path) => (
          <button
            key={path}
            type="button"
            disabled={!hasActiveHandler}
            onClick={() => handleSelect(path)}
            title={path}
            className={`text-left text-[11px] truncate px-3 py-2 rounded-2xl border transition shadow-[0_6px_18px_rgba(0,0,0,0.05)]
              ${
                hasActiveHandler
                  ? "bg-white text-[#b15b2c] border-[#f6c197] hover:bg-[#ffe7d6]"
                  : "bg-slate-100 text-slate-400 border-transparent cursor-not-allowed"
              }`}
          >
            {path}
          </button>
        ))}
      </div>
    </div>
  );
}

function DatasetRightPanel() {
  const { sidecarLogs } = useDatasetRecents();
  return (
    <div className="rounded-3xl bg-white/85 border border-slate-500/40 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-4 space-y-3 text-[11px] leading-snug">
      <DatasetRecentFoldersPanel />
      <div className="flex items-center justify-between pt-2">
        <p className="text-[9px] uppercase tracking-[0.45em] text-slate-500">
          Quiet Notes
        </p>
        <span className="text-[9px] font-semibold text-slate-700 px-2 py-0.5 rounded-full border border-slate-400/60">
          DSA
        </span>
      </div>
      <p className="text-slate-700 font-semibold">
        Mirror the File Renamer lens—<span className="italic text-slate-500">same stance, zero scroll.</span>
      </p>
      <div className="border-t border-slate-200/80 pt-2 space-y-1.5 text-slate-600">
        <p>
          <strong className="text-slate-800">Alignment:</strong> Left rail, title card, main card stay identical to FR-DB.
        </p>
        <p>
          <strong className="text-slate-800">Typography:</strong> Use FR-DB sizes; vary tone with color/weight only.
        </p>
        <p>
          <strong className="text-slate-800">Quiet rail:</strong> Reserve this strip for dataset helpers—no extra cards.
        </p>
      </div>
      <div className="rounded-2xl bg-slate-900/5 border border-slate-400/30 px-3 py-2.5 text-slate-700">
        <span className="font-semibold text-slate-900">Reminder:</span> Preview & snapshot before caption sweeps; backups keep atelier sessions reversible.
      </div>
      <div className="border-t border-slate-200/70 pt-3">
        <p className="text-[9px] uppercase tracking-[0.35em] text-slate-500">
          Recent log
        </p>
        <div className="mt-2 max-h-28 overflow-auto pr-1 space-y-1 text-slate-600">
          {sidecarLogs.length === 0 && (
            <p className="text-[10px] italic text-slate-400">Awaiting first entry…</p>
          )}
          {sidecarLogs.map((line, idx) => (
            <p key={`${line}-${idx}`} className="text-[11px] text-slate-700">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DatasetActionsDashboard() {
  const [active, setActive] = useState(modules[0].key);
  return (
    <ChakraProvider theme={theme}>
      <DatasetRecentsProvider>
        <div className="relative w-full">
          <Motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={mainCardClasses}
          >
            <div className="relative z-10 px-6 py-6 md:px-8 md:py-7 flex flex-col gap-6 min-h-[720px]">
              <section className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
                  CHOOSE OPERATION
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {modules.map((mod) => {
                    const isActive = mod.key === active;
                    return (
                      <div key={mod.key} className="flex flex-col items-stretch">
                        <Button
                          onClick={() => setActive(mod.key)}
                          borderRadius="18px"
                          height="34px"
                          width="100%"
                          fontSize={isActive ? "0.8rem" : "0.75rem"}
                          fontWeight="600"
                          bg={isActive ? "rgba(255,144,81,0.18)" : "rgba(0,0,0,0.04)"}
                          color={isActive ? "charcoal" : "muted"}
                          border="1px solid rgba(0,0,0,0.05)"
                          _hover={{ transform: "translateY(-2px)" }}
                          transition="all 0.2s ease"
                        >
                          {mod.label}
                        </Button>
                        {isActive && (
                          <p className="text-[10px] text-slate-500 text-center mt-0.5 px-2">
                            {mod.description ? mod.description.replace(/\.$/, "") : ""}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="flex-1 min-h-[420px]">
                <AnimatePresence mode="sync" initial={false}>
                  {modules.map((mod) => {
                    if (mod.key !== active) return null;
                    const Component = mod.component;
                    return (
                      <Motion.div
                        key={mod.key}
                        style={{ height: "100%" }}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.35 }}
                      >
                        <Component />
                      </Motion.div>
                    );
                  })}
                </AnimatePresence>
              </section>
            </div>
          </Motion.div>
          <div className="hidden 2xl:block absolute top-0 right-[-20rem] w-[18rem]">
            <DatasetRightPanel />
          </div>
          <div className="2xl:hidden mt-4 w-full">
            <DatasetRightPanel />
          </div>
        </div>
      </DatasetRecentsProvider>
    </ChakraProvider>
  );
}
