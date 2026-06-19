const REQUIRED = [
  "ANTHROPIC_API_KEY", "ELEVENLABS_API_KEY", "ODIE_VOICE_ID", "GEMINI_API_KEY", "VIDU_API_KEY",
];

export function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((k) => !env[k] || !String(env[k]).trim());
  if (missing.length) {
    throw new Error(`Missing required env vars:\n${missing.join("\n")}`);
  }
  return {
    anthropicKey: env.ANTHROPIC_API_KEY,
    elevenKey: env.ELEVENLABS_API_KEY,
    odieVoiceId: env.ODIE_VOICE_ID,
    geminiKey: env.GEMINI_API_KEY,
    viduKey: env.VIDU_API_KEY,
    // Vidu fetches the keyframe by URL; the app's public base (Render sets RENDER_EXTERNAL_URL)
    publicBaseUrl: env.PUBLIC_BASE_URL || env.RENDER_EXTERNAL_URL || "",
    port: Number(env.PORT) || 3000,
    dailyCap: Number(env.DAILY_CLIP_CAP) || 50,
  };
}
