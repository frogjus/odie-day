// Odie Day keyframe generation via Google's Gemini API ("Nano Banana Pro").
// Animation is handled separately by Vidu Q3 Pro (see backend/vidu.js).
import fs from "node:fs";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const IMAGE_MODEL = "gemini-3-pro-image";              // Nano Banana Pro

// Locked style prompt. Tuned to match the actual Odie IP — a clean, finished cartoon
// (even confident inking, flat cel coloring), NOT a scribbly/crayon doodle.
export const STYLE_PREFIX =
  "Draw in the EXACT art style and character design of the reference images — a clean, finished 2D " +
  "CARTOON like a modern animated show: confident, even black ink outlines, flat cel coloring, polished " +
  "and on-model. Do NOT make it scribbly, crayon, sketchy, wobbly, childish or a naive doodle. " +
  "Character: \"Odie\", a TEENAGE girl (a teenager — slim, with longer/older proportions, NOT a small " +
  "child) with a dark bob, straight bangs, round glasses and a simple expressive cartoon face — match " +
  "the reference character exactly. NOT photorealistic, NOT 3D. Place her on the crinkled white lined " +
  "NOTEBOOK PAPER (blue ruled lines, red margin) as a clean cartoon drawn on the page, Odie centered " +
  "with room around her. Scene: ";

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
