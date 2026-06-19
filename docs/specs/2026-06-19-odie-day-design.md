# Odie Day — Design Spec

**Date:** 2026-06-19
**Author:** Sia (with Pantin)
**Status:** Approved design → next: implementation plan

## One-liner

A polished, single-page web app in the *Odie* notebook-doodle world. A user types
"Describe your day?" and gets back a ~5-second 16:9 animated clip of the Odie
character acting out their day on the real ruled-notebook background, narrated in
Odie's voice. Generation is live, powered by Higgsfield + ElevenLabs + Claude.

## Audience & scope

- **Prototype, internal-only** sample shared via a link within Sia's company.
- Live generation per prompt; light gating is acceptable (no hardened public auth).
- Quality bar: **polished** UI and on-model Odie art — it's a showcase, not a toy.

## Locked decisions

| Decision | Choice |
|---|---|
| Output format | 16:9 landscape, ~5s clip |
| Narration language | English |
| Concept | **Odie acts out the user's day** (first-person) |
| Live engine | Higgsfield **REST API** (key provided) |
| Build-time engine | Higgsfield **MCP** (assets + style-lock, on existing credits) |
| Hosting | Persistent Node server (Railway or Render) |
| Project location | New standalone repo `~/odie-day/` |

## Source IP assets (on `~/Desktop/Odie/`)

- `Bakcground/note_BG.png` — crinkled ruled paper, blue lines + red margin. The
  literal page background AND the clip's base frame.
- `Odie Character/Odie/o01–o12.png`, `s01.png` — on-model Odie character poses.
- `Odie Character/Artstyle ref/*` — naive crayon-doodle style references.
- `Font style/odie en espanl_title_V*.png` — bouncy hand-drawn slab-script title
  with white sticker outline + soft drop shadow (the typographic north star).
- ElevenLabs Odie voice id: `GH1wW7mCVF4CcOcdpKya` (cloned, on the provided key).

## Architecture

Static frontend (the notebook page) + a thin **Node/Express backend** that holds
all API keys and orchestrates generation as an async job.

```
[ Notebook page ] --POST /generate { day }--> [ Express backend ]
       |                                            |
       |  <-- { jobId } ----------------------------|
       |  --GET /jobs/:id (poll)-->  pipeline: Claude -> Higgsfield img
       |                                       -> Higgsfield video -> 11Labs -> ffmpeg
       |  <-- { status, mp4Url } -------------------|
[ Plays clip taped to the page ]
```

### Generation pipeline (one async job, ~1–3 min)

1. **Scriptwriter — Claude API.** Raw day text → (a) a short first-person Odie line
   (kid-voice, kept on-tone and kid-friendly), and (b) a visual scene description.
2. **Keyframe — Higgsfield Soul (image).** Generates Odie acting out the scene,
   composited onto the real `note_BG.png` as the start frame. Odie character +
   art-style PNGs passed as `reference_image_urls` (served publicly from `/assets`)
   to hold her on-model.
3. **Animate — Higgsfield image-to-video.** Keyframe → ~5s 16:9 clip, gentle
   doodle-appropriate motion.
4. **Voice + mux — ElevenLabs + ffmpeg.** Odie voice narrates the line; ffmpeg
   muxes audio onto the clip → final mp4 served back to the page.

**Why keyframe-first** (step 2 → 3 instead of one text-to-video call): the naive
crayon-doodle style is the hard part — video models tend to "prettify." Locking the
notebook bg + on-model Odie as a still first is the best shot at fidelity.

### Components (each independently testable)

- `frontend/` — static notebook page; no keys; form + poller + player.
- `backend/scriptwriter.js` — `day → { line, scenePrompt }` via Claude.
- `backend/higgsfield.js` — `scenePrompt → keyframeUrl → videoUrl` (REST; MCP shim
  during build).
- `backend/voice.js` — `line → mp3` via ElevenLabs.
- `backend/mux.js` — `(videoUrl, mp3) → mp4` via ffmpeg.
- `backend/jobs.js` — in-memory job store + pipeline runner + daily cap.
- `backend/server.js` — Express routes: `POST /generate`, `GET /jobs/:id`, `/assets`.

## UI & design direction

The whole UI lives in the "drawn in a school notebook" world:

- **Canvas:** real `note_BG.png` as page background (ruled lines, red margin, crinkle).
- **Title:** "Describe your day?" in a bouncy handwritten display font (close
  Google-font match to the Odie title) with white-outline + drop-shadow sticker
  treatment recreated in CSS.
- **Input:** textbox styled as handwriting sitting *on* the blue rules.
- **Button:** hand-drawn doodle button ("make my Odie clip") — Higgsfield-generated
  asset in Odie's line style.
- **Loader:** Odie-style "she's drawing your day…" doodle loop (Higgsfield/MCP).
- **Result:** finished 16:9 clip shown small — **a little larger than thumbnail
  size** (roughly ~320–400px wide, never full-screen / full-bleed), framed like a
  sketch taped to the notebook page so the paper world stays the hero; click to
  enlarge/replay, plus "make another." (The clip is still rendered at full 16:9
  resolution; it's only *displayed* small.)
- **Decorations:** scattered doodle stickers (stars, scribbles, paper-clip),
  Higgsfield-generated to match Odie's hand.

A frontend design skill is applied at build time so it reads premium, not template-y.

## Risks & mitigations

1. **Style fidelity (primary risk).** Crayon-doodle is hard for video models.
   Mitigation: keyframe-first + reference images + a locked style prompt; validate a
   real sample clip via MCP before declaring done.
2. **Latency (~1–3 min/clip).** Covered by the async job model + drawing loader.
3. **Cost per click.** Internal only; `DAILY_CLIP_CAP` guardrail against runaway loops.
4. **Open user input.** The Claude scriptwriter keeps output kid-friendly and on-tone.
5. **Higgsfield REST specifics** (exact endpoints, Soul params, public ref hosting):
   verified during the build's first end-to-end run.

## Dependencies / setup

- **Keys** (in gitignored `.env`): `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`,
  `ODIE_VOICE_ID`, `HIGGSFIELD_API_KEY`. All provided. **Rotate after sharing** —
  they passed through chat.
- **ffmpeg** on the host (npm `ffmpeg-static` for portability).
- Higgsfield MCP available during build only (not in the deployed runtime).

## Build order

1. Notebook UI + Higgsfield/MCP-generated design assets.
2. Backend pipeline wired to **MCP** for a real end-to-end sample clip (style proof).
3. Swap MCP shim → **Higgsfield REST key**; add daily cap.
4. Deploy to Railway/Render → internal share link.

## Out of scope (YAGNI)

Spanish toggle, accounts/login, persistent gallery/history, public hardening,
multiple characters, clip editing. Revisit only if the sample lands well.
