import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { animate } from "./vidu.js";

const ok = (body) => ({ ok: true, json: async () => body });

test("animate hosts the keyframe, submits Vidu Q3 Pro, polls, returns video bytes", async () => {
  const clipsDir = fs.mkdtempSync(path.join(os.tmpdir(), "vclips-"));
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push(url);
    if (url.endsWith("/ent/v2/img2video")) {
      const body = JSON.parse(opts.body);
      assert.equal(body.model, "viduq3-pro");
      assert.match(body.images[0], /^http:\/\/pub\/clips\/JOB-key\.jpg$/);
      return ok({ task_id: "T1" });
    }
    if (url.includes("/tasks/T1/creations")) return ok({ state: "success", creations: [{ url: "https://v/out.mp4" }] });
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode("mp4").buffer };
  };
  const buf = await animate(Buffer.from("KEYFRAME"), {
    apiKey: "K", publicBaseUrl: "http://pub", clipsDir, id: "JOB", fetchImpl, sleep: async () => {},
  });
  assert.ok(Buffer.isBuffer(buf) && buf.toString() === "mp4");
  assert.ok(fs.existsSync(path.join(clipsDir, "JOB-key.jpg")));   // keyframe was hosted
  fs.rmSync(clipsDir, { recursive: true, force: true });
});

test("animate throws without a public base url", async () => {
  await assert.rejects(
    () => animate(Buffer.from("x"), { apiKey: "K", clipsDir: os.tmpdir(), id: "J", fetchImpl: async () => ok({}) }),
    /PUBLIC_BASE_URL/,
  );
});

test("animate throws when Vidu reports failed", async () => {
  const clipsDir = fs.mkdtempSync(path.join(os.tmpdir(), "vclips-"));
  const fetchImpl = async (url) => {
    if (url.endsWith("/ent/v2/img2video")) return ok({ task_id: "T2" });
    return ok({ state: "failed", err_msg: "boom" });
  };
  await assert.rejects(
    () => animate(Buffer.from("x"), { apiKey: "K", publicBaseUrl: "http://pub", clipsDir, id: "J", fetchImpl, sleep: async () => {} }),
    /boom/,
  );
  fs.rmSync(clipsDir, { recursive: true, force: true });
});
