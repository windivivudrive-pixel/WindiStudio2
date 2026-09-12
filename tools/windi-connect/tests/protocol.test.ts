import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowedUrl,
  parseLines,
  userActionErrors,
  validProvider,
} from "../src/protocol.ts";
test("provider boundaries reject lookalike, insecure and unrelated origins", () => {
  assert.equal(allowedUrl("flow", "https://flow.google.com/project/123"), true);
  assert.equal(
    allowedUrl("flow", "https://labs.google/fx/tools/flow/project/123"),
    true,
  );
  for (const url of [
    "https://flow.google.com.attacker.test/",
    "http://flow.google.com/",
    "https://labs.google/other",
    "https://chatgpt.com/",
  ])
    assert.equal(allowedUrl("flow", url), false);
  assert.equal(allowedUrl("chatgpt", "https://chatgpt.com/c/123"), true);
  assert.throws(() => validProvider("auto"));
});
test("framing handles split and coalesced messages and rejects oversized input", () => {
  const messages: any[] = [];
  const parse = parseLines((message) => messages.push(message), 100);
  parse('{"a":');
  parse('1}\n{"a":2}\n');
  assert.deepEqual(messages, [{ a: 1 }, { a: 2 }]);
  assert.throws(() => parse("a".repeat(101)), /TOO_LARGE/);
});
test("Vietnamese prompts survive split UTF-8 socket packets", () => {
  const messages: any[] = [];
  const parse = parseLines((message) => messages.push(message));
  const bytes = Buffer.from(
    JSON.stringify({ prompt: "Giọng nói và ảnh tham chiếu" }) + "\n",
  );
  for (const byte of bytes) parse(Buffer.from([byte]));
  assert.equal(messages[0].prompt, "Giọng nói và ảnh tham chiếu");
});
test("an unowned provider tab pauses for user action instead of failing the job", () => {
  assert.equal(userActionErrors.has("TAB_NOT_OWNED_OR_WRONG_PROVIDER"), true);
});
