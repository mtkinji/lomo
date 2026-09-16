# Frame — external agent completion receipts

## Product frame

- Audience: `audience-ai-native-life-operators`
- Representative persona: Nina
- Hero JTBD: `jtbd-trust-this-app-with-my-life`
- Supporting JTBD: `jtbd-stay-in-control-of-ai-actions`
- Underserved job-flow steps: 6–10 in `nina-trust-ai-with-my-life-system` — review in proportion to risk, apply idempotently, receive an authoritative receipt, reach the exact native destination when useful, and recover without starting over.

## Offered idea

MCP calls should finish in the agentic surface that initiated them. Kwilt Home may quietly confirm completed work, but MCP must not create a Kwilt Chat or turn Home into an approval queue.

## Constraint posture

- **Bend the system:** reviewed external writes need a server-owned continuation that ChatGPT/Codex can confirm and apply without a mobile-only executor.
- **Fit the system:** completed external writes already have an owner-scoped audit trail. Home should project that truth instead of creating a second notification model.

## Aspirational challenge

How might we let Nina finish a safe Kwilt change entirely in ChatGPT or Codex, then give her calm, trustworthy proof in Home without adding another inbox, dashboard, or conversation?

## Product invariants

1. External tool calls never create a visible Kwilt Chat.
2. Reads return directly to the originating agentic surface.
3. Low-risk writes apply atomically and return a receipt there.
4. Consequential writes preview, confirm, apply, and return a receipt there.
5. Native/provider handoff is reserved for work that intrinsically requires that owner.
6. Home shows terminal completed writes only. It never owns approval, retry, or failure recovery.
7. A repeated idempotent call produces one Home receipt, not duplicate noise.

## Three-second read

“Kwilt shows me what my AI apps finished, and nothing here needs my attention.”
