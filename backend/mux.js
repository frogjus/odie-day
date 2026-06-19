import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const pexec = promisify(execFile);

// Combine a video (bytes) with the Odie voice mp3 (bytes) into one mp4 at outPath.
// Video stream is copied; our mp3 becomes the audio (Veo's own audio is dropped).
// No -shortest: the full clip plays even if the narration is shorter.
export async function muxClip(videoBuffer, mp3Buffer, outPath) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "odie-"));
  const vPath = path.join(tmp, "v.mp4");
  const aPath = path.join(tmp, "a.mp3");
  fs.writeFileSync(vPath, videoBuffer);
  fs.writeFileSync(aPath, mp3Buffer);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  try {
    await pexec(ffmpegPath, [
      "-y", "-i", vPath, "-i", aPath,
      "-map", "0:v:0", "-map", "1:a:0",
      "-c:v", "copy", "-c:a", "aac", outPath,
    ]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return outPath;
}
