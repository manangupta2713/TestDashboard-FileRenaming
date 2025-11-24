import importlib.util
import os
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[4]
CODE_DIR = REPO_ROOT / "Code"
if str(CODE_DIR) not in sys.path:
    sys.path.insert(0, str(CODE_DIR))

spec = importlib.util.spec_from_file_location("max_api", CODE_DIR / "Option_C-Max-API.py")
max_api = importlib.util.module_from_spec(spec)
sys.modules["max_api"] = max_api
spec.loader.exec_module(max_api)  # type: ignore


def test_compute_new_names_handles_collisions(tmp_path: Path):
    (tmp_path / "foo.txt").write_text("1", encoding="utf-8")
    (tmp_path / "foo (copy).txt").write_text("2", encoding="utf-8")
    ops = [
        max_api.Operation(step=1, type="remove_suffix", value=" (copy)"),
        max_api.Operation(step=2, type="add_prefix", value="dup"),
    ]
    files, mapping, summary = max_api.compute_new_names(str(tmp_path), ops)
    assert len(files) == 2
    assert set(mapping.values()) == {"dup-foo.txt", "dup-foo_1.txt"}
    assert summary.collisions == 1


def test_run_ignores_unknown_include_files(tmp_path: Path):
    (tmp_path / "keep.txt").write_text("a", encoding="utf-8")
    req = max_api.RunRequest(
        folder=str(tmp_path),
        operations=[max_api.Operation(step=1, type="add_prefix", value="pre")],
        include_files=["missing.txt"],
    )
    resp = max_api.run(req)
    assert resp.files == []
    assert resp.summary.renamed == 0


def test_run_subset_recompute_summary(tmp_path: Path):
    f1 = tmp_path / "one.txt"
    f2 = tmp_path / "two.txt"
    f1.write_text("1", encoding="utf-8")
    f2.write_text("2", encoding="utf-8")
    req = max_api.RunRequest(
        folder=str(tmp_path),
        operations=[max_api.Operation(step=1, type="add_suffix", value="end")],
        include_files=["two.txt"],
    )
    resp = max_api.run(req)
    assert resp.summary.renamed == 1
    assert resp.summary.collisions == 0
    assert (tmp_path / "two-end.txt").exists()
    assert (tmp_path / "one.txt").exists()


def test_normalize_fs_path_strips_quotes():
    raw = '"D:\\\\Sample\\\\Work"'
    normalized = max_api.normalize_fs_path(raw)
    if os.name == "posix":
        assert normalized.replace("//", "/").startswith("/mnt/d/Sample/Work")
    else:
        assert normalized == "D:\\Sample\\Work"


def test_apply_prefix_suffix_helpers_handle_delims():
    assert max_api.apply_add_prefix("foo", "pre-") == "pre-foo"
    assert max_api.apply_remove_prefix("foo_bar", "foo") == "bar"
    assert max_api.apply_add_suffix("foo", "-tail") == "foo-tail"
    assert max_api.apply_remove_suffix("foo-bar", "-bar") == "foo"


def test_apply_helpers_return_original_when_empty():
    assert max_api.apply_add_prefix("foo", "") == "foo"
    assert max_api.apply_remove_prefix("foo", "") == "foo"
    assert max_api.apply_add_suffix("foo", "") == "foo"
    assert max_api.apply_remove_suffix("foo", "") == "foo"


def test_compute_new_names_missing_folder_raises(tmp_path: Path):
    missing = tmp_path / "nope"
    with pytest.raises(FileNotFoundError):
        max_api.compute_new_names(str(missing), [])
