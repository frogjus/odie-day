const BASE = "https://platform.higgsfield.ai";
const IMAGE_MODEL = "higgsfield-ai/soul/standard";
const VIDEO_MODEL = "higgsfield-ai/dop/standard";

// Locked crayon-doodle style. Finalized/tuned in Task 9.
export const STYLE_PREFIX =
  "Child's naive crayon-and-marker doodle, wobbly hand-drawn black outlines, flat soft crayon fills, " +
  "on crinkled white lined notebook paper with blue horizontal rules and a red vertical margin line. " +
  "Odie, a cheerful little girl with a dark bob and straight bangs, simple dot eyes, drawn in the same childlike style. Scene: ";

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
