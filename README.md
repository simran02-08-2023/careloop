# CareLoop

**An Alexa+ agent for family caregivers.** Say it once: "Remind Mom to take her blood pressure pill at 8," "Order the usual groceries," "Update the family." CareLoop coordinates medications, appointments and groceries in one conversation, remembers state across sessions, and produces a summary for the rest of the family.

Built for the **Build, Ship, Shape: Amazon Developer Hackathon**, Alexa+ track. Mini challenge: Open Source.

## What is in the box
| Part | What it does |
|---|---|
| `/mcp` | Self-hosted **MCP server** over **Streamable HTTP** (spec 2025-11-25, via the official `@modelcontextprotocol/sdk`). Exposes 4 tools to Alexa+. |
| `public/index.html` | Voice-first **Alexa+ simulator** (browser speech in and out) with a live care timeline and grocery orders. |
| `agent.js` | Agent loop. Uses Claude tool calling when `ANTHROPIC_API_KEY` is set, otherwise a rule-based fallback. |
| `tools.js` | One tool layer shared by the MCP server and the simulator, with JSON-file state that persists across sessions. |

Tools: `add_reminder`, `list_schedule`, `order_groceries`, `family_summary`.

## Run it (Node 20+)
```bash
git clone <this repo> && cd careloop
npm install
# optional: use Claude as the agent brain
export ANTHROPIC_API_KEY=sk-ant-...      # and optionally CLAUDE_MODEL
npm start                                 # http://localhost:3000
```
Open http://localhost:3000, click **Speak** (Chrome or Edge) or tap a suggestion chip. Reload the page: your schedule is still there (state lives in `data/state.json`). Use **Reset demo** to clear it.

## Connect it to Alexa+ (MCP)
Expose the server over HTTPS (for example `npx cloudflared tunnel --url http://localhost:3000`) and register `https://<your-tunnel>/mcp` as the MCP endpoint following the Alexa+ developer docs.

Check the endpoint by hand:
```bash
curl -s localhost:3000/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
 -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Architecture
```
Voice / text ──> Alexa+ (real)  ──MCP over HTTP──┐
Browser simulator ──> /api/chat ──> agent.js ─────┤──> tools.js ──> data/state.json
                                                  └── same 4 tools
```
The server is stateless per request, so it scales horizontally. Only the JSON state file needs swapping for a database in production.

## Roadmap
Real medication-adherence confirmation ("Mom took it"), pharmacy refill integration, multi-caregiver roles with notifications, and checkout through a real grocery partner.

## License
MIT
