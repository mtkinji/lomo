# Evaluate Learning: Analytics consent

Learn whether the choice is understandable, starts on for a fresh install, preserves explicit withdrawal across version changes, and stops all optional requests after withdrawal and relaunch.

Evidence: automated state/runtime/UI tests plus signed-build network inspection for fresh install, opt-in, withdrawal, relaunch, sign-out, and account switching. Do not instrument the consent interaction in PostHog; doing so would undermine the boundary being tested.

Proceed when the signed candidate shows the documented default-on request boundary and none after withdrawal. Revise if the control is unclear or any SDK request escapes the withdrawal gate. Reinstall is documented to return to default-on because app-local storage is removed.
