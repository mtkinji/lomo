## PRD — AI Proxy + Quotas (MVP Launch)

### Purpose

AI generation is day‑1 core. For a paid/scalable launch, we must:

- Remove direct OpenAI calls from the client (no embedded API key).
- Enforce tier-based quotas (Free vs Pro).
- Preserve the current UX flow by keeping response shapes stable.

### References

- Launch plan: `docs/launch/mvp-app-launch-jan-1-2026.md`
- Current AI client: `src/services/ai.ts` (routes through proxy when `aiProxyBaseUrl` is configured)
- Supabase Edge Function (proxy): `supabase/functions/ai-chat/index.ts`
- Existing AI architecture notes: `docs/ai-chat-architecture.md`

---

## Current state (implemented)

The app now supports an **AI proxy + quotas** posture end-to-end:

- Client routes AI requests through a proxy when `aiProxyBaseUrl` is set.
- The proxy holds the OpenAI key server-side and enforces:
  - monthly action quotas (Free vs Pro)
  - optional daily rail limits
  - per-minute request limiting
- Proxy emits best-effort telemetry into Supabase tables/RPCs (request counts, status, latency, quota rejects).

Important guardrail:

- In production, ensure `aiProxyBaseUrl` is set and **no OpenAI key is shipped** in app config/env.

---

## MVP requirements

### Server responsibilities (AI proxy)

- Hold the OpenAI API key server-side.
- Accept signed/validated client requests.
- Apply rate limits and quotas:
  - Free tier quota (e.g., N generations/day)
  - Pro tier quota (higher, bounded)
- Return stable JSON responses compatible with existing client parsing (handoff markers, etc.).
- Provide observability:
  - request count, latency, error rates, quota rejects.

### Client responsibilities

- Replace OpenAI endpoints with proxy endpoints.
- Include entitlement context (Pro vs Free) in a tamper-resistant way.
- Handle degraded mode:
  - When proxy is down or quota exceeded, show a helpful UI and provide fallback (templates/cached output).

---

## API design (minimal)

### Endpoint (example)

- `POST /v1/ai/chat`

Request:

- `mode` (existing chat mode)
- `messages` (existing chat turn format)
- `workflowDefinitionId` (optional)
- `metadata` (optional: screen context, etc.)

Auth:

- Short-lived token or signed request header.
- Include entitlement claim (`isPro`) validated server-side.

Response:

- `id`
- `content` (assistant content)
- Optional structured handoff payload if needed (keep current markers approach for MVP).

---

## Quotas

### Policy (MVP)

- **Free**: daily quota for AI generations (set conservatively).
- **Pro**: higher daily quota or “soft unlimited” with abuse guardrails.

Quota mechanics:

- Reset on UTC midnight (or user local midnight; decide once).
- Return clear error type on quota exceeded:
  - `code: "quota_exceeded"`
  - `retryAt: ISO timestamp`

---

## Entitlement verification (avoid painting into a corner)

Phase 1 (MVP):

- Client retrieves entitlement from RevenueCat.
- Client requests a short-lived signed token from your backend (or uses a pre-shared signing secret embedded in app **only if** you accept risk; recommended to avoid).

Phase 2 (post-launch):

- Optional account system to unify entitlements across platforms.

---

## Degraded mode UX

When proxy returns `quota_exceeded` or `provider_unavailable`:

- Show a clear message:
  - Free: “You’ve hit today’s AI limit. Try again tomorrow or upgrade to Pro.”
  - Pro: “AI is temporarily busy. Try again in a moment.”
- Provide fallback:
  - Template-based plan suggestions or cached “last generated” plan for that Arc/Goal.

---

## Acceptance criteria

- No OpenAI API key in the client binary/config.
- AI requests succeed through proxy in TestFlight builds.
- Quota exceed returns a user-facing, non-blocking flow.
- Metrics exist for: requests, latency, error rate, quota rejects.


