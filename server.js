import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { TOOLS, runTool, load, reset } from "./tools.js";
import { chat } from "./agent.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(here, "public")));

// ---- MCP server (Streamable HTTP, stateless) -------------------------------
function zodFor(p) {
  const t = p.enum ? z.enum(p.enum) : p.type === "array" ? z.array(z.string())
    : p.type === "boolean" ? z.boolean() : z.string();
  return t.describe(p.description || "");
}
function buildMcp() {
  const s = new McpServer({ name: "careloop", version: "1.0.0" });
  for (const t of TOOLS) {
    const shape = {};
    for (const [k, p] of Object.entries(t.properties))
      shape[k] = t.required.includes(k) ? zodFor(p) : zodFor(p).optional();
    s.registerTool(t.name, { description: t.description, inputSchema: shape },
      async (args) => ({ content: [{ type: "text", text: JSON.stringify(runTool(t.name, args), null, 2) }] }));
  }
  return s;
}
app.post("/mcp", async (req, res) => {
  try {
    const server = buildMcp();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
  }
});
app.all("/mcp", (req, res) => res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Use POST" }, id: null }));

// ---- Web simulator API -----------------------------------------------------
app.get("/api/state", (req, res) => res.json(load()));
app.post("/api/reset", (req, res) => res.json(reset()));
app.post("/api/chat", async (req, res) => {
  const { message = "", history = [] } = req.body || {};
  const out = await chat(String(message).slice(0, 500), history.slice(-10));
  res.json({ reply: out.reply, toolCalls: out.calls, engine: out.engine, state: load() });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`CareLoop on http://localhost:${port}  (MCP endpoint: /mcp)`));
