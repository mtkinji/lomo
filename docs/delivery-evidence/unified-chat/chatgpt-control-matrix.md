# Live ChatGPT connector control matrix

Captured: 2026-08-30 00:26 UTC

## Provenance

- Checkout: `/Users/andrewwatanabe/Kwilt`
- Branch: `codex/chat-parity-next`
- Backend: Supabase project `sqxwjtorodqjdfnuvprf`
- Hosted MCP endpoint: `https://auth.kwilt.app/functions/v1/mcp`
- Deployed MCP function: version 44, active, deployed 2026-08-30 00:19 UTC
- Deployed function SHA-256: `5116a5c8883c4833659e75cfc7df0444080ac65ffa23fa6c3db5a4b14bc8f9db`
- Canonical public catalog: 223 tools, SHA-256 `e17fa013eab46b784b9b59023cb445e012b4e07eb513a488bad834ac880dc4dc`
- ChatGPT app: `Kwilt`, development version `dev mode`, app id `asdk_app_6a8faaa1584081919724b8362e9d0363`
- ChatGPT reported OAuth authorization in use; connected 2026-08-26.

## Current live results

| Contract | Result | Evidence |
| --- | --- | --- |
| Protected-resource discovery | Passed | Canonical resource, authorization server, and all eight capability scopes returned over HTTPS. |
| Authorization-server discovery | Passed | Authorization, token, registration, and revocation endpoints; S256 PKCE; resource indicators. |
| Unauthorized request challenge | Passed | Unauthenticated `initialize` returned HTTP 401 with the RFC 9728 protected-resource metadata challenge. |
| Existing ChatGPT OAuth connection | Passed | ChatGPT management UI reports OAuth supported and OAuth used for the canonical endpoint. |
| Initial ChatGPT catalog snapshot | Failed, diagnosed | The installed snapshot exposed only 26 legacy Life tools. |
| Initial refreshed ChatGPT catalog | Failed, diagnosed | Refresh exposed 197 canonical tools plus 26 compatibility aliases; 26 canonical names were not advertised. |
| Canonical catalog correction | Passed in production | MCP version 43 advertises all 223 canonical names and no aliases. ChatGPT's refreshed list matched the source catalog exactly by count and SHA-256. Compatibility aliases remain accepted but are not advertised. Focused connector tests: 3 suites, 53 tests, passed. |
| Authenticated account/Household binding | Passed | In a fresh ChatGPT conversation, an explicitly authorized read-only request reached the intended connected Kwilt account and Household. The reply was limited to the requested identity confirmation and a Household count/role summary. |
| Representative private read | Passed | ChatGPT used the Kwilt app to read profile and Household information, returned the requested result, and reported no change. Edge logs recorded the corresponding successful authenticated MCP version 43 requests at 20:41 UTC. |
| Representative direct write | Passed | ChatGPT created exactly one explicitly authorized, clearly labeled temporary To-do and returned both a Kwilt mutation receipt and the created item identifier. A separate read retrieved the exact title and `Planned — not completed` state. |
| Reviewed-write staging | Passed | Deleting the temporary To-do produced one pending proposal with no mutation receipt. ChatGPT did not claim that the item was deleted. |
| Reviewed-write approval in ChatGPT | Expected boundary, incomplete outcome | The connector does not expose proposal approval as an external tool. ChatGPT truthfully reported that the proposal remained pending and that approval must occur in Kwilt. Current architecture keeps authoritative apply, receipt, and undo in native Kwilt for this proposal family. |
| Native handoff staging | Passed | ChatGPT staged one account-bound `open_capability` client action for the exact temporary To-do. Production persistence showed the action in `pending_client_action` state. |
| Native handoff arrival | Passed on the account-bound physical iPhone | A fresh navigation-only `open_capability` request for To-dos reached the signed-in physical iPhone and rendered the exact `Open To-dos` action with the consequence `This only opens To-dos. Nothing changes.` The different-account Matrix Simulator correctly did not receive it. |
| Native handoff presentation | Failed in the installed phone build; fix deployed and build uploaded | The installed build rendered the correct inline action card, but also auto-opened a duplicate bottom sheet and exposed synthetic connector request/response text. Source now removes the automatic sheet and filters external handoff bookkeeping from the customer timeline. MCP version 44 contains human fallback connector copy. TestFlight build `1.0.112 (112)` finished and Apple accepted the upload; Apple processing and post-install physical proof remain pending. |
| Native handoff completion | Not yet proven | The bottom sheet was dismissed without opening To-dos. The final native transition and ChatGPT-observed receipt still require a post-deployment physical-device run. |
| Test cleanup | Completed administratively, not product proof | The exact temporary To-do was soft-deleted with ID/title guards; its pending proposal was rejected and its pending client action declined. A final ChatGPT read confirmed the item was no longer available as an active To-do. This cleanup is not counted as ChatGPT, native-review, receipt, or undo proof. |

## Still required

- After Apple finishes processing TestFlight build `1.0.112 (112)`, install it and repeat the same-account handoff. Verify that only the timeline card appears, tapping `Open` reaches To-dos, and ChatGPT observes the final receipt without claiming completion early.
- Verify refresh-token rotation, read-only and missing-write scopes, revocation, wrong-Household refusal, expired handoff, duplicate request, provider outage, and retry.

Successful discovery, OAuth connection, or `tools/list` is not action coverage.
