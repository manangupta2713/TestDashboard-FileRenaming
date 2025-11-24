# D:\FaceCrop\face_crop_female.py
import os
from pathlib import Path
import cv2
import shutil
from insightface.app import FaceAnalysis

# -----------------------
# CONFIG (no CLI args)
# -----------------------
INPUT_DIR  = r"D:\Cursor\FaceCrop\input_images\Nitara"
OUTPUT_DIR = r"D:\Cursor\FaceCrop\cropped_faces\Nitara"
# Extra border around the detected face box, as % of box size (e.g., 0.15 = 15%)
MARGIN_PCT = 0.45
# Minimum detector confidence to consider a face (0..1)
MIN_DET_SCORE = 0.4
# Minimum face box size in pixels (width or height); smaller faces will be ignored
MIN_FACE_SIZE = 80

# -----------------------
# Init InsightFace on CPU
# -----------------------
app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
# det_size affects speed/recall. 640x640 is a good starting point for mixed sizes.
app.prepare(ctx_id=0, det_size=(640, 640))

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Create skip folders
SKIP_BASE = Path(OUTPUT_DIR) / "skipped"
SKIP_UNREADABLE = SKIP_BASE / "unreadable_files"
SKIP_NO_FACES = SKIP_BASE / "no_faces_detected"
SKIP_NO_FEMALE = SKIP_BASE / "no_female_face_kept"

os.makedirs(SKIP_UNREADABLE, exist_ok=True)
os.makedirs(SKIP_NO_FACES, exist_ok=True)
os.makedirs(SKIP_NO_FEMALE, exist_ok=True)

def safe_crop(img, x1, y1, x2, y2, margin_pct):
    h, w = img.shape[:2]
    bw, bh = x2 - x1, y2 - y1
    mx = int(bw * margin_pct)
    my = int(bh * margin_pct)
    X1 = max(0, x1 - mx)
    Y1 = max(0, y1 - my)
    X2 = min(w, x2 + mx)
    Y2 = min(h, y2 + my)
    return img[Y1:Y2, X1:X2]

def pick_largest_female(faces):
    """
    InsightFace: f.gender == 0 -> female, == 1 -> male
    Returns the face with max area among females passing thresholds.
    """
    best = None
    best_area = -1
    for f in faces:
        if getattr(f, "gender", None) is None:
            continue
        if f.gender != 0:  # 0=female
            continue
        if f.det_score is not None and f.det_score < MIN_DET_SCORE:
            continue
        x1, y1, x2, y2 = map(int, f.bbox)
        if (x2 - x1) < MIN_FACE_SIZE or (y2 - y1) < MIN_FACE_SIZE:
            continue
        area = (x2 - x1) * (y2 - y1)
        if area > best_area:
            best_area = area
            best = f
    return best

def process_image(img_path: Path):
    img = cv2.imread(str(img_path))
    if img is None:
        print(f"⚠️ Skipping unreadable file: {img_path.name}")
        # Copy to skip folder
        skip_dest = SKIP_UNREADABLE / img_path.name
        shutil.copy2(img_path, skip_dest)
        return

    faces = app.get(img)
    if not faces:
        print(f"❌ No faces: {img_path.name}")
        # Copy to skip folder
        skip_dest = SKIP_NO_FACES / img_path.name
        shutil.copy2(img_path, skip_dest)
        return

    chosen = pick_largest_female(faces)
    if chosen is None:
        print(f"❌ No female face kept: {img_path.name}")
        # Copy to skip folder
        skip_dest = SKIP_NO_FEMALE / img_path.name
        shutil.copy2(img_path, skip_dest)
        return

    x1, y1, x2, y2 = map(int, chosen.bbox)
    crop = safe_crop(img, x1, y1, x2, y2, MARGIN_PCT)

    stem = img_path.stem
    out_name = f"{stem}_headshot.png"
    out_path = Path(OUTPUT_DIR) / out_name
    cv2.imwrite(str(out_path), crop, [cv2.IMWRITE_PNG_COMPRESSION, 0])  # 0=none, 9=max


def main():
    from pathlib import Path

    p = Path(INPUT_DIR)
    assert p.exists(), f"INPUT_DIR does not exist: {INPUT_DIR}"

    patterns = ["*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG"]

    # collect with your original patterns, then de-duplicate via resolved absolute paths
    files = []
    for pat in patterns:
        files.extend(p.rglob(pat))

    # de-duplicate and sort for stable order
    files = sorted({f.resolve() for f in files if f.is_file()})

    if not files:
        print("⚠️ No images found in input folder.")
        return

    for f in files:
        process_image(f)

    print(f"Done. Processed {len(files)} file(s). Output → {OUTPUT_DIR}")

if __name__ == "__main__":
    print("▶ Running main() …")
    main()