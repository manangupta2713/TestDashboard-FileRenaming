# face_similarity_step2.py
# Multi-female reprocessing:
# - Input: images under images/outcomes/multi-female-face/
# - For each image: detect all FEMALE faces, filter by det_score >= 0.60
# - For each qualifying female face:
#     * compute flip-pooled sims vs anchors (reuse step-1)
#     * COPY the image to the corresponding bucket with name:
#         step_2_face_{idx}_{score:.4f}__<orig>.ext
#     * also save a bbox variant with suffix _bbox before extension
# - Log everything to images/outcomes/log_step_2.xlsx

from __future__ import annotations
import shutil
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import numpy as np
import cv2
import pandas as pd

# Reuse helpers and thresholds from step-1
import face_similarity_step1 as s1
from insightface.app import FaceAnalysis

# ------------------ constants & paths ------------------
IMG_DIR      = Path("./images")
OUTCOME_DIR  = IMG_DIR / "outcomes"
MULTI_DIR    = OUTCOME_DIR / "multi-female-face"
NS_DIR       = MULTI_DIR / "not-similar"   # destination for non-matching copies
LOG_XLSX     = OUTCOME_DIR / "log_step_2.xlsx"

DET_CONF_MIN = 0.60   # 60% detection confidence gate for faces

# ------------------ small utils ------------------------
def ensure_dir(p: Path): p.mkdir(parents=True, exist_ok=True)

def _area(face) -> int:
    x1, y1, x2, y2 = face.bbox.astype(int)
    return max(0, x2 - x1) * max(0, y2 - y1)

def _left(face) -> int:
    x1, y1, x2, y2 = face.bbox.astype(int)
    return x1

def _hflip(img: np.ndarray) -> np.ndarray:
    return img[:, ::-1, :].copy()

def _copy(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)

def _name_with_prefix(orig: Path, face_idx: int, score: Optional[float]) -> str:
    score_str = "NA" if score is None else f"{float(score):.4f}"
    return f"step_2_face_{face_idx}_{score_str}__{orig.name}"

def _bbox_image(bgr: np.ndarray, face) -> np.ndarray:
    x1, y1, x2, y2 = [int(v) for v in face.bbox]
    out = bgr.copy()
    cv2.rectangle(out, (x1, y1), (x2, y2), (0, 255, 0), 2)
    # label with det_score/sex if available
    tag = []
    if hasattr(face, "det_score"): tag.append(f"d={float(face.det_score):.2f}")
    if hasattr(face, "sex"): tag.append(str(face.sex))
    if hasattr(face, "gender"): 
        try: tag.append(str(int(face.gender)))
        except: pass
    if tag:
        cv2.putText(out, " ".join(tag), (x1, max(10, y1-6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0,255,0), 1, cv2.LINE_AA)
    return out

# ------------------ embedding helpers ------------------
def embed_from_face_or_aligned(rgb: np.ndarray, chosen_face, align_size: int) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    """Return (E, Ef) using chosen face's embedding if available; else re-detect on aligned crop."""
    aligned = s1.aligned_crop(rgb, chosen_face.kps, size=align_size)

    # Prefer the full-image detection embedding (more robust)
    E = None
    if getattr(chosen_face, "embedding", None) is not None:
        try:
            E = s1._l2(np.asarray(chosen_face.embedding, dtype=float).reshape(-1))
        except Exception:
            E = None

    # Fallback: re-detect on the aligned crop
    if E is None:
        faces_al = s1.detect_faces(aligned)
        if faces_al:
            best = s1.pick_largest_face(faces_al)
            if best is not None and getattr(best, "embedding", None) is not None:
                E = s1._l2(np.asarray(best.embedding, dtype=float).reshape(-1))

    if E is None:
        return None, None

    if s1.ENABLE_FLIP_POOL:
        aligned_f = _hflip(aligned)
        Ef = None
        faces_f = s1.detect_faces(aligned_f)
        if faces_f:
            bestf = s1.pick_largest_face(faces_f)
            if bestf is not None and getattr(bestf, "embedding", None) is not None:
                Ef = s1._l2(np.asarray(bestf.embedding, dtype=float).reshape(-1))
        if Ef is None: Ef = E
        return E, Ef
    else:
        return E, E

def pooled_sim(Ec: np.ndarray, Ecf: np.ndarray, Ea: np.ndarray, Eaf: np.ndarray) -> float:
    if s1.ENABLE_FLIP_POOL:
        sims = (s1._cos(Ec, Ea), s1._cos(Ec, Eaf), s1._cos(Ecf, Ea), s1._cos(Ecf, Eaf))
        return float(s1.flip_consistency_pool(sims))
    else:
        return float(s1._cos(Ec, Ea))

def classify_with_rules(s_face1: float, s_face2: float, s_face3: float) -> str:
    b1 = s1.score_to_bucket_for_anchor(s_face1, "face1") if s_face1 is not None else 0
    b2 = s1.score_to_bucket_for_anchor(s_face2, "face2") if s_face2 is not None else 0
    b3 = s1.score_to_bucket_for_anchor(s_face3, "face3") if s_face3 is not None else 0
    for name, triple in s1.RULES:
        if s1.rule_match(b1, b2, b3, triple):
            return name
    return "not-similar"

# ------------------ init InsightFace & anchors -----------
def init_models_and_anchors() -> Dict[str, Dict[str, np.ndarray]]:
    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    app = FaceAnalysis(name=s1.INSIGHTFACE_PACK, providers=providers)
    app.prepare(ctx_id=0, det_size=s1.DET_SIZE)
    s1.APP = app  # let step-1 helpers use this instance

    # thresholds from step-1 calibration (if any)
    cal = s1.compute_calibrated_thresholds_from_csv(s1.SCORES_CSV)
    s1.ANCHOR_THRESHOLDS = s1.anchor_thresholds(cal)

    # preload anchors
    anchors: Dict[str, Dict[str, np.ndarray]] = {}
    for t in s1.TARGETS:
        aligned, E, Ef = s1.extract_main_face_align_and_embed(t)
        if E is None:
            raise RuntimeError(f"Failed to embed anchor: {t}")
        anchors[t.name] = {"E": E, "Ef": (Ef if Ef is not None else E)}
    return anchors

# ------------------ core processing ----------------------
def collect_images(root: Path) -> List[Path]:
    exts = {".jpg",".jpeg",".png",".webp",".bmp"}
    return [p for p in root.glob("*") if p.suffix.lower() in exts]

def process_image(p: Path, anchors: Dict[str, Dict[str, np.ndarray]], log_rows: List[dict]):
    bgr = cv2.imread(str(p), cv2.IMREAD_COLOR)
    if bgr is None:
        return
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

    # detect all faces then keep FEMALE faces with det_score >= 0.60
    faces_all = s1.detect_faces(rgb)         # expects BGR internally
    if not faces_all:
        return

    females = [f for f in faces_all if s1._is_female(f)]
    # apply detection confidence gate (if det_score missing, treat as 1.0)
    females = [f for f in females if float(getattr(f, "det_score", 1.0)) >= DET_CONF_MIN]

    if not females:
        return

    # sort qualifying females left->right; index from 1
    females_sorted = sorted(females, key=_left)

    for idx, f in enumerate(females_sorted, start=1):
        Ec, Ecf = embed_from_face_or_aligned(rgb, f, s1.ALIGN_SIZE)
        if Ec is None:
            # log failure
            log_rows.append({
                "source_image": str(p),
                "face_index_lr": idx,
                "det_score": float(getattr(f, "det_score", np.nan)),
                "gender_raw": getattr(f, "gender", None),
                "sex_raw": getattr(f, "sex", None),
                "sim_face1": None, "sim_face2": None, "sim_face3": None,
                "category": "embed_fail",
                "dest": ""
            })
            continue

        # sims per anchor (keys are like "face1.png")
        s1_max = s2_max = s3_max = None
        for aname, a in anchors.items():
            s_val = pooled_sim(Ec, Ecf, a["E"], a["Ef"])
            if "face1" in aname.lower(): s1_max = s_val
            elif "face2" in aname.lower(): s2_max = s_val
            else: s3_max = s_val

        category = classify_with_rules(s1_max, s2_max, s3_max)
        if category == "not-similar":
            dst_dir = NS_DIR
        else:
            dst_dir = OUTCOME_DIR / category

        # filenames: step_2_face_{idx}_{score:.4f}__orig + bbox variant
        score_for_name = max([v for v in [s1_max, s2_max, s3_max] if v is not None], default=None)
        base_name = _name_with_prefix(p, idx, score_for_name)
        dst_path = dst_dir / base_name

        # copy original
        _copy(p, dst_path)

        # bbox variant alongside
        bbox_bgr = _bbox_image(bgr, f)
        stem, ext = base_name.rsplit(".", 1)
        bbox_path = dst_dir / f"{stem}_bbox.{ext}"
        cv2.imwrite(str(bbox_path), bbox_bgr)

        log_rows.append({
            "source_image": str(p),
            "face_index_lr": idx,
            "det_score": float(getattr(f, "det_score", np.nan)),
            "gender_raw": getattr(f, "gender", None),
            "sex_raw": getattr(f, "sex", None),
            "sim_face1": s1_max, "sim_face2": s2_max, "sim_face3": s3_max,
            "category": category,
            "dest": str(dst_path)
        })

def main():
    anchors = init_models_and_anchors()
    ensure_dir(NS_DIR)

    # Collect images in multi-female-face root (ignore subfolders)
    files = collect_images(MULTI_DIR)
    log_rows: List[dict] = []

    for p in files:
        try:
            process_image(p, anchors, log_rows)
        except Exception as e:
            log_rows.append({
                "source_image": str(p),
                "face_index_lr": None,
                "det_score": None,
                "gender_raw": None, "sex_raw": None,
                "sim_face1": None, "sim_face2": None, "sim_face3": None,
                "category": f"error:{e}",
                "dest": ""
            })

    # write Excel log
    if log_rows:
        df = pd.DataFrame(log_rows)
        LOG_XLSX.parent.mkdir(parents=True, exist_ok=True)
        with pd.ExcelWriter(LOG_XLSX) as xw:
            df.to_excel(xw, sheet_name="log", index=False)

    print(f"Step-2: processed {len(files)} files. Logged {len(log_rows)} rows to {LOG_XLSX.name}")

if __name__ == "__main__":
    main()
