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

normalize_fs_path = max_api.normalize_fs_path


def test_normalize_fs_path_strips_quotes_and_maps_drive():
  raw = '"D:\\\\Projects\\\\Files"'
  normalized = normalize_fs_path(raw)
  if os.name == "posix":
    assert normalized.startswith("/mnt/d/")
  else:
    assert normalized == "D:\\Projects\\Files"


def test_preview_counts(tmp_path):
  (tmp_path / "alpha.txt").write_text("a", encoding="utf-8")
  (tmp_path / "beta.txt").write_text("b", encoding="utf-8")

  req = max_api.PreviewRequest(
    folder=str(tmp_path),
    operations=[max_api.Operation(step=1, type="add_prefix", value="hello")],
  )
  resp = max_api.preview(req)
  assert resp.summary.dict() == {"renamed": 2, "unchanged": 0, "collisions": 0}
  assert len(resp.files) == 2


def test_run_respects_include_files(tmp_path):
  f1 = tmp_path / "one.txt"
  f2 = tmp_path / "two.txt"
  f1.write_text("1", encoding="utf-8")
  f2.write_text("2", encoding="utf-8")

  req = max_api.RunRequest(
    folder=str(tmp_path),
    operations=[max_api.Operation(step=1, type="add_prefix", value="pre")],
    include_files=["two.txt"],
  )
  resp = max_api.run(req)
  assert resp.files == [max_api.FileMapping(original="two.txt", new="pre-two.txt")]
  assert (tmp_path / "one.txt").exists()
  assert (tmp_path / "pre-two.txt").exists()
  assert not (tmp_path / "pre-one.txt").exists()
  assert resp.summary.renamed == 1


def test_dataset_caption_endpoints(tmp_path):
  base = tmp_path / "captions"
  base.mkdir()
  caption = base / "pose.txt"
  caption.write_text("calm", encoding="utf-8")

  load_req = max_api.CaptionLoadRequest(folder=str(base), recursive=False)
  rows = max_api.dataset_load_captions(load_req).rows

  preview_req = max_api.CaptionPreviewRequest(
    entries=rows,
    operations=[
      max_api.Operation(step=1, type="add_prefix", value="mix"),
      max_api.Operation(step=2, type="add_suffix", value="tail"),
    ],
  )
  preview = max_api.dataset_preview_captions(preview_req)
  assert preview.previews[0]["preview"].startswith("mix")

  run_req = max_api.CaptionRunRequest(
    folder=str(base),
    entries=rows,
    recursive=False,
    dry_run=False,
    make_backup=False,
    prefix="",
    suffix="",
    operations=[max_api.Operation(step=1, type="add_prefix", value="mix")],
  )
  max_api.dataset_run_captions(run_req)
  assert caption.read_text(encoding="utf-8").startswith("mix-")


def test_copy_and_make_blank_endpoints(tmp_path):
  src = tmp_path / "src"
  dest = tmp_path / "dest"
  src.mkdir()
  dest.mkdir()
  (dest / "set").mkdir()

  (dest / "set" / "img.png").write_bytes(b"png")
  (src / "set").mkdir()
  (src / "set" / "img.txt").write_text("caption", encoding="utf-8")

  copy_req = max_api.CopyCaptionsRequest(
    src=str(src),
    dest=str(dest),
    allow_overwrite=False,
    dry_run=False,
  )
  copy_resp = max_api.dataset_copy_captions(copy_req)
  assert copy_resp.summary["copied"] == 1

  blank_req = max_api.MakeBlankRequest(
    folder=str(dest),
    recursive=True,
    dry_run=False,
    extensions=[".png"],
  )
  blank_resp = max_api.dataset_make_blank(blank_req)
  assert Path(blank_resp.csv_path).exists()
