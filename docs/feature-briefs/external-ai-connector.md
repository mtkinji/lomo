---
id: brief-external-ai-connector
title: External AI connector — Kwilt as a remote MCP for Claude & ChatGPT
status: draft
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-capture-and-find-meaning
  - jtbd-trust-this-app-with-my-life
  - jtbd-move-the-few-things-that-matter
  - jtbd-see-my-arcs-in-everyday-moments
related_briefs:
  - brief-background-agents-weekly-planning
  - brief-kwilt-text-coach
owner: andrew
last_updated: 2026-05-08
---

## Context

Kwilt today only exists where users explicitly open Kwilt — the iOS app, the desktop app (in progress), and `kwilt.app`. But the place users now spend the most reflective, life-shaped time is inside conversational AI surfaces — Claude and ChatGPT. They're already drafting reflections, planning weeks, processing decisions, and listing things they want to do. None of it lands in Kwilt.

Both Anthropic and OpenAI have just shipped official directories that solve the distribution problem we'd otherwise face: a vendor publishes a hosted, OAuth-protected MCP server once, gets reviewed, and then any Claude or ChatGPT user can install it with a "Connect" button. No JSON config, no developer mode. The user authenticates with Kwilt the same way they sign into the mobile app.

This feature brief is the inbound counterpart to [`docs/mcp-strategic-proposal.md`](../mcp-strategic-proposal.md) (which covers the outbound "Send to…" model). Together, the two define Kwilt's complete connector posture: stable internal UX, expanding capability surface in both directions.

It is also the external-AI counterpart to [`docs/feature-briefs/kwilt-text-coach.md`](kwilt-text-coach.md). MCP and Text Coach should share the same domain-level action tools, but they serve different moments: MCP lets a user-initiated Claude/ChatGPT conversation act on Kwilt data; Text Coach lets Kwilt carry intentions forward through its own text prompts and loop closure.

## JTBD framing

This work primarily serves the **capture-first** and **trust-this-app** anchors:

- `jtbd-capture-and-find-meaning` — a user mid-conversation in Claude says *"I'm going to take Mara to Tilden Saturday morning."* Capturing that as a future Activity should not require switching apps. Capture-first means capture from any surface where the user already is.
- `jtbd-trust-this-app-with-my-life` — Kwilt earns trust by being where the user processes their life, not by demanding the user come to it. A connector that respects privacy, returns minimal data, and doesn't get loud is the most concrete expression of this anchor outside the app.
- `jtbd-move-the-few-things-that-matter` — when an agent the user trusts can advance a Goal on their behalf (logging an Activity, marking something done, surfacing the Arc context for a decision), the few things that matter actually move on the days the user wouldn't have opened Kwilt.
- `jtbd-see-my-arcs-in-everyday-moments` — Arcs become legible to *every* AI surface the user trusts. The identity frame shows up in the conversations they're already having, not just in Kwilt's UI.

This feature brief does **not** serve `jtbd-make-sense-of-the-season` directly — Chapter generation stays a Kwilt-side concern. The connector exposes existing chapters but does not let agents author or schedule them.

## Decisions log

Locked in the design phase — record here so they don't drift during implementation:

| Decision | Choice | Why |
|---|---|---|
| Hosting | Supabase Edge Function (Deno) under the existing `auth.kwilt.app` Supabase Custom Domain (path: `/functions/v1/mcp`) | Native JWT/RLS context, same secrets store, one operational surface for backend, reuses the trust-branded domain we already engineered in `docs/auth-custom-domain.md`. Vercel was considered but only owns the small UI surfaces (consent screen, marketing pages, universal-link confirmation). |
| Publisher identity | The Kwilt business entity (not individual) on both Anthropic and OpenAI directories | Brand consistency with "Notion / Linear / Dovetail"-class listings. Same answer the moment a single business buyer Googles us. |
| Pricing posture | Connector is free at every tier. AI-backed tool calls debit the existing AI credit pool (50/mo free, 1000/mo Pro) — no new pricing concept. | Capture-first is preserved; conversion happens contextually via the existing `generative_quota_exceeded` paywall flow shipped in `growth-loops-execution-plan.md` Sprint 4 Task 27. |
| Free-tier feature limits | Surface as structured tool errors with a paywall deep-link carrying the existing `PaywallReason` enum (e.g. `?source=claude&reason=goal_limit`) | Reuses the in-app paywall; no new monetization surface. The agent surfaces the error in a calm, factual way; the user clicks through to the contextual paywall. |

Open questions remaining are listed in the [Open questions](#open-questions) section.

## Design

### One sentence

Stand up the MCP server at `auth.kwilt.app/functions/v1/mcp` as a hosted Remote MCP with OAuth + Dynamic Client Registration, get it listed in the [Anthropic Connectors directory](https://claude.ai/directory) and the [ChatGPT Apps directory](https://platform.openai.com/apps-manage), and wire successful tool calls back into Kwilt's existing show-up streak, capture log, and Chapter inputs so the connector becomes a first-class capture and retention surface alongside the mobile app.

### How the user experiences it

**Discovery & install (one-time, ~30 seconds):**

1. User clicks "Add to Claude" on `kwilt.app/connect/claude` (or browses the Claude directory and finds Kwilt).
2. Claude opens its install dialog with name + URL prefilled (per [Anthropic's directory connector pattern](https://claude.com/docs/connectors/building/directory-vs-custom)).
3. Claude redirects to `auth.kwilt.app` — same login UX as the mobile app (Sign in with Apple, Google, or email).
4. OAuth handshake completes. Claude shows "Kwilt connected." A first-run system message in the conversation: *"I can now read your Arcs and capture Activities to Kwilt. Try: 'What Arcs am I in?' or 'Add a 30-min walk Saturday morning to my Health Arc.'"*

The ChatGPT path is identical except the directory and dialog are OpenAI's.

**Inside the conversation:**

- The user says natural-language things; Claude/ChatGPT calls Kwilt tools to fulfill them.
- Every successful write tool call returns a confirmation snippet that is **calm, identity-anchored, and never gamified** (see anti-pattern guardrails below). Example: `capture_activity` returns *"Logged 'Walk with Mara, 30m' to Family Arc — Saturday 9am. Showed up today."* — never *"Crushed it!"* or *"+1 streak day!"*
- For destructive or scoped writes (`create_goal`, `propose_arc`, `mark_activity_done` with confirmation flag), the tool response includes a `kwilt://confirm` deep link so the user can review in-app before the change is final. This honors the **no auto-anchoring** anti-pattern from the context primer.

**Inside Kwilt:**

- Settings → Connections lists each connected surface ("Claude — connected May 3", "ChatGPT — not connected") with last-used timestamp and per-surface revoke.
- Activities captured from external surfaces show a small surface-origin badge in the Activity card (Claude logo, ChatGPT logo). Tap → "Captured from Claude on May 3 at 8:42 PM."
- A successful write to `capture_activity` from any external surface counts as a **show-up for that day**, integrating with the streak system shipped in `growth-loops-execution-plan.md` Sprint 1.
- The Day-7 welcome email and weekly Chapter digest mention "captures from Claude/ChatGPT" alongside in-app activity, so the user sees the cross-surface picture.

### Tool catalog

Designed against [Anthropic's review criteria](https://claude.com/docs/connectors/building/review-criteria): separate read and write tools (no catch-all method-param tools), narrow descriptions, accurate hint annotations, names ≤ 64 chars.

**Reads (`readOnlyHint: true`, `openWorldHint: false`):**

| Tool | Returns | Privacy posture |
|---|---|---|
| `list_arcs` | id, name, force_intent vector | No narrative or recent activity unless asked |
| `get_arc` | Full Arc detail incl. recent goals (last 5) | User-scoped only |
| `list_goals` | id, title, arc_id, status, kind | Filterable by arc/status |
| `get_goal` | Full Goal incl. last 10 activities | User-scoped only |
| `list_recent_activities` | Last N days (default 7, max 90) | Lean by default — title + when + arc/goal anchors only. Notes/attachments/voice transcripts gated behind an explicit `include_rich: true` flag. Chapter-substitution and privacy mitigation. |
| `search_kwilt` | Semantic search across activities, goals, chapters | Top-K with scores; no raw embeddings |
| `get_current_chapter` | Latest published Chapter narrative | Lookback only — never future |
| `get_show_up_status` | Current streak, repair-window state, today's show-up boolean | No protected/repair-window mechanics in description copy that could be exploited |

**Writes:**

| Tool | Hints | Notes |
|---|---|---|
| `capture_activity` | `readOnlyHint: false`, `destructiveHint: false`, `openWorldHint: false` | Primary write. Anchors are optional (capture-first). Counts as show-up. |
| `mark_activity_done` | `destructiveHint: false` | Idempotent. |
| `set_focus_today` | `destructiveHint: false` | Soft signal — not a hard schedule. |
| `create_goal` | `destructiveHint: false` | Returns a `kwilt://confirm` link; goal enters `pending_confirmation` state until user confirms in-app. |
| `propose_arc` | `destructiveHint: false` | **Never** silently creates an Arc. Always proposes; confirmation required in-app. Honors the "auto-anchoring without confirmation" anti-pattern explicitly. |

Notably absent (deliberate, by anti-pattern): no `delete_*`, no `set_streak`, no tool that returns a composite "growth score," no tool that lets the agent author Chapters.

### Relationship to Text Coach action tools

MCP should not grow a separate action model from Text Coach. The same domain-level operations should sit beneath both surfaces:

| Shared operation | MCP initiation | Text Coach initiation |
|---|---|---|
| Create/capture Activity | User asks Claude/ChatGPT to log or create something in Kwilt | User texts Kwilt an intention; Kwilt captures or confirms it |
| Log Activity outcome | User asks external AI to mark something done | User replies `done` to a follow-up |
| Snooze or pause follow-up | User asks external AI to defer a prompt | User replies `snooze 2d`, `pause`, or `not relevant` |
| Draft message | User asks Claude/ChatGPT for a draft using Kwilt context | Kwilt offers a draft at the moment follow-through is due |
| Propose Goal | External AI proposes and deep-links to confirmation | Text Coach proposes only when strongly supported; confirmation required |

The distinction is **who initiates**. MCP is pull-based: the user is already in an external chat and asks for something. Text Coach is follow-through-based: Kwilt carries a previously captured intention across time and prompts the user later. Both must write to the same audit/action log so the app, Chapters, and user settings can explain what happened.

### Architecture

Two surfaces, each doing what it's best at. All token + data flow happens on Supabase; Vercel only renders the few moments the user is looking at a screen.

```
Claude / ChatGPT
    │
    │  MCP (Streamable HTTP) + OAuth 2.1 (DCR)
    ▼
auth.kwilt.app/functions/v1/mcp  ── Supabase Edge Function (Deno)
    │
    ├── OAuth provider endpoints
    │     /.well-known/oauth-authorization-server
    │     /register   (dynamic client registration)
    │     /authorize  ── 302 → kwilt-site /oauth/consent
    │     /token, /revoke
    │
    ├── MCP tool handlers (one Postgres RPC per tool, RLS-scoped)
    │
    └── Writes to kwilt_external_capture_log
            │
            ▼
       Supabase (Postgres + RLS, existing project)
            │
            ▼
       Mobile / desktop / kwilt-site read the same tables (unchanged)

kwilt-site (Vercel / Next.js) ── only the user-facing UI surfaces:
    ├── /oauth/consent              — "Approve Kwilt access for Claude?" + Supabase Auth login if needed
    ├── /connect/claude             — marketing landing + "Add to Claude" button (post-approval)
    ├── /connect/chatgpt            — marketing landing + "Open in ChatGPT" button (post-approval)
    └── go.kwilt.app/open/confirm/  — propose_arc / create_goal universal-link confirmation
                                      (already exists from email-system-ga-plan.md Phase 1–3, reused unchanged)
```

Key choices:

- **MCP server lives in Supabase Edge.** Auth context is native (the function gets the user JWT and instantiates a Supabase client with it; RLS does the rest), every tool is one RPC away from Postgres, secrets/logs/deploys all live in the same place as the existing `email-drip` / `chapters-generate` / `pro-codes` functions. No JWT bridging, no double-serialize.
- **Reuse the existing `auth.kwilt.app` Supabase Custom Domain.** Already DNS/TLS-verified per `docs/auth-custom-domain.md`. The "trustworthy domain" property the iOS auth prompt depends on carries over: when Claude shows the OAuth login screen, it reads `auth.kwilt.app` — exactly what users see signing into the mobile app. No new domain to provision.
- **Vercel only owns user-facing UI surfaces.** The OAuth consent screen, the marketing landing pages, and the universal-link confirmation pages. Claude/ChatGPT never talk to Vercel during a tool call.
- **Published as Kwilt (the business entity).** Identity verification in the OpenAI Platform Dashboard uses the business entity. Both Anthropic's directory card and OpenAI's listing show "Kwilt" as publisher.
- **Reuse existing Supabase Auth identity.** No new user table, no new sign-in flow. The MCP OAuth provider issues short-lived MCP access tokens that wrap a Supabase JWT for the same user; revoking a connection just invalidates the wrapped token.
- **No new business logic in the MCP layer.** Every tool is a thin call to a Postgres RPC. Mobile + desktop + connector all hit the same RPCs. Drift is impossible by construction.
- **Audit log as first-class data.** New `kwilt_external_capture_log` table records every tool call (user_id, surface, tool, input hash, success, timestamp). This is what powers the surface-origin badge in-app, the per-surface analytics, and the per-source revoke.

### Anti-pattern guardrails (instant-fail in code review)

From `docs/jtbd/_kwilt-context-primer.md`. The reviewer should reject the PR if any of these slip in:

- Tool descriptions or response copy that uses productivity-app voice ("crush," "level up," "optimize"). Calm, identity-anchored language only.
- Streak language that frames missed days as failure. The streak is observed; never weaponized.
- A tool that auto-anchors an Activity to an Arc without a clear confirmation path (either user-confirmed in the conversation, or `pending_confirmation` state in-app).
- A tool response that includes more user data than was requested (e.g. `capture_activity` returning the full Arc narrative).
- Default-public anything. All data is user-scoped via RLS; the connector cannot expose another user's data even if asked.
- Any tool that purports to send messages on behalf of the user to other people (sharing is its own surface — see `growth-evangelism-shared-goals.md`).

### Sprint plan

Modeled on `docs/growth-loops-execution-plan.md`. Each sprint ships a complete, testable loop.

#### Sprint A — Inbound MCP foundation (~1.5 weeks)

**Theme:** Stand up the server with OAuth and read-only tools. No directory submission yet — beta with team via custom-connector install link.

- New Supabase Edge Function `mcp` (path: `auth.kwilt.app/functions/v1/mcp`).
- Implement OAuth 2.1 + Dynamic Client Registration endpoints, wrapping Supabase Auth. The `/authorize` step 302s to the Next.js consent page on `kwilt-site` (`/oauth/consent`) which handles the "Approve Kwilt access for Claude?" UI and the Supabase Auth login if needed, then redirects back with an auth code.
- Implement read-only tools: `list_arcs`, `get_arc`, `list_goals`, `get_goal`, `list_recent_activities`, `get_current_chapter`, `get_show_up_status`.
- Create `kwilt_external_capture_log` table (read-only writes for now: `tool_kind = 'read'`).
- Internal beta: distribute the [custom-connector install link](https://claude.com/docs/connectors/building/directory-vs-custom#share-an-install-link) to the team and a small group of Pro-tier friends.
- PostHog: `ExternalConnectorInstalled`, `ExternalToolCalled` (with tool name + surface).

**Acceptance:** Team members can connect Kwilt to their personal Claude and ask "What Arcs am I in?" and get an answer. Read-only — no writes yet.

#### Sprint B — Write tools + capture-first parity (~1 week)

**Theme:** Make the connector a first-class capture surface that participates in the show-up streak.

- Implement `capture_activity`, `mark_activity_done`, `set_focus_today`.
- Wire writes into `kwilt_external_capture_log` with `tool_kind = 'write'` and `surface_origin`.
- Show-up attribution: a successful `capture_activity` from an external surface increments the show-up streak the same way an in-app capture does. Reuses `recordShowUp` flow via a new Edge Function `external-capture-relay`.
- In-app: surface-origin badge component (`SurfaceOriginBadge`) on Activity cards that have a non-Kwilt origin.
- Notification (silent, in-app): "Captured from Claude — your streak continues." (Reuses the calm celebration tone from `useCelebrationStore`.)
- Tests: mock-MCP integration test that runs a tool call and verifies the show-up was recorded.

**Acceptance:** Capturing an Activity via Claude on a day the user hasn't opened the app counts as a show-up; the badge appears in the in-app timeline.

#### Sprint C — Directory submissions (~1 week + review wait)

**Theme:** Get the official badges. This is paperwork-heavy but mostly parallelizable.

- Build a permanent demo Kwilt workspace (no MFA, fully populated with realistic Arcs/Goals/Activities/Chapters).
- Pass Anthropic's [pre-submission checklist](https://claude.com/docs/connectors/building/review-criteria): tool annotations, narrow descriptions, no prompt-injection patterns, error message quality.
- Pass OpenAI's [App Submission Guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines): CSP, identity verification under the **business entity (Kwilt)**, screenshots, test prompts/responses.
- Update `kwilt-site` privacy policy to enumerate the data categories returned by each tool.
- Submit Anthropic [directory form](https://claude.com/connectors/building/submission); submit OpenAI Apps Dashboard.
- Build `kwilt-site` landing pages: `/connect/claude`, `/connect/chatgpt` with the official "Connect" / "Add" buttons (post-approval) and a screenshot of the in-conversation UX.

**Acceptance:** Directory listings live at `claude.ai/directory/connectors/kwilt` and the OpenAI app directory URL. Both buttons on `kwilt-site` work end-to-end for a fresh user.

#### Sprint D — Cross-surface activation loops (~1 week)

**Theme:** Convert directory installs into *retained Kwilt users*, including ones who started with a Claude conversation rather than the mobile app.

- New activation path: a user who created their account by authenticating from Claude/ChatGPT (no mobile app yet) goes through a different welcome drip. Day 0 email mentions Claude specifically; Day 1 nudges mobile install with a deep link to the App Store carrying a `?source=claude` param.
- "Install the mobile app" prompt inside the conversation: after the user's 3rd successful write tool call from a single surface, the next tool response appends a one-line prompt: *"To see your weekly Chapter and get notifications, install Kwilt for iOS: kwilt.app/ios"*. One-time per surface per user.
- Mobile app launches from the email/conversation prompt deep-link straight into the user's already-populated workspace (no FTUE re-prompt).
- Settings → Connections screen: per-surface stats ("47 captures via Claude this month") and per-surface revoke.
- New PostHog events: `ExternalActivationStarted` (account created via external surface), `ExternalToMobileInstall` (external-only user installs mobile app), `ExternalShowUpCounted` (a tool call resulted in a streak day that wouldn't have happened otherwise).

**Acceptance:** A new user who only ever interacted with Kwilt through Claude can be measured separately, gets a tailored welcome drip, and sees a single calm prompt to install the mobile app.

#### Sprint E — Expansion & polish (~1.5 weeks)

**Theme:** The remaining writes, semantic search, and observability.

- `propose_arc` with the universal-link confirmation flow via `go.kwilt.app/open/confirm/arc/<token>` (reuses the email handoff pattern from `email-system-ga-plan.md` Phase 1–3).
- `create_goal` with the same confirmation pattern.
- `search_kwilt` semantic search — start with Postgres `pg_trgm` over titles; upgrade to pgvector embeddings when the existing chapter/goal embedding pipeline is reusable. (AI-backed; debits AI credits.)
- Force-Actual inference: when `capture_activity` lacks `force_actual`, the server suggests one in the response (*"This looks Activity-Connection. Confirm in Kwilt to record it."*) — never silently writes Forces. (AI-backed; debits AI credits.)
- Connector health dashboard (internal): per-surface success rate, p95 tool latency, active connections.

**Acceptance:** A free user can run the full read+write surface from Claude or ChatGPT. Confirmation flows for goal/Arc creation work through universal links. AI-backed tools correctly debit the user's AI credit pool and return the existing `generative_quota_exceeded` paywall link when exhausted.

### Cost & gating model

The decision is in the [Decisions log](#decisions-log) at the top; this section explains the mechanics so reviewers/reimplementers can verify behavior.

**Two cost pools, treated very differently:**

1. **MCP infrastructure cost.** Functionally zero — the Supabase Edge Function does an OAuth check + a Postgres RPC. No AI tokens are spent on Kwilt's side; Claude/ChatGPT pay the LLM costs on their side. The connector itself does not need to be monetized to recoup hosting cost.
2. **Kwilt-side AI cost when a tool itself calls AI.** Only `search_kwilt` (embeddings) and the optional Force-Actual inference in `capture_activity` and `propose_arc` touch the AI proxy. These tools debit the user's existing monthly AI credit pool — same pool, same limits, same paywall flow as the in-app AI surfaces.

**When a free user hits their AI credit limit mid-conversation:** the AI-backed tool returns a structured error like:

```json
{
  "error": "generative_quota_exceeded",
  "message": "AI-backed tools are out for this month. Upgrade for 1,000/month or wait until June 1.",
  "upgrade_url": "https://kwilt.app/upgrade?source=claude&reason=generative_quota_exceeded"
}
```

The agent surfaces this naturally; the user clicks through to the same paywall surface shipped in `growth-loops-execution-plan.md` Sprint 4 Task 27.

**When a free user hits a non-AI feature limit** (e.g. the 3-Goal-per-Arc cap on free tier):

The tool runs, the limit check trips inside the RPC, and the tool returns a structured error with three fields:
- `attempted` — what was tried (`create_goal` on Arc "Health")
- `blocked_by` — why (`free_tier_goal_limit`, current count: 3 of 3 used)
- `remediation` — `{ upgrade_url: "https://kwilt.app/upgrade?source=claude&reason=goal_limit", alternative: "Remove an existing Goal first." }`

The `reason` query param matches an existing `PaywallReason` enum value already wired into `PaywallDrawer.tsx`; no new monetization plumbing needed. The agent presents this calmly: *"I couldn't create that Goal — you're at the 3-Goal limit on the Health Arc. You can upgrade Kwilt Pro at kwilt.app/upgrade or remove an existing Goal first. Want me to list your Health Arc's current Goals?"* Tool descriptions explicitly forbid "crush"/"unlock"/"upgrade now" hard-sell language in errors.

**Capture is never gated by anything but rate limiting.** `capture_activity` does not consume AI credits and is not subject to feature-tier limits even on free. Capture-first means capture-first across surfaces.

## Success signal

Tied to the four anchors above. Measured 90 days post-directory approval.

| Anchor | Signal |
|---|---|
| `jtbd-capture-and-find-meaning` | ≥ 20% of captures from connected users come from external surfaces. The capture surface is real and used, not a novelty. |
| `jtbd-trust-this-app-with-my-life` | D30 retention for connected users is ≥ 1.3× D30 for non-connected. Being where the user already is keeps them. |
| `jtbd-move-the-few-things-that-matter` | ≥ 30% of weekly active connected users have ≥ 1 external `capture_activity` against an explicitly named Goal in a given week. |
| `jtbd-see-my-arcs-in-everyday-moments` | Qualitatively (user interviews, n ≥ 5): users report that having Arcs visible to Claude/ChatGPT changes how they think mid-conversation. |

Plus directory presence as a binary milestone:

- [ ] Listed at `claude.ai/directory/connectors/kwilt`.
- [ ] Listed in OpenAI ChatGPT Apps Directory.

And a guardrail metric:

- < 2% of external write tool calls result in a user-initiated revoke within 7 days of install. (Higher = the agent surface is being experienced as noisy or invasive.)

## Open questions

(Hosting, publisher identity, and pricing posture are now [resolved in the Decisions log](#decisions-log).)

- **Data residency.** OpenAI requires a global-residency project for submission today (no EU residency). Acceptable for launch?
- **Affiliate/attribution for connector-driven mobile installs.** Should `?source=claude` flow into the existing affiliate model in `docs/affiliate-enablement.md`?
- **Apple/Google App Store policy.** External surfaces creating accounts that bypass IAP — does this collide with Apple's IAP rules for the mobile app? (Likely fine because the connector is not a purchase surface, but confirm.)
- **Anthropic-held client credentials.** Directory listings are eligible for Anthropic-held credentials. Worth using (simpler distribution) vs ship-our-own (more control)?
- **Relationship to MCP outbound proposal.** Should `auth.kwilt.app/functions/v1/mcp` *also* host the outbound connectors (Calendar, Amazon, etc.) so we have one MCP surface, or keep inbound-MCP and outbound-connectors as different concerns?
- **URL aesthetics.** The natural Supabase Edge Function URL is `auth.kwilt.app/functions/v1/mcp`. If we ever want a clean `/mcp` (e.g. for a "Manual install URL" field shown to power users), we'd add a Vercel proxy hop on `kwilt-site`. Defer until a directory listing field actually needs it.

## JTBDs served

This feature brief serves:

- `jtbd-capture-and-find-meaning` — external surfaces become first-class capture inputs that participate in the streak and Chapter pipeline.
- `jtbd-trust-this-app-with-my-life` — Kwilt shows up where the user is already processing their life, with calm tone and minimal data exposure.
- `jtbd-move-the-few-things-that-matter` — agents can advance Goals on the user's behalf with clear confirmation guardrails.
- `jtbd-see-my-arcs-in-everyday-moments` — Arcs become legible to every AI surface the user trusts, not only inside Kwilt's UI.

See [`docs/jtbd/_index.md`](../jtbd/_index.md) for the taxonomy.

## Related

- [`docs/mcp-strategic-proposal.md`](../mcp-strategic-proposal.md) — outbound connector view; this feature brief is its inbound counterpart.
- [`docs/send-to-connector-strategy.md`](../send-to-connector-strategy.md) — outbound UX (Send to…); the surface-origin badge in this feature brief is its inbound mirror.
- [`docs/growth-loops-strategy.md`](../growth-loops-strategy.md) — the strategic frame (activation, retention, upsell) this feature brief plugs into.
- [`docs/growth-loops-execution-plan.md`](../growth-loops-execution-plan.md) — sprint structure modeled on this plan; show-up streak attribution depends on Sprint 1 here.
- [`docs/feature-briefs/kwilt-text-coach.md`](kwilt-text-coach.md) — Kwilt-owned follow-through surface that should share the same action-tool substrate.
- [`docs/feature-briefs/background-agents-weekly-planning.md`](background-agents-weekly-planning.md) — a future weekly ritual under the Text Coach / follow-through agent umbrella.
- [`docs/email-system-ga-plan.md`](../email-system-ga-plan.md) — universal-link handoff pattern (`go.kwilt.app/open/...`) reused for `propose_arc` / `create_goal` confirmations.
- [`docs/jtbd/_kwilt-context-primer.md`](../jtbd/_kwilt-context-primer.md) — anti-pattern guardrails enforced in tool descriptions and response copy.
