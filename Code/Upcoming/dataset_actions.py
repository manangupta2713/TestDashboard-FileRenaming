# DatasetActions — Step 4 (adds Face Crop tab with Undo/Redo)
import os
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Tuple, Any

import csv
from datetime import datetime

import tempfile
import shutil

# ---- PIN THIS PROCESS TO CUDA 12.4 + explicit cuDNN v9 bin (Windows) ----
import os

CUDA12 = r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.4"
CUDA12_BIN = fr"{CUDA12}\bin"
CUDNN_BIN = r"C:\Program Files\NVIDIA\CUDNN\v9.14\bin\12.9"   # <-- replace with the bin you found in step 1

if os.name == "nt":
    # Force CUDA 12.4
    os.environ["CUDA_PATH"] = CUDA12

    # Rebuild PATH: drop all CUDA Toolkit \bin entries and any cuDNN/TensorRT bins,
    # then prepend CUDA12 bin and the SPECIFIC cuDNN v9 bin we want.
    drop_markers = [
        r"NVIDIA GPU Computing Toolkit\\CUDA\\",   # note doubled backslashes
        r"NVIDIA\\CUDNN\\",
        r"NVIDIA\\TensorRT\\",
    ]
    kept = []
    for p in os.environ.get("PATH", "").split(";"):
        if not p:
            continue
        low = p.lower()
        # drop all generic CUDA/cuDNN/TRT entries from PATH
        if any(m.lower() in low for m in drop_markers) and low.endswith("\\bin"):
            continue
        kept.append(p)

    # add exactly the two bins we want at the front
    if os.path.isdir(CUDNN_BIN):
        kept.insert(0, CUDNN_BIN)
    if os.path.isdir(CUDA12_BIN):
        kept.insert(0, CUDA12_BIN)

    os.environ["PATH"] = ";".join(kept)

    # Ensure the loader sees these directories first
    if os.path.isdir(CUDA12_BIN):
        os.add_dll_directory(CUDA12_BIN)
    if os.path.isdir(CUDNN_BIN):
        os.add_dll_directory(CUDNN_BIN)

    # Disable TensorRT EP to avoid any surprise pulls
    os.environ["ORT_DISABLE_TRT"] = "1"
    os.environ["ORT_TENSORRT_ENABLE"] = "0"
# ---- END PIN ----


import os, onnxruntime as ort
print(">> [fc_run] CUDA_PATH:", os.environ.get("CUDA_PATH"))
print(">> [fc_run] CUDA bits in PATH:", [p for p in os.environ.get("PATH","").split(";") if "CUDA\\v" in p][:6])
print(">> [fc_run] ORT providers (pre):", ort.get_available_providers())


print("=== CUDA pin debug ===")
print("CUDA_PATH:", os.environ.get("CUDA_PATH"))
_paths = os.environ.get("PATH","").split(";")
print("PATH CUDA entries (top 10 shown):")
for p in [q for q in _paths if "NVIDIA GPU Computing Toolkit\\CUDA" in q][:10]:
    print("  ", p)
print("======================")

import gradio as gr

# NEW: libs for face crop tab
import cv2
from insightface.app import FaceAnalysis

# ---------- Helpers ----------
IMG_EXTS_ALL = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"]
CAPTION_GLOBS = ["*.txt"]  # explicit tick-box per your request

def pick_folder() -> str:
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        path = filedialog.askdirectory(title="Select a folder")
        root.destroy()
        return path or ""
    except Exception as e:
        return f"ERROR: {e}"

def log_line(log: str, msg: str) -> str:
    return (log + ("\n" if log else "") + msg)

def list_images(folder: Path, recursive: bool, exts: List[str]) -> List[Path]:
    exts_set = set([e.lower() for e in exts])
    if recursive:
        return [p for p in folder.rglob("*") if p.suffix.lower() in exts_set]
    else:
        return [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in exts_set]

def read_text_safe(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8")
    except Exception:
        return ""

def write_text_safe(p: Path, content: str):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")

def write_summary_csv(base_dir: Path, name_prefix: str, headers: List[str], rows: List[List[str]]) -> str:
    """
    Writes a timestamped CSV to base_dir/__reports (persistent),
    then copies it to the system temp dir and returns THAT temp path
    (so Gradio's File component can serve it safely).
    """
    reports = base_dir / "__reports"
    reports.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    persistent = reports / f"{name_prefix}_{ts}.csv"

    with persistent.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows(rows)

    temp_dir = Path(tempfile.gettempdir()) / "Datasetactions_reports"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_copy = temp_dir / persistent.name
    try:
        shutil.copy2(persistent, temp_copy)
    except Exception:
        with temp_copy.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(headers)
            w.writerows(rows)

    return str(temp_copy)

# ---------- Undo/Redo Snapshots (TEXT) ----------
@dataclass
class Snapshot:
    dir: Path
    files: List[str]

def make_snapshot(base: Path, affected: List[Path], before_texts: Dict[Path, str], after_texts: Dict[Path, str]) -> Snapshot:
    ts = time.strftime("%Y%m%d_%H%M%S")
    snap_dir = base / "__undo" / ts
    before_dir = snap_dir / "before"
    after_dir = snap_dir / "after"
    before_dir.mkdir(parents=True, exist_ok=True)
    after_dir.mkdir(parents=True, exist_ok=True)

    rels: List[str] = []
    for p in affected:
        rel = str(p.relative_to(base)).replace("\\", "/")
        rels.append(rel)
        dst_before = before_dir / rel
        dst_before.parent.mkdir(parents=True, exist_ok=True)
        write_text_safe(dst_before, before_texts[p])
        dst_after = after_dir / rel
        dst_after.parent.mkdir(parents=True, exist_ok=True)
        write_text_safe(dst_after, after_texts[p])

    manifest = {"base": str(base), "files": rels, "created_at": ts, "count": len(rels), "version": 2}
    write_text_safe(snap_dir / "manifest.json", json.dumps(manifest, indent=2))
    return Snapshot(dir=snap_dir, files=rels)

def _restore_set(base: Path, snap_dir: Path, which: str) -> Tuple[int, List[str]]:
    restored = 0
    errors: List[str] = []
    try:
        manifest = json.loads((snap_dir / "manifest.json").read_text(encoding="utf-8"))
        rels: List[str] = manifest.get("files", [])
    except Exception as e:
        return 0, [f"manifest.json read error: {e}"]

    for rel in rels:
        try:
            src = (snap_dir / which / rel)
            if not src.exists():
                errors.append(f"missing in snapshot: {which}/{rel}")
                continue
            dst = (base / rel)
            dst.parent.mkdir(parents=True, exist_ok=True)
            write_text_safe(dst, src.read_text(encoding="utf-8"))
            restored += 1
        except Exception as e:
            errors.append(f"{rel}: {e}")
    return restored, errors

def restore_before(base: Path, snap: Snapshot) -> Tuple[int, List[str]]:
    return _restore_set(base, snap.dir, "before")

def restore_after(base: Path, snap: Snapshot) -> Tuple[int, List[str]]:
    return _restore_set(base, snap.dir, "after")

# ---------- TAB 1: Add Prefix/Suffix with table ----------
def t1_browse():
    return pick_folder()

def t1_load(folder: str, recursive: bool, log: str):
    if not folder or folder.startswith("ERROR"):
        return [], [], log_line(log, "Select a valid folder first.")
    base = Path(folder)
    if not base.exists():
        return [], [], log_line(log, "Folder does not exist.")

    if recursive:
        txts = list(base.rglob("*.txt"))
    else:
        txts = [p for p in base.glob("*.txt") if p.is_file()]
    txts.sort()

    rows = []
    files = []
    for p in txts:
        cap = read_text_safe(p)
        rows.append([str(p.name), cap, cap])
        files.append(str(p))

    if not rows:
        return [], [], log_line(log, "No caption files found.")

    new_log = log_line(log, f"Loaded {len(rows)} captions.")
    return rows, files, new_log

def _rows_to_list(rows):
    try:
        import pandas as pd  # type: ignore
        if isinstance(rows, pd.DataFrame):
            return rows.values.tolist()
    except Exception:
        pass
    return rows or []

def t1_preview_update(rows, prefix: str, suffix: str):
    rows = _rows_to_list(rows)
    if not rows:
        return rows
    out = []
    pre = prefix or ""
    suf = suffix or ""
    for filename, caption, _prev in rows:
        cap = caption or ""
        preview = f"{pre}{cap}{suf}"
        out.append([filename, cap, preview])
    return out

def t1_run(folder: str, recursive: bool, make_backup: bool, dry_run: bool,
           rows, files: List[str],
           prefix: str, suffix: str, log: str,
           undo_stack: List[Dict[str, Any]], redo_stack: List[Dict[str, Any]]):

    if not folder or folder.startswith("ERROR"):
        return rows, files, undo_stack, redo_stack, log_line(log, "Select a valid folder first.")
    base = Path(folder)
    if not base.exists():
        return rows, files, undo_stack, redo_stack, log_line(log, "Folder does not exist.")

    rows = _rows_to_list(rows)
    if not rows or not files or len(rows) != len(files):
        return rows, files, undo_stack, redo_stack, log_line(log, "Nothing loaded. Click Load first.")

    progress = gr.Progress(track_tqdm=False)
    progress(0, desc="Starting…")

    pre = prefix or ""
    suf = suffix or ""

    affected_paths: List[Path] = []
    before_texts: Dict[Path, str] = {}
    after_texts: Dict[Path, str] = {}

    changed = 0
    skipped = 0
    backed_up = 0

    new_log = log_line(log, f"Running{' (dry-run)' if dry_run else ''} on {len(rows)} captions...")

    backup_dir = None
    if make_backup and not dry_run:
        backup_dir = base / "__backup_prefix_suffix"
        backup_dir.mkdir(parents=True, exist_ok=True)

    summary_rows: List[List[str]] = []

    for i, fp in enumerate(files):
        p = Path(fp)
        if not p.exists():
            continue
        original = read_text_safe(p)
        user_caption = rows[i][1] or ""
        final_text = f"{pre}{user_caption}{suf}"

        if backup_dir and not dry_run:
            try:
                write_text_safe(backup_dir / (p.name + ".bak"), original)
                backed_up += 1
            except Exception:
                pass

        if final_text == original:
            skipped += 1
        else:
            affected_paths.append(p)
            before_texts[p] = original
            after_texts[p] = final_text

            if not dry_run:
                try:
                    write_text_safe(p, final_text)
                    changed += 1
                except Exception as e:
                    new_log = log_line(new_log, f"[ERROR] Write failed for {p}: {e}")
            else:
                changed += 1

        old_preview = (original or "")[:80].replace("\n", " ")
        new_preview = (final_text or "")[:80].replace("\n", " ")
        summary_rows.append([str(p.relative_to(base)), "changed" if final_text != original else "skipped", old_preview, new_preview])

        if (i + 1) % 25 == 0 or (i + 1) == len(files):
            progress((i + 1) / len(files), desc=f"Processing {i+1}/{len(files)}")

    if affected_paths and not dry_run:
        snap = make_snapshot(base, affected_paths, before_texts, after_texts)
        undo_stack = (undo_stack or [])
        undo_stack.append({"dir": str(snap.dir)})
        if len(undo_stack) > 3:
            undo_stack = undo_stack[-3:]
        redo_stack = []

    summary = f"Done | changed: {changed}, skipped: {skipped}"
    if backup_dir and not dry_run:
        summary += f", .bak: {backed_up}"
    new_log = log_line(new_log, summary)

    csv_path = write_summary_csv(
        base, "prefix_suffix",
        ["relative_path", "action", "old_head", "new_head"],
        summary_rows
    )

    new_rows, new_files, new_log = t1_load(folder, recursive, new_log)
    return new_rows, new_files, undo_stack, redo_stack, new_log, csv_path

def t1_undo(folder: str, recursive: bool, rows: List[List[str]], files: List[str],
            log: str, undo_stack: List[Dict[str, Any]], redo_stack: List[Dict[str, Any]]):

    if not folder or folder.startswith("ERROR"):
        return rows, files, undo_stack, redo_stack, log_line(log, "Select a valid folder first.")
    base = Path(folder)
    if not base.exists():
        return rows, files, undo_stack, redo_stack, log_line(log, "Folder does not exist.")
    if not undo_stack:
        return rows, files, undo_stack, redo_stack, log_line(log, "Nothing to undo.")

    snap_info = undo_stack.pop()
    snap_dir = Path(snap_info["dir"])
    restored, errors = restore_before(base, Snapshot(dir=snap_dir, files=[]))
    if errors:
        log = log_line(log, f"[UNDO WARN] Some files failed: {errors[:3]}... ({len(errors)} total)")

    redo_stack = (redo_stack or [])
    redo_stack.append({"dir": str(snap_dir)})
    if len(redo_stack) > 3:
        redo_stack = redo_stack[-3:]

    log = log_line(log, f"Undo: restored {restored} file(s).")
    new_rows, new_files, log = t1_load(folder, recursive, log)
    return new_rows, new_files, undo_stack, redo_stack, log

def t1_redo(folder: str, recursive: bool, rows: List[List[str]], files: List[str],
            log: str, undo_stack: List[Dict[str, Any]], redo_stack: List[Dict[str, Any]]):

    if not folder or folder.startswith("ERROR"):
        return rows, files, undo_stack, redo_stack, log_line(log, "Select a valid folder first.")
    base = Path(folder)
    if not base.exists():
        return rows, files, undo_stack, redo_stack, log_line(log, "Folder does not exist.")
    if not redo_stack:
        return rows, files, undo_stack, redo_stack, log_line(log, "Nothing to redo.")

    snap_info = redo_stack.pop()
    snap_dir = Path(snap_info["dir"])
    restored, errors = restore_after(base, Snapshot(dir=snap_dir, files=[]))
    if errors:
        log = log_line(log, f"[REDO WARN] Some files failed: {errors[:3]}... ({len(errors)} total)")

    undo_stack = (undo_stack or [])
    undo_stack.append({"dir": str(snap_dir)})
    if len(undo_stack) > 3:
        undo_stack = undo_stack[-3:]

    log = log_line(log, f"Redo: re-applied {restored} file(s).")
    new_rows, new_files, log = t1_load(folder, recursive, log)
    return new_rows, new_files, undo_stack, redo_stack, log

# ---------- TAB 2: Copy Captions ----------
def t2_browse_src():
    return pick_folder()

def t2_browse_dest():
    return pick_folder()

def t2_run(src: str, dest: str, allow_overwrite: bool, dry_run: bool, log: str):
    if not src or src.startswith("ERROR") or not dest or dest.startswith("ERROR"):
        return log_line(log, "Pick both SRC and DEST folders."), ""

    src_p = Path(src)
    dest_p = Path(dest)
    if not src_p.exists() or not dest_p.exists():
        return log_line(log, "SRC or DEST does not exist."), ""

    imgs = list_images(dest_p, True, IMG_EXTS_ALL)

    progress = gr.Progress(track_tqdm=False)
    progress(0, desc="Scanning images…")

    copied = 0
    missing = 0
    exist_skip = 0
    summary_rows: List[List[str]] = []

    new_log = log_line(log, f"Found {len(imgs)} images under DEST. Running{' (dry-run)' if dry_run else ''}...")
    for idx, img in enumerate(imgs, 1):
        rel = img.relative_to(dest_p)
        txt_in_src = src_p / rel.with_suffix(".txt")
        txt_in_dest = img.with_suffix(".txt")

        if not txt_in_src.exists():
            missing += 1
            action = "missing_in_src"
        elif txt_in_dest.exists() and not allow_overwrite:
            exist_skip += 1
            action = "skipped_exist"
        else:
            if dry_run:
                copied += 1
                action = "would_copy"
            else:
                try:
                    write_text_safe(txt_in_dest, read_text_safe(txt_in_src))
                    copied += 1
                    action = "copied"
                except Exception as e:
                    new_log = log_line(new_log, f"[ERROR] Copy failed for {txt_in_dest}: {e}")
                    action = "error"

        summary_rows.append([str(rel).replace("\\", "/"), action])

        if idx % 50 == 0 or idx == len(imgs):
            progress(idx / max(1, len(imgs)), desc=f"Processing {idx}/{len(imgs)}")

    summary = f"Done | copied: {copied}, skipped_exist: {exist_skip}, missing_in_src: {missing}"
    new_log = log_line(new_log, summary)

    csv_path = write_summary_csv(
        dest_p, "copy_captions",
        ["relative_image_path", "action"],
        summary_rows
    )
    return new_log, csv_path

# ---------- TAB 3: Make Blank Txts ----------
def t3_browse():
    return pick_folder()

def t3_run(folder: str, recursive: bool, dry_run: bool, log: str, exts_selected: List[str]):
    if not folder or folder.startswith("ERROR"):
        return log_line(log, "Select a valid folder first."), ""

    base = Path(folder)
    if not base.exists():
        return log_line(log, "Folder does not exist."), ""

    exts = exts_selected or IMG_EXTS_ALL
    imgs = list_images(base, recursive, exts)

    progress = gr.Progress(track_tqdm=False)
    progress(0, desc="Scanning images…")

    created = 0
    exist = 0
    summary_rows: List[List[str]] = []

    new_log = log_line(log, f"Found {len(imgs)} images. Running{' (dry-run)' if dry_run else ''}...")
    for idx, img in enumerate(imgs, 1):
        txt = img.with_suffix(".txt")
        if txt.exists():
            exist += 1
            action = "exists"
        else:
            if dry_run:
                created += 1
                action = "would_create"
            else:
                try:
                    write_text_safe(txt, "")
                    created += 1
                    action = "created"
                except Exception as e:
                    new_log = log_line(new_log, f"[ERROR] Create failed for {txt}: {e}")
                    action = "error"

        summary_rows.append([str(img.relative_to(base)).replace("\\", "/"), action])

        if idx % 50 == 0 or idx == len(imgs):
            progress(idx / max(1, len(imgs)), desc=f"Processing {idx}/{len(imgs)}")

    summary = f"Done | created: {created}, already_exists: {exist}"
    new_log = log_line(new_log, summary)

    csv_path = write_summary_csv(
        base, "make_blank_txts",
        ["relative_image_path", "action"],
        summary_rows
    )
    return new_log, csv_path

# ---------- TAB 4: Face Crop (Nitara) ----------
# Binary snapshot: store files created by a run under __undo/<TS>/after and delete/restore on undo/redo
@dataclass
class BinSnapshot:
    dir: Path
    created_files: List[str]  # relative to output base (OUTPUT_DIR)

def _fc_make_bin_snapshot(output_base: Path, created: List[Path]) -> BinSnapshot:
    ts = time.strftime("%Y%m%d_%H%M%S")
    snap_dir = output_base / "__undo" / f"facecrop_{ts}"
    after_dir = snap_dir / "after"
    after_dir.mkdir(parents=True, exist_ok=True)
    rels: List[str] = []
    for p in created:
        if not p.exists():
            continue
        rel = str(p.relative_to(output_base)).replace("\\", "/")
        rels.append(rel)
        dst = after_dir / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dst)
    manifest = {"base": str(output_base), "files": rels, "created_at": ts, "kind": "facecrop_v1"}
    write_text_safe(snap_dir / "manifest.json", json.dumps(manifest, indent=2))
    return BinSnapshot(dir=snap_dir, created_files=rels)

def _fc_delete_created(output_base: Path, created_rels: List[str]) -> Tuple[int, List[str]]:
    deleted = 0
    errors: List[str] = []
    for rel in created_rels:
        try:
            p = (output_base / rel)
            if p.exists():
                p.unlink()
                deleted += 1
        except Exception as e:
            errors.append(f"{rel}: {e}")
    return deleted, errors

def _fc_restore_created(output_base: Path, snap_dir: Path, created_rels: List[str]) -> Tuple[int, List[str]]:
    restored = 0
    errors: List[str] = []
    for rel in created_rels:
        try:
            src = (snap_dir / "after" / rel)
            if not src.exists():
                errors.append(f"missing in snapshot: after/{rel}")
                continue
            dst = (output_base / rel)
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            restored += 1
        except Exception as e:
            errors.append(f"{rel}: {e}")
    return restored, errors

# cache InsightFace app across runs
_FACE_APP = None
def _get_face_app(det_w: int = 640, det_h: int = 640):
    global _FACE_APP
    if _FACE_APP is None:
        try:
            app = FaceAnalysis(name="buffalo_l", providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
        except Exception:
            app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        app.prepare(ctx_id=0, det_size=(det_w, det_h))
        _FACE_APP = app
    return _FACE_APP

def _safe_crop(img, x1, y1, x2, y2, margin_pct):
    h, w = img.shape[:2]
    bw, bh = x2 - x1, y2 - y1
    mx = int(bw * margin_pct)
    my = int(bh * margin_pct)
    X1 = max(0, x1 - mx)
    Y1 = max(0, y1 - my)
    X2 = min(w, x2 + mx)
    Y2 = min(h, y2 + my)
    return img[Y1:Y2, X1:X2]

def _pick_face(faces, min_score: float, min_size: int, female_only: bool) -> Any:
    best = None
    best_area = -1
    for f in faces:
        if f.det_score is not None and f.det_score < min_score:
            continue
        if female_only:
            if getattr(f, "gender", None) is None or f.gender != 0:  # 0=female
                continue
        x1, y1, x2, y2 = map(int, f.bbox)
        if (x2 - x1) < min_size or (y2 - y1) < min_size:
            continue
        area = (x2 - x1) * (y2 - y1)
        if area > best_area:
            best_area = area
            best = f
    return best

def fc_browse_input():
    return pick_folder()

def fc_browse_output():
    return pick_folder()

def fc_rejected_toggle(rejected: bool, min_size: int, margin: float, det_score: float, female_only: bool):
    # Auto-adjust to rejected defaults when checked; keep user tweaks otherwise
    if rejected:
        return 60, 0.65, det_score, False
    else:
        return 80, 0.45, det_score, True

import os, onnxruntime as ort
print(">> [fc_run] CUDA_PATH:", os.environ.get("CUDA_PATH"))
print(">> [fc_run] CUDA bits in PATH:", [p for p in os.environ.get("PATH","").split(";") if "CUDA\\v" in p])
print(">> [fc_run] ORT providers (pre):", ort.get_available_providers())

def fc_run(input_dir: str, output_dir: str, recursive: bool,
           min_size: int, margin_pct: float, det_score: float, female_only: bool,
           dry_run: bool, log: str,
           undo_stack_fc: List[Dict[str, Any]], redo_stack_fc: List[Dict[str, Any]]):

    if not input_dir or input_dir.startswith("ERROR"):
        return log_line(log, "Pick a valid INPUT folder."), "", undo_stack_fc, redo_stack_fc
    if not output_dir or output_dir.startswith("ERROR"):
        return log_line(log, "Pick a valid OUTPUT folder."), "", undo_stack_fc, redo_stack_fc

    inp = Path(input_dir)
    out = Path(output_dir)
    if not inp.exists():
        return log_line(log, "INPUT does not exist."), "", undo_stack_fc, redo_stack_fc
    out.mkdir(parents=True, exist_ok=True)

    # Prepare skipped folders (match your script)
    SKIP_BASE = out / "skipped"
    SKIP_UNREADABLE = SKIP_BASE / "unreadable_files"
    SKIP_NO_FACES = SKIP_BASE / "no_faces_detected"
    SKIP_NO_FEMALE = SKIP_BASE / "no_female_face_kept"
    SKIP_UNREADABLE.mkdir(parents=True, exist_ok=True)
    SKIP_NO_FACES.mkdir(parents=True, exist_ok=True)
    SKIP_NO_FEMALE.mkdir(parents=True, exist_ok=True)

    patterns = IMG_EXTS_ALL
    imgs = list_images(inp, recursive, patterns)

    progress = gr.Progress(track_tqdm=False)
    progress(0, desc="Scanning images…")

    created_files: List[Path] = []  # for snapshot
    summary_rows: List[List[str]] = []

    app = _get_face_app(640, 640)

    new_log = log_line(log, f"Found {len(imgs)} images. Running{' (dry-run)' if dry_run else ''}...")
    for idx, img_p in enumerate(imgs, 1):
        rel = img_p.relative_to(inp)
        try:
            img = cv2.imread(str(img_p))
            if img is None:
                # unreadable
                if dry_run:
                    action = "would_copy_unreadable"
                else:
                    dst = SKIP_UNREADABLE / rel.name
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(img_p, dst)
                    created_files.append(dst)
                    action = "copied_unreadable"
                summary_rows.append([str(rel).replace("\\", "/"), action])
                continue

            faces = app.get(img)
            if not faces:
                if dry_run:
                    action = "would_copy_no_faces"
                else:
                    dst = SKIP_NO_FACES / rel.name
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(img_p, dst)
                    created_files.append(dst)
                    action = "copied_no_faces"
                summary_rows.append([str(rel).replace("\\", "/"), action])
                continue

            chosen = _pick_face(faces, det_score, min_size, female_only)
            if chosen is None:
                # In gender-agnostic mode, this means "no face passed thresholds"
                # In female-only mode, this is "no_female_face_kept"
                if dry_run:
                    action = "would_copy_no_female_or_below_threshold"
                else:
                    dst = (SKIP_NO_FEMALE if female_only else SKIP_NO_FACES) / rel.name
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(img_p, dst)
                    created_files.append(dst)
                    action = "copied_no_female" if female_only else "copied_below_threshold"
                summary_rows.append([str(rel).replace("\\", "/"), action])
                continue

            x1, y1, x2, y2 = map(int, chosen.bbox)
            crop = _safe_crop(img, x1, y1, x2, y2, margin_pct)
            out_name = f"{img_p.stem}_headshot.png"
            dst = out / out_name

            if dry_run:
                action = "would_write_crop"
            else:
                cv2.imwrite(str(dst), crop, [cv2.IMWRITE_PNG_COMPRESSION, 0])
                created_files.append(dst)
                action = "wrote_crop"

            summary_rows.append([str(rel).replace("\\", "/"), action])

        except Exception as e:
            new_log = log_line(new_log, f"[ERROR] {rel}: {e}")

        if idx % 50 == 0 or idx == len(imgs):
            progress(idx / max(1, len(imgs)), desc=f"Processing {idx}/{len(imgs)}")

    # Snapshot only in non-dry runs
    if not dry_run:
        snap = _fc_make_bin_snapshot(out, created_files)
        undo_stack_fc = (undo_stack_fc or [])
        undo_stack_fc.append({"dir": str(snap.dir)})
        if len(undo_stack_fc) > 3:
            undo_stack_fc = undo_stack_fc[-3:]
        redo_stack_fc = []

    summary = f"Done | outputs_created: {len(created_files)}"
    new_log = log_line(new_log, summary)

    # CSV under OUTPUT
    csv_path = write_summary_csv(
        out, "face_crop",
        ["relative_input_path", "action"],
        summary_rows
    )
    return new_log, csv_path, undo_stack_fc, redo_stack_fc

def fc_undo(output_dir: str, log: str, undo_stack_fc: List[Dict[str, Any]], redo_stack_fc: List[Dict[str, Any]]):
    if not output_dir or output_dir.startswith("ERROR"):
        return log_line(log, "Pick a valid OUTPUT folder first."), undo_stack_fc, redo_stack_fc
    base = Path(output_dir)
    if not base.exists():
        return log_line(log, "OUTPUT folder does not exist."), undo_stack_fc, redo_stack_fc
    if not undo_stack_fc:
        return log_line(log, "Nothing to undo."), undo_stack_fc, redo_stack_fc

    snap_info = undo_stack_fc.pop()
    snap_dir = Path(snap_info["dir"])
    try:
        manifest = json.loads((snap_dir / "manifest.json").read_text(encoding="utf-8"))
        rels: List[str] = manifest.get("files", [])
    except Exception as e:
        return log_line(log, f"[UNDO ERROR] manifest: {e}"), undo_stack_fc, redo_stack_fc

    deleted, errors = _fc_delete_created(base, rels)
    if errors:
        log = log_line(log, f"[UNDO WARN] Some files failed: {errors[:3]}... ({len(errors)} total)")
    log = log_line(log, f"Undo: removed {deleted} file(s).")

    redo_stack_fc = (redo_stack_fc or [])
    redo_stack_fc.append({"dir": str(snap_dir)})
    if len(redo_stack_fc) > 3:
        redo_stack_fc = redo_stack_fc[-3:]
    return log, undo_stack_fc, redo_stack_fc

def fc_redo(output_dir: str, log: str, undo_stack_fc: List[Dict[str, Any]], redo_stack_fc: List[Dict[str, Any]]):
    if not output_dir or output_dir.startswith("ERROR"):
        return log_line(log, "Pick a valid OUTPUT folder first."), undo_stack_fc, redo_stack_fc
    base = Path(output_dir)
    if not base.exists():
        return log_line(log, "OUTPUT folder does not exist."), undo_stack_fc, redo_stack_fc
    if not redo_stack_fc:
        return log_line(log, "Nothing to redo."), undo_stack_fc, redo_stack_fc

    snap_info = redo_stack_fc.pop()
    snap_dir = Path(snap_info["dir"])
    try:
        manifest = json.loads((snap_dir / "manifest.json").read_text(encoding="utf-8"))
        rels: List[str] = manifest.get("files", [])
    except Exception as e:
        return log_line(log, f"[REDO ERROR] manifest: {e}"), undo_stack_fc, redo_stack_fc

    restored, errors = _fc_restore_created(base, snap_dir, rels)
    if errors:
        log = log_line(log, f"[REDO WARN] Some files failed: {errors[:3]}... ({len(errors)} total)")
    log = log_line(log, f"Redo: restored {restored} file(s).")

    undo_stack_fc = (undo_stack_fc or [])
    undo_stack_fc.append({"dir": str(snap_dir)})
    if len(undo_stack_fc) > 3:
        undo_stack_fc = undo_stack_fc[-3:]
    return log, undo_stack_fc, redo_stack_fc

# ---------- Build UI ----------
with gr.Blocks(
    title="DatasetActions",
    fill_width=True,
    fill_height=True,
    css="""
    .gradio-container { max-width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
    """
) as demo:

    gr.Markdown("## DatasetActions — Step 4")

    # --- TAB 1: Add Prefix / Suffix ---
    with gr.Tab("Add Prefix / Suffix"):
        with gr.Row(equal_height=True):
            with gr.Column(scale=1, min_width=420):
                t1_folder = gr.Textbox(label="Folder", interactive=False, placeholder="(click Browse)")
                t1_browse_btn = gr.Button("Browse…")
                with gr.Row():
                    t1_recursive = gr.Checkbox(value=False, label="Recursive")
                    t1_make_backup = gr.Checkbox(value=False, label="Also write .bak (optional)")
                    t1_dry = gr.Checkbox(value=True, label="Dry-run")
                t1_globs = gr.CheckboxGroup(choices=CAPTION_GLOBS, value=["*.txt"], label="Target caption files")
                with gr.Row():
                    t1_prefix = gr.Textbox(label="Prefix", placeholder="(optional)")
                    t1_suffix = gr.Textbox(label="Suffix", placeholder="(optional)")
                with gr.Row():
                    t1_load_btn = gr.Button("Load")
                    t1_run_btn = gr.Button("Run")
                    t1_undo_btn = gr.Button("Undo")
                    t1_redo_btn = gr.Button("Redo")
                with gr.Accordion("Log", open=False):
                    t1_log = gr.Textbox(label="", lines=10, interactive=False)

                t1_report = gr.File(label="Download last run summary (CSV)", interactive=False)

            with gr.Column(scale=3, min_width=800):
                t1_table = gr.Dataframe(
                    headers=["Filename", "Caption", "Preview"],
                    datatype=["str", "str", "str"],
                    row_count=(0, "dynamic"),
                    interactive=True,
                    wrap=True,
                    label="Captions",
                    elem_id="t1-table"
                )

        st_files = gr.State([])
        st_undo = gr.State([])
        st_redo = gr.State([])

        t1_browse_btn.click(fn=t1_browse, outputs=t1_folder).then(
            fn=t1_load,
            inputs=[t1_folder, t1_recursive, t1_log],
            outputs=[t1_table, st_files, t1_log]
        )
        t1_folder.change(
            fn=t1_load,
            inputs=[t1_folder, t1_recursive, t1_log],
            outputs=[t1_table, st_files, t1_log]
        )
        t1_load_btn.click(
            fn=t1_load,
            inputs=[t1_folder, t1_recursive, t1_log],
            outputs=[t1_table, st_files, t1_log]
        )
        t1_prefix.change(fn=t1_preview_update, inputs=[t1_table, t1_prefix, t1_suffix], outputs=t1_table)
        t1_suffix.change(fn=t1_preview_update, inputs=[t1_table, t1_prefix, t1_suffix], outputs=t1_table)
        t1_table.change(fn=t1_preview_update, inputs=[t1_table, t1_prefix, t1_suffix], outputs=t1_table)

        t1_run_btn.click(
            fn=t1_run,
            inputs=[t1_folder, t1_recursive, t1_make_backup, t1_dry,
                    t1_table, st_files, t1_prefix, t1_suffix, t1_log, st_undo, st_redo],
            outputs=[t1_table, st_files, st_undo, st_redo, t1_log, t1_report]
        )
        t1_undo_btn.click(
            fn=t1_undo,
            inputs=[t1_folder, t1_recursive, t1_table, st_files, t1_log, st_undo, st_redo],
            outputs=[t1_table, st_files, st_undo, st_redo, t1_log]
        )
        t1_redo_btn.click(
            fn=t1_redo,
            inputs=[t1_folder, t1_recursive, t1_table, st_files, t1_log, st_undo, st_redo],
            outputs=[t1_table, st_files, st_undo, st_redo, t1_log]
        )

    # --- TAB 2: Copy Captions ---
    with gr.Tab("Copy Captions"):
        t2_src = gr.Textbox(label="SRC (captions)", interactive=False, placeholder="(click Browse)")
        t2_src_btn = gr.Button("Browse SRC…")
        t2_dest = gr.Textbox(label="DEST (images)", interactive=False, placeholder="(click Browse)")
        t2_dest_btn = gr.Button("Browse DEST…")
        with gr.Row():
            t2_over = gr.Checkbox(value=False, label="Allow overwrite")
            t2_dry = gr.Checkbox(value=True, label="Dry-run")
        t2_run_btn = gr.Button("Run")
        t2_log = gr.Textbox(label="Log", lines=10, interactive=False)
        t2_report = gr.File(label="Download last run summary (CSV)", interactive=False)

        t2_src_btn.click(fn=t2_browse_src, outputs=t2_src)
        t2_dest_btn.click(fn=t2_browse_dest, outputs=t2_dest)
        t2_run_btn.click(
            fn=t2_run,
            inputs=[t2_src, t2_dest, t2_over, t2_dry, t2_log],
            outputs=[t2_log, t2_report]
        )

    # --- TAB 3: Make Blank Txts ---
    with gr.Tab("Make Blank Txts"):
        t3_folder = gr.Textbox(label="Folder", interactive=False, placeholder="(click Browse)")
        t3_browse_btn = gr.Button("Browse…")
        with gr.Row():
            t3_recursive = gr.Checkbox(value=True, label="Recursive")
            t3_dry = gr.Checkbox(value=True, label="Dry-run")
        t3_exts = gr.CheckboxGroup(choices=IMG_EXTS_ALL, value=IMG_EXTS_ALL, label="Image extensions")
        t3_run_btn = gr.Button("Run")
        t3_log = gr.Textbox(label="Log", lines=10, interactive=False)
        t3_report = gr.File(label="Download last run summary (CSV)", interactive=False)

        t3_browse_btn.click(fn=t3_browse, outputs=t3_folder)
        t3_run_btn.click(
            fn=t3_run,
            inputs=[t3_folder, t3_recursive, t3_dry, t3_log, t3_exts],
            outputs=[t3_log, t3_report]
        )

    # --- TAB 4: Face Crop (Nitara) ---
    with gr.Tab("Face Crop (Nitara)"):
        with gr.Row():
            with gr.Column(scale=1, min_width=420):
                fc_input = gr.Textbox(label="INPUT folder (images)", interactive=False, placeholder="(click Browse)")
                fc_in_btn = gr.Button("Browse INPUT…")
                fc_output = gr.Textbox(label="OUTPUT folder", interactive=False, placeholder="(click Browse)")
                fc_out_btn = gr.Button("Browse OUTPUT…")

                with gr.Row():
                    fc_recursive = gr.Checkbox(value=True, label="Recursive")
                    fc_dry = gr.Checkbox(value=False, label="Dry-run")

                fc_rejected = gr.Checkbox(value=False, label="Rejected mode (gender-agnostic, looser thresholds)")

                with gr.Row():
                    fc_min_size = gr.Number(value=80, precision=0, label="Min face size (px)")
                    fc_margin = gr.Number(value=0.45, precision=2, label="Margin % (0..1)")
                with gr.Row():
                    fc_det_score = gr.Slider(value=0.40, minimum=0.00, maximum=1.00, step=0.01, label="Min detector score")
                    fc_female_only = gr.Checkbox(value=True, label="Female only")

                with gr.Row():
                    fc_run_btn = gr.Button("Run")
                    fc_undo_btn = gr.Button("Undo")
                    fc_redo_btn = gr.Button("Redo")

                fc_log = gr.Textbox(label="Log", lines=10, interactive=False)
                fc_report = gr.File(label="Download last run summary (CSV)", interactive=False)

                # States for binary undo/redo (face crop)
                st_fc_undo = gr.State([])
                st_fc_redo = gr.State([])

                # Wire up
                fc_in_btn.click(fn=fc_browse_input, outputs=fc_input)
                fc_out_btn.click(fn=fc_browse_output, outputs=fc_output)

                fc_rejected.change(
                    fn=fc_rejected_toggle,
                    inputs=[fc_rejected, fc_min_size, fc_margin, fc_det_score, fc_female_only],
                    outputs=[fc_min_size, fc_margin, fc_det_score, fc_female_only]
                )

                fc_run_btn.click(
                    fn=fc_run,
                    inputs=[fc_input, fc_output, fc_recursive,
                            fc_min_size, fc_margin, fc_det_score, fc_female_only,
                            fc_dry, fc_log, st_fc_undo, st_fc_redo],
                    outputs=[fc_log, fc_report, st_fc_undo, st_fc_redo]
                )
                fc_undo_btn.click(
                    fn=fc_undo,
                    inputs=[fc_output, fc_log, st_fc_undo, st_fc_redo],
                    outputs=[fc_log, st_fc_undo, st_fc_redo]
                )
                fc_redo_btn.click(
                    fn=fc_redo,
                    inputs=[fc_output, fc_log, st_fc_undo, st_fc_redo],
                    outputs=[fc_log, st_fc_undo, st_fc_redo]
                )

# Launch
if __name__ == "__main__":
    import threading, webbrowser, time, sys, io

    # In windowed builds, ensure stdout/stderr exist so libraries don't choke.
    if sys.stdout is None:
        sys.stdout = io.StringIO()
    if sys.stderr is None:
        sys.stderr = io.StringIO()

    HOST = "127.0.0.1"
    PORT = 7860
    URL  = f"http://{HOST}:{PORT}"

    # Open default browser shortly after start (works on double-click)
    def _open():
        try:
            time.sleep(0.8)
            webbrowser.open(URL)
        except Exception:
            pass

    threading.Thread(target=_open, daemon=True).start()

    demo.launch(
        share=False,
        inbrowser=True,           # also asks Gradio to open a tab
        server_name=HOST,
        server_port=PORT,
        prevent_thread_lock=False,
        allowed_paths=None,
        show_error=True,
        debug=False
    )