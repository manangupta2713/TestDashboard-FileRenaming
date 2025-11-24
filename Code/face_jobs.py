from __future__ import annotations

import os
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


@dataclass
class JobStatus:
    job_id: str
    job_type: str
    state: str = "pending"
    processed: int = 0
    total: int = 0
    message: str = ""
    error: Optional[str] = None
    logs: List[str] = field(default_factory=list)
    started_at: float = field(default_factory=time.time)
    finished_at: Optional[float] = None

    def to_dict(self) -> Dict:
        return {
            "job_id": self.job_id,
            "job_type": self.job_type,
            "state": self.state,
            "processed": self.processed,
            "total": self.total,
            "message": self.message,
            "error": self.error,
            "logs": self.logs,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
        }


class JobManager:
    def __init__(self):
        self._jobs: Dict[str, JobStatus] = {}
        self._lock = threading.Lock()

    def start_job(self, job_type: str, total_steps: int, description: str) -> JobStatus:
        job_id = str(uuid.uuid4())
        status = JobStatus(job_id=job_id, job_type=job_type, total=max(total_steps, 1))
        status.logs.append(f"Job created: {description}")
        with self._lock:
            self._jobs[job_id] = status

        thread = threading.Thread(target=self._simulate_run, args=(status,), daemon=True)
        thread.start()
        return status

    def _simulate_run(self, status: JobStatus) -> None:
        status.state = "running"
        for step in range(status.total):
            time.sleep(0.3)
            status.processed = step + 1
            status.message = f"Processing item {status.processed}/{status.total}"
        status.state = "completed"
        status.message = "Job completed"
        status.finished_at = time.time()
        status.logs.append("Job finished successfully")

    def get_job(self, job_id: str) -> Optional[JobStatus]:
        with self._lock:
            return self._jobs.get(job_id)

def count_images(folder: Path) -> int:
    if not folder.exists():
        return 0
    total = 0
    for root, _, files in os.walk(folder):
        for filename in files:
            if Path(filename).suffix.lower() in IMAGE_EXTS:
                total += 1
    return total

job_manager = JobManager()
