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
  → Veo 3.1           (Gemini) animates that keyframe into a ~clip
  → ElevenLabs        narrates the line in Odie's voice
  → ffmpeg            muxes the voice onto the clip → mp4
```

Generation runs as an async job; the page polls and shows a paper progress pill,
a live timer, and a Chrome-dino-style **Odie runner** mini-game while you wait.

## Stack

- **Backend:** Node 18+ / Express, `@anthropic-ai/sdk`, `ffmpeg-static`
- **Frontend:** vanilla HTML/CSS/JS (notebook-paper UI, canvas mini-game)
- **AI:** Anthropic Claude · Google Gemini (Nano Banana Pro image + Veo 3.1 video) · ElevenLabs TTS
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
| `GEMINI_API_KEY` | Google Gemini — Nano Banana Pro (image) + Veo (video) |
| `ELEVENLABS_API_KEY` | ElevenLabs — Odie voice TTS |
| `ODIE_VOICE_ID` | ElevenLabs voice id used for narration |
| `PORT` / `DAILY_CLIP_CAP` | optional (defaults 3000 / 50) |

The Gemini key needs a billed/paid project (Nano Banana Pro + Veo aren't free-tier).

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
