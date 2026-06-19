import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyframe, animate } from "./higgsfield.js";

function mockFetchSequence(steps) {
  let i = 0;
  return async () => { const s = steps[Math.min(i++, steps.length - 1)]; return s; };
}
const ok = (body) => ({ ok: true, json: async () => body });

test("generateKeyframe submits then polls to completed image url", async () => {
  const fetchImpl = mockFetchSequence([
    ok({ status: "queued", request_id: "r1" }),
    ok({ status: "in_progress" }),
    ok({ status: "completed", images: [{ url: "https://img/x.jpg" }] }),
  ]);
  const url = await generateKeyframe("a girl spilling juice",
    { key: "k", secret: "s", fetchImpl, sleep: async () => {} });
  assert.equal(url, "https://img/x.jpg");
});

test("animate returns video url", async () => {
  const fetchImpl = mockFetchSequence([
    ok({ status: "queued", request_id: "r2" }),
    ok({ status: "completed", video: { url: "https://vid/y.mp4" } }),
  ]);
  const url = await animate("https://img/x.jpg",
    { key: "k", secret: "s", fetchImpl, sleep: async () => {} });
  assert.equal(url, "https://vid/y.mp4");
});

test("throws on failed/nsfw status", async () => {
  const fetchImpl = mockFetchSequence([
    ok({ status: "queued", request_id: "r3" }),
    ok({ status: "nsfw" }),
  ]);
  await assert.rejects(() => generateKeyframe("x",
    { key: "k", secret: "s", fetchImpl, sleep: async () => {} }), /nsfw/);
});
