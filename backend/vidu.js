// Animation step via Vidu Q3 Pro image-to-video.
// Vidu fetches the start image by URL, so we write the keyframe into the public
// /clips dir and hand Vidu its public URL. Returns the finished video bytes.
import fs from "node:fs";
import path from "node:path";

const BASE = "https://api.vidu.com";
const MODEL = "viduq3-pro";

export const MOTION_PROMPT =
  "The clean 2D cartoon gently comes to life with subtle, natural motion and small shifting " +
  "details. Keep the exact clean cartoon style and the lined notebook paper from the image. " +
  "No style change, no 3D, no morphing, camera stays still.";

export async function animate(imageBuffer, {
  apiKey, publicBaseUrl, clipsDir, id,
  fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  intervalMs = 8000, maxTries = 90,
} = {}) {
  if (!publicBaseUrl) {
    throw new Error("PUBLIC_BASE_URL is required — Vidu fetches the keyframe by URL (set it to the app's public URL)");
  }
  // host the keyframe at a public /clips URL for Vidu to fetch
  fs.mkdirSync(clipsDir, { recursive: true });
  const keyName = `${id}-key.jpg`;
  fs.writeFileSync(path.join(clipsDir, keyName), imageBuffer);
  const imageUrl = `${publicBaseUrl.replace(/\/$/, "")}/clips/${keyName}`;

  const sub = await fetchImpl(`${BASE}/ent/v2/img2video`, {
    method: "POST",
    headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, images: [imageUrl], prompt: MOTION_PROMPT, duration: 5, resolution: "720p" }),
  });
  if (!sub.ok) throw new Error(`Vidu submit failed: ${sub.status} ${await sub.text()}`);
  const { task_id: taskId } = await sub.json();
  if (!taskId) throw new Error("Vidu: no task_id in submit response");

  for (let i = 0; i < maxTries; i++) {
    const r = await fetchImpl(`${BASE}/ent/v2/tasks/${taskId}/creations`, { headers: { Authorization: `Token ${apiKey}` } });
    if (!r.ok) throw new Error(`Vidu poll failed: ${r.status}`);
    const o = await r.json();
    if (o.state === "success") {
      const url = o.creations?.[0]?.url;
      if (!url) throw new Error(`Vidu: no creation url: ${JSON.stringify(o).slice(0, 200)}`);
      const dl = await fetchImpl(url);
      if (!dl.ok) throw new Error(`Vidu video download failed: ${dl.status}`);
      return Buffer.from(await dl.arrayBuffer());
    }
    if (o.state === "failed") throw new Error(`Vidu generation failed: ${o.err_msg || o.err_code || "unknown"}`);
    await sleep(intervalMs);
  }
  throw new Error("Vidu generation timed out");
}
