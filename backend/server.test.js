import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./server.js";

function fakeStore() {
  return {
    _last: null,
    start(day) { if (day === "CAP") throw new Error("daily cap reached"); this._last = "job1"; return "job1"; },
    get(id) { return id === "job1" ? { id, status: "done", mp4Url: "/clips/job1.mp4", line: "hi" } : null; },
  };
}

async function call(app, method, path, body) {
  const { createServer } = await import("node:http");
  const server = createServer(app);
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method, headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  server.close();
  return { status: res.status, json };
}

test("POST /generate returns 202 + jobId", async () => {
  const app = createApp({ config: {}, store: fakeStore() });
  const r = await call(app, "POST", "/generate", { day: "rode my bike" });
  assert.equal(r.status, 202);
  assert.equal(r.json.jobId, "job1");
});

test("POST /generate 400 on empty day", async () => {
  const app = createApp({ config: {}, store: fakeStore() });
  const r = await call(app, "POST", "/generate", { day: "" });
  assert.equal(r.status, 400);
});

test("POST /generate 429 when capped", async () => {
  const app = createApp({ config: {}, store: fakeStore() });
  const r = await call(app, "POST", "/generate", { day: "CAP" });
  assert.equal(r.status, 429);
});

test("GET /jobs/:id returns status", async () => {
  const app = createApp({ config: {}, store: fakeStore() });
  const r = await call(app, "GET", "/jobs/job1");
  assert.equal(r.status, 200);
  assert.equal(r.json.status, "done");
});
