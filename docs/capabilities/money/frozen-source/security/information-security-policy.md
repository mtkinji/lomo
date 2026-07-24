# Information Security Policy

Owner: Andrew Watanabe  
Applies to: Kwilt Money and shared Kwilt Labs systems that process user data  
Status: active baseline  
Last updated: 2026-06-24

## Purpose

Kwilt Labs protects user data by limiting access, keeping private credentials
out of source code and client bundles, using managed infrastructure, and
treating financial data as sensitive by default. This policy is intentionally
lightweight for an early-stage company, but it is operational: production access
and development practices should follow these rules.

## Current Operating Context

Kwilt Labs currently operates a small, founder-led product stack:

- Mobile apps are built with Expo/React Native and distributed through EAS,
  TestFlight, and Apple platform tooling.
- Authentication, database, storage, and server-side functions are centered on
  Supabase, including the custom Supabase domain `auth.kwilt.app`.
- Server-side application code runs primarily through Supabase Edge Functions.
- Payments/subscription entitlements use RevenueCat and Apple platform billing.
- Product analytics use PostHog when enabled for production builds.
- Email delivery uses Resend for supported product and operational email.
- AI calls are routed through a Supabase Edge Function proxy so model-provider
  API keys are not embedded in the mobile app.
- Kwilt Money plans to use Plaid Transactions for account and transaction data.

Because Kwilt Labs is early-stage, the information security owner is currently
the primary control owner for access review, incident response, vendor access,
and production changes.

## Data Covered

Sensitive data includes:

- User-generated Kwilt content, including goals, activities, notes, chapters,
  shared-goal data, attachments, and related metadata.
- Optional health, calendar, location, notification, and Screen Time-related
  data when users enable those features.
- Plaid access tokens or equivalent financial-data provider credentials.
- Linked financial institution and account metadata.
- Raw and normalized transactions.
- Merchant, category, meter-assignment, and review history data.
- Supabase service-role keys, provider API secrets, webhook secrets,
  deployment tokens, Apple/Expo credentials, and similar private credentials.
- User identifiers and authentication data.

Client-safe public keys, such as Supabase publishable/anon keys or PostHog
project keys, may be embedded in client builds when intended by the provider.
They are still configuration values, but they are not treated as private
credentials. Service-role keys, provider secrets, OAuth client secrets, webhook
secrets, Plaid access tokens, and model-provider API keys must never be embedded
in the client.

## Access Control

- Production systems must use unique user accounts where supported.
- Multi-factor authentication must be enabled for systems that support it.
- Access should follow least privilege: users and services get only the access
  needed for their role.
- Shared accounts should be avoided. If a platform requires a shared account,
  credentials must be stored in an approved password manager.
- Production access should be reviewed when roles change, contractors leave, or
  sensitive systems are added.
- Supabase service-role access must be limited to server-side code paths,
  administrative scripts, or provider dashboards where it is required.
- Financial-data provider dashboards and credentials must be limited to people
  who need them for development, operations, support, or incident response.

## Secret Management

- Secrets must not be committed to source control.
- `.env` files are local-only and must be ignored by git. Checked-in
  `.env.example` files may contain placeholders and client-safe sample values
  only.
- Production secrets should be stored in the hosting/platform secret manager or
  another appropriate secure store, such as Supabase Function secrets, GitHub
  Actions secrets, EAS/Expo credentials, Apple credentials, or provider
  dashboards.
- Server-side provider credentials, including OpenAI/model-provider keys,
  Supabase service-role keys, Plaid secrets/access tokens, Resend keys,
  RevenueCat webhook secrets, Slack webhooks, and deployment tokens, must not be
  shipped in client code.
- Expiring provider secrets should be tracked through the existing Kwilt secret
  expiration workflow where practical. The workflow stores secret names and
  expiry metadata, not secret values.
- Plaid, Supabase, Apple, Expo/EAS, GitHub, RevenueCat, Resend, model-provider,
  and deployment credentials should be rotated if there is reason to believe
  they were exposed.

## Application And Database Security

- Supabase Auth is the canonical cloud identity layer for signed-in Kwilt
  surfaces. Mobile auth uses PKCE-style flows and persistent device sessions.
- Supabase Postgres tables that store user or sensitive product data should use
  Row Level Security policies or server-side authorization through Edge
  Functions.
- Public, webhook, callback, and scheduled Edge Functions may disable platform
  JWT verification only when they perform route-specific validation, such as
  bearer-token validation, signed webhook validation, secret headers, one-time
  tokens, or constrained public read behavior.
- New tables that store user data should define ownership, membership, or
  service-only access rules before production use.
- Storage objects that contain user data should be accessed through authenticated
  or server-authorized flows unless the object is intentionally public.

## Financial Data Handling

- Kwilt Money should request only the Plaid products needed for the product
  purpose. The initial product request is Transactions only.
- Financial data should be used only to power user-facing budget meters,
  transaction normalization, merchant/category matching, meter assignment, and
  related security/support workflows.
- Kwilt Money should not use Plaid data for lending, credit decisions,
  payments, collections, or sale to third parties.
- Plaid access tokens and provider item identifiers must be stored server-side,
  not in the mobile app.
- Raw provider records should be retained only as long as needed for sync,
  debugging, user-visible history, or compliance with product obligations.
- User-approved meter assignment should be stored separately from provider
  category hints so user intent remains the source of truth.
- Before production financial-data access, Kwilt Money should define retention,
  deletion, logging, and support-access expectations for Plaid-linked data.

## Development Practices

- Code changes that touch authentication, provider credentials, financial data,
  sync, permissions, or production infrastructure should receive extra review
  before broad release.
- Local development should use sandbox/test credentials whenever possible.
- Production data should not be downloaded to local machines unless necessary
  for a specific support or debugging task.
- Logs should avoid storing secrets, full access tokens, or unnecessary
  sensitive financial details.
- Analytics instrumentation should avoid user-entered free-form content and
  sensitive financial transaction details. Event properties should prefer ids,
  counts, statuses, and coarse product states.
- Changes should pass the relevant repo verification commands before release,
  such as TypeScript checks, tests, product lint, architecture lint, Supabase
  function checks, or targeted verification commands.
- Production mobile releases should use the established EAS/TestFlight/App Store
  delivery path and should verify build environment configuration before upload.

## Vendor And Infrastructure Controls

Kwilt Labs uses established vendors for core infrastructure where possible,
including:

- Supabase for authentication/database infrastructure.
- Plaid for financial-account connection and transaction sync.
- RevenueCat and Apple for subscription entitlement and billing flows.
- PostHog for production analytics when enabled.
- Resend for email delivery.
- GitHub Actions for CI and release automation.
- Expo/EAS and Apple App Store Connect for mobile build/signing/submission.
- Apple platform controls for iOS distribution and Screen Time capabilities.

Vendor credentials and dashboards should use MFA and least-privilege access
where available.

## Current Verification And Monitoring Practices

- The Kwilt mobile repo has CI for TypeScript checks, test typechecks, product
  taxonomy lint, architecture lint, and Jest coverage.
- The Kwilt mobile repo includes scheduled/manual workflows for Maestro and
  visual regression checks.
- Supabase migrations are kept in source control and many user-data tables use
  RLS policies in migrations.
- A Supabase secret-expiration monitor exists for tracking provider secret
  metadata and warning before configured secrets expire.
- PostHog and database reads are used for product/usage diagnostics, with
  Supabase treated as the operational source of truth when analytics are noisy.

## Monitoring And Incident Handling

- Security issues, suspected data exposure, credential leaks, or suspicious
  production access must be treated as incidents.
- Incidents should follow the process in
  [incident-response.md](incident-response.md).
- The security owner is responsible for triage, containment, communication, and
  post-incident follow-up.
- For provider-specific incidents, the response should include provider-side log
  review and credential rotation where available.

Access-control details are maintained in
[access-control-policy.md](access-control-policy.md).

## Review Cadence

This policy should be reviewed:

- before requesting or expanding production access to financial-data providers,
- after material architecture changes,
- after a security incident,
- at least annually while the product is active.

## Not Currently Claimed

This policy does not claim that Kwilt Labs currently has SOC 2 certification,
ISO 27001 certification, a dedicated security team, SSO across all vendors, a
formal SIEM, annual third-party penetration testing, or company-wide employee
security training. Those controls may be added as the product and team mature.
