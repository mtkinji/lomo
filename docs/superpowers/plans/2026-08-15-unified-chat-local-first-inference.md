# Unified Chat local-first inference implementation plan

**Goal:** Avoid paid inference for tiny social turns and narrowly bounded text-help tasks on Apple-Intelligence-capable iPhones, with automatic cloud fallback.

**Architecture:** Add a local Expo module around Apple's Foundation Models framework. Keep eligibility in tested TypeScript pure logic, expose a provider-neutral generation function, and inject that function into Unified Chat execution. The execution phase may choose an authored response or attempt a local task only after request policy and context requirements are known; all existing cloud/tool behavior remains the fallback and authority.

## Tasks

1. Add failing route tests covering authored turns, eligible local tasks, and every cloud-only boundary.
2. Add failing provider tests covering unavailable modules, successful generation, cancellation, and native failure fallback signaling.
3. Add the Expo module with iOS 26 availability checks, supported-locale checks, bounded generation, serialized execution, and cancellation.
4. Inject local generation into `runUnifiedChatTurn` and add integration tests proving successful authored/local responses do not call `sendCoachChat`, while local failure does.
5. Add content-free operational telemetry for route and fallback outcomes.
6. Run focused Jest tests, Swift/native compile validation where available, `npm run verify:changed -- --run`, and a final diff review. Preserve physical-device verification as an explicit release gate.
