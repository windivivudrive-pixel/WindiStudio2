import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { setTimeout as delay } from "node:timers/promises";
import {
  captureFlowSessionHeaders,
  flowProjectId,
  isFlowGenerationUrl,
  parseFlowImages,
} from "../extension/flow-adapter.js";
// @ts-ignore Archived compatibility adapter is never bundled in production.
import {flowDownloadExisting,flowSelectExisting} from '../extension/flow-legacy-ui.js';

test("immediate native host failure is captured and next reconnect opens a new port", async () => {
  const source = (
    await readFile(
      new URL("../extension/background.js", import.meta.url),
      "utf8",
    )
  ).replace(
    "import {PROVIDER,HOST} from './provider.js';",
    "const PROVIDER='flow',HOST='com.windistudio.connect.flow';",
  );
  const data: Record<string, any> = { installation: "test-installation" };
  let attempts = 0,
    unhandled = false;
  const event = () => ({ addListener(_fn: unknown) {} });
  const runtime: any = {
    onMessage: event(),
    lastError: null,
    connectNative() {
      attempts++;
      let disconnected: (() => void) | undefined;
      queueMicrotask(() => {
        runtime.lastError = {
          message: "Specified native messaging host not found.",
        };
        if (disconnected) disconnected();
        else unhandled = true;
        runtime.lastError = null;
      });
      return {
        onDisconnect: {
          addListener(fn: () => void) {
            disconnected = fn;
          },
        },
        onMessage: event(),
        postMessage() {},
        disconnect() {},
      };
    },
  };
  const context = vm.createContext({
    URL,
    crypto,
    console,
    chrome: {
      runtime,
      storage: {
        local: {
          async get() {
            await delay(2);
            return { ...data };
          },
          async set(patch: object) {
            await delay(2);
            Object.assign(data, patch);
          },
        },
      },
      debugger: { onDetach: event() },
      downloads: { onCreated: event(), onChanged: event() },
      alarms: { create() {}, onAlarm: event() },
    },
  });
  vm.runInContext(source, context);
  await delay(60);
  assert.equal(unhandled, false);
  assert.equal(data.status.connected, false);
  assert.match(data.status.error, /host not found/);
  await vm.runInContext("connect()", context);
  await delay(30);
  assert.equal(attempts, 2);
});

test("combined extension keeps provider state separated", async () => {
  const source = await readFile(
    new URL("../extension/combined-background.js", import.meta.url),
    "utf8",
  );
  assert.match(source, /combinedStatus/);
  assert.match(source, /com\.windistudio\.connect\.flow/);
  assert.match(source, /com\.windistudio\.connect\.chatgpt/);
  assert.match(source, /managedTabs\.set\(tab\.id,provider\)/);
  assert.match(source, /waitForProviderTab\(provider,created\.id\)/);
  assert.match(source, /tab\.status==='complete'/);
  assert.match(source, /document\.body\?\.innerText/);
  assert.match(source, /allowed\(provider,tab\.url\|\|''\)/);
  assert.match(source, /Input\.dispatchMouseEvent/);
  assert.doesNotMatch(source, /el\.click\(\)/);
  assert.match(source, /flowDirectGenerate/);
  assert.match(source, /flowRefreshSession/);
  assert.doesNotMatch(source, /op==='flowUiSubmit'/);
  assert.doesNotMatch(source, /op==='flowDownloadExisting'/);
  assert.match(source, /chatgptSaveOriginal/);
  assert.match(source, /chatgpt-image-save/);
  assert.match(source, /item\.provider!==provider\|\|item\.jobId!==jobId/);
  assert.match(source, /CHATGPT_SAVE_NOT_FOUND/);
  assert.match(source, /Network\.getResponseBody/);
  assert.match(source, /patchStatus\(provider,\{tabId:null\}\)/);
  assert.doesNotMatch(source, /cookie/i);
});

test("Flow adapter only recognizes exact workspaces and extracts original response URLs", () => {
  assert.equal(
    flowProjectId("https://flow.google.com/project/65761a43-b56d-41a6-aa44-b4861eac2c95"),
    "65761a43-b56d-41a6-aa44-b4861eac2c95",
  );
  assert.equal(flowProjectId("https://flow.google.com/project/not-a-project"), null);
  assert.equal(
    isFlowGenerationUrl(
      "https://aisandbox-pa.googleapis.com/v1/projects/65761a43-b56d-41a6-aa44-b4861eac2c95/flowMedia:batchGenerateImages?key=public",
    ),
    true,
  );
  assert.equal(
    isFlowGenerationUrl("https://aisandbox-pa.googleapis.com/v1/credits"),
    false,
  );
  assert.deepEqual(
    parseFlowImages({
      media: [
        { image: { generatedImage: { fifeUrl: "https://storage.googleapis.com/original-one" } } },
        { image: { generatedImage: { imageUri: "https://flow-content.google/original-two" } } },
      ],
    }),
    [
      "https://storage.googleapis.com/original-one",
      "https://flow-content.google/original-two",
    ],
  );
});

test("Flow session capture accepts a Bearer token only on approved Flow origins", async () => {
  const prior = (globalThis as any).chrome;
  const writes: any[] = [];
  (globalThis as any).chrome = {storage:{local:{set:async(value:any)=>writes.push(value)}}};
  try {
    assert.equal(captureFlowSessionHeaders("https://evil.example/?key=nope", {Authorization:"Bearer ya29.test-token-with-enough-length"}), false);
    assert.equal(captureFlowSessionHeaders("https://aisandbox-pa.googleapis.com/v1/test?key=public", {Authorization:"Bearer ya29.test-token-with-enough-length"}), true);
    await delay(0);
    assert.equal(writes.length,1);
  } finally {
    if (prior === undefined) delete (globalThis as any).chrome;
    else (globalThis as any).chrome = prior;
  }
});

test("Flow existing-result recovery selects the media matched to the exact prompt", async () => {
  const source = await readFile(new URL("../extension/flow-legacy-ui.js", import.meta.url), "utf8");
  assert.match(source, /ingredient\|nguyên liệu/);
  const calls: any[] = [];
  const result = await flowSelectExisting({
    tabId: 42,
    prompt: "  exact scene prompt  ",
    evaluate: async (provider: string, tabId: number, _fn: unknown, prompt: string) => {
      calls.push({ provider, tabId, prompt });
      return { x: 120, y: 240, promptMatched: true };
    },
    cdp: async (_provider: string, tabId: number, method: string, params: any) => {
      calls.push({ tabId, method, params });
      return {};
    },
  } as any);
  assert.deepEqual(result, { selected: true });
  assert.equal(calls[0].prompt, "exact scene prompt");
  assert.equal(calls[1].params.type, "mouseMoved");
  assert.equal(calls[2].params.type, "mousePressed");
  assert.equal(calls[3].params.type, "mouseReleased");
});

test("Flow existing-result download uses the tile menu before 1K Original", async () => {
  const points = [
    { x: 10, y: 20, promptMatched: true },
    { x: 30, y: 40 },
    { x: 50, y: 60 },
    { x: 70, y: 80 },
  ];
  const clicks: any[] = [];
  const result = await flowDownloadExisting({
    tabId: 9,
    prompt: "exact result prompt",
    evaluate: async () => points.shift() || null,
    cdp: async (_provider: string, _tabId: number, method: string, params: any) => {
      if (method === "Input.dispatchMouseEvent") clicks.push(params);
      return {};
    },
  } as any);
  assert.deepEqual(result, { started: true });
  assert.equal(clicks.length, 12);
  assert.deepEqual(
    clicks.filter((item) => item.type === "mousePressed").map((item) => [item.x, item.y]),
    [[10, 20], [30, 40], [50, 60], [70, 80]],
  );
});
