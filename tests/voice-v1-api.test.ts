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

import {
  automationTokenDescriptor,
  cartesiaTtsPayload,
  createAutomationToken,
  hashAutomationToken,
  parseCartesiaSse,
  pcm16ToMp3,
  requestHash,
  requestUuid,
  requireIdempotencyKey,
  validateVoiceApiInput,
} from "../lib/voice/api";
import { parseSepayPaymentCode } from "../lib/payments/sepay";
import { createProductToken, hashProductToken } from "../lib/products/license";

const user = "00000000-0000-4000-8000-000000000011";
const token = "00000000-0000-4000-8000-000000000022";
const voice = "00000000-0000-4000-8000-000000000033";

test("automation token is high entropy, stored by hash, and shown with safe metadata", () => {
  const generated = createAutomationToken();
  expect(generated.secret).toMatch(/^windi_voice_[A-Za-z0-9_-]{40,}$/);
  expect(generated.hash).toHaveLength(64);
  expect(generated.hash).toBe(hashAutomationToken(generated.secret));
  expect(generated.prefix).not.toContain(generated.secret.slice(-12));
});

test("workflow activation token uses a separate namespace and stores only its hash", () => {
  const generated = createProductToken();
  expect(generated.secret).toMatch(/^windi_kit_[A-Za-z0-9_-]{40,}$/);
  expect(generated.hash).toBe(hashProductToken(generated.secret));
  expect(generated.secret).not.toMatch(/^windi_voice_/);
});

test("workflow activation token is also a Windi Voice API credential", () => {
  const generated = createProductToken();
  expect(automationTokenDescriptor(`Bearer ${generated.secret}`)).toMatchObject({
    token: generated.secret,
    purpose: "video_workflow",
    isWorkflowToken: true,
  });
  expect(() => automationTokenDescriptor("Bearer cartesia-secret")).toThrow(
    "Token Windi",
  );
});

test("idempotency derives a stable UUID per user and token while hashing request content", () => {
  const input = { text: "Xin chào", voiceId: voice, language: "vi", speed: 1 };
  expect(requestUuid(user, token, "scene-1")).toBe(
    requestUuid(user, token, "scene-1"),
  );
  expect(requestUuid(user, token, "scene-1")).not.toBe(
    requestUuid(user, token, "scene-2"),
  );
  expect(requestUuid(user, token, "scene-1")).toMatch(/^[0-9a-f-]{36}$/);
  expect(requestHash(input)).not.toBe(
    requestHash({ ...input, text: "Nội dung khác" }),
  );
});

test("generation input and required Idempotency-Key reject ambiguous requests", () => {
  expect(
    validateVoiceApiInput({
      text: " Xin chào ",
      voice_id: voice,
      language: "vi",
      speed: 1,
    }),
  ).toMatchObject({ text: "Xin chào", voiceId: voice });
  expect(() => validateVoiceApiInput({ text: "", voice_id: voice })).toThrow();
  expect(() =>
    requireIdempotencyKey(new Request("https://example.test")),
  ).toThrow("Idempotency-Key");
  expect(
    requireIdempotencyKey(
      new Request("https://example.test", {
        headers: { "Idempotency-Key": "workflow-01" },
      }),
    ),
  ).toBe("workflow-01");
});

test("Cartesia SSE combines raw PCM and word timestamps from the same generation", () => {
  const payload = [
    `event: chunk\ndata: ${JSON.stringify({ type: "chunk", data: Buffer.from([0, 0, 1, 0]).toString("base64") })}`,
    `event: timestamps\ndata: ${JSON.stringify({ type: "timestamps", word_timestamps: { words: ["Xin", "chào"], start: [0, 0.2], end: [0.18, 0.5] } })}`,
    "data: [DONE]",
  ].join("\n\n");
  const result = parseCartesiaSse(payload);
  expect([...result.pcm]).toEqual([0, 0, 1, 0]);
  expect(result.timestamps).toEqual({
    words: ["Xin", "chào"],
    start: [0, 0.2],
    end: [0.18, 0.5],
  });
});

test("Cartesia TTS request requires word timestamps from the same SSE generation", () => {
  const payload = cartesiaTtsPayload(
    { text: "Xin chào", voiceId: voice, language: "vi", speed: 1 },
    voice,
    "job-01",
  );
  expect(payload).toMatchObject({
    model_id: "sonic-3.6",
    voice: { mode: "id", id: voice },
    add_timestamps: true,
    use_normalized_timestamps: true,
    context_id: "job-01",
  });
});

test("Cartesia timestamp payload rejects missing or misaligned words", () => {
  expect(() =>
    parseCartesiaSse(
      `data: ${JSON.stringify({ type: "timestamps", word_timestamps: { words: ["Xin"], start: [0], end: [] } })}\n\n`,
    ),
  ).toThrow("timestamp");
});

test("Cartesia timestamp payload keeps zero-length provider ticks as a short word", () => {
  const result = parseCartesiaSse(
    `data: ${JSON.stringify({ type: "timestamps", word_timestamps: { words: ["thì"], start: [4.92], end: [4.92] } })}\n\n`,
  );
  expect(result.timestamps.words).toEqual(["thì"]);
  expect(result.timestamps.start).toEqual([4.92]);
  expect(result.timestamps.end[0]).toBeCloseTo(4.94, 8);
});

test("raw 16-bit mono PCM is encoded as a non-empty MP3", () => {
  const samples = 4410;
  const pcm = Buffer.alloc(samples * 2);
  for (let index = 0; index < samples; index++)
    pcm.writeInt16LE(Math.round(Math.sin(index / 15) * 12000), index * 2);
  const mp3 = pcm16ToMp3(pcm);
  expect(mp3.byteLength).toBeGreaterThan(500);
  expect(
    mp3.subarray(0, 2).equals(Buffer.from([0xff, 0xfb])) ||
      mp3.subarray(0, 3).toString() === "ID3",
  ).toBe(true);
});

test("unified SePay parser separates kit, voice, and legacy namespaces", () => {
  expect(parseSepayPaymentCode("Thanh toan WINDI KAB12CD34")).toEqual({
    kind: "kit",
    code: "WINDI KAB12CD34",
  });
  expect(parseSepayPaymentCode("WINDI VAB12CD34")).toEqual({
    kind: "voice",
    code: "WINDI VAB12CD34",
  });
  expect(parseSepayPaymentCode("WINDI AB12CD34")).toEqual({
    kind: "voice",
    code: "WINDI AB12CD34",
  });
  expect(parseSepayPaymentCode("WINDI KAB12CD34 WINDI VAB12CD34")).toBeNull();
});
