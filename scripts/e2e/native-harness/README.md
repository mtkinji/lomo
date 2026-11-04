# Isolated app native smoke tests

This Expo project is loaded into the existing Debug development client. It never
imports the real app config or its dotenv cascade. Set `KWILT_MAESTRO_APP_FIXTURE`
explicitly to one of:

- `auth`: mounts the unchanged `App.tsx`, with loopback Supabase configuration and
  a literal fake publishable key. Verifies the signed-out screen without provider
  login, production access, or an auth bypass.
- `workspace`: mounts the production root navigator, workflow feedback and
  onboarding/celebration overlay hosts. App storage is in memory, and no identity
  or session is forged. The dev tools create local deterministic data. This is
  UI integration evidence, not authenticated app/backend acceptance.

Both modes hide Expo’s developer floating button on the disposable test host;
its invisible native hit area can otherwise intercept drawer-close taps.
Both modes install external fetch/XHR guards before app modules load. Metro and
loopback requests are allowed. The dummy backend endpoint has no server: this
fixture does not supply data API responses or claim backend integration coverage.
Native asset loading is not intercepted by those JavaScript guards.

Use the repository runner so Metro ownership, bundle readiness and diagnostics
are retained:

```sh
KWILT_MAESTRO_APP_FIXTURE=auth SIMULATOR_ID=<installed-simulator> \
  bash scripts/e2e/run-maestro-ios.sh e2e/maestro/auth-gate-smoke.yaml
KWILT_MAESTRO_APP_FIXTURE=workspace SIMULATOR_ID=<installed-simulator> \
  bash scripts/e2e/run-maestro-ios.sh \
  e2e/workspace-fixture/smoke-devtools.yaml \
  e2e/workspace-fixture/onboarding-plan-ready-touch-regression.yaml \
  e2e/workspace-fixture/arc-banner-touch-regression.yaml \
  e2e/workspace-fixture/activity-detail-key-actions.yaml
```

Workspace flows wait for the production navigator's ready event, dismiss the
initial local coachmark if present, then use the existing dev-only deep link.
They retain the legacy interaction assertions; the runner regression verifies
that parity. The original flows remain in `e2e/maestro` for their existing use.
The smoke workflow runs auth, workspace and Budget as independent steps after
installation so one failure cannot erase the others' results. The broader nightly
suite's authenticated/backend setup is not replaced by this isolated smoke suite.

The harness is not imported by the production app. Native host build provenance,
fixture JavaScript revision, local versus hosted OS version, physical-device and
TestFlight evidence must continue to be recorded separately.
