# Kwilt External MCP (OAuth Remote MCP)

The deployed public endpoint is:

- `https://auth.kwilt.app/functions/v1/mcp`

This is Kwilt's canonical MCP server. It is the hosted remote connector intended
for directory-style installs (Claude, ChatGPT, Cursor plugin, Codex plugin) and
is the auth path documented for users on the marketing site.

## OAuth 2.1 + PKCE surface

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/.well-known/oauth-authorization-server` | GET | RFC 8414 discovery |
| `/.well-known/oauth-protected-resource` | GET | RFC 9728 PRM discovery |
| `/register` | POST | RFC 7591 Dynamic Client Registration |
| `/authorize` | GET | 302 to `${KWILT_SITE_URL}/oauth/consent` |
| `/authorize/approve` | POST | Consent UI callback, issues auth code (requires Supabase user JWT) |
| `/token` | POST | Authorization code exchange and refresh-token rotation |
| `/revoke` | POST | Revoke access or refresh tokens |
| `POST /` | POST | MCP JSON-RPC entrypoint (requires Bearer access token) |

PKCE `S256` is required for the consent step. The token endpoint accepts both
`S256` and `plain` to support older clients that don't yet hash.

The OAuth surface is submission-oriented:

- Discovery advertises `read` and `write` scopes plus `resource_indicators_supported`.
- `/authorize`, `/authorize/approve`, and `/token` accept the MCP `resource`
  indicator and validate it against the canonical server URL.
- Dynamic Client Registration supports confidential clients and public clients
  (`token_endpoint_auth_method: "none"`) for Cursor-style OAuth.
- Refresh-token grants rotate by issuing a new refresh token and revoking the
  previous token row.
- Declined consent redirects back with `error=access_denied` and does not issue
  an authorization code.

## Tools

The function dispatches owner-scoped read tools:

- `get_current_account`
- `list_arcs`
- `get_arc`
- `list_goals`
- `get_goal`
- `list_recent_activities`
- `get_current_chapter`
- `get_show_up_status`

When the token has `write` scope, `tools/list` also advertises write tools:

- `create_arc`, `update_arc`, `delete_arc`
- `create_goal`, `update_goal`, `delete_goal`, `add_goal_checkin`
- `capture_activity`, `update_activity`, `mark_activity_done`, `set_focus_today`, `delete_activity`
- `update_chapter_user_note`

Write tools create the same domain rows as the Kwilt app. Delete tools use the
same recoverable soft-delete model (`is_deleted`, `deleted_at`, `data: {}`).
Origin is recorded in `kwilt_external_capture_log`, not stamped onto the object.
Schemas live in `_shared/externalMcp.ts` and write helpers live in
`_shared/externalMcpWrite.ts`.

## Storage

State lives in tables created by
`supabase/migrations/20260509052000_kwilt_external_connector_foundation.sql`:

- `kwilt_external_oauth_clients` — DCR registrations
- `kwilt_external_oauth_authorization_codes` — short-lived auth codes
- `kwilt_external_oauth_tokens` — access tokens (with optional refresh hash)
- `kwilt_external_capture_log` — per-tool audit trail, including write object ids and idempotency hashes

Every table is service-role only; only `kwilt_external_capture_log` exposes an
owner-scoped `SELECT` policy.

## Local quick check

The local smoke script wraps the full flow end-to-end. Use it after deploying a
new revision:

```sh
MCP_BASE_URL=https://auth.kwilt.app/functions/v1/mcp \
SUPABASE_USER_JWT=<paste from a signed-in Kwilt session> \
  npm run mcp:smoke
```

This executes: metadata → DCR → `/authorize/approve` → `/token` → `tools/list`
→ `tools/call(list_arcs)`.

If you already have a long-lived access token, you can skip OAuth and just
exercise the tools:

```sh
MCP_BASE_URL=https://auth.kwilt.app/functions/v1/mcp \
MCP_ACCESS_TOKEN=<token> \
  npm run mcp:smoke
```

## Consent UI

The consent UI lives in the `kwilt-site` repo at `app/oauth/consent/page.tsx`
and is served at `https://go.kwilt.app/oauth/consent`. The function reads
`KWILT_SITE_URL` (default `https://kwilt.app`) and redirects users to
`${KWILT_SITE_URL}/oauth/consent` with the OAuth params. Production sets
`KWILT_SITE_URL=https://go.kwilt.app` so the consent UI runs on the go subdomain.

## Required edge function env vars

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — for DB writes
- `SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`) — for `auth.getUser` on the consent step
- `KWILT_SITE_URL` — where to redirect for consent
- `KWILT_MCP_ISSUER` (optional) — override the discovery issuer; defaults to the request origin
- `KWILT_POSTHOG_PROJECT_API_KEY`, `KWILT_POSTHOG_HOST` (optional) — for `ExternalConnectorInstalled` / `ExternalToolCalled` analytics

## Submission checklist

Use this before submitting to Claude, Cursor, Codex, or another remote MCP
directory/reviewer:

- Public server URL: `https://auth.kwilt.app/functions/v1/mcp`
- Transport: Streamable HTTP
- Authentication: OAuth 2.0 / OAuth 2.1-style authorization code with PKCE,
  Dynamic Client Registration, form-encoded token exchange, refresh-token
  rotation, and RFC 9728 protected-resource metadata.
- Privacy policy: `https://go.kwilt.app/privacy`
- Public docs: `https://go.kwilt.app/docs/connect-kwilt-to-ai-tools`
- Tool annotations: every tool has `annotations.title`, `readOnlyHint`,
  `destructiveHint`, and `openWorldHint`; read tools also set
  `idempotentHint`.
- Link openings: this MCP server does not use `ui/open-link`.
- Reviewer smoke gate:

```sh
MCP_BASE_URL=https://auth.kwilt.app/functions/v1/mcp \
SUPABASE_USER_JWT=<reviewer-user-jwt> \
MCP_SMOKE_WRITE=1 \
  npm run mcp:smoke
```
