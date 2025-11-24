# -*- coding: utf-8 -*-
"""
face_similarity_step1.py — InsightFace (r100) on GPU (ONNX CUDA) + flip-pooling

Absolute, per-anchor cosine thresholds (calibrated).
- MIN = p99 (~1% FAR), STRICT = p99.5 for all anchors
"""

from __future__ import annotations
import os, glob, shutil, re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Dict, Tuple, List, Optional, Union

import numpy as np
import pandas as pd
import cv2
from tqdm import tqdm

# === InsightFace (GPU via ONNX Runtime) ===
from insightface.app import FaceAnalysis
from insightface.utils.face_align import norm_crop

import onnxruntime as ort
ort.preload_dlls()
ort.set_default_logger_severity(3)

# ===================== CONFIG & KNOBS =====================

IMG_DIR = Path("./images")
TARGETS = [IMG_DIR / "face1.png", IMG_DIR / "face2.png", IMG_DIR / "face3.png"]
OUTCOME_DIR = IMG_DIR / "outcomes"

INSIGHTFACE_PACK = "antelopev2"    # r100 backbone
DET_SIZE = (640, 640)
ALIGN_SIZE = 256
ENABLE_FLIP_POOL = True

# Fallback so code never crashes before calibration is read
ANCHOR_THRESHOLDS = {
    "face1": {"MIN": 0.5663, "STRICT": 0.5773},
    "face2": {"MIN": 0.5663, "STRICT": 0.5773},
    "face3": {"MIN": 0.5663, "STRICT": 0.5773},
}

# Stored calibration defaults (p99/p99.5 will be filled from CSV if present)
BASE_THRESHOLDS_DEFAULT = {
    "face1": {"p99": 0.5663, "p995": 0.5773},
    "face2": {"p99": 0.5663, "p995": 0.5773},
    "face3": {"p99": 0.5663, "p995": 0.5773},
}

ENABLE_QUALITY_GATE = True
MIN_FACE_SIZE_PX = 256
BLUR_VAR_MIN = 100.0
BRIGHT_MIN = 30
BRIGHT_MAX = 225
CLIP_FRACTION_MAX = 0.02

SCORES_CSV  = OUTCOME_DIR / "scores_wide.csv"
SCORES_XLSX = OUTCOME_DIR / "scores_wide.xlsx"
CLASS_CSV   = OUTCOME_DIR / "classification.csv"
CLASS_XLSX  = OUTCOME_DIR / "classification.xlsx"
SKIPPED_LOG = OUTCOME_DIR / "skipped_unusable.csv"
MOVES_LOG   = OUTCOME_DIR / "moves_log.csv"
ERRORS_LOG  = OUTCOME_DIR / "move_errors.csv"

MOVE_MODE = "copy"
IO_WORKERS = 12

# RULES use bucket tiers (0..5) computed per-anchor with absolute thresholds
RULES = [
    ("1) F1-5 + F2-X + F3-X", (5, "X", "X")),
    ("2) F1-4 + F2-X + F3-X", (4, "X", "X")),
    ("3) F1-3 + F2-X + F3-X", (3, "X", "X")),
    ("4) F1-2 + F2-X + F3-X", (2, "X", "X")),
    ("5) F1-1 + F2-X + F3-X", (1, "X", "X")),
    ("6) F1-X + F2-5 + F3-X", ("X", 5, "X")),
    ("7) F1-X + F2-4 + F3-X", ("X", 4, "X")),
    ("8) F1-X + F2-3 + F3-X", ("X", 3, "X")),
    ("9) F1-X + F2-2 + F3-X", ("X", 2, "X")),
    ("10) F1-X + F2-1 + F3-X", ("X", 1, "X")),
    ("11) F1-X + F2-X + F3-5", ("X", "X", 5)),
    ("12) F1-X + F2-X + F3-4", ("X", "X", 4)),
    ("13) F1-X + F2-X + F3-3", ("X", "X", 3)),
    ("14) F1-X + F2-X + F3-2", ("X", "X", 2)),
    ("15) F1-X + F2-X + F3-1", ("X", "X", 1)),
]

def ensure_dir(p: Path): p.mkdir(parents=True, exist_ok=True)

def _l2(x: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(x, axis=-1, keepdims=True) + 1e-12
    return x / n

def _cos(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(_l2(a), _l2(b)))

def _hflip(img: np.ndarray) -> np.ndarray:
    return img[:, ::-1, :].copy()

# === Flip pooling: penalized top-2 (stable across flips) ===
POOL_ALPHA1 = 0.7
POOL_ALPHA2 = 0.3
POOL_SPREAD_PENALTY = 0.5
POOL_DELTA = 0.04
POOL_FAIL_PENALTY = 0.10

def flip_consistency_pool(sims: Tuple[float, ...]) -> float:
    s = sorted([float(x) for x in sims], reverse=True)
    if not s: return -1.0
    if len(s) == 1: return s[0]
    s1, s2 = s[0], s[1]
    spread = float(np.std(s))
    S = POOL_ALPHA1 * s1 + POOL_ALPHA2 * s2 - POOL_SPREAD_PENALTY * spread
    if s[-1] < S - POOL_DELTA:
        return S - POOL_FAIL_PENALTY
    return S

# ----------------------- InsightFace helpers -----------------
APP: Optional[FaceAnalysis] = None

def read_rgb(path: Path) -> np.ndarray:
    bgr = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if bgr is None: raise RuntimeError(f"Cannot read image: {path}")
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

def detect_faces(rgb: np.ndarray):
    assert APP is not None, "InsightFace app not initialized"
    # FaceAnalysis expects BGR. Convert our RGB → BGR before calling .get()
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    return APP.get(bgr)

def _is_female(face) -> bool:
    # prefer explicit string if present
    if hasattr(face, "sex") and isinstance(face.sex, str):
        return face.sex.strip().lower().startswith("f")
    # numeric mapping observed in antelopev2: 0=female, 1=male
    for attr in ("gender", "sex"):
        if hasattr(face, attr):
            try:
                v = float(getattr(face, attr))
                if v in (0.0, 1.0):
                    return v == 0.0
                return v < 0.5
            except Exception:
                pass
    return False

def pick_largest_face(faces):
    if not faces: return None
    def area(f):
        x1, y1, x2, y2 = f.bbox.astype(int)
        return max(0, x2 - x1) * max(0, y2 - y1)
    return sorted(faces, key=area, reverse=True)[0]

def aligned_crop(rgb: np.ndarray, kps: np.ndarray, size: int = ALIGN_SIZE) -> np.ndarray:
    crop = norm_crop(rgb, landmark=kps, image_size=size)
    if crop.dtype != np.uint8:
        crop = np.clip(crop, 0, 255).astype(np.uint8)
    return crop

def embed_from_aligned(aligned_rgb: np.ndarray) -> Optional[np.ndarray]:
    faces = detect_faces(aligned_rgb)
    if not faces: return None
    best = pick_largest_face(faces)
    emb = best.embedding if best is not None else None
    if emb is None: return None
    return _l2(np.asarray(emb, dtype=float).reshape(-1))

def extract_main_face_align_and_embed(image_path: Path) -> Tuple[np.ndarray, Optional[np.ndarray], Optional[np.ndarray]]:
    rgb = read_rgb(image_path)
    faces = detect_faces(rgb)
    females = [f for f in faces if _is_female(f)]
    if not females:
        raise RuntimeError("no_female_face")
    best = pick_largest_face(females)  # female-first, even if males are larger
    aligned = aligned_crop(rgb, best.kps, ALIGN_SIZE)

    emb = best.embedding
    if emb is None:
        emb = embed_from_aligned(aligned)
    else:
        emb = _l2(np.asarray(emb, dtype=float).reshape(-1))

    if not ENABLE_FLIP_POOL:
        return aligned, emb, emb

    aligned_f = _hflip(aligned)
    emb_f = embed_from_aligned(aligned_f)
    if emb_f is None: emb_f = emb
    return aligned, emb, emb_f

# ----------------------- quality -----------------
def _variance_of_laplacian(gray: np.ndarray) -> float:
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())

def _brightness_and_clip(rgb: np.ndarray) -> Tuple[float, float]:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    mean = float(gray.mean())
    total = gray.size
    clipped = int((gray <= 0).sum() + (gray >= 255).sum())
    frac = clipped / float(total)
    return mean, frac

def quality_ok(face_rgb_uint8: np.ndarray) -> Tuple[bool, str]:
    h, w = face_rgb_uint8.shape[:2]
    if min(h, w) < MIN_FACE_SIZE_PX: return False, f"too_small:{min(h,w)}px"
    gray = cv2.cvtColor(face_rgb_uint8, cv2.COLOR_RGB2GRAY)
    blur_var = _variance_of_laplacian(gray)
    if blur_var < BLUR_VAR_MIN: return False, f"blurry:var{blur_var:.1f}<min{BLUR_VAR_MIN}"
    mean_b, frac_clip = _brightness_and_clip(face_rgb_uint8)
    if not (BRIGHT_MIN <= mean_b <= BRIGHT_MAX): return False, f"brightness:{mean_b:.1f} not in [{BRIGHT_MIN},{BRIGHT_MAX}]"
    if frac_clip > CLIP_FRACTION_MAX: return False, f"clipped:{frac_clip:.3f}>{CLIP_FRACTION_MAX:.3f}"
    return True, "ok"

# ----------------------- file ops --------------------------
def same_drive(a: Path, b: Path) -> bool:
    try:
        return a.drive.lower() == b.drive.lower()
    except Exception:
        return False

def move_file(src: Path, dst: Path, mode: str) -> Tuple[str, str]:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if mode == "move":
        try:
            src.rename(dst)
            return str(dst), "rename"
        except OSError:
            shutil.copy2(src, dst)
            try:
                src.unlink()
            except Exception:
                pass
            return str(dst), "copy+delete"
    elif mode == "hardlink":
        if same_drive(src, dst):
            try:
                os.link(src, dst)
                return str(dst), "hardlink"
            except Exception:
                shutil.copy2(src, dst)
                return str(dst), "copy"
        else:
            shutil.copy2(src, dst)
            return str(dst), "copy"
    else:
        shutil.copy2(src, dst)
        return str(dst), "copy"

# ----------------------- thresholds & rules ----------------
def _anchor_key(anchor_name: str) -> str:
    low = anchor_name.lower()
    if "face1" in low: return "face1"
    if "face2" in low: return "face2"
    return "face3"

def score_to_bucket_for_anchor(x: Optional[float], anchor_name: str) -> int:
    """0: < MIN; 1: [MIN, mid); 2: [mid, STRICT); 3: [STRICT, STRICT+0.02);
       4: [STRICT+0.02, STRICT+0.04); 5: >= STRICT+0.04
    """
    if not isinstance(x, float): return 0
    t = ANCHOR_THRESHOLDS[_anchor_key(anchor_name)]
    MIN_T, STRICT_T = float(t["MIN"]), float(t["STRICT"])
    if x < MIN_T: return 0
    mid = (MIN_T + STRICT_T) / 2.0
    if x < mid:           return 1
    if x < STRICT_T:      return 2
    if x < STRICT_T+0.02: return 3
    if x < STRICT_T+0.04: return 4
    return 5

def rule_match(b1: int, b2: int, b3: int, r: Tuple[Union[int,str],Union[int,str],Union[int,str]]) -> bool:
    t1, t2, t3 = r
    def ok(req, got): return True if req == "X" else (got == int(req))
    return ok(t1, b1) and ok(t2, b2) and ok(t3, b3)

def compute_calibrated_thresholds_from_csv(csv_path: Path) -> Dict[str, Dict[str, float]]:
    """Read p99/p99.5 per anchor from scores file if calibration rows exist; else defaults."""
    try:
        if not csv_path.exists():
            return BASE_THRESHOLDS_DEFAULT
        df = pd.read_csv(csv_path)
        cal = df[df["image"].str.contains(r"[\\/]calibration_bg[\\/]", na=False)].copy()
        if cal.empty:
            return BASE_THRESHOLDS_DEFAULT

        def pct(series, p):
            x = pd.Series(series).dropna().astype(float).values
            return float(np.percentile(x, p)) if len(x) else float("nan")

        out = {}
        for name, col in [("face1","sim_face1"), ("face2","sim_face2"), ("face3","sim_face3")]:
            vals = cal[col]
            out[name] = {"p99": pct(vals, 99.0), "p995": pct(vals, 99.5)}

        # fill NaNs/missing with defaults
        for k in ["face1","face2","face3"]:
            base = BASE_THRESHOLDS_DEFAULT.get(k, {})
            cur = out.get(k, {})
            for kk in ["p99","p995"]:
                v = cur.get(kk, None)
                if v is None or not (v == v):
                    cur[kk] = float(base.get(kk, 0.0))
            out[k] = cur
        return out
    except Exception:
        return BASE_THRESHOLDS_DEFAULT

def anchor_thresholds(th: Dict[str, Dict[str, float]]) -> Dict[str, Dict[str, float]]:
    """Parity policy for all anchors: MIN=p99, STRICT=p99.5."""
    def p(anchor: str, key: str, fallback_key: str) -> float:
        v = float(th.get(anchor, {}).get(key, 0.0))
        if v <= 0.0:
            v = float(th.get(anchor, {}).get(fallback_key, 0.0))
        return v
    return {
        "face1": {"MIN": p("face1","p99","p99"),  "STRICT": p("face1","p995","p995")},
        "face2": {"MIN": p("face2","p99","p99"),  "STRICT": p("face2","p995","p995")},
        "face3": {"MIN": p("face3","p99","p99"),  "STRICT": p("face3","p995","p995")},
    }

def _parse_decisive_anchor(folder_label: str) -> str:
    """From a rule label like '11) F1-5 + F2-X + F3-X', return 'face1'/'face2'/'face3'."""
    if not folder_label:
        return ""
    m = re.search(r"F1-([0-5X])\s*\+\s*F2-([0-5X])\s*\+\s*F3-([0-5X])", folder_label)
    if not m:
        return ""
    parts = m.groups()
    if parts[0] and parts[0] not in ("X","0"): return "face1"
    if parts[1] and parts[1] not in ("X","0"): return "face2"
    if parts[2] and parts[2] not in ("X","0"): return "face3"
    return ""

def _choose_score_for_filename(row) -> float:
    """Pick a score to prefix the moved filename."""
    s1, s2, s3 = row.get("sim_face1"), row.get("sim_face2"), row.get("sim_face3")
    cat = str(row.get("category") or "")
    lbl = str(row.get("bucket_if_usable") or "")
    if lbl and cat == lbl:
        key = _parse_decisive_anchor(lbl)
        if key == "face1": return float(s1) if s1 is not None else None
        if key == "face2": return float(s2) if s2 is not None else None
        if key == "face3": return float(s3) if s3 is not None else None
    vals = [v for v in [s1, s2, s3] if v is not None]
    if not vals: return None
    try:
        return float(max(vals))
    except Exception:
        return None

def _score_prefix(score: float) -> str:
    try:
        if score is None:
            return "NA"
        return f"{float(score):.4f}"
    except Exception:
        return "NA"

def _quality_tag(q_reason: str) -> str:
    r = (q_reason or "").lower()
    if r.startswith("blurry"):      return "blur"
    if r.startswith("brightness"):  return "bright"
    if r.startswith("clipped"):     return "clip"
    if r.startswith("too_small"):   return "small"
    return "q"

def _unique_dest_with_score(dst_dir: Path, src_name: str, score: float) -> Path:
    # If src_name starts with a quality tag like "blur_", place score AFTER the tag.
    known_tags = ("blur_", "bright_", "clip_", "small_", "q_")
    prefix = _score_prefix(score)

    def unique_candidate(base_name: str) -> Path:
        stem, dot, ext = base_name.partition(".")
        candidate = dst_dir / base_name
        if not candidate.exists():
            return candidate
        k = 1
        while True:
            base_k = f"{stem}-{k}.{ext}" if ext else f"{stem}-{k}"
            candidate = dst_dir / base_k
            if not candidate.exists():
                return candidate
            k += 1

    for tag in known_tags:
        if src_name.startswith(tag):
            rest = src_name[len(tag):]                 # after "tag_"
            base = f"{tag}{prefix}_{rest}"             # e.g., blur_0.5759_original.png
            return unique_candidate(base)

    # Default (non-tagged names): keep original behavior "score__name"
    base = f"{prefix}__{src_name}"
    return unique_candidate(base)

# ----------------------- main ------------------------------
def collect_image_paths(root: Path) -> List[Path]:
    exts = {".jpg",".jpeg",".png",".webp",".bmp"}
    allp = [Path(p) for p in glob.glob(str(root / "**" / "*.*"), recursive=True)]
    return [p for p in allp if p.suffix.lower() in exts]

def main():
    global ANCHOR_THRESHOLDS
    ensure_dir(OUTCOME_DIR)

    # Load thresholds
    cal_table = compute_calibrated_thresholds_from_csv(SCORES_CSV)
    ANCHOR_THRESHOLDS = anchor_thresholds(cal_table)
    print("Using thresholds:", ANCHOR_THRESHOLDS)

    # Init InsightFace
    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    app = FaceAnalysis(name=INSIGHTFACE_PACK, providers=providers)
    app.prepare(ctx_id=0, det_size=DET_SIZE)

    # expose to helpers
    global APP
    APP = app

    # 1) Preload/align anchors
    anchors_data: Dict[str, Dict[str, np.ndarray]] = {}
    for t in TARGETS:
        aligned, E, Ef = extract_main_face_align_and_embed(t)
        if E is None:
            raise RuntimeError(f"Failed to compute embedding for anchor: {t}")
        anchors_data[t.name] = {"aligned": aligned, "E": E, "Ef": Ef if Ef is not None else E}

    # 2) Score candidates
    imgs = collect_image_paths(IMG_DIR)
    anchor_names = set(anchors_data.keys())
    candidates = [p for p in imgs if p.name not in anchor_names]

    rows = []
    skipped_rows = []
    quality_map: Dict[str, str] = {}

    for cpath in tqdm(candidates, desc="Scoring", unit="img"):

        # --- PREFILTER: (1) no-face, (2) multi-female, (3) no-female ---
        try:
            rgb_pre = read_rgb(cpath)
            faces_pre = detect_faces(rgb_pre)
            if not faces_pre:
                skipped_rows.append({"image": str(cpath), "reason": "no_face_detected"})
                quality_map[str(cpath)] = "no_face_detected"
                continue
            females_pre = [f for f in faces_pre if _is_female(f)]
            if len(females_pre) > 1:
                skipped_rows.append({"image": str(cpath), "reason": "multi_female_face"})
                quality_map[str(cpath)] = "multi_female_face"
                continue
            if len(females_pre) == 0:
                skipped_rows.append({"image": str(cpath), "reason": "no_female_face"})
                quality_map[str(cpath)] = "no_female_face"
                continue
        except Exception:
            skipped_rows.append({"image": str(cpath), "reason": "no_face_detected"})
            quality_map[str(cpath)] = "no_face_detected"
            continue

        try:
            c_aligned, EC, EC_f = extract_main_face_align_and_embed(cpath)
        except Exception as e:
            reason = "no_female_face" if "no_female_face" in str(e) else "no_face_detected"
            skipped_rows.append({"image": str(cpath), "reason": reason})
            quality_map[str(cpath)] = reason
            continue

        # Quality (record only; may mark unusable)
        quality_reason = ""
        if ENABLE_QUALITY_GATE:
            ok, reason = quality_ok(c_aligned)
            if not ok:
                h, w = c_aligned.shape[:2]
                gray = cv2.cvtColor(c_aligned, cv2.COLOR_RGB2GRAY)
                blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
                mean_b, frac_clip = _brightness_and_clip(c_aligned)
                skipped_rows.append({
                    "image": str(cpath),
                    "reason": reason,
                    "height": h,
                    "width": w,
                    "blur_var": f"{blur_var:.1f}",
                    "brightness": f"{mean_b:.1f}",
                    "clip_fraction": f"{frac_clip:.3f}"
                })
                quality_reason = reason
        quality_map[str(cpath)] = quality_reason

        # Similarities across anchors (flip-pooled)
        for aname, a in anchors_data.items():
            EA, EA_f = a["E"], a["Ef"]
            if ENABLE_FLIP_POOL:
                sims = (_cos(EC, EA), _cos(EC, EA_f), _cos(EC_f, EA), _cos(EC_f, EA_f))
            else:
                sims = (_cos(EC, EA),)
            sim_pooled = float(flip_consistency_pool(sims))
            rows.append({"image": str(cpath), "anchor": aname, "sim_arc": sim_pooled})

    if skipped_rows:
        ensure_dir(OUTCOME_DIR)
        pd.DataFrame(skipped_rows).to_csv(SKIPPED_LOG, index=False)

    if not rows:
        print("No scored pairs produced.")
        return

    df = pd.DataFrame(rows)

    # Aggregate to wide scores
    sim_scores: Dict[str, Dict[str, float]] = {}
    for (img, anch), grp in df.groupby(["image", "anchor"], sort=False):
        sim_max = float(grp["sim_arc"].max())
        entry_s = sim_scores.setdefault(img, {})
        low = anch.lower()
        if "face1" in low: entry_s["face1"] = max(sim_max, entry_s.get("face1", -1e9))
        elif "face2" in low: entry_s["face2"] = max(sim_max, entry_s.get("face2", -1e9))
        else: entry_s["face3"] = max(sim_max, entry_s.get("face3", -1e9))

    # SCORES
    scores_rows = []
    for img_path, sc in sim_scores.items():
        scores_rows.append({
            "image": img_path,
            "sim_face1": sc.get("face1", None),
            "sim_face2": sc.get("face2", None),
            "sim_face3": sc.get("face3", None),
        })
    ensure_dir(OUTCOME_DIR)
    df_scores = pd.DataFrame(scores_rows)
    df_scores.to_csv(SCORES_CSV, index=False)
    with pd.ExcelWriter(SCORES_XLSX) as xw:
        df_scores.to_excel(xw, sheet_name="scores_wide", index=False)

    # CLASSIFICATION
    all_keys = set(sim_scores.keys()) | set(quality_map.keys())
    class_rows = []
    for img_path in sorted(all_keys):
        s1 = sim_scores.get(img_path, {}).get("face1")
        s2 = sim_scores.get(img_path, {}).get("face2")
        s3 = sim_scores.get(img_path, {}).get("face3")
        q_reason = quality_map.get(img_path, "")

        if q_reason in ("no_face_detected", "no_female_face", "multi_female_face"):
            category = "skipped"; folder_label = ""; b1=b2=b3=0
        else:
            b1 = score_to_bucket_for_anchor(float(s1), "face1") if s1 is not None else 0
            b2 = score_to_bucket_for_anchor(float(s2), "face2") if s2 is not None else 0
            b3 = score_to_bucket_for_anchor(float(s3), "face3") if s3 is not None else 0
            folder_label = ""
            for name, triple in RULES:
                if rule_match(b1, b2, b3, triple):
                    folder_label = name; break
            if not folder_label: category = "not-similar"
            elif q_reason:       category = "unusable"
            else:                category = folder_label

        class_rows.append({
            "image": img_path,
            "sim_face1": s1, "sim_face2": s2, "sim_face3": s3,
            "bucket_f1": b1, "bucket_f2": b2, "bucket_f3": b3,
            "quality_reason": q_reason,
            "bucket_if_usable": folder_label or "",
            "category": category,
        })

    df_class = pd.DataFrame(class_rows)
    df_class.to_csv(CLASS_CSV, index=False)
    with pd.ExcelWriter(CLASS_XLSX) as xw:
        df_class.to_excel(xw, sheet_name="classification", index=False)

    # MOVES
    move_plan: List[Tuple[Path, Path]] = []
    for _, row in df_class.iterrows():
        img_path = row["image"]; category = str(row["category"]); bucket_if_usable = str(row["bucket_if_usable"])
        src = Path(img_path)
        if not src.exists(): continue
        if category == "skipped": continue
        elif category == "not-similar": 
            dst_dir = OUTCOME_DIR / "not-similar"
        elif category == "unusable":
            dst_dir = OUTCOME_DIR / "unusable"
            # prepend reason tag directly to the original name (score comes from _unique_dest_with_score)
            tag = _quality_tag(str(row.get("quality_reason", "")))
            tagged_name = f"{tag}_{src.name}"
        else:                            dst_dir = OUTCOME_DIR / bucket_if_usable
        score_val = _choose_score_for_filename(row)
        dst = _unique_dest_with_score(dst_dir, (tagged_name if category == "unusable" else src.name), score_val)
        # If not-similar, write a companion bbox image that matches the final moved name
        if category == "not-similar":
            try:
                ensure_dir(dst.parent)  # make sure folder exists
                rgb_ns = read_rgb(src)
                faces_ns = detect_faces(rgb_ns)
                if faces_ns:
                    best = pick_largest_face(faces_ns)
                    x1, y1, x2, y2 = best.bbox.astype(int)
                    boxed = cv2.cvtColor(rgb_ns, cv2.COLOR_RGB2BGR)
                    cv2.rectangle(boxed, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    stem = dst.stem
                    stem = (stem[:-1] + "_bbox") if stem.endswith("_") else (stem + "_bbox")
                    bbox_path = dst.parent / f"{stem}{dst.suffix}"
                    cv2.imwrite(str(bbox_path), boxed)
            except Exception as e:
                print(f"Failed bbox for {src}: {e}")
        move_plan.append((src, dst))

    results, errors = [], []
    def worker(pair: Tuple[Path, Path]):
        s,d = pair
        try:
            _, how = move_file(s, d, MOVE_MODE)
            return (str(s), str(d), how, "")
        except Exception as e:
            return (str(s), str(d), "ERROR", str(e))

    if move_plan:
        with ThreadPoolExecutor(max_workers=IO_WORKERS) as ex:
            for (s, d, how, err) in tqdm(ex.map(worker, move_plan, chunksize=64),
                                         total=len(move_plan), desc="Moving", unit="file"):
                if how == "ERROR": errors.append({"src": s, "dst": d, "error": err})
                else: results.append({"src": s, "dst": d, "mode": how})

    # Copy skipped categories into their folders
    no_face_dir = OUTCOME_DIR / "no-face-detected"
    ensure_dir(no_face_dir)
    no_female_dir = OUTCOME_DIR / "no-female-face"
    ensure_dir(no_female_dir)
    multi_female_dir = OUTCOME_DIR / "multi-female-face"
    ensure_dir(multi_female_dir)

    for item in skipped_rows:
        src = Path(item["image"])
        if not src.exists(): continue
        reason = item.get("reason")
        if reason == "no_face_detected":
            dst = no_face_dir / src.name
        elif reason == "no_female_face":
            dst = no_female_dir / src.name
        elif reason == "multi_female_face":
            dst = multi_female_dir / src.name
        else:
            continue
        try:
            shutil.copy2(src, dst)
        except Exception as e:
            print(f"Failed to copy {src} to {dst}: {e}")

    if results: pd.DataFrame(results).to_csv(MOVES_LOG, index=False)
    if errors:  pd.DataFrame(errors).to_csv(ERRORS_LOG, index=False)

    print(f"Wrote scores to: {SCORES_CSV.name} & {SCORES_XLSX.name}")
    print(f"Wrote classification to: {CLASS_CSV.name} & {CLASS_XLSX.name}")
    print(f"Planned moves: {len(move_plan)} | Done: {len(results)} | Errors: {len(errors)}")

if __name__ == "__main__":
    main()
