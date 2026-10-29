import { expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../lib/voice/server", () => ({
  cartesia: vi.fn(),
  resolveVoice: vi.fn(),
  writer: vi.fn(),
  VoiceError: class VoiceError extends Error {
    constructor(
      message: string,
      public status = 400,
    ) {
      super(message);
    }
  },
}));

import { normalizeSpeechNumbers, validateSpeech } from "../lib/voice/shared";
import { validateVoiceApiInput } from "../lib/voice/api";

test("normalizeSpeechNumbers converts version and decimal dots to 'chấm' in Vietnamese", () => {
  expect(normalizeSpeechNumbers("3.0")).toBe("3 chấm 0");
  expect(normalizeSpeechNumbers("5.1")).toBe("5 chấm 1");
  expect(normalizeSpeechNumbers("Sol 6.1 và Claude Opus 5.5")).toBe("Sol 6 chấm 1 và Claude Opus 5 chấm 5");
  expect(normalizeSpeechNumbers("Sonnet 3.7 và GPT-4.5")).toBe("Sonnet 3 chấm 7 và GPT-4 chấm 5");
  expect(normalizeSpeechNumbers("Windi Clone Pro 3.0 với tốc độ 5.1x")).toBe("Windi Clone Pro 3 chấm 0 với tốc độ 5 chấm 1x");
  expect(normalizeSpeechNumbers("Phiên bản 2.0.1 nâng cấp")).toBe("Phiên bản 2 chấm 0 chấm 1 nâng cấp");
  expect(normalizeSpeechNumbers("v3.0 và V5.1")).toBe("v3 chấm 0 và V5 chấm 1");
  expect(normalizeSpeechNumbers("Tỉ lệ 0.5%")).toBe("Tỉ lệ 0 chấm 5%");
});

test("normalizeSpeechNumbers preserves thousands separator", () => {
  expect(normalizeSpeechNumbers("Giá chỉ 10.000đ hoặc 1.000.000 VNĐ")).toBe("Giá chỉ 10.000đ hoặc 1.000.000 VNĐ");
  expect(normalizeSpeechNumbers("Nạp 100.000 credit")).toBe("Nạp 100.000 credit");
  expect(normalizeSpeechNumbers("500.000")).toBe("500.000");
});

test("normalizeSpeechNumbers does not affect sentence ending punctuation", () => {
  expect(normalizeSpeechNumbers("Chương 1. Giới thiệu tổng quan")).toBe("Chương 1. Giới thiệu tổng quan");
  expect(normalizeSpeechNumbers("Năm 2026. Một khởi đầu mới")).toBe("Năm 2026. Một khởi đầu mới");
  expect(normalizeSpeechNumbers("Năm 2026. 10 người tham gia")).toBe("Năm 2026. 10 người tham gia");
});

test("normalizeSpeechNumbers leaves other languages unchanged", () => {
  expect(normalizeSpeechNumbers("Version 3.0 and 5.1", "en")).toBe("Version 3.0 and 5.1");
  expect(normalizeSpeechNumbers("バージョン 3.0", "ja")).toBe("バージョン 3.0");
});

test("validateSpeech and validateVoiceApiInput normalize numbers automatically", () => {
  const reqKey = "00000000-0000-4000-8000-000000000001";
  const voiceId = "00000000-0000-4000-8000-000000000002";
  
  const speech = validateSpeech({
    requestKey: reqKey,
    voiceId,
    text: "Trải nghiệm Windi 3.0 và tốc độ 5.1",
    language: "vi",
  });
  expect(speech.text).toBe("Trải nghiệm Windi 3 chấm 0 và tốc độ 5 chấm 1");

  const apiInput = validateVoiceApiInput({
    voice_id: voiceId,
    text: "Trải nghiệm Windi 3.0 và tốc độ 5.1",
    language: "vi",
  });
  expect(apiInput.text).toBe("Trải nghiệm Windi 3 chấm 0 và tốc độ 5 chấm 1");
});
