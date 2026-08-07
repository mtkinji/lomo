# Recipe import corpus evidence

## Proof available

- A 50-case rights-respecting structural manifest lives at
  `scripts/fixtures/recipe-import/corpus-manifest.mjs`. It covers JSON-LD,
  prose-only, paywall/error, multi-recipe pages, long family posts,
  fractions/ranges/sections, adversarial page instructions, and partial
  extraction. Its URLs are non-routable and it stores expected structure only,
  never copied recipe expression.
- Executable deterministic HTML fixtures currently prove two JSON-LD shapes.
  Deno tests prove URL allowlisting, local/private-network rejection, unknown
  field rejection, size bounds, literal ingredient/instruction preservation,
  and page-script isolation.
- Photo/text extraction uses a strict JSON schema, evidence rows, bounded output,
  zero temperature, and a prompt that forbids filling missing facts.
- Import review exposes source evidence for uncertain fields and requires an
  explicit private-copy choice before idempotent approval.
- The migration creates a non-public, owner-scoped `recipe-import-artifacts`
  bucket. Draft rows and artifact references expire after seven days.

## Proof not yet available

The 50-case manifest is a deterministic privacy/correctness harness, not a
live-publisher accuracy benchmark. There is no provider credential in this
worktree, so field accuracy, median/P95 extraction latency, signed upload,
offline interruption, scheduled artifact purge, and complete remote deletion
remain gated. Those must be measured with consented/user-owned sources and a
linked non-production backend before enabling photo import broadly.
