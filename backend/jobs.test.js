import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createJobStore } from "./jobs.js";

const deps = {
  writeScript: async () => ({ line: "Today I jumped in puddles!", scenePrompt: "girl jumping in puddles" }),
  generateKeyframe: async () => "https://img/x.jpg",
  animate: async () => "https://vid/y.mp4",
  synthesize: async () => Buffer.from("mp3"),
  muxClip: async (_v, _a, out) => { fs.writeFileSync(out, "MP4"); return out; },
};
const config = { dailyCap: 2, higgsKey: "k", higgsSecret: "s", elevenKey: "e", odieVoiceId: "v", anthropicKey: "a" };

test("runs the pipeline to done with an mp4Url", async () => {
  const clipsDir = fs.mkdtempSync(path.join(os.tmpdir(), "clips-"));
  const store = createJobStore({ config, deps, clipsDir });
  const id = store.start("jumped in puddles");
  await store.waitFor(id); // test helper that resolves when terminal
  const job = store.get(id);
  assert.equal(job.status, "done");
  assert.match(job.mp4Url, /\/clips\/.+\.mp4/);
  assert.equal(job.line, "Today I jumped in puddles!");
});

test("enforces the daily cap", async () => {
  const clipsDir = fs.mkdtempSync(path.join(os.tmpdir(), "clips-"));
  const store = createJobStore({ config: { ...config, dailyCap: 1 }, deps, clipsDir });
  store.start("a");
  assert.throws(() => store.start("b"), /cap/i);
});

test("marks failed when a stage throws", async () => {
  const clipsDir = fs.mkdtempSync(path.join(os.tmpdir(), "clips-"));
  const boom = { ...deps, animate: async () => { throw new Error("boom"); } };
  const store = createJobStore({ config, deps: boom, clipsDir });
  const id = store.start("x");
  await store.waitFor(id);
  assert.equal(store.get(id).status, "failed");
  assert.match(store.get(id).error, /boom/);
});
