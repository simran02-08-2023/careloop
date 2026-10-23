// Shared tool layer: used by BOTH the MCP server (/mcp) and the web agent (/api/chat).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const FILE = process.env.STATE_FILE ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "state.json");

const seed = () => ({
  usual: ["milk", "whole-wheat bread", "oats", "bananas", "low-sodium soup"],
  reminders: [], orders: [], log: []
});

export function load() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return seed(); }
}
function save(s) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2));
}
export function reset() { save(seed()); return load(); }

// "8", "8am", "8:30 pm", "20:15" -> "08:00", "08:30", "20:15"
export function normTime(t = "") {
  const m = String(t).trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return String(t);
  let h = +m[1]; const min = m[2] || "00";
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  if (!m[3] && h >= 1 && h <= 6) h += 12; // bare "5" most likely means evening
  return `${String(h).padStart(2, "0")}:${min}`;
}

export const TOOLS = [
  {
    name: "add_reminder",
    description: "Add a medication reminder, doctor appointment, or other care task for a family member.",
    properties: {
      person: { type: "string", description: "Who it is for, e.g. Mom" },
      what: { type: "string", description: "What to do, e.g. take blood-pressure pill" },
      time: { type: "string", description: "Time of day, e.g. 8am or 14:30" },
      kind: { type: "string", enum: ["medication", "appointment", "other"], description: "Category" },
      day: { type: "string", description: "Optional day label, e.g. Thursday. Defaults to daily/today." }
    },
    required: ["person", "what", "time", "kind"],
    run(s, a) {
      const r = { id: Date.now().toString(36), person: a.person, what: a.what,
        time: normTime(a.time), kind: a.kind, day: a.day || "daily", done: false };
      s.reminders.push(r);
      return { added: r };
    }
  },
  {
    name: "list_schedule",
    description: "List the care schedule (medications, appointments, tasks), optionally for one person.",
    properties: { person: { type: "string", description: "Filter by person" } },
    required: [],
    run(s, a) {
      let list = [...s.reminders];
      if (a.person) list = list.filter(r => r.person.toLowerCase() === a.person.toLowerCase());
      list.sort((x, y) => x.time.localeCompare(y.time));
      return { count: list.length, schedule: list };
    }
  },
  {
    name: "order_groceries",
    description: "Place a grocery order. Use useUsual=true to reorder the household's usual basket.",
    properties: {
      items: { type: "array", description: "Item names to order" },
      useUsual: { type: "boolean", description: "Reorder the saved usual basket" }
    },
    required: [],
    run(s, a) {
      const items = [...(a.useUsual || !a.items?.length ? s.usual : []), ...(a.items || [])];
      const order = { id: "ord-" + Date.now().toString(36), items: [...new Set(items)],
        status: "placed", eta: "Tomorrow, 9am to 11am" };
      s.orders.push(order);
      return { order };
    }
  },
  {
    name: "family_summary",
    description: "Summarise what is scheduled and ordered, written for the rest of the family.",
    properties: {},
    required: [],
    run(s) {
      const sorted = [...s.reminders].sort((x, y) => x.time.localeCompare(y.time));
      const meds = sorted.filter(r => r.kind === "medication").length;
      const appts = sorted.filter(r => r.kind === "appointment");
      const last = s.orders[s.orders.length - 1];
      return {
        medications_scheduled: meds,
        appointments: appts.map(a => `${a.person}: ${a.what} at ${a.time} (${a.day})`),
        open_tasks: sorted.filter(r => !r.done).length,
        latest_grocery_order: last ? { items: last.items, eta: last.eta } : null
      };
    }
  }
];

export function runTool(name, args = {}) {
  const t = TOOLS.find(x => x.name === name);
  if (!t) return { error: `Unknown tool ${name}` };
  const s = load();
  const out = t.run(s, args);
  s.log.push({ at: new Date().toISOString(), tool: name, args });
  s.log = s.log.slice(-50);
  save(s);
  return out;
}
