# Odie Day — Style Notes (locked from the Task 9 proof)

Date: 2026-06-19. Validated end-to-end with a real sample (`backend/clips/sample.mp4`,
test day "jumped in puddles"). Style fidelity — the project's #1 risk — is solved.

## The proven pipeline (what actually worked)

1. **Keyframe — `nano_banana_pro` (Nano Banana Pro), NOT `soul/standard`.**
   Soul 2.0 pushes Odie toward realistic UGC/portrait — wrong for a child's doodle.
   Nano Banana Pro is image-to-image and faithfully preserved the naive crayon style.
   - Pass **3 reference images** (role `image`): the Odie character PNG, an art-style
     ref, and the real `note_BG.png`. Multiple refs are supported and all help.
   - aspect_ratio `16:9`, resolution `2k`.
   - The prompt must aggressively pin the style and forbid realism. The winning prompt
     is `KEYFRAME_PROMPT` below.

2. **Animate — `kling3_0_turbo`, NOT `dop/standard`.**
   Start frame = the keyframe image job id (role `start_image`), duration 5, 16:9.
   Motion prompt keeps it gentle and forbids 3D/style drift. It held the doodle style
   across all frames (verified mid + end frames). 720p default.
   - Note: the literal generation triggered a spurious preset suggestion ("IN THE DARK")
     — resubmit with `declined_preset_id` to force literal.

3. **Voice — ElevenLabs Odie** (`GH1wW7mCVF4CcOcdpKya`, `eleven_turbo_v2_5`). Verified.

4. **Mux — ffmpeg** `-map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest`.
   ⚠️ `-shortest` clipped the 5.0s video to the 4.4s voice. For production, prefer
   keeping the full video and padding/looping audio, OR drop `-shortest` and let audio
   end early — so the clip is always the full 5s. (Minor mux tuning for Task 10.)

## KEYFRAME_PROMPT (locked)

> Keep the EXACT art style and character design of the reference images: a young
> child's naive crayon-and-marker DOODLE of "Odie", a little girl with a dark bob and
> straight bangs, simple tiny dot eyes, a small simple nose, wobbly uneven hand-drawn
> black marker outlines, flat soft crayon coloring that scribbles slightly outside the
> lines. It must look hand-drawn by a kid — NOT realistic, NOT polished, NOT 3D, NOT a
> cartoon render. Scene: {SCENE}. Draw her directly on the crinkled white lined
> NOTEBOOK PAPER from the reference (blue horizontal ruled lines and a red vertical
> margin line), as if a child sketched her in their notebook. Landscape composition,
> Odie roughly centered, lots of notebook paper around her.

## MOTION_PROMPT (locked)

> The child's crayon doodle gently comes to life: {ACTION}, with a subtle childlike
> wobble. Keep the EXACT flat 2D childlike crayon-doodle style and the lined notebook
> paper exactly as in the image. No 3D, no realism, no style change. Camera stays still.

## ⚠️ Implication for Task 10 (live REST wiring) — IMPORTANT

The proof used the **MCP** model names (`nano_banana_pro`, `kling3_0_turbo`). The REST
client (`backend/higgsfield.js`) currently targets `higgsfield-ai/soul/standard` and
`higgsfield-ai/dop/standard` — which produce a DIFFERENT (worse, realistic) look.

Before live deploy, Task 10 must:
1. Find the **REST model_ids** for Nano Banana Pro (image) and Kling 3.0 Turbo (video)
   in the Higgsfield REST catalog (cloud.higgsfield.ai / the `/{model_id}` path).
2. Update `IMAGE_MODEL` / `VIDEO_MODEL` and the request bodies accordingly, including
   **passing the 3 reference images** (host `assets/odie-ref-*.png` + `note_BG.png` at
   public `/assets` URLs and send them as the image refs) — references are essential to
   the fidelity, not optional.
3. Re-run a real REST smoke to confirm the REST output matches this MCP-proven quality.

Reference media_ids used in the proof (MCP, for reuse this session):
- Odie character: `a73d7f5e-8aaa-42b7-97b1-c8bcaf3b54ae`
- Art-style ref:  `d52147f3-91a2-4210-8c0c-9075925661b5`
- Notebook bg:    `613860e6-786f-4144-96f2-541ff333fa6f`

## REST API findings (live debugging, 2026-06-19)

- **Auth was swapped.** Correct header: `Authorization: Key {API_KEY}:{API_SECRET}` —
  the UUID-form value is the api_key and the long hex value is the secret (not the other
  way round). (No-auth → 401; any `Key …` header with wrong order/secret → 500, which
  masked the real problem.) (Higgsfield is no longer used — superseded by Gemini.)
- **No GET model catalog** on platform.higgsfield.ai (all GETs → 405; POST-only
  `/{model_id}` router). Full catalog lives in the authed Cloud gallery.
- **Valid REST image models found:** `higgsfield-ai/soul/standard` (text2img),
  `higgsfield-ai/soul/reference` (reference-conditioned), `higgsfield-ai/soul/character`
  (trained soul_id), `reve/text-to-image`. Soul path = `higgsfield-ai/soul/{mode}`,
  mode ∈ reference|character|standard.
- **soul/reference REST test** (with `reference_images:[url]` + doodle prompt) → produced
  a doodle, BUT a monochrome PENCIL sketch of a generic kid on a 3D spiral notebook on a
  desk (`samples/rest_soul_ref.png`). Doodle-ish but NOT on-model Odie and not flat
  full-frame paper. Inferior to the MCP Nano Banana Pro result.
- **Open item:** find the REST slug for **Nano Banana Pro** (the MCP winner). Guesses
  google/nano-banana[-pro][/edit], higgsfield-ai/nano-banana → all 404. The exact API
  model_id is in the Cloud gallery (cloud.higgsfield.ai). Kling turbo slug also not found;
  documented working video slug is `kling-video/v2.1/pro/image-to-video`.
