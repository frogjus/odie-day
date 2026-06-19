const BASE = "https://platform.higgsfield.ai";
// NOTE (Task 9 proof): the MCP proof used Nano Banana Pro (image) + Kling 3.0 Turbo
// (video), which nail the doodle style — soul/standard + dop/standard look realistic
// and are WRONG. Task 10 must map these to the REST catalog model_ids, pass the Odie
// reference images, and re-smoke. See docs/style-notes.md.
const IMAGE_MODEL = "higgsfield-ai/soul/standard"; // TODO Task 10: -> Nano Banana Pro REST id + reference images
const VIDEO_MODEL = "higgsfield-ai/dop/standard";  // TODO Task 10: -> Kling 3.0 Turbo REST id

// Locked crayon-doodle style prompt (proven via Task 9). Prepended to {SCENE}.
export const STYLE_PREFIX =
  "Keep the EXACT art style and character design of the reference images: a young child's " +
  "naive crayon-and-marker DOODLE of \"Odie\", a little girl with a dark bob and straight bangs, " +
  "simple tiny dot eyes, a small simple nose, wobbly uneven hand-drawn black marker outlines, flat " +
  "soft crayon coloring that scribbles slightly outside the lines. It must look hand-drawn by a kid " +
  "— NOT realistic, NOT polished, NOT 3D, NOT a cartoon render. Draw her directly on the crinkled " +
  "white lined NOTEBOOK PAPER (blue horizontal ruled lines and a red vertical margin line), as if a " +
  "child sketched her in their notebook, Odie roughly centered with lots of paper around her. Scene: ";

function authHeader(key, secret) { return `Key ${key}:${secret}`; }

export async function submit(modelId, body, { key, secret, fetchImpl = fetch }) {
  const res = await fetchImpl(`${BASE}/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(key, secret),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Higgsfield submit ${modelId} failed: ${res.status}`);
  const data = await res.json();
  if (!data.request_id) throw new Error(`No request_id in submit response: ${JSON.stringify(data)}`);
  return data.request_id;
}

export async function pollUntilDone(requestId, { key, secret, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), intervalMs = 4000, maxTries = 90 }) {
  for (let i = 0; i < maxTries; i++) {
    const res = await fetchImpl(`${BASE}/requests/${requestId}/status`, {
      headers: { Authorization: authHeader(key, secret), Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Higgsfield status failed: ${res.status}`);
    const data = await res.json();
    if (data.status === "completed") return data;
    if (["failed", "nsfw"].includes(data.status)) throw new Error(`Higgsfield generation ${data.status}`);
    await sleep(intervalMs);
  }
  throw new Error("Higgsfield generation timed out");
}

export async function generateKeyframe(scenePrompt, opts) {
  const body = {
    prompt: STYLE_PREFIX + scenePrompt,
    aspect_ratio: "16:9",
    resolution: "720p",
  };
  if (opts.refImageUrls?.length) body.image_urls = opts.refImageUrls; // verified/tuned in Task 9
  const id = await submit(IMAGE_MODEL, body, opts);
  const done = await pollUntilDone(id, opts);
  const url = done.images?.[0]?.url;
  if (!url) throw new Error(`No image url in result: ${JSON.stringify(done)}`);
  return url;
}

export async function animate(imageUrl, opts) {
  const body = {
    image_url: imageUrl,
    prompt: "gentle playful motion, the little girl moves and blinks softly, subtle hand-drawn wobble, camera still",
    duration: 5,
  };
  const id = await submit(VIDEO_MODEL, body, opts);
  const done = await pollUntilDone(id, opts);
  const url = done.video?.url;
  if (!url) throw new Error(`No video url in result: ${JSON.stringify(done)}`);
  return url;
}
