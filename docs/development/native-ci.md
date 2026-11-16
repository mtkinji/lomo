# Native CI feedback and release evidence

The E2E (Maestro) workflow separates a reusable iOS Debug host from the current
checkout's JavaScript and assertions. A failed UI test no longer discards a
successful native compilation. This changes feedback cost, not the release gate.

## Dispatch scope

```sh
# Complete isolated release acceptance, including all 4,000 Budget rows:
gh workflow run e2e-maestro.yml --ref BRANCH -f suite=acceptance -f group=all -f workspace_flow=all

# Diagnose only the failing onboarding interaction:
gh workflow run e2e-maestro.yml --ref BRANCH -f suite=smoke -f group=workspace -f workspace_flow=onboarding-plan-ready-touch-regression

# Quick Accounts/Budgets navigation and real refresh gesture:
gh workflow run e2e-maestro.yml --ref BRANCH -f suite=smoke -f group=budget
```

Smoke or a selected group is diagnostic evidence, never full release acceptance.
The summary explicitly reports the distinction. The scheduled authenticated suite
remains separate and needs its own test identity/environment. Isolated fixtures do
not prove live backend integration, signed-device behavior or TestFlight delivery.

## Native host compatibility

After clean prebuild, Expo fingerprints native source/configuration and dependencies.
The host key additionally includes resolved `Podfile.lock`, local modules/plugins/
patches, npm lock, build helper/recipe, Xcode, Simulator SDK and architecture.
Generated Xcode UUIDs and build directories are excluded. A changed native contract
requires a new build; test YAML and ordinary app JS can use a compatible host.

There are no partial native cache fallback keys. A receipt records the original
native commit and archive checksum. Restore verifies compatibility and checksum;
the test job verifies the producer's key and its own toolchain before installation.
The summary separately records the current JavaScript commit. Cache corruption is
a failure, not permission to run an unknown binary. `force_native_build=true`
bypasses restore when diagnosing native build behavior.

The host is saved before UI testing and published as a same-run artifact. GitHub
cache eviction still causes a cold compile. Metro's separate transform cache is
content-addressed and may restore from an older commit with matching configuration.

## Fixture startup and diagnostics

The runner warms the exact launch asset from Expo's manifest before UI assertions.
Fixture projects are npm workspaces so assets resolve from the repository root.
A fixture-only loopback server serves that resolved manifest for the duration of
the run, avoiding repeated asset/schema resolution during app launches. The actual
app bundle and real interaction assertions still run in the Simulator. Cleanup
stops both servers. This transport does not sign in or change the production app.

Each group uploads its diagnostics immediately, including Metro logs, Maestro
screenshots and `timings.tsv` (manifest, bundle, UI durations/status). Workspace
startup stops waiting when Expo displays a loading error, then fails the required
fixture assertion. There are no assertion retries to hide failing behavior.

Read the first failing screenshot and native log before rerunning. Use a focused
scope to reproduce it. After a correction passes, run complete acceptance for the
actual integration candidate. Do not substitute an earlier commit or focused run.

## Feedback budget and proof

Report queue time separately from compute. Record native cache hit/miss, setup,
bundle and test timings. The target is warm focused feedback under ten minutes;
this is a target until measured on hosted runners. Cold compilation can still take
about 25 minutes. Prove both a cold build and an exact cache hit before calling the
latency improvement validated. Cached native builds never prove current JS passed.

Local runtime ownership remains one checkout/Simulator at a time. Record checkout,
branch, dirty state, JS commit, native build provenance and Metro port 8081. Cache
and generated diagnostics are excluded from Git and EAS uploads.
