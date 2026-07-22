# Production platform proof — 2026-07-22

- App base SHA: `bf0500189807f97c3f2effcdd4d39bcfbc37af0d` with the Unified Chat implementation still uncommitted in its isolated worktree.
- Site base SHA: `b6e06db21b23e3e2ba66b93a6257e1967ec01754` with the Unified Chat implementation deployed from its isolated worktree.
- Hosted workbench deployment: `dpl_DzBJXu57uhbkh1qjT6jknLzcDr8n`, production-promoted, READY.
- Production deployment URL: `https://kwilt-site-1lqjt8dk6-andys-projects-d85f8feb.vercel.app`; `https://go.kwilt.app` was aliased by the deployment, and the app-consumed `https://www.kwilt.app/embed/chat` served the same revised row-tap/swipe-delete surface in the signed simulator.
- Supabase project: Kwilt (`sqxwjtorodqjdfnuvprf`), ACTIVE_HEALTHY.
- Applied migration: `20260722151037_unified_chat_trust_contract`.
- Applied migration: `20260722154051_unified_chat_text_attachments`.
- Applied migration: `20260722163951_unified_chat_atomic_transitions`.
- Deployed function: `unified-chat-transcribe`, version 1, ACTIVE.

Observed production checks:

- all eight new trust tables report RLS enabled;
- 32 owner policies exist across those tables;
- atomic proposal-decision and message-feedback RPCs resolve in Postgres;
- the rollback-only live SQL contract rejected cross-user reads, cross-user parent references, and duplicate capability idempotency keys;
- the same live contract proved attachment owner isolation and duplicate-request idempotency; the attachment table reports RLS enabled with three policies;
- the rollback-only live contract proved run and proposal transitions update their versioned state and append the matching ordered event in one transaction, while replayed stale transitions are rejected;
- an unauthenticated transcription request returns HTTP 401 with the expected safe error;
- Supabase edge logs record that request against function version 1, and the promoted Vercel deployment reports no error-level logs in the verification window;
- the initialized production workbench has no framework error overlay and exposes removable context, Add context, persisted and pending text documents, document removal, attachment picking, retry, microphone, composer, and send controls;
- [production-workbench.png](production-workbench.png) contains only deterministic fixture content.
- [production-attachments.png](production-attachments.png) contains only deterministic attachment fixture names and visually proves the production attachment states.
- the current production workbench renders created To-dos as the compact inventory row, removes Inspect/Undo buttons, supports row-tap native opening, and reveals Delete on swipe-left.

This is backend and hosted-surface evidence. It does not substitute for the signed simulator and physical-device passes required by a score of 5.
