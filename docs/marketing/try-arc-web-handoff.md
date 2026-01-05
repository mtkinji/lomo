# Marketing Site → App: “Try Arc” survey handoff (ArcDraft)

This doc describes how the **Next.js marketing site** should let users try the **Arc creation survey**, then hand off into the **Kwilt mobile app** to continue Arc + goal creation.

The implementation uses an **anonymous, expiring ArcDraft** stored in Supabase. The marketing site creates the draft; the app claims it after sign-in and continues the existing `arcCreation` workflow.

---

## What we built in the app/backend (so the web can integrate)

### Shared survey domain package
The survey schema/output is standardized in `@kwilt/arc-survey`:
- **Payload type**: `ArcDraftPayloadV1` (unioned as `ArcDraftPayload`)
- **Options**: `DOMAIN_OPTIONS`, `WHY_NOW_OPTIONS`, `MOTIVATION_OPTIONS`, `PROUD_MOMENT_OPTIONS`
- **Archetype taps**: `ARCHETYPE_ROLE_MODEL_TYPES`, `ARCHETYPE_ADMIRED_QUALITIES`

The marketing site can either:
- **Reuse these exactly** (recommended), or
- Reimplement the UI but must output the same payload schema.

### Supabase Edge Functions (public + claim)
We expose 3 endpoints via the AI proxy base (same pattern as invites/referrals):

- **Create draft** (anonymous):
  - Function: `arc-drafts-create`
  - Returns: `{ draftId, token, expiresAt }`

- **Claim draft** (auth-backed, in-app):
  - Function: `arc-drafts-claim`
  - Requires `Authorization: Bearer <supabase access token>`
  - Returns: `{ payload, expiresAt }`

- **Redirect / fallback landing** (public):
  - Function: `arc-drafts-redirect`
  - Serves HTML (OG-friendly + “Open in app”), and best-effort redirects to `kwilt://arc-draft?...`

---

## Web integration: end-to-end flow

### Step 1) Render the survey (web UI)
Collect survey inputs and produce an `ArcDraftPayloadV1`:

```ts
type ArcDraftPayloadV1 = {
  version: 1;
  dream: string;
  whyNowId: string | null;
  domainId: string;
  proudMomentId: string;
  motivationId: string;
  roleModelTypeId: string;
  admiredQualityIds: string[]; // 1–3
};
```

**Notes**
- `dream` is free text.
- All the `*Id` fields should be the canonical ids from the shared options (or exact equivalents).
- `admiredQualityIds` must be **1–3** items.

### Step 2) Create an ArcDraft (server-side)
When the user completes the survey, call **`arc-drafts-create`** from a **server-side** environment on the marketing site (Next route handler / server action).

Why server-side:
- Keeps any service credentials off the client.
- Allows rate limiting, bot defense, and payload validation.

#### Request
- Method: `POST`
- URL: `{{AI_PROXY_BASE}}/arc-drafts-create`
- Headers:
  - `Content-Type: application/json`
  - `apikey: {{SUPABASE_ANON_KEY}}` (recommended; aligns with other edge calls)
  - `x-kwilt-client: kwilt-web`
- Body:

```json
{
  "payload": {
    "version": 1,
    "dream": "Be a calmer, more patient dad.",
    "whyNowId": "excited_and_serious",
    "domainId": "relationships_connection",
    "proudMomentId": "showing_up_when_hard",
    "motivationId": "reliable_for_others",
    "roleModelTypeId": "helpers_carers",
    "admiredQualityIds": ["kind", "patient"]
  }
}
```

#### Response (200)

```json
{
  "draftId": "9a4f4b58-0a5b-4a2b-b1a7-2a92f5e8a6dd",
  "token": "64-hex-ish-secret-token...",
  "expiresAt": "2026-01-12T01:23:45.678Z"
}
```

**Important**: treat `token` as a secret. Don’t log it. Don’t send it to analytics.

### Step 3) Redirect user to “Open in app” universal-link style URL
After draft creation, navigate the browser to the **redirect/fallback** URL:

```
{{AI_PROXY_BASE}}/arc-drafts-redirect/c/{{draftId}}?token={{token}}
```

That endpoint will:
- Provide OG metadata for share previews
- Show an “Open in Kwilt” button
- Attempt a best-effort redirect to the app scheme:
  - `kwilt://arc-draft?draftId=...&token=...`

### Step 4) App claims the draft and continues Arc creation
On open, the app:
- Parses the incoming link
- Prompts the user to sign in (if needed)
- Calls `arc-drafts-claim`
- Injects the payload into the existing `arcCreation` workflow and triggers generation

---

## Data flow diagram

```mermaid
sequenceDiagram
  participant User
  participant Web as NextMarketing
  participant Edge as SupabaseEdge
  participant Link as ArcDraftRedirect
  participant App as KwiltApp

  User->>Web: Complete TryArcSurvey
  Web->>Edge: POST arc-drafts-create(payload)
  Edge-->>Web: draftId + token + expiresAt
  Web->>Link: Navigate /arc-drafts-redirect/c/draftId?token
  alt AppInstalled
    Link->>App: Open kwilt://arc-draft?draftId&token
    App->>Edge: POST arc-drafts-claim(draftId, token) + Bearer
    Edge-->>App: payload
    App->>App: Continue arcCreation workflow
  else AppNotInstalled
    Link->>User: Fallback HTML + OpenInApp CTA
    note over User: User installs app and reopens link
  end
```

---

## Environment variables / config the marketing site needs

### Required
- **AI proxy base** (the same base used for other edge functions):
  - Example: `https://<your-ai-proxy-host>/ai-chat`
  - The web should derive edge URLs like:
    - `AI_PROXY_BASE.replace('/ai-chat', '') + '/arc-drafts-create'`

### Recommended
- **Supabase anon key** (to pass as `apikey` header)

---

## Security + abuse controls (web owner responsibilities)

### Required hygiene
- **Do not log the token** (server logs, client logs, analytics).
- Treat `token` like a password. If leaked, a third party could claim the draft (though they still need an app account).

### Recommended controls
- **Rate limit** draft creation (per IP + per session).
- Add **bot defense** (Turnstile/recaptcha) if you see abuse.
- Cap payload sizes:
  - `dream` should be reasonably bounded (the edge function rejects extremely large strings).

### Backend caps implemented
- `arc-drafts-create` stores `ip_hash` (SHA-256 of first `x-forwarded-for` IP) and enforces a coarse per-IP cap.

---

## Web UX requirements (keep marketing shell + survey canvas)

Per the app’s UX model, the web version should maintain two layers:
- **App shell**: marketing nav + margins, brand, primary CTA locations
- **Canvas**: the survey experience (focused, distraction-minimized)

Suggested layout:
- `/try-arc`: a landing section explaining what an Arc is + “Start survey”
- Survey runs in a contained card/page area (the “canvas”)
- Completion screen immediately transitions to “Open in app” (the redirect endpoint)

---

## Analytics recommendations (web + app)

### Web events (marketing analytics)
- `arc_survey_started`
- `arc_survey_completed`
- `continue_in_app_clicked`

Do **not** include the `token` in analytics. `draftId` is also better avoided; if you must, hash it.

### App events (already added)
- `arc_draft_claim_attempted`
- `arc_draft_claim_succeeded`
- `arc_draft_claim_failed`

---

## Practical implementation notes for Next.js

### Where to call `arc-drafts-create`
- Use a **route handler** (`app/api/.../route.ts`) or **server action**.
- Validate payload server-side before calling the edge function.

### Where to redirect
- After create returns `{draftId, token}`, redirect user to:
  - `{{AI_PROXY_BASE_ROOT}}/arc-drafts-redirect/c/{{draftId}}?token={{token}}`

---

## Troubleshooting

### “App opens but doesn’t continue”
Common causes:
- Token missing/trimmed in URL
- Draft expired
- User cancelled sign-in (claim requires auth)

### “Nothing happens when tapping Open in app”
Common causes:
- Universal links not configured for the marketing domain
- Testing in environments that don’t support scheme launch

Workaround:
- Ensure the fallback page provides a visible “Open in app” button that points to `kwilt://arc-draft?...`


