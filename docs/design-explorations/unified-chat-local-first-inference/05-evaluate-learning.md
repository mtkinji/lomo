# Evaluate Learning: Unified Chat local-first inference

Dogfood the authored, local-success, unavailable, unsupported-locale, cancelled, and local-error paths.

Record only operational metadata: selected route, task kind, availability/fallback reason, duration bucket, completion/cancellation, app version, and device capability. Do not log the prompt or generated response for this evaluation.

Expand eligibility only when representative prompts preserve usefulness and tone, local p95 improves perceived latency, fallback is reliable, and the successful local route is proven not to make a paid model request. Narrow or disable a task kind if quality, energy, thermal, or memory behavior is unacceptable.
