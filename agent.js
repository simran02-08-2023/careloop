// Agent loop for the web simulator. Uses Claude when ANTHROPIC_API_KEY is set,
// otherwise a deterministic rule-based fallback so the demo never depends on a key.
import { TOOLS, runTool } from "./tools.js";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const SYSTEM = `You are CareLoop, a calm voice assistant that helps family caregivers coordinate medication reminders, appointments and grocery orders for an older relative. Use the tools for every change or lookup; never invent schedule data. Replies are spoken aloud: keep them under 40 words, plain sentences, no markdown.`;

const anthropicTools = TOOLS.map(t => ({
  name: t.name, description: t.description,
  input_schema: { type: "object", properties: t.properties, required: t.required }
}));

async function claudeChat(message, history) {
  const messages = [...history.map(h => ({ role: h.role, content: h.text })),
    { role: "user", content: message }];
  const calls = [];
  for (let i = 0; i < 5; i++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, system: SYSTEM, tools: anthropicTools, messages })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || "Claude API error");
    messages.push({ role: "assistant", content: d.content });
    if (d.stop_reason !== "tool_use") {
      return { reply: d.content.filter(b => b.type === "text").map(b => b.text).join(" "), calls };
    }
    const results = [];
    for (const b of d.content.filter(b => b.type === "tool_use")) {
      calls.push({ name: b.name, args: b.input });
      results.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(runTool(b.name, b.input)) });
    }
    messages.push({ role: "user", content: results });
  }
  return { reply: "Done.", calls };
}

function ruleChat(message) {
  const m = message.trim(), calls = [];
  const call = (name, args = {}) => { calls.push({ name, args }); return runTool(name, args); };
  let r;
  if ((r = m.match(/remind\s+(\w+)\s+(?:to\s+)?(.+?)\s+at\s+([\d:]+\s*(?:am|pm)?)/i))) {
    const what = r[2].replace(/\b(her|his|their)\b/gi, "").replace(/\s+/g, " ").trim();
    const kind = /pill|medic|tablet|dose|insulin/i.test(what) ? "medication"
      : /doctor|appointment|visit|clinic/i.test(what) ? "appointment" : "other";
    const out = call("add_reminder", { person: r[1], what, time: r[3], kind });
    return { reply: `Done. I will remind ${r[1]} to ${what} at ${out.added.time}.`, calls };
  }
  if (/order|grocer|usual/i.test(m)) {
    const out = call("order_groceries", { useUsual: true });
    return { reply: `Ordered the usual ${out.order.items.length} items. Arriving ${out.order.eta}.`, calls };
  }
  if (/summary|update.*family|tell.*family|family/i.test(m)) {
    const o = call("family_summary");
    return { reply: `${o.medications_scheduled} medication reminders and ${o.appointments.length} appointments are set. ` +
      (o.latest_grocery_order ? `Groceries arrive ${o.latest_grocery_order.eta}.` : "No grocery order yet."), calls };
  }
  if (/week|schedule|today|what.*(on|look)|upcoming/i.test(m)) {
    const o = call("list_schedule");
    return { reply: o.count ? `You have ${o.count} items. The first is ${o.schedule[0].person}: ${o.schedule[0].what} at ${o.schedule[0].time}.`
      : "Nothing is scheduled yet.", calls };
  }
  return { reply: "Try: remind Mom to take her blood pressure pill at 8am, what does her week look like, order the usual groceries, or send the family summary.", calls };
}

export async function chat(message, history = []) {
  if (process.env.ANTHROPIC_API_KEY) {
    try { return { ...(await claudeChat(message, history)), engine: "claude" }; }
    catch (e) { console.error("Claude failed, using fallback:", e.message); }
  }
  return { ...ruleChat(message), engine: "rules" };
}
