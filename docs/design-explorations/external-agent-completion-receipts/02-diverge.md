# Diverge — Home receipt directions

## A. Recently done stack — chosen

A small Home header region shows up to three completed external changes. Each row carries a quiet completion mark, concise result, source app, and relative time. It is informational by default.

- Strengths: immediate trust, bounded footprint, no new navigation model.
- Risk: could feel like a dashboard if the stack grows or gains status chrome.
- Guardrail: completed-only, three-item cap, no unread state, no approval actions.

## B. Full activity timeline

Merge external actions into the chronological Home feed.

- Strengths: one temporal story.
- Rejected: system events would compete with personal moments and shared-life content; repetition would turn Home into an audit log.

## C. Capability-local confirmation only

Show a small “changed through Codex” marker only on the affected object.

- Strengths: perfect local context and low Home clutter.
- Rejected as the sole solution: the user may not know where the object landed, and many operations lack a stable native detail destination.

## D. Push notifications

Send an OS notification for every completed external write.

- Strengths: immediate awareness outside Kwilt.
- Rejected: too interruptive for requested work the user just observed completing in another foreground surface.
