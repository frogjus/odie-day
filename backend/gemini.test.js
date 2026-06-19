import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyframe } from "./gemini.js";

const ok = (body) => ({ ok: true, json: async () => body });

test("generateKeyframe posts to Nano Banana Pro and returns image bytes", async () => {
  let calledUrl, calledBody, calledHeaders;
  const pngB64 = Buffer.from("fake-png-bytes").toString("base64");
  const fetchImpl = async (url, opts) => {
    calledUrl = url; calledBody = JSON.parse(opts.body); calledHeaders = opts.headers;
    return ok({ candidates: [{ content: { parts: [{ inlineData: { data: pngB64 } }] } }] });
  };
  const buf = await generateKeyframe("a girl jumping in a puddle", { apiKey: "K", fetchImpl });
  assert.match(calledUrl, /gemini-3-pro-image:generateContent$/);
  assert.equal(calledHeaders["x-goog-api-key"], "K");
  assert.equal(calledBody.generationConfig.imageConfig.aspectRatio, "16:9");
  assert.ok(Buffer.isBuffer(buf));
  assert.equal(buf.toString(), "fake-png-bytes");
});

test("generateKeyframe throws when the response has no image", async () => {
  const fetchImpl = async () => ok({ candidates: [{ content: { parts: [{ text: "nope" }] } }] });
  await assert.rejects(() => generateKeyframe("x", { apiKey: "K", fetchImpl }), /No image/);
});
