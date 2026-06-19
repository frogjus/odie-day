# Odie Day 🎨

A tiny, playful web app: type **"What did you do today?"** and get back a short,
hand-drawn **Odie**-style animated clip of your day, narrated in Odie's voice — all
on a crinkled notebook page, with a little wait-game to play while it renders.

> Built as an internal prototype. The whole thing is key-based HTTP APIs, so it
> deploys as a normal web app.

## How it works

```
your day
  → Claude            writes a short first-person "Odie" line + a scene
  → Nano Banana Pro   (Gemini) draws Odie acting it out on notebook paper
  → Vidu Q3 Pro       animates that keyframe into a short clip (image-to-video)
  → ElevenLabs        narrates the line in Odie's voice
  → ffmpeg            muxes the voice onto the clip → mp4
```

Generation runs as an async job; the page polls and shows a paper progress pill,
a live timer, and a Chrome-dino-style **Odie runner** mini-game while you wait.

## Stack

- **Backend:** Node 18+ / Express, `@anthropic-ai/sdk`, `ffmpeg-static`
- **Frontend:** vanilla HTML/CSS/JS (notebook-paper UI, canvas mini-game)
- **AI:** Anthropic Claude · Google Gemini (Nano Banana Pro keyframe) · Vidu Q3 Pro (image-to-video) · ElevenLabs TTS
- **Tests:** built-in `node:test` (run with `npm test`)

## Run it

```bash
npm install
cp .env.example .env      # then fill in your keys
npm start                 # http://localhost:3000
```

### Required environment (`.env`, gitignored)

| Var | What |
|-----|------|
| `ANTHROPIC_API_KEY` | Claude — the scriptwriter step |
| `GEMINI_API_KEY` | Google Gemini — Nano Banana Pro (keyframe) |
| `VIDU_API_KEY` | Vidu — Q3 Pro image-to-video (animation) |
| `PUBLIC_BASE_URL` | app's public URL (Vidu fetches the keyframe by URL); Render auto-provides `RENDER_EXTERNAL_URL` |
| `ELEVENLABS_API_KEY` | ElevenLabs — Odie voice TTS |
| `ODIE_VOICE_ID` | ElevenLabs voice id used for narration |
| `PORT` / `DAILY_CLIP_CAP` | optional (defaults 3000 / 50) |

The Gemini key needs a billed/paid project (Nano Banana Pro isn't free-tier). Vidu is pay-per-second.

## Deploy (always-on)

The repo ships a `render.yaml` blueprint:

1. Push to GitHub (done).
2. On [Render](https://render.com): **New → Blueprint** → pick this repo (it reads `render.yaml`).
3. Add the secret env vars in the dashboard: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`,
   `VIDU_API_KEY`, `ELEVENLABS_API_KEY`, `ODIE_VOICE_ID`. (`PORT` and `RENDER_EXTERNAL_URL` are injected automatically.)
4. Deploy → you get a permanent `https://odie-day.onrender.com`-style URL.

Railway works the same way (New → Deploy from repo → add the env vars; it runs `npm start`).

For a quick temporary public link without deploying, run the app locally and tunnel it:
`cloudflared tunnel --url http://localhost:3000`.

## Project layout

```
backend/    config · scriptwriter (Claude) · gemini (image+video) · voice · mux · jobs · server
frontend/   index.html · styles.css · app.js · game.js  (notebook UI + wait-game)
assets/     notebook bg, Odie reference art, paper UI cutouts, game sprites, decorations
docs/       design spec, implementation plan, style notes
```

## Notes

- The **Odie** character and artwork are © their owner and included here only to run
  the prototype — not licensed for reuse.
- Many UI/paper/game elements were generated and background-cut with image models, then
  hand-placed.
