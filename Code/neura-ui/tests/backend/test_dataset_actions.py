import importlib.util
import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[4]
CODE_DIR = REPO_ROOT / "Code"
if str(CODE_DIR) not in sys.path:
    sys.path.insert(0, str(CODE_DIR))

core_spec = importlib.util.spec_from_file_location("dataset_core", CODE_DIR / "dataset_actions_core.py")
dataset_core = importlib.util.module_from_spec(core_spec)
sys.modules["dataset_core"] = dataset_core
core_spec.loader.exec_module(dataset_core)  # type: ignore

api_spec = importlib.util.spec_from_file_location("max_api", CODE_DIR / "Option_C-Max-API.py")
max_api = importlib.util.module_from_spec(api_spec)
sys.modules["max_api"] = max_api
api_spec.loader.exec_module(max_api)  # type: ignore

copy_captions = dataset_core.copy_captions
load_caption_rows = dataset_core.load_caption_rows
make_blank_txts = dataset_core.make_blank_txts
preview_caption_rows = dataset_core.preview_caption_rows
restore_snapshot = dataset_core.restore_snapshot
run_caption_prefix_suffix = dataset_core.run_caption_prefix_suffix

client = TestClient(max_api.app)


def make_caption(base: Path, name: str, text: str) -> Path:
    file_path = base / name
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(text, encoding="utf-8")
    return file_path


def test_preview_caption_rows_applies_operations():
    entries = [
        {"id": "a", "filename": "a.txt", "caption": "pose"},
        {"id": "b", "filename": "b.txt", "caption": "look"},
    ]
    previews = preview_caption_rows(
        entries,
        prefix="",
        suffix="",
        operations=[
            {"step": 2, "type": "add_suffix", "value": "beta"},
            {"step": 1, "type": "add_prefix", "value": "alpha"},
        ],
    )
    assert [p["preview"] for p in previews] == ["alpha-pose-beta", "alpha-look-beta"]


def test_run_caption_prefix_suffix_creates_backups_and_snapshots(tmp_path: Path):
    base = tmp_path / "dataset"
    base.mkdir()
    caption = make_caption(base, "alpha.txt", "pose")

    result = run_caption_prefix_suffix(
        folder=str(base),
        entries=[
            {
                "id": "alpha",
                "path": str(caption),
                "filename": "alpha.txt",
                "caption": "pose",
            }
        ],
        recursive=False,
        prefix="mix",
        suffix="_tail",
        dry_run=False,
        make_backup=True,
        operations=[
            {"step": 1, "type": "add_prefix", "value": "mix"},
            {"step": 2, "type": "add_suffix", "value": "_tail"},
        ],
    )

    updated = caption.read_text(encoding="utf-8")
    assert updated == "mix-pose_tail"
    backup_dir = base / "__backup_prefix_suffix"
    assert any(backup_dir.rglob("*.bak"))
    assert result["summary"] == {"changed": 1, "skipped": 0, "backups": 1}
    assert Path(result["csv_path"]).exists()
    assert result["snapshot_id"]
    manifest = json.loads(
        (base / "__undo" / result["snapshot_id"] / "manifest.json").read_text(encoding="utf-8")
    )
    assert manifest["files"] == ["alpha.txt"]

    # restore original text, then roll forward again
    restore_snapshot(str(base), result["snapshot_id"], "before")
    assert caption.read_text(encoding="utf-8") == "pose"
    restore_snapshot(str(base), result["snapshot_id"], "after")
    assert caption.read_text(encoding="utf-8") == "mix-pose_tail"


def test_run_caption_prefix_suffix_dry_run_only_reports(tmp_path: Path):
    base = tmp_path / "dataset_dry_run"
    base.mkdir()
    caption = make_caption(base, "beta.txt", "calm")

    summary = run_caption_prefix_suffix(
        folder=str(base),
        entries=[{"path": str(caption), "id": "beta", "filename": "beta.txt", "caption": "calm"}],
        recursive=False,
        prefix="pre",
        suffix="",
        dry_run=True,
        make_backup=True,
        operations=[{"step": 1, "type": "add_prefix", "value": "pre"}],
    )
    assert caption.read_text(encoding="utf-8") == "calm"
    assert summary["summary"]["changed"] == 1
    assert summary["snapshot_id"] is None
    assert not (base / "__backup_prefix_suffix").exists()


def test_copy_and_blank_caption_flows(tmp_path: Path):
    src = tmp_path / "src"
    dest = tmp_path / "dest"
    src.mkdir()
    dest.mkdir()
    (dest / "set").mkdir()

    # destination images
    for name in ("img1.png", "img2.png", "img3.png"):
        (dest / "set" / name).write_bytes(b"png")

    # captions exist for img1/img2, missing for img3
    make_caption(src, "set/img1.txt", "alpha")
    make_caption(src, "set/img2.txt", "beta")
    # pre-existing caption in destination triggers skip
    make_caption(dest, "set/img2.txt", "existing")

    copy_result = copy_captions(
        src=str(src),
        dest=str(dest),
        allow_overwrite=False,
        dry_run=False,
    )
    assert copy_result["summary"] == {
        "copied": 1,
        "skipped_exist": 1,
        "missing_in_src": 1,
    }
    assert Path(copy_result["csv_path"]).exists()
    assert (dest / "set/img1.txt").read_text(encoding="utf-8") == "alpha"
    assert (dest / "set/img2.txt").read_text(encoding="utf-8") == "existing"

    blank_result = make_blank_txts(
        folder=str(dest),
        recursive=True,
        dry_run=False,
        extensions=[".png"],
    )
    assert blank_result["summary"]["created"] >= 1
    assert Path(blank_result["csv_path"]).exists()
    assert (dest / "set/img3.txt").exists()


def test_load_caption_rows_read_files(tmp_path: Path):
    base = tmp_path / "captions"
    base.mkdir()
    make_caption(base, "foo.txt", "x")
    rows = load_caption_rows(str(base), recursive=False)
    assert rows["count"] == 1
    assert rows["rows"][0]["caption"] == "x"


def test_load_caption_rows_missing_folder(tmp_path: Path):
    with pytest.raises(FileNotFoundError):
        load_caption_rows(str(tmp_path / "missing"), recursive=False)


def test_normalize_caption_operations_variants():
    ops = dataset_core._normalize_caption_operations("pre", "suf", None)
    assert ops == [
        {"step": 1, "type": "add_prefix", "value": "pre"},
        {"step": 2, "type": "add_suffix", "value": "suf"},
    ]
    custom = dataset_core._normalize_caption_operations(
        "", "",
        [
            {"step": 2, "type": "add_suffix", "value": "tail"},
            {"step": None, "type": "ignored", "value": ""},
            {"step": 1, "type": "add_prefix", "value": "head"},
        ],
    )
    assert [c["type"] for c in custom] == ["add_prefix", "add_suffix"]


def test_restore_snapshot_missing_folder(tmp_path: Path):
    base = tmp_path / "snap_missing"
    base.mkdir()
    with pytest.raises(FileNotFoundError):
        restore_snapshot(str(base), "unknown", "before")


def test_make_blank_dry_run_creates_summary(tmp_path: Path):
    base = tmp_path / "images"
    base.mkdir()
    (base / "img.png").write_bytes(b"png")
    result = make_blank_txts(
        folder=str(base),
        recursive=False,
        dry_run=True,
        extensions=[".png"],
    )
    assert result["summary"]["created"] == 1
    assert (base / "img.txt").exists() is False


def test_restore_snapshot_invalid_mode(tmp_path: Path):
    base = tmp_path / "snap"
    base.mkdir()
    undo_dir = base / "__undo" / "snap_1"
    (undo_dir / "before").mkdir(parents=True, exist_ok=True)
    (undo_dir / "after").mkdir(parents=True, exist_ok=True)
    (undo_dir / "manifest.json").write_text(
        json.dumps({"files": [], "version": 2, "base": str(base)}),
        encoding="utf-8",
    )
    with pytest.raises(ValueError):
        restore_snapshot(str(base), "snap_1", "later")


def test_copy_captions_dry_run_allows_overwrite(tmp_path: Path):
    src = tmp_path / "src2"
    dest = tmp_path / "dest2"
    src.mkdir()
    dest.mkdir()
    (dest / "set").mkdir()
    (dest / "set" / "img.png").write_bytes(b"png")
    make_caption(src, "set/img.txt", "alpha")
    make_caption(dest, "set/img.txt", "beta")

    result = copy_captions(
        src=str(src),
        dest=str(dest),
        allow_overwrite=True,
        dry_run=True,
    )
    assert result["summary"]["copied"] == 1
    assert result["summary"]["skipped_exist"] == 0
    assert result["summary"]["missing_in_src"] == 0


def test_caption_apply_helpers_cover_delims():
    assert dataset_core._apply_caption_add_prefix("foo", "pre_") == "pre_foo"
    assert dataset_core._apply_caption_remove_prefix("foo_bar", "foo") == "bar"
    assert dataset_core._apply_caption_add_suffix("foo", "_tail") == "foo_tail"
    assert dataset_core._apply_caption_remove_suffix("foo-tail", "-tail") == "foo"
