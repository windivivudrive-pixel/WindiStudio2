from __future__ import annotations

import json
import wave
from pathlib import Path

import numpy as np
import whisper


ROOT = Path(__file__).resolve().parent
AUDIO = ROOT / "audio.wav"
OUTPUT = ROOT / "transcript-turbo"


def srt_time(seconds: float) -> str:
    millis = int(round(seconds * 1000))
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


with wave.open(str(AUDIO), "rb") as stream:
    if stream.getframerate() != 16_000 or stream.getnchannels() != 1 or stream.getsampwidth() != 2:
        raise RuntimeError("Expected 16 kHz, mono, 16-bit PCM input")
    pcm = stream.readframes(stream.getnframes())

audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
model = whisper.load_model("large-v3-turbo")
result = model.transcribe(
    audio,
    language="vi",
    task="transcribe",
    fp16=False,
    word_timestamps=True,
    verbose=False,
)

OUTPUT.mkdir(parents=True, exist_ok=True)
(OUTPUT / "audio.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
(OUTPUT / "audio.txt").write_text(result["text"].strip() + "\n", encoding="utf-8")

srt = []
for index, segment in enumerate(result["segments"], start=1):
    srt.extend(
        [
            str(index),
            f"{srt_time(segment['start'])} --> {srt_time(segment['end'])}",
            segment["text"].strip(),
            "",
        ]
    )
(OUTPUT / "audio.srt").write_text("\n".join(srt), encoding="utf-8")
print(result["text"].strip())
