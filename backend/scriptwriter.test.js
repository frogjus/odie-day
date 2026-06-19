import { test } from "node:test";
import assert from "node:assert/strict";
import { writeScript } from "./scriptwriter.js";

const fakeClient = {
  messages: {
    create: async () => ({
      content: [{ type: "text", text: JSON.stringify({
        line: "Today I spilled juice all over my homework!",
        scenePrompt: "a little girl at a desk with a knocked-over juice cup soaking a worksheet",
      }) }],
    }),
  },
};

test("returns line + scenePrompt parsed from the model", async () => {
  const r = await writeScript("spilled juice on my homework", { apiKey: "x", client: fakeClient });
  assert.match(r.line, /juice/i);
  assert.ok(r.scenePrompt.length > 0);
});

test("throws on unparseable model output", async () => {
  const bad = { messages: { create: async () => ({ content: [{ type: "text", text: "not json" }] }) } };
  await assert.rejects(() => writeScript("x", { apiKey: "x", client: bad }), /parse/i);
});
