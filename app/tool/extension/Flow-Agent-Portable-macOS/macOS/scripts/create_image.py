#!/usr/bin/env python3
import json
from pathlib import Path
import subprocess
import uuid


SCRIPT_DIR = Path(__file__).resolve().parent
MAC_ROOT = SCRIPT_DIR.parent
APP_ROOT = MAC_ROOT.parent / "flow-agent"
PYTHON = APP_ROOT / ".venv-portable" / "bin" / "python3"

with (MAC_ROOT / "config.local.json").open(encoding="utf-8") as handle:
    config = json.load(handle)
print("TẠO ẢNH BẰNG GOOGLE FLOW")
prompt = input("Dán prompt: ").strip()
if not prompt: raise SystemExit("Prompt không được trống.")
output_dir = input(f"Thư mục lưu [Enter = {config['default_output']}]: ").strip() or config["default_output"]
filename = input("Tên file [Enter = flow-image.png]: ").strip() or "flow-image.png"
if Path(filename).suffix.lower() != ".png": filename += ".png"
print("Tỷ lệ: 1=vuông, 2=dọc 9:16, 3=ngang 16:9, 4=3:4, 5=4:3")
aspect = {"1":"square","2":"portrait","3":"landscape","4":"3x4","5":"4x3"}.get(input("Chọn [1]: ").strip() or "1", "square")
raw_refs = input("Ảnh ref (bỏ trống hoặc nhiều đường dẫn cách nhau bằng |): ").strip()
refs = [item.strip().strip('"') for item in raw_refs.split("|") if item.strip()]
if len(refs) > 10: raise SystemExit("Tối đa 10 ảnh ref.")
for ref in refs:
    if not Path(ref).expanduser().is_file(): raise SystemExit(f"Không tìm thấy ref: {ref}")
jobs = MAC_ROOT / ".jobs"
jobs.mkdir(exist_ok=True)
job_path = jobs / f"image-{uuid.uuid4().hex}.json"
job = {"kind":"image","prompt":prompt,"output":str(Path(output_dir).expanduser()/filename),
       "aspect":aspect,"model":"gem_pix_2","ref":refs,
       "idempotency_key":"portable-image-"+uuid.uuid4().hex}
with job_path.open("w", encoding="utf-8") as handle: json.dump(job, handle, ensure_ascii=False, indent=2)
raise SystemExit(subprocess.call([str(PYTHON), str(SCRIPT_DIR / "job_runner.py"), str(job_path)]))

