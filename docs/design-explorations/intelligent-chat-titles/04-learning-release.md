# Learning Release: Intelligent Chat Titles

## Concept To Build
Automatically name a new Chat from its opening exchange and refine that name when older history is compressed into durable understanding.

## Capability Delta
Today, new conversations remain `New chat` unless manually renamed. After this release, recognizable titles emerge automatically and can mature at compression time. Manual names remain authoritative.

## User Experience
The user simply chats. The first useful title appears after the opening response. Much later, compression may quietly refine it. Choosing Rename freezes automatic naming for that thread.

## Buildable Slice and release channel
Model title suggestions, strict normalization, durable title-source migration, owner-scoped conditional updates, current-screen refresh, focused tests, and the next normal TestFlight build after local verification.

## Guardrails and reversibility
Title generation runs in the background and never blocks a response. Failure leaves the existing name intact. The source column makes behavior reversible and prevents automation from winning over user intent.

