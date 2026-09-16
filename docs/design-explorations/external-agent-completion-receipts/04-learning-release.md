# Learning release

## Implemented slice

- External-only durable threads carry `visible_in_chat = false`; Chat queries require `visible_in_chat = true`.
- Home derives a maximum of three completed external-write receipts from the existing owner-scoped connection audit.
- Pending proposals, native handoffs, reads, failures, and repeated idempotent calls do not appear.
- The Home region is static evidence with no approval, retry, unread, or dismiss controls.
- DevTools Home preview includes fictional Codex and ChatGPT receipts for repeatable native review.

## Proof boundary

Rendered on the iPhone 17 Pro / iOS 26.5 Simulator from the normal `main` checkout using the existing Metro server. This proves the local native composition only. It does not prove a deployed migration, deployed Edge Function, TestFlight build, production data, physical-device accessibility, or catalog-wide MCP continuation.

Rendered capture: [`mockups/ios-home-preview.png`](mockups/ios-home-preview.png)
