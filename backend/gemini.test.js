import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyframe, animate } from "./gemini.js";

const ok = (body) => ({ ok: true, json: async () => body });

test("generateKeyframe posts to Nano Banana Pro and returns image bytes", async () => {
  let calledUrl, calledBody;
  const pngB64 = Buffer.from("fake-png-bytes").toString("base64");
  const fetchImpl = async (url, opts) => {
    calledUrl = url; calledBody = JSON.parse(opts.body);
    return ok({ candidates: [{ content: { parts: [{ inlineData: { data: pngB64 } }] } }] });
  };
  const buf = await generateKeyframe("a girl jumping in a puddle", { apiKey: "K", fetchImpl });
  assert.match(calledUrl, /gemini-3-pro-image:generateContent\?key=K/);
  assert.equal(calledBody.generationConfig.imageConfig.aspectRatio, "16:9");
  assert.ok(Buffer.isBuffer(buf));
  assert.equal(buf.toString(), "fake-png-bytes");
});

test("generateKeyframe throws when the response has no image", async () => {
  const fetchImpl = async () => ok({ candidates: [{ content: { parts: [{ text: "nope" }] } }] });
  await assert.rejects(() => generateKeyframe("x", { apiKey: "K", fetchImpl }), /No image/);
});

test("animate submits to Veo, polls the operation, and downloads the video bytes", async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push(url);
    if (url.includes(":predictLongRunning")) return ok({ name: "models/veo/operations/abc" });
    if (url.includes("operations/abc")) return ok({ done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: "https://files/v:download" } }] } } });
    // download
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode("mp4-bytes").buffer };
  };
  const buf = await animate(Buffer.from("keyframe"), { apiKey: "K", fetchImpl, sleep: async () => {} });
  assert.ok(calls[0].includes("veo-3.1-generate-preview:predictLongRunning"));
  assert.ok(Buffer.isBuffer(buf) && buf.toString() === "mp4-bytes");
});

test("animate throws when the operation completes with an error", async () => {
  const fetchImpl = async (url) => {
    if (url.includes(":predictLongRunning")) return ok({ name: "op/x" });
    return ok({ done: true, error: { message: "veo boom" } });
  };
  await assert.rejects(() => animate(Buffer.from("k"), { apiKey: "K", fetchImpl, sleep: async () => {} }), /veo boom/);
});
