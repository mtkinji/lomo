# CI failures checklist

This is a quick triage guide for common CI failures in Kwilt.

---

## 1) CI (typecheck + Jest)

### Typecheck failures (`npm run lint`)
- Inspect the TypeScript error in the CI logs.
- Reproduce locally with `npm run lint`.
- Fix the type error or update typing assumptions.

### Jest failures (`npm run test:ci`)
- Run locally: `npm run test:ci`.
- If a test is flaky, isolate it by running the specific test file.
- Check for nondeterministic time, random IDs, or unmocked network calls.

### Coverage threshold failures
- Coverage is intentionally low at first and will ratchet upward.
- Add tests for logic layers: `src/domain`, `src/services`, `src/store`, `src/utils`.

---

## 2) Maestro E2E failures

- Confirm the app boots locally and DevTools is reachable.
- Run the same flow locally:
  - `maestro test e2e/maestro/<flow>.yaml`
- Common causes:
  - `testID` changed or removed
  - screen context is different (e.g., not on a root screen)
  - keyboard or drawer animations not finished when a tap occurs

---

## 3) Visual regression failures

### If the change is expected
- Re-run the visual flows locally.
- Update the baseline:
  - `npm run visual:collect`
  - `npm run visual:update`
- Commit the updated images under `e2e/visual-baseline/`.

### If the change is unexpected
- Inspect the CI artifact: `visual-regression-artifacts`.
- Fix the UI regression, then re-run CI.

---

## 4) Slack alerts

- Failures post to Slack when `SLACK_WEBHOOK_URL` is configured.
- If Slack is silent, confirm the repo secret exists and is valid.


