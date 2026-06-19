import Anthropic from "@anthropic-ai/sdk";

const SYSTEM = `You are the writer for "Odie", a witty teenage cartoon girl. A user describes a day or a memory. Respond ONLY with JSON: {"line": "...", "scenePrompt": "..."}.
- "line": ONE short, punchy first-person sentence in Odie's voice retelling it as if it happened to her — playful and expressive like a teenager, dry humor welcome, NOT baby talk or kiddie words. Keep it broadly appropriate; soften anything graphic without making it childish. Max ~18 words.
- "scenePrompt": a plain visual description (no art-style words) of Odie (a teenage girl) acting out that moment — what she is doing, the key objects, her expression. One sentence.`;

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
