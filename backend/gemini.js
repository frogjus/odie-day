// Odie Day generation via Google's Gemini API (source of "Nano Banana"):
//   keyframe = Nano Banana Pro (gemini-3-pro-image), animation = Veo 3.1.
// Proven 2026-06-19 to hold the Odie crayon-doodle style end-to-end. See docs/style-notes.md.
import fs from "node:fs";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const IMAGE_MODEL = "gemini-3-pro-image";              // Nano Banana Pro
const VIDEO_MODEL = "veo-3.1-generate-preview";        // Veo 3.1 (premium, non-fast) — cleaner frames

// Locked style prompt. Tuned to match the actual Odie IP — a clean, finished cartoon
// (even confident inking, flat cel coloring), NOT a scribbly/crayon doodle.
export const STYLE_PREFIX =
  "Draw in the EXACT art style and character design of the reference images — a clean, finished " +
  "children's CARTOON (like a modern 2D animated show): confident, even black ink outlines, simple " +
  "flat cel coloring, tidy and on-model. Do NOT make it scribbly, crayon, sketchy, wobbly or a rough " +
  "naive doodle. Character: \"Odie\", a young girl with a dark bob and straight bangs, round glasses, " +
  "and a simple friendly cartoon face — match the reference character exactly. NOT photorealistic, " +
  "NOT 3D. Place her on the crinkled white lined NOTEBOOK PAPER (blue ruled lines, red margin) as a " +
  "clean cartoon drawn on the page, Odie centered with room around her. Scene: ";

// Locked motion prompt for Veo. Framed as animating a flat 2D cartoon DRAWING (not a
// real person) — this keeps the doodle style AND avoids Veo's people/child RAI filter.
export const MOTION_PROMPT =
  "A simple flat 2D hand-drawn CARTOON crayon doodle gently animates: the little drawn figure bounces " +
  "and sways with a playful wobble while tiny hand-drawn splashes, raindrops and scribbled details " +
  "wiggle. It stays a flat 2D crayon illustration on lined notebook paper, exactly as in the source " +
  "image — a child's sketch coming to life. No 3D, no photographic realism, no style change. Camera stays still.";

// Nano Banana Pro keyframe. Returns image bytes (Buffer). refImagePaths are local PNGs
// (Odie character + art-style + notebook bg) inlined as references.
export async function generateKeyframe(scenePrompt, { apiKey, refImagePaths = [], fetchImpl = fetch } = {}) {
  const parts = [{ text: STYLE_PREFIX + scenePrompt }];
  for (const p of refImagePaths) {
    parts.push({ inline_data: { mime_type: "image/png", data: fs.readFileSync(p).toString("base64") } });
  }
  const body = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } },
  };
  const res = await fetchImpl(`${BASE}/models/${IMAGE_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini image failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const out = data.candidates?.[0]?.content?.parts || [];
  const img = out.find((p) => p.inlineData || p.inline_data);
  if (!img) throw new Error(`No image in Gemini response: ${JSON.stringify(data).slice(0, 300)}`);
  const d = img.inlineData || img.inline_data;
  return Buffer.from(d.data, "base64");
}

// Veo image-to-video. imageBuffer = keyframe bytes; action describes the motion.
// Returns video bytes (Buffer). Veo is long-running: submit -> poll operation -> download.
export async function animate(imageBuffer, { apiKey, fetchImpl = fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)), intervalMs = 10000, maxTries = 60 } = {}) {
  const body = {
    instances: [{ prompt: MOTION_PROMPT, image: { bytesBase64Encoded: imageBuffer.toString("base64"), mimeType: "image/jpeg" } }],
    parameters: { aspectRatio: "16:9" },
  };
  const sub = await fetchImpl(`${BASE}/models/${VIDEO_MODEL}:predictLongRunning`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!sub.ok) throw new Error(`Veo submit failed: ${sub.status} ${await sub.text()}`);
  const op = await sub.json();
  if (!op.name) throw new Error(`No Veo operation name: ${JSON.stringify(op).slice(0, 200)}`);

  for (let i = 0; i < maxTries; i++) {
    const r = await fetchImpl(`${BASE}/${op.name}`, { headers: { "x-goog-api-key": apiKey } });
    if (!r.ok) throw new Error(`Veo poll failed: ${r.status}`);
    const o = await r.json();
    if (o.done) {
      if (o.error) throw new Error(`Veo failed: ${JSON.stringify(o.error)}`);
      const uri = o.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new Error(`No Veo video uri: ${JSON.stringify(o.response).slice(0, 300)}`);
      // Download requires header auth (the ?key= query 302s on the file endpoint).
      const dl = await fetchImpl(uri, { headers: { "x-goog-api-key": apiKey } });
      if (!dl.ok) throw new Error(`Veo download failed: ${dl.status}`);
      return Buffer.from(await dl.arrayBuffer());
    }
    await sleep(intervalMs);
  }
  throw new Error("Veo generation timed out");
}
