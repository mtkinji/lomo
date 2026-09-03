# Analytics consent

Kwilt treats PostHog product analytics as part of the standard app service and
enables it by default after local preferences hydrate. This continues Kwilt's
previously approved product posture. The owner explicitly accepted the policy
risk of not requiring a separate opt-in before product-analytics collection.

The user can enable, withdraw, or renew consent in **Settings → Legal & privacy →
Optional analytics**. Withdrawal removes the app's active client immediately,
clears queued event, AI, and log payloads, resets the PostHog identity, and opts
the SDK out. The withdrawn choice persists across relaunch and account changes.
Uninstalling the app removes the local preference; a reinstall therefore returns
to the default-on state. A disclosure-version change does not silently reverse
an explicit grant or withdrawal.

Optional analytics uses the bounded event schemas and global sanitizer described
in [`instrumentation-map.md`](instrumentation-map.md). It must never include
user-authored writing, financial values, messages, recipes, household content,
precise location, credentials, or tokens. Kwilt features must use deterministic
fallbacks when PostHog feature flags are unavailable and cannot require consent.

Essential account security and service-delivery records are not routed through
this optional PostHog client. Supabase authentication, authorization, sync,
purchase, deletion, and server-security records remain limited to providing and
protecting the requested service. Crash diagnostics, if enabled in a submitted
build, must be disclosed and controlled according to their own documented
collection policy rather than silently inheriting product-analytics consent.
