import ntpath
import os
from pathlib import Path
from typing import List, Literal, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from dataset_actions_core import (
    copy_captions,
    load_caption_rows,
    make_blank_txts,
    preview_caption_rows,
    restore_snapshot,
    run_caption_prefix_suffix,
)
from face_jobs import count_images, job_manager

app = FastAPI(title="NeuraMax Smart Renamer API")

# ---------- CORS (required for the frontend to reach FastAPI) ----------
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DELIMS = ['_', '-', '.', ',']


class Operation(BaseModel):
    step: int = Field(ge=1, le=4)
    type: Literal["add_prefix", "remove_prefix", "add_suffix", "remove_suffix"]
    value: str


class PreviewRequest(BaseModel):
    folder: str
    operations: List[Operation]


class FileMapping(BaseModel):
    original: str
    new: str


class Summary(BaseModel):
    renamed: int
    unchanged: int
    collisions: int


class PreviewResponse(BaseModel):
    files: List[FileMapping]
    summary: Summary


class RunResponse(PreviewResponse):
    pass
class RunRequest(PreviewRequest):
    include_files: Optional[List[str]] = None


class CaptionEntry(BaseModel):
    id: str
    path: str
    filename: str
    caption: str


class CaptionLoadRequest(BaseModel):
    folder: str
    recursive: bool = False


class CaptionLoadResponse(BaseModel):
    rows: List[CaptionEntry]
    count: int


class CaptionPreviewRequest(BaseModel):
    entries: List[CaptionEntry]
    prefix: str = ""
    suffix: str = ""
    operations: List[Operation] = Field(default_factory=list)


class CaptionPreviewResponse(BaseModel):
    previews: List[dict]


class CaptionRunRequest(BaseModel):
    folder: str
    recursive: bool = False
    prefix: str = ""
    suffix: str = ""
    dry_run: bool = True
    make_backup: bool = False
    entries: List[CaptionEntry]
    operations: List[Operation] = Field(default_factory=list)


class CaptionRunResponse(BaseModel):
    summary: dict
    log: List[str]
    csv_path: str
    snapshot_id: Optional[str]


class CaptionSnapshotRequest(BaseModel):
    folder: str
    snapshot_id: str
    mode: Literal["before", "after"]


class CopyCaptionsRequest(BaseModel):
    src: str
    dest: str
    allow_overwrite: bool = False
    dry_run: bool = True


class CopyCaptionsResponse(BaseModel):
    summary: dict
    log: List[str]
    csv_path: str


class MakeBlankRequest(BaseModel):
    folder: str
    recursive: bool = False
    dry_run: bool = True
    extensions: Optional[List[str]] = None


class MakeBlankResponse(BaseModel):
    summary: dict
    log: List[str]
    csv_path: str

class FaceJobResponse(BaseModel):
    job_id: str

class FaceJobStatusResponse(BaseModel):
    job_id: str
    job_type: str
    state: str
    processed: int
    total: int
    message: str
    error: Optional[str]
    logs: List[str]
    started_at: float
    finished_at: Optional[float]

class FaceStep1Request(BaseModel):
    folder: str
    move_mode: Literal["copy", "move", "hardlink"] = "copy"
    enable_quality_gate: bool = True
    calibration_csv: Optional[str] = None
    anchors_dir: Optional[str] = None

class FaceStep2Request(BaseModel):
    folder: str
    detection_threshold: float = 0.6
    destination: Optional[str] = None

class FaceCropRequest(BaseModel):
    input_dir: str
    output_dir: str
    margin_pct: float = 0.45
    min_confidence: float = 0.4
    min_face_size: int = 80


# ---------- Core rename logic (mirrors your script) ----------

def normalize_fs_path(path: str) -> str:
    """
    Convert incoming Windows-style paths (e.g., E:\\foo\\bar) to WSL mounts
    so os.path calls work when the API runs inside WSL.
    """
    if not path:
        return path

    sanitized = path.strip()
    if not sanitized:
        return sanitized

    # strip wrapping quotes from paths copied via “Copy as path”
    if sanitized[0] in {"'", '"'} and sanitized[-1] == sanitized[0]:
        sanitized = sanitized[1:-1].strip()
        if not sanitized:
            return sanitized

    if sanitized.startswith("\\\\?\\"):
        sanitized = sanitized[4:]

    drive, remainder = ntpath.splitdrive(sanitized)

    if os.name == "posix" and drive:
        drive_letter = drive.replace(":", "").lower()
        remainder = remainder.replace("\\", "/").lstrip("/")
        return f"/mnt/{drive_letter}/{remainder}" if remainder else f"/mnt/{drive_letter}"

    return sanitized

def apply_add_prefix(base: str, prefix: str) -> str:
    if not prefix:
        return base
    if prefix[-1] in DELIMS:
        return prefix + base
    return prefix + "-" + base


def apply_remove_prefix(base: str, prefix: str) -> str:
    if not prefix:
        return base
    if base.startswith(prefix):
        new_base = base[len(prefix):]
        if new_base and new_base[0] in DELIMS:
            new_base = new_base[1:]
        return new_base
    return base


def apply_add_suffix(base: str, suffix: str) -> str:
    if not suffix:
        return base
    if suffix[0] in DELIMS:
        return base + suffix
    return base + "-" + suffix


def apply_remove_suffix(base: str, suffix: str) -> str:
    if not suffix:
        return base
    if base.endswith(suffix):
        new_base = base[:-len(suffix)]
        if new_base and new_base[-1] in DELIMS:
            new_base = new_base[:-1]
        return new_base
    return base


def compute_new_names(folder: str, operations: List[Operation]):
    folder = normalize_fs_path(folder)
    if not os.path.isdir(folder):
        raise FileNotFoundError(f"Folder not found: {folder}")

    files_in_folder = sorted(
        [
            f for f in os.listdir(folder)
            if os.path.isfile(os.path.join(folder, f))
        ]
    )

    # sort operations by step (1–4)
    ops_sorted = sorted(operations, key=lambda o: o.step)

    existing_names = set(files_in_folder)
    mapping = {}
    used_targets = set()
    renamed_count = 0
    collision_count = 0

    for fname in files_in_folder:
        base, ext = os.path.splitext(fname)
        for op in ops_sorted:
            if op.type == "add_prefix":
                base = apply_add_prefix(base, op.value)
            elif op.type == "remove_prefix":
                base = apply_remove_prefix(base, op.value)
            elif op.type == "add_suffix":
                base = apply_add_suffix(base, op.value)
            elif op.type == "remove_suffix":
                base = apply_remove_suffix(base, op.value)

        candidate = base + ext
        final_name = candidate

        if final_name != fname:
            if final_name in used_targets or (
                final_name in existing_names and final_name != fname
            ):
                collision_count += 1
                root, ex = os.path.splitext(candidate)
                counter = 1
                new_candidate = f"{root}_{counter}{ex}"
                while new_candidate in used_targets or (
                    new_candidate in existing_names and new_candidate != fname
                ):
                    counter += 1
                    new_candidate = f"{root}_{counter}{ex}"
                final_name = new_candidate

        if final_name != fname:
            renamed_count += 1

        used_targets.add(final_name)
        mapping[fname] = final_name

    unchanged_count = len(files_in_folder) - renamed_count

    summary = Summary(
        renamed=renamed_count,
        unchanged=unchanged_count,
        collisions=collision_count,
    )
    return files_in_folder, mapping, summary


# ---------- API endpoints ----------

@app.post("/preview", response_model=PreviewResponse)
def preview(req: PreviewRequest):
    try:
        files_in_folder, mapping, summary = compute_new_names(
            normalize_fs_path(req.folder),
            req.operations,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    files = [
        FileMapping(original=fname, new=mapping[fname])
        for fname in files_in_folder
    ]
    return PreviewResponse(files=files, summary=summary)


@app.post("/run", response_model=RunResponse)
def run(req: RunRequest):
    include_set = set(req.include_files) if req.include_files else None
    try:
        files_in_folder, mapping, summary = compute_new_names(
            normalize_fs_path(req.folder),
            req.operations,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # actually apply renames
    if include_set is not None:
        include_set = {fname for fname in include_set if fname in mapping}
        if not include_set:
            return RunResponse(files=[], summary=Summary(renamed=0, unchanged=0, collisions=0))
    errors = []
    for old_name, new_name in mapping.items():
        if include_set is not None and old_name not in include_set:
            continue
        if old_name == new_name:
            continue
        src = os.path.join(normalize_fs_path(req.folder), old_name)
        dst = os.path.join(normalize_fs_path(req.folder), new_name)
        try:
            os.rename(src, dst)
        except OSError as e:
            errors.append((old_name, new_name, str(e)))

    # You could add errors to response later if we want
    def recompute_summary():
        if include_set is None:
            return summary
        ops_sorted = sorted(req.operations, key=lambda o: o.step)
        renamed_count = 0
        collision_count = 0
        total = 0
        for fname in files_in_folder:
            if fname not in include_set:
                continue
            total += 1
            new_name = mapping.get(fname, fname)
            if new_name == fname:
                continue
            renamed_count += 1
            base, ext = os.path.splitext(fname)
            for op in ops_sorted:
                if op.type == "add_prefix":
                    base = apply_add_prefix(base, op.value)
                elif op.type == "remove_prefix":
                    base = apply_remove_prefix(base, op.value)
                elif op.type == "add_suffix":
                    base = apply_add_suffix(base, op.value)
                elif op.type == "remove_suffix":
                    base = apply_remove_suffix(base, op.value)
            candidate = base + ext
            if candidate != new_name:
                collision_count += 1
        unchanged_count = total - renamed_count
        return Summary(renamed=renamed_count, unchanged=unchanged_count, collisions=collision_count)

    effective_summary = recompute_summary()

    files = [
        FileMapping(original=fname, new=mapping[fname])
        for fname in files_in_folder
        if include_set is None or fname in include_set
    ]
    return RunResponse(files=files, summary=effective_summary)


# ---------- Dataset Actions Endpoints ----------


@app.post("/dataset/captions/load", response_model=CaptionLoadResponse)
def dataset_load_captions(req: CaptionLoadRequest):
    try:
        data = load_caption_rows(normalize_fs_path(req.folder), req.recursive)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    rows = [
        CaptionEntry(id=row["id"], path=row["path"], filename=row["filename"], caption=row["caption"])
        for row in data.get("rows", [])
    ]
    return CaptionLoadResponse(rows=rows, count=data.get("count", len(rows)))


@app.post("/dataset/captions/preview", response_model=CaptionPreviewResponse)
def dataset_preview_captions(req: CaptionPreviewRequest):
    previews = preview_caption_rows(
        [entry.dict() for entry in req.entries],
        req.prefix,
        req.suffix,
        [op.dict() for op in req.operations] if req.operations else None,
    )
    return CaptionPreviewResponse(previews=previews)


@app.post("/dataset/captions/run", response_model=CaptionRunResponse)
def dataset_run_captions(req: CaptionRunRequest):
    try:
        result = run_caption_prefix_suffix(
            normalize_fs_path(req.folder),
            [entry.dict() for entry in req.entries],
            req.recursive,
            req.prefix,
            req.suffix,
            req.dry_run,
            req.make_backup,
            [op.dict() for op in req.operations] if req.operations else None,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return CaptionRunResponse(
        summary=result["summary"],
        log=result["log"],
        csv_path=result["csv_path"],
        snapshot_id=result.get("snapshot_id"),
    )


@app.post("/dataset/captions/snapshot/restore")
def dataset_restore_snapshot(req: CaptionSnapshotRequest):
    try:
        restored, errors = restore_snapshot(
            normalize_fs_path(req.folder), req.snapshot_id, req.mode
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"restored": restored, "errors": errors}


@app.post("/dataset/captions/copy", response_model=CopyCaptionsResponse)
def dataset_copy_captions(req: CopyCaptionsRequest):
    try:
        result = copy_captions(
            normalize_fs_path(req.src),
            normalize_fs_path(req.dest),
            req.allow_overwrite,
            req.dry_run,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return CopyCaptionsResponse(summary=result["summary"], log=result["log"], csv_path=result["csv_path"])


@app.post("/dataset/captions/make_blank", response_model=MakeBlankResponse)
def dataset_make_blank(req: MakeBlankRequest):
    try:
        result = make_blank_txts(
            normalize_fs_path(req.folder),
            req.recursive,
            req.dry_run,
            req.extensions,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return MakeBlankResponse(summary=result["summary"], log=result["log"], csv_path=result["csv_path"])

# ---------- Face Similarity & Crop Dashboard ----------

def _start_simulated_face_job(job_type: str, description: str, folder: Optional[str]) -> FaceJobResponse:
    total = 0
    if folder:
        total = count_images(Path(normalize_fs_path(folder)))
    job = job_manager.start_job(job_type, max(total, 1), description)
    return FaceJobResponse(job_id=job.job_id)

def _job_status_response(job_id: str) -> FaceJobStatusResponse:
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return FaceJobStatusResponse(**job.to_dict())


@app.post("/faces/step1/run", response_model=FaceJobResponse)
def faces_step1_run(req: FaceStep1Request):
    return _start_simulated_face_job("face_step1", "Face similarity step 1", req.folder)


@app.post("/faces/step2/run", response_model=FaceJobResponse)
def faces_step2_run(req: FaceStep2Request):
    return _start_simulated_face_job("face_step2", "Face similarity step 2", req.folder)


@app.post("/faces/crop/run", response_model=FaceJobResponse)
def faces_crop_run(req: FaceCropRequest):
    return _start_simulated_face_job("face_crop", "Face cropper run", req.input_dir)


@app.get("/faces/jobs/{job_id}", response_model=FaceJobStatusResponse)
def faces_job_status(job_id: str):
    return _job_status_response(job_id)
