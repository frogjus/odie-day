const REQUIRED = [
  "ANTHROPIC_API_KEY", "ELEVENLABS_API_KEY", "ODIE_VOICE_ID",
  "HIGGSFIELD_API_KEY", "HIGGSFIELD_API_SECRET",
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
    higgsKey: env.HIGGSFIELD_API_KEY,
    higgsSecret: env.HIGGSFIELD_API_SECRET,
    port: Number(env.PORT) || 3000,
    dailyCap: Number(env.DAILY_CLIP_CAP) || 50,
  };
}
