import { test } from "node:test";
import assert from "node:assert/strict";
import { synthesize } from "./voice.js";

test("posts to the voice endpoint and returns mp3 bytes", async () => {
  let calledUrl, calledBody;
  const fetchImpl = async (url, opts) => {
    calledUrl = url; calledBody = JSON.parse(opts.body);
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode("ID3fake").buffer };
  };
  const buf = await synthesize("hello", { apiKey: "k", voiceId: "VID", fetchImpl });
  assert.match(calledUrl, /text-to-speech\/VID/);
  assert.equal(calledBody.text, "hello");
  assert.ok(Buffer.isBuffer(buf) && buf.length > 0);
});

test("throws on non-ok response", async () => {
  const fetchImpl = async () => ({ ok: false, status: 422, text: async () => "bad" });
  await assert.rejects(() => synthesize("x", { apiKey: "k", voiceId: "v", fetchImpl }), /422/);
});
