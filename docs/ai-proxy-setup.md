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
- `KWILT_AI_DAILY_FREE_QUOTA` (default: 20)
- `KWILT_AI_DAILY_PRO_QUOTA` (default: 200)

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


