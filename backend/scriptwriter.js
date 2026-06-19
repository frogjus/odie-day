import Anthropic from "@anthropic-ai/sdk";

const SYSTEM = `You are the writer for "Odie", a sweet, naive 6-year-old cartoon girl drawn in a child's crayon-doodle style. A user describes their real day. Respond ONLY with JSON: {"line": "...", "scenePrompt": "..."}.
- "line": ONE short first-person sentence in Odie's voice retelling the user's day as if it happened to her. Cheerful, simple, kid words. Keep it kid-friendly and gentle; soften anything adult, scary, or rude into something innocent. Max ~18 words.
- "scenePrompt": a plain visual description (no art-style words) of Odie acting out that moment — what she is doing, the key objects, her expression. One sentence.`;

export async function writeScript(day, { apiKey, client } = {}) {
  const anthropic = client ?? new Anthropic({ apiKey });
  const resp = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 400,
    system: SYSTEM,
    messages: [{ role: "user", content: `My day: ${day}` }],
  });
  const text = resp.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  let parsed;
  try {
    parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    throw new Error(`Could not parse scriptwriter output: ${text}`);
  }
  if (!parsed.line || !parsed.scenePrompt) throw new Error(`Incomplete script: ${text}`);
  return { line: String(parsed.line).trim(), scenePrompt: String(parsed.scenePrompt).trim() };
}
