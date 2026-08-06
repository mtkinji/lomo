# Household Food job funnel

Food analytics measure job transitions, not household content. Never capture
recipe or ingredient text, source URLs, images, raw voice/audio/transcripts,
private family responses, prices or budgets, coupon tokens, retailer credentials,
notes, or provider response bodies.

| Job step | Entry | Success | Useful failure dimensions |
|---|---|---|---|
| Save a recipe | `recipe_import_started` | `recipe_import_approved` | method, validation/provider/connectivity outcome, duration bucket |
| Understand it | `recipe_home_viewed` | add-to-plan or cook start | source surface, offline state |
| Build next meals | `meal_plan_horizon_selected` | `meal_plan_finalized` | horizon kind, candidate/response counts, stale/permission/connectivity |
| Build and review list | `grocery_list_compiled` | `grocery_list_reviewed` | item count bucket, correction count, stale/validation |
| Improve economics | `grocery_savings_reviewed` | savings choice or keep-current | evidence coverage bucket, provider, evidence stale/ineligible |
| Hand off shopping | `retailer_handoff_prepared` | `retailer_handoff_opened` | provider, disabled/rate-limit/ambiguous/connectivity |
| Cook | `cook_session_started` or resumed | `cook_session_completed` | cue/timer counts, voice mode/fallback, permission/connectivity |

Every event may carry `proof_level`: `fixture`, `source_test`, `simulator`,
`signed_device`, `provider_sandbox`, or `testflight`. This describes evidence;
it does not upgrade one environment into another.
