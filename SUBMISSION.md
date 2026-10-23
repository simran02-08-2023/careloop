# Devpost submission text (copy and paste)

**Project name:** CareLoop
**Tagline:** One conversation for the whole care circle.
**Track:** Alexa+ **Mini challenge:** Open Source

## Inspiration / problem
Over 50 million people in the US care for a family member, and they juggle medicines, doctor visits and groceries across separate apps, notes and phone calls. Things slip. A missed dose or appointment has real consequences, and the person coordinating it is usually also working and raising a family.

## What it does
CareLoop is an Alexa+ agent that coordinates all three through natural speech. Say "Remind Mom to take her blood pressure pill at 8," and it schedules it. Ask "What does Mom's day look like?" and it reads back the timeline. Say "Order the usual groceries" and it places the household's regular basket. "Update the family" produces a plain-language summary for siblings. State persists across sessions, so the assistant continues where you left off.

## How we built it
- A **self-hosted MCP server** over Streamable HTTP (spec 2025-11-25) built with the official TypeScript/JavaScript SDK, exposing four tools: `add_reminder`, `list_schedule`, `order_groceries`, `family_summary`.
- A **voice-first Alexa+ simulator** web app (Web Speech API) that shows tool calls live, with a care timeline and order cards.
- **Claude** (Anthropic API tool calling) as the agent loop in the simulator, with a deterministic fallback so the demo works offline.
- One shared tool layer serves both real Alexa+ (through `/mcp`) and the simulator, so what you see in the demo is the same code Alexa+ calls.

## Challenges
Making spoken input robust (times like "8" or "5 pm" become normalised 24-hour times), keeping tool outputs short enough to read aloud, and making the MCP server stateless per request so it is safe to host.

## Accomplishments
A working MCP endpoint that completes the initialize handshake at protocol version 2025-11-25, a simulator that behaves the same with or without an LLM key, and persistent state across sessions.

## What's next
Adherence confirmations, pharmacy refills, multi-caregiver roles and notifications, and real grocery checkout.

## Product feedback (fill in with your real experience)
- **Tools used and for what:** MCP TypeScript SDK for the Streamable HTTP server; Claude API for the simulator's agent loop; Web Speech API for voice.
- **What worked well:** [e.g. SDK setup, handshake worked first time, small tool surface]
- **What needs work:** [be honest: docs gaps, testing Alexa+ without a device, anything that cost you time]
- **Onboarding (zero to hello world):** [time taken and blockers]
- **Would you build again?** Yes, because [your reason].

## Optional friction log (up to 10% bonus; write 2 or 3 real entries)
| Task attempted | Steps | Expected | Actual | Severity | Workaround | Suggestion |
|---|---|---|---|---|---|---|
| | | | | | | |

## Open Source mini challenge
- Contribution URL / project repository URL: [your GitHub repo URL]
- GitHub username: [yours]
- What I did, how it works, why it matters: Published CareLoop under the MIT license. It is a reusable reference for building a stateless Alexa+ MCP server whose tool layer is shared with a browser simulator, so other developers can test Alexa+ ideas without a device.

## 3-minute video script
- 0:00-0:20 Problem: one caregiver, three apps, things get missed.
- 0:20-1:30 Live demo: speak a medication reminder, an appointment, "order the usual groceries"; point at the tool chips and the timeline updating.
- 1:30-2:00 Reload the page to show persistence, then "update the family."
- 2:00-2:40 Show `curl` to `/mcp` (initialize at 2025-11-25, tools/list), then `server.js` and `tools.js`.
- 2:40-3:00 Impact and roadmap.
