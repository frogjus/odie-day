import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { muxClip } from "./mux.js";

const pexec = promisify(execFile);

test("muxClip overlays audio onto video and writes an mp4", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mux-"));
  const srcVideo = path.join(dir, "v.mp4");
  // 1s silent test video
  await pexec(ffmpegPath, ["-f", "lavfi", "-i", "color=c=white:s=320x180:d=1", "-pix_fmt", "yuv420p", srcVideo]);
  const videoBytes = fs.readFileSync(srcVideo);
  // 1s test mp3
  const srcAudio = path.join(dir, "a.mp3");
  await pexec(ffmpegPath, ["-f", "lavfi", "-i", "sine=frequency=440:duration=1", srcAudio]);
  const mp3 = fs.readFileSync(srcAudio);

  const fetchImpl = async () => ({ ok: true, arrayBuffer: async () => videoBytes.buffer.slice(videoBytes.byteOffset, videoBytes.byteOffset + videoBytes.byteLength) });
  const out = path.join(dir, "final.mp4");
  const res = await muxClip("https://x/v.mp4", mp3, out, { fetchImpl });
  assert.equal(res, out);
  assert.ok(fs.statSync(out).size > 0);
});
