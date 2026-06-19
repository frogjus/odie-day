import path from "node:path";
import crypto from "node:crypto";

export function createJobStore({ config, deps, clipsDir }) {
  const jobs = new Map();
  let dayCount = 0; // simple per-process daily cap; reset on restart

  async function run(job, day) {
    const ho = { key: config.higgsKey, secret: config.higgsSecret };
    try {
      job.status = "scripting";
      const { line, scenePrompt } = await deps.writeScript(day, { apiKey: config.anthropicKey });
      job.line = line;
      job.status = "drawing";
      const imageUrl = await deps.generateKeyframe(scenePrompt, ho);
      job.status = "animating";
      const videoUrl = await deps.animate(imageUrl, ho);
      job.status = "voicing";
      const mp3 = await deps.synthesize(line, { apiKey: config.elevenKey, voiceId: config.odieVoiceId });
      job.status = "muxing";
      const out = path.join(clipsDir, `${job.id}.mp4`);
      await deps.muxClip(videoUrl, mp3, out);
      job.mp4Url = `/clips/${job.id}.mp4`;
      job.status = "done";
    } catch (err) {
      job.status = "failed";
      job.error = err.message;
    } finally {
      job._resolve?.();
    }
  }

  return {
    start(day) {
      if (dayCount >= config.dailyCap) throw new Error("daily cap reached");
      dayCount++;
      const id = crypto.randomUUID();
      const job = { id, status: "queued", day };
      job._done = new Promise((r) => (job._resolve = r));
      jobs.set(id, job);
      run(job, day);
      return id;
    },
    get(id) {
      const j = jobs.get(id);
      if (!j) return null;
      const { _done, _resolve, day, ...pub } = j;
      return pub;
    },
    waitFor(id) { return jobs.get(id)?._done ?? Promise.resolve(); },
  };
}
