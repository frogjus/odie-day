import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "./config.js";

test("throws and names every missing required var", () => {
  assert.throws(() => loadConfig({}), /ANTHROPIC_API_KEY[\s\S]*VIDU_API_KEY/);
});

test("returns a normalized config when all vars present", () => {
  const env = {
    ANTHROPIC_API_KEY: "a", ELEVENLABS_API_KEY: "e", ODIE_VOICE_ID: "v",
    GEMINI_API_KEY: "g", VIDU_API_KEY: "vd", PUBLIC_BASE_URL: "http://x",
    PORT: "3000", DAILY_CLIP_CAP: "50",
  };
  const c = loadConfig(env);
  assert.equal(c.geminiKey, "g");
  assert.equal(c.viduKey, "vd");
  assert.equal(c.publicBaseUrl, "http://x");
  assert.equal(c.port, 3000);
  assert.equal(c.dailyCap, 50);
});
