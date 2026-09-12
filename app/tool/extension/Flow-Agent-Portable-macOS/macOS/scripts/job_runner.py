#!/usr/bin/env python3
import json
from pathlib import Path
import subprocess
import sys


SCRIPT_DIR = Path(__file__).resolve().parent
KIT_ROOT = SCRIPT_DIR.parent.parent
APP_ROOT = KIT_ROOT / "flow-agent"
PYTHON = APP_ROOT / ".venv-portable" / "bin" / "python3"


def resolve(value, job_dir):
    path = Path(str(value)).expanduser()
    candidate = path if path.is_absolute() else job_dir / path
    return str(candidate.resolve()) if candidate.exists() or path.suffix else str(value)


def main(job_name):
    job_path = Path(job_name).expanduser().resolve()
    if not job_path.is_file():
        raise ValueError(f"Không tìm thấy job: {job_path}")
    with job_path.open(encoding="utf-8-sig") as handle:
        job = json.load(handle)
    for key in ("kind", "prompt", "output", "idempotency_key"):
        if not job.get(key): raise ValueError(f"Job thiếu {key}")
    if job["kind"] not in ("image", "video"):
        raise ValueError("kind chỉ nhận image hoặc video")
    job_dir = job_path.parent
    output = Path(resolve(job["output"], job_dir))
    if output.exists(): raise ValueError(f"Output đã tồn tại, không ghi đè: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    args = [str(PYTHON), str(APP_ROOT / "main.py"), job["kind"], str(job["prompt"]),
            "--output", str(output), "--idempotency-key", str(job["idempotency_key"])]
    for field in ("aspect", "model", "count", "duration"):
        if job.get(field) is not None: args += ["--" + field, str(job[field])]
    for field in ("start", "end"):
        if job.get(field): args += ["--" + field, resolve(job[field], job_dir)]
    refs = job.get("ref") or []
    if not isinstance(refs, list) or len(refs) > 10:
        raise ValueError("ref phải là mảng tối đa 10 ảnh")
    if refs: args += ["--ref", *[resolve(value, job_dir) for value in refs]]
    log_path = Path(str(output) + ".flow.log")
    print("Đang tạo media bằng Google Flow...")
    with log_path.open("w", encoding="utf-8") as log:
        process = subprocess.Popen(args, cwd=job_dir, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True)
        for line in process.stdout:
            print(line, end="")
            log.write(line)
        code = process.wait()
    if code or not output.is_file():
        raise RuntimeError(f"Tạo media thất bại. Xem log: {log_path}")
    print(f"Hoàn tất: {output}")


if __name__ == "__main__":
    try:
        main(sys.argv[1])
    except (OSError, ValueError, KeyError, RuntimeError) as error:
        print(error, file=sys.stderr)
        raise SystemExit(5)

