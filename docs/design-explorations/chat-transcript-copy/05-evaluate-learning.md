# Evaluate Learning: Chat Transcript Copy

## Learning questions

- Does one local copy action remove the screenshot and turn-by-turn handoff friction?
- Is the Markdown transcript immediately legible to Codex?
- Are title, roles, timestamps, and attachment names enough context without exporting hidden records?

## Evidence plan

Support: Andrew uses the action on several real chats and can paste each transcript into Codex without reconstruction.

Disconfirm: clipboard continuity is unreliable, the transcript is too large or noisy, or cross-device/collaborator sharing remains the dominant friction.

## Instrumentation

Use direct dogfood observation and qualitative notes. Do not log transcript content or clipboard contents.

## Decision rule

Keep the local action if it supports repeated feedback handoffs. If destination friction persists, test a native share sheet next. Consider a hosted link only with an explicit private-sharing and revocation design.
