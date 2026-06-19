import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createJobStore } from "./jobs.js";
import { writeScript } from "./scriptwriter.js";
import { generateKeyframe, animate } from "./gemini.js";
import { synthesize } from "./voice.js";
import { muxClip } from "./mux.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

export function createApp({ store }) {
  const app = express();
  app.use(express.json());
  app.post("/generate", (req, res) => {
    const day = (req.body?.day || "").trim();
    if (!day) return res.status(400).json({ error: "Tell me about your day first!" });
    try {
      const jobId = store.start(day);
      res.status(202).json({ jobId });
    } catch (err) {
      if (/cap/i.test(err.message)) return res.status(429).json({ error: "Odie's tired — try again tomorrow!" });
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/jobs/:id", (req, res) => {
    const job = store.get(req.params.id);
    if (!job) return res.status(404).json({ error: "unknown job" });
    res.json(job);
  });
  app.use("/clips", express.static(path.join(ROOT, "backend", "clips")));
  app.use("/assets", express.static(path.join(ROOT, "assets")));
  app.use("/", express.static(path.join(ROOT, "frontend")));
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { config } = await (async () => {
    const { default: dotenv } = await import("dotenv");
    dotenv.config({ path: path.join(ROOT, ".env") });
    return { config: loadConfig() };
  })();
  const clipsDir = path.join(ROOT, "backend", "clips");
  const assetsDir = path.join(ROOT, "assets");
  const refImagePaths = ["odie-ref-1.png", "odie-style-1.png", "note_BG.png"]
    .map((f) => path.join(assetsDir, f));
  const store = createJobStore({
    config,
    clipsDir,
    refImagePaths,
    deps: { writeScript, generateKeyframe, animate, synthesize, muxClip },
  });
  createApp({ store }).listen(config.port, () => console.log(`Odie Day on :${config.port}`));
}
