import os
from typing import List, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

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


# ---------- Core rename logic (mirrors your script) ----------

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
            req.folder,
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
def run(req: PreviewRequest):
    try:
        files_in_folder, mapping, summary = compute_new_names(
            req.folder,
            req.operations,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # actually apply renames
    errors = []
    for old_name, new_name in mapping.items():
        if old_name == new_name:
            continue
        src = os.path.join(req.folder, old_name)
        dst = os.path.join(req.folder, new_name)
        try:
            os.rename(src, dst)
        except OSError as e:
            errors.append((old_name, new_name, str(e)))

    # You could add errors to response later if we want
    files = [
        FileMapping(original=fname, new=mapping[fname])
        for fname in files_in_folder
    ]
    return RunResponse(files=files, summary=summary)
