from __future__ import annotations

import csv
import json
import shutil
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

IMG_EXTS_ALL = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"]
CAPTION_DELIMS = ["_", "-", ".", ","]


def _ensure_folder(folder: str) -> Path:
    base = Path(folder)
    if not base.exists() or not base.is_dir():
        raise FileNotFoundError(f"Folder not found: {folder}")
    return base


def _list_caption_files(base: Path, recursive: bool) -> List[Path]:
    if recursive:
        return sorted([p for p in base.rglob("*.txt") if p.is_file()])
    return sorted([p for p in base.glob("*.txt") if p.is_file()])


def _read_text_safe(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8")
    except Exception:
        return ""


def _write_text_safe(p: Path, text: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def _log(lines: List[str], msg: str) -> None:
    lines.append(msg)


def _write_summary_csv(
    base_dir: Path,
    name_prefix: str,
    headers: List[str],
    rows: List[List[str]],
) -> str:
    reports = base_dir / "__reports"
    reports.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    persistent = reports / f"{name_prefix}_{ts}.csv"

    with persistent.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    temp_dir = Path(tempfile.gettempdir()) / "Datasetactions_reports"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_copy = temp_dir / persistent.name
    shutil.copy2(persistent, temp_copy)
    return str(temp_copy)


@dataclass
class Snapshot:
    dir: Path
    files: List[str]


def _make_snapshot(
    base: Path,
    affected: List[Path],
    before_texts: Dict[Path, str],
    after_texts: Dict[Path, str],
) -> Snapshot:
    ts = time.strftime("%Y%m%d_%H%M%S")
    snap_dir = base / "__undo" / ts
    before_dir = snap_dir / "before"
    after_dir = snap_dir / "after"
    before_dir.mkdir(parents=True, exist_ok=True)
    after_dir.mkdir(parents=True, exist_ok=True)

    rels: List[str] = []
    for path in affected:
        rel = str(path.relative_to(base)).replace("\\", "/")
        rels.append(rel)
        dst_before = before_dir / rel
        dst_before.parent.mkdir(parents=True, exist_ok=True)
        _write_text_safe(dst_before, before_texts[path])
        dst_after = after_dir / rel
        dst_after.parent.mkdir(parents=True, exist_ok=True)
        _write_text_safe(dst_after, after_texts[path])

    manifest = {
        "base": str(base),
        "files": rels,
        "created_at": ts,
        "version": 2,
    }
    _write_text_safe(snap_dir / "manifest.json", json.dumps(manifest, indent=2))
    return Snapshot(dir=snap_dir, files=rels)


def _restore_set(base: Path, snap_dir: Path, which: str) -> Tuple[int, List[str]]:
    restored = 0
    errors: List[str] = []
    try:
        manifest = json.loads((snap_dir / "manifest.json").read_text(encoding="utf-8"))
        rels: List[str] = manifest.get("files", [])
    except Exception as exc:
        return 0, [f"manifest.json read error: {exc}"]

    for rel in rels:
        try:
            src = snap_dir / which / rel
            if not src.exists():
                errors.append(f"missing snapshot entry: {which}/{rel}")
                continue
            dst = base / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            _write_text_safe(dst, src.read_text(encoding="utf-8"))
            restored += 1
        except Exception as exc:
            errors.append(f"{rel}: {exc}")
    return restored, errors


def restore_snapshot(folder: str, snapshot_id: str, mode: str) -> Tuple[int, List[str]]:
    base = _ensure_folder(folder)
    snap_dir = (base / "__undo" / snapshot_id).resolve()
    if not snap_dir.exists():
        raise FileNotFoundError(f"Snapshot not found: {snapshot_id}")
    if mode == "before":
        return _restore_set(base, snap_dir, "before")
    if mode == "after":
        return _restore_set(base, snap_dir, "after")
    raise ValueError("mode must be 'before' or 'after'")


def load_caption_rows(folder: str, recursive: bool) -> Dict[str, Any]:
    base = _ensure_folder(folder)
    txts = _list_caption_files(base, recursive)
    rows = []
    for p in txts:
        rows.append(
            {
                "id": str(p.relative_to(base)).replace("\\", "/"),
                "path": str(p),
                "filename": p.name,
                "caption": _read_text_safe(p),
            }
        )
    return {"rows": rows, "count": len(rows)}


def _apply_caption_add_prefix(base: str, prefix: str) -> str:
    if not prefix:
        return base
    if prefix[-1] in CAPTION_DELIMS:
        return prefix + base
    return prefix + "-" + base


def _apply_caption_remove_prefix(base: str, prefix: str) -> str:
    if not prefix:
        return base
    if base.startswith(prefix):
        new_base = base[len(prefix):]
        if new_base and new_base[0] in CAPTION_DELIMS:
            new_base = new_base[1:]
        return new_base
    return base


def _apply_caption_add_suffix(base: str, suffix: str) -> str:
    if not suffix:
        return base
    if suffix[0] in CAPTION_DELIMS:
        return base + suffix
    return base + "-" + suffix


def _apply_caption_remove_suffix(base: str, suffix: str) -> str:
    if not suffix:
        return base
    if base.endswith(suffix):
        new_base = base[:-len(suffix)]
        if new_base and new_base[-1] in CAPTION_DELIMS:
            new_base = new_base[:-1]
        return new_base
    return base


def _normalize_caption_operations(
    prefix: str,
    suffix: str,
    operations: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    if operations:
        cleaned: List[Dict[str, Any]] = []
        for op in operations:
            step = op.get("step")
            op_type = op.get("type")
            value = op.get("value", "")
            if step is None or op_type not in {"add_prefix", "remove_prefix", "add_suffix", "remove_suffix"}:
                continue
            cleaned.append({"step": step, "type": op_type, "value": value})
        cleaned.sort(key=lambda o: o["step"])
        return cleaned

    fallback: List[Dict[str, Any]] = []
    if prefix:
        fallback.append({"step": 1, "type": "add_prefix", "value": prefix})
    if suffix:
        fallback.append({"step": 2 if prefix else 1, "type": "add_suffix", "value": suffix})
    return fallback


def _apply_caption_operations(text: str, operations: List[Dict[str, Any]]) -> str:
    updated = text or ""
    for op in operations:
        value = op.get("value", "")
        t = op.get("type")
        if t == "add_prefix":
            updated = _apply_caption_add_prefix(updated, value)
        elif t == "remove_prefix":
            updated = _apply_caption_remove_prefix(updated, value)
        elif t == "add_suffix":
            updated = _apply_caption_add_suffix(updated, value)
        elif t == "remove_suffix":
            updated = _apply_caption_remove_suffix(updated, value)
    return updated


def preview_caption_rows(
    entries: List[Dict[str, Any]],
    prefix: str,
    suffix: str,
    operations: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    pre = prefix or ""
    suf = suffix or ""
    ops = _normalize_caption_operations(pre, suf, operations)
    pre = prefix or ""
    suf = suffix or ""
    out = []
    for entry in entries:
        cap = entry.get("caption") or ""
        preview = _apply_caption_operations(cap, ops) if ops else f"{pre}{cap}{suf}"
        out.append(
            {
                "id": entry.get("id"),
                "filename": entry.get("filename"),
                "caption": cap,
                "preview": preview,
            }
        )
    return out


def run_caption_prefix_suffix(
    folder: str,
    entries: List[Dict[str, Any]],
    recursive: bool,
    prefix: str,
    suffix: str,
    dry_run: bool,
    make_backup: bool,
    operations: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    base = _ensure_folder(folder)
    logs: List[str] = []
    affected_paths: List[Path] = []
    before_texts: Dict[Path, str] = {}
    after_texts: Dict[Path, str] = {}

    changed = 0
    skipped = 0
    backed_up = 0
    summary_rows: List[List[str]] = []

    ops = _normalize_caption_operations(prefix, suffix, operations)
    backup_dir = base / "__backup_prefix_suffix" if make_backup and not dry_run else None
    if backup_dir:
        backup_dir.mkdir(parents=True, exist_ok=True)

    entry_map: Dict[Path, Dict[str, Any]] = {}
    for entry in entries:
        path_str = entry.get("path")
        if not path_str:
            continue
        path = Path(path_str)
        if not path.is_absolute():
            path = (base / path_str).resolve()
        try:
            path.relative_to(base)
        except ValueError:
            continue
        entry_map[path] = entry

    txts = _list_caption_files(base, recursive) if not entries else list(entry_map.keys())
    for txt_path in txts:
        try:
            if not txt_path.exists():
                continue
            rel = str(txt_path.relative_to(base)).replace("\\", "/")
            entry = entry_map.get(str(txt_path), None)
            caption = ""
            if entry is not None:
                caption = entry.get("caption", "")
            else:
                caption = _read_text_safe(txt_path)

            original = _read_text_safe(txt_path)
            final_text = _apply_caption_operations(caption, ops) if ops else f"{pre}{caption}{suf}"

            if final_text == original:
                skipped += 1
                summary_rows.append([rel, "skipped", original[:80].replace("\n", " "), original[:80].replace("\n", " ")])
                continue

            affected_paths.append(txt_path)
            before_texts[txt_path] = original
            after_texts[txt_path] = final_text

            if backup_dir and not dry_run:
                try:
                    _write_text_safe(backup_dir / (txt_path.name + ".bak"), original)
                    backed_up += 1
                except Exception as exc:
                    _log(logs, f"[WARN] Backup failed for {rel}: {exc}")

            if not dry_run:
                _write_text_safe(txt_path, final_text)
            changed += 1
            old_preview = original[:80].replace("\n", " ")
            new_preview = final_text[:80].replace("\n", " ")
            summary_rows.append([rel, "changed", old_preview, new_preview])
        except Exception as exc:
            _log(logs, f"[ERROR] {txt_path}: {exc}")

    snapshot_id: Optional[str] = None
    if affected_paths and not dry_run:
        snap = _make_snapshot(base, affected_paths, before_texts, after_texts)
        snapshot_id = snap.dir.name

    csv_path = _write_summary_csv(
        base,
        "prefix_suffix",
        ["relative_path", "action", "old_head", "new_head"],
        summary_rows,
    )

    _log(logs, f"Done | changed: {changed}, skipped: {skipped}, backups: {backed_up}")
    return {
        "summary": {"changed": changed, "skipped": skipped, "backups": backed_up},
        "log": logs,
        "csv_path": csv_path,
        "snapshot_id": snapshot_id,
    }


def list_images(folder: Path, recursive: bool, exts: Iterable[str]) -> List[Path]:
    exts_set = {e.lower() for e in exts}
    if recursive:
        return [
            p
            for p in folder.rglob("*")
            if p.is_file() and p.suffix.lower() in exts_set
        ]
    return [
        p
        for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in exts_set
    ]


def copy_captions(
    src: str,
    dest: str,
    allow_overwrite: bool,
    dry_run: bool,
) -> Dict[str, Any]:
    src_p = _ensure_folder(src)
    dest_p = _ensure_folder(dest)
    imgs = list_images(dest_p, True, IMG_EXTS_ALL)

    copied = 0
    missing = 0
    exist_skip = 0
    summary_rows: List[List[str]] = []
    logs: List[str] = []

    for img in imgs:
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
                    _write_text_safe(txt_in_dest, _read_text_safe(txt_in_src))
                    copied += 1
                    action = "copied"
                except Exception as exc:
                    _log(logs, f"[ERROR] Copy failed for {txt_in_dest}: {exc}")
                    action = "error"

        summary_rows.append([str(rel).replace("\\", "/"), action])

    csv_path = _write_summary_csv(
        dest_p,
        "copy_captions",
        ["relative_image_path", "action"],
        summary_rows,
    )
    _log(
        logs,
        f"Done | copied: {copied}, skipped_exist: {exist_skip}, missing_in_src: {missing}",
    )
    return {
        "summary": {
            "copied": copied,
            "skipped_exist": exist_skip,
            "missing_in_src": missing,
        },
        "log": logs,
        "csv_path": csv_path,
    }


def make_blank_txts(
    folder: str,
    recursive: bool,
    dry_run: bool,
    extensions: Optional[List[str]],
) -> Dict[str, Any]:
    base = _ensure_folder(folder)
    exts = extensions or IMG_EXTS_ALL
    imgs = list_images(base, recursive, exts)

    created = 0
    exist = 0
    summary_rows: List[List[str]] = []
    logs: List[str] = []

    for img in imgs:
        txt = img.with_suffix(".txt")
        rel = str(img.relative_to(base)).replace("\\", "/")
        if txt.exists():
            exist += 1
            action = "exists"
        else:
            if dry_run:
                created += 1
                action = "would_create"
            else:
                try:
                    _write_text_safe(txt, "")
                    created += 1
                    action = "created"
                except Exception as exc:
                    _log(logs, f"[ERROR] Create failed for {txt}: {exc}")
                    action = "error"

        summary_rows.append([rel, action])

    csv_path = _write_summary_csv(
        base,
        "make_blank_txts",
        ["relative_image_path", "action"],
        summary_rows,
    )
    _log(logs, f"Done | created: {created}, already_exists: {exist}")
    return {
        "summary": {"created": created, "already_exists": exist},
        "log": logs,
        "csv_path": csv_path,
    }
