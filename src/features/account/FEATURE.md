---
feature: account
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-trust-this-app-with-my-life
  - jtbd-invite-the-right-people-in
  - jtbd-capture-and-find-meaning
  - jtbd-move-the-few-things-that-matter
  - jtbd-see-my-arcs-in-everyday-moments
briefs:
  - ai-proxy-and-quotas
  - external-ai-connector
  - monetization-paywall-revenuecat
  - notifications-v1-5
  - social-goals-auth
status: shipped
last_reviewed: 2026-05-13
---

# account

Helps Nina trust Kwilt enough to connect identity, destinations, subscriptions, notification preferences, and AI settings without losing control of the system.

## Surfaces in this folder

- `SettingsHomeScreen.tsx` - entry point for account and app-level configuration.
- `AuthPromptDrawerHost.tsx` and `ProfileSettingsScreen.tsx` - identity and sign-in posture.
- `ManageSubscriptionScreen.tsx` and `ChangePlanScreen.tsx` - plan and entitlement management.
- `DestinationsLibraryScreen.tsx`, `DestinationDetailScreen.tsx`, `ConnectCursorScreen.tsx`, `McpServerScreen.tsx`, and `ConnectedToolsScreen.tsx` - external execution, connector configuration, action history, and revocation.
- `NotificationsSettingsScreen.tsx`, `SharingSettingsScreen.tsx`, `AiModelSettingsScreen.tsx`, and `ExecutionTargetsSettingsScreen.tsx` - controls that keep automation permissioned.

## Notes

This folder is a trust surface. It should make identity, billing, AI, sharing, and destinations inspectable and reversible before it makes them powerful.
