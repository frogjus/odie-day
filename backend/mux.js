import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const pexec = promisify(execFile);

export async function muxClip(videoUrl, mp3Buffer, outPath, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(videoUrl);
  if (!res.ok) throw new Error(`Video download failed: ${res.status}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "odie-"));
  const vPath = path.join(tmp, "v.mp4");
  const aPath = path.join(tmp, "a.mp3");
  fs.writeFileSync(vPath, Buffer.from(await res.arrayBuffer()));
  fs.writeFileSync(aPath, mp3Buffer);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  try {
    await pexec(ffmpegPath, [
      "-y", "-i", vPath, "-i", aPath,
      "-map", "0:v:0", "-map", "1:a:0",
      "-c:v", "copy", "-c:a", "aac", "-shortest", outPath,
    ]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return outPath;
}
