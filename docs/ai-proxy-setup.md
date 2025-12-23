## AI Proxy + Quotas — Supabase Setup (MVP)

This repo now routes all AI calls through a **web proxy** (Supabase Edge Function) so **no OpenAI key ships in the client**.

Primary references:
- PRD: `docs/prds/ai-proxy-and-quotas-prd.md`
- Backend posture: `docs/backend-services-supabase-strategy.md`

---

### What’s included in this repo

- **Edge Function**: `supabase/functions/ai-chat/index.ts`
  - Routes:
    - `POST /v1/chat/completions`
    - `POST /v1/images/generations`
- **Migration**: `supabase/migrations/20251223000000_kwilt_ai_proxy.sql`
  - Daily usage counter + lightweight request telemetry

---

### Client configuration (Expo / EAS)

Set an **AI proxy base URL** (safe to embed):

- `AI_PROXY_BASE_URL` (recommended) or `EXPO_PUBLIC_AI_PROXY_BASE_URL`

Examples:
- Local (Supabase CLI): `http://localhost:54321/functions/v1/ai-chat`
- Hosted: `https://<project-ref>.functions.supabase.co/functions/v1/ai-chat`

The app sends:
- `x-kwilt-install-id` (stable per install)
- `x-kwilt-is-pro` (best-effort; server-verified entitlements can be added later)

---

### Supabase secrets (server-side)

Configure these as **Supabase Function secrets** (never in the client):

- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KWILT_AI_MONTHLY_FREE_ACTIONS` (default: 25)
- `KWILT_AI_MONTHLY_PRO_ACTIONS` (default: 1000)
- `KWILT_AI_DAILY_FREE_QUOTA` (optional daily safety rail; recommended: 2–3)
- `KWILT_AI_DAILY_PRO_QUOTA` (optional daily safety rail; recommended: 50–100)
- `KWILT_AI_IMAGE_ACTION_COST` (default: 10)
- `KWILT_AI_MAX_REQUEST_BYTES` (default: 120000)
- `KWILT_AI_MAX_OUTPUT_TOKENS` (default: 1200)
- `KWILT_AI_RPM_LIMIT` (requests/minute per installId; recommended: 50)

---

### Local dev quickstart (CLI)

Run these from the repo root:

```bash
npx supabase init
npx supabase start
npx supabase db reset
npx supabase functions serve ai-chat --no-verify-jwt
```

Then set:

```bash
AI_PROXY_BASE_URL=http://localhost:54321/functions/v1/ai-chat
```

---

### Deploy (when ready)

```bash
npx supabase link
npx supabase db push
npx supabase functions deploy ai-chat
```

### Recommended MVP quota posture (matches product strategy)

- Free: **25 actions/month** (AI “taste”)
- Pro: **1000 actions/month** (daily use)
- Add daily rails to prevent burst spend:
  - Free: 2–3/day
  - Pro: 50–100/day
- Add a per-minute safety rail to prevent runaway loops:
  - Free + Pro: 50 requests/minute

### How to tune using real usage (recommended)

The proxy stores lightweight telemetry:
- `kwilt_ai_usage_monthly` → actions + tokens per month (per `installId` / later `userId`)
- `kwilt_ai_requests` → per-request model/route/status + token usage (chat responses only)

After 3–7 days of internal use:
- Look at the 50th/90th percentile `total_tokens` per request to tune `KWILT_AI_MAX_OUTPUT_TOKENS` and payload size caps.
- If Free users consistently hit the monthly cap too early, consider:
  - increasing Free actions slightly (e.g. 35/mo), or
  - reducing per-action “heaviness” by clamping outputs for Free tiers.


