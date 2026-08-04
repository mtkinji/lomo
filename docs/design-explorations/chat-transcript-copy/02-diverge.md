# Diverge: Chat Transcript Portability

Axis: local owner-controlled handoff versus durable hosted sharing.

## A. Copy visible transcript

Add `Copy chat` to the current overflow menu. It writes a readable Markdown transcript to the device clipboard. Strongest system and privacy fit; best for immediate Codex handoff. It fails when the destination is on another device without clipboard continuity.

## B. Native share sheet

Add `Share chat…` and pass the transcript to iOS. This reaches more destinations but adds a second decision surface and makes accidental disclosure easier. It is best when users frequently send transcripts to people or files.

## C. Private hosted link

Create a URL with authenticated or capability-token access, expiration, and revocation. It is convenient across devices but requires a new sharing model, backend storage/access policy, and clear recipient expectations. It is best only after repeated evidence that clipboard or native sharing is insufficient.

All three leave Arcs, Goals, Activities, and Chapters unchanged, do not block capture, avoid default-public sharing, and introduce no anthropomorphic AI behavior. Option C is rejected for this release because its privacy semantics are the product, not implementation detail.
