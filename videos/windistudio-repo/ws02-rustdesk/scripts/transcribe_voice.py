from __future__ import annotations

import json
import sys
import wave
from pathlib import Path

import numpy as np
import whisper


ROOT = Path(__file__).resolve().parent.parent
AUDIO = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "public" / "voice-v2.wav"
OUTPUT = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else ROOT / "evidence" / "transcript-v2"


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
(OUTPUT / "voice.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
(OUTPUT / "voice.txt").write_text(result["text"].strip() + "\n", encoding="utf-8")
print(result["text"].strip())
