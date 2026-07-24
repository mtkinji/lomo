# Access Control Policy

Owner: Andrew Watanabe  
Applies to: Kwilt Money and shared Kwilt Labs systems that process user data  
Status: active baseline  
Last updated: 2026-06-24

## Purpose

Kwilt Labs limits access to production systems, sensitive user data, financial
data, source code, deployment credentials, and vendor dashboards to the people
and services that need that access to build, operate, support, or secure the
product.

This policy is designed for a founder-led early-stage company. It establishes a
practical access-control baseline without claiming enterprise controls that are
not yet in place.

## Scope

This policy applies to:

- Kwilt Money systems and related shared Kwilt Labs infrastructure.
- Supabase projects, databases, storage, Auth, and Edge Functions.
- GitHub repositories and CI/CD systems.
- Expo/EAS, Apple developer tooling, App Store Connect, and TestFlight.
- Plaid and other financial-data provider dashboards, credentials, and tokens.
- RevenueCat, PostHog, Resend, model-provider dashboards, and other production
  vendors.
- Local development environments when they contain production credentials,
  production data, or sensitive user data.

## Access Control Principles

- Access must follow least privilege.
- Production and vendor access must use unique user accounts where the platform
  supports them.
- Multi-factor authentication must be enabled for sensitive systems where the
  platform supports MFA.
- Shared accounts should be avoided. If a shared account is unavoidable,
  credentials must be stored in an approved password manager or equivalent
  secure credential store.
- Access should be granted only for a defined purpose, such as development,
  operations, support, billing, security response, or release management.
- Access should be removed when it is no longer needed.
- Service credentials must be scoped and stored so they are not exposed to
  mobile clients, source control, logs, or unnecessary local tooling.

## Roles And Responsibilities

The information security owner is responsible for approving access to production
systems, sensitive data, financial-data provider dashboards, and deployment
credentials.

Current role categories are:

- Security owner: approves and reviews access, manages incidents, and owns this
  policy.
- Product/development access: builds and maintains app, backend, database,
  analytics, and deployment workflows.
- Support/operations access: investigates user-impacting issues and production
  incidents when needed.
- Service access: machine credentials used by CI/CD, Supabase Edge Functions,
  provider webhooks, and scheduled jobs.

Kwilt Labs uses platform-provided roles and permissions where available, such
as GitHub repository permissions, Supabase project roles and Row Level Security,
Apple/App Store Connect roles, Expo/EAS permissions, Google Drive sharing, and
provider dashboard roles. Kwilt Labs does not currently operate a centralized
identity and access management platform across all vendors.

## Authentication Requirements

- Sensitive systems must use MFA where available.
- Passwords and recovery credentials must not be stored in source control,
  issue trackers, plain text notes, or app code.
- Local development secrets must remain in ignored environment files or secure
  local secret stores.
- Client-safe public keys, such as Supabase anon/publishable keys or PostHog
  project keys, may be embedded in client builds when intended by the provider.
  Private credentials must not be embedded in client builds.

## Authorization And Data Access

- Supabase Auth is the canonical cloud identity layer for signed-in Kwilt app
  surfaces.
- User-data tables should use Row Level Security, ownership/membership checks,
  or server-side authorization through Edge Functions before production use.
- Supabase service-role keys may bypass Row Level Security and must be limited
  to server-side code paths, administrative scripts, provider dashboards, or
  controlled operational workflows where that access is required.
- Public, webhook, callback, and scheduled Edge Functions may disable platform
  JWT verification only when the route implements appropriate validation, such
  as bearer-token validation, signed webhook validation, secret headers,
  one-time tokens, or constrained public-read behavior.
- Production data should not be downloaded to local machines unless required
  for a specific support, debugging, migration, or incident-response task.
- Logs, analytics, and support notes should avoid storing secrets, access
  tokens, full financial-account details, or unnecessary transaction-level
  sensitive data.

## Financial Data Provider Access

Kwilt Money plans to use Plaid Transactions for the initial bank-data use case.
Access to Plaid and any future financial-data provider must follow these rules:

- Request only the products needed for the user-facing product purpose.
- Limit dashboard access to people who need it for development, operations,
  support, compliance, or incident response.
- Store Plaid secrets, access tokens, item identifiers, webhook secrets, and
  equivalent provider credentials server-side.
- Do not store Plaid access tokens or provider secrets in the mobile app.
- Do not use Plaid data for lending, credit decisions, payments, collections,
  or sale to third parties.
- Review financial-data access before production launch, when adding provider
  products, after incidents, and when personnel or vendor access changes.

## Service Accounts And Secrets

- Service credentials must be named and scoped to their intended purpose where
  the platform supports it.
- OAuth/OIDC service tokens or mutual TLS client certificates should be used for
  non-human service-to-service authentication only when the relevant platform,
  provider, or architecture supports and requires that pattern. Normal HTTPS/TLS
  transport, user login sessions, provider API keys, webhook secrets, Plaid Link
  tokens, and Plaid access tokens are not treated as equivalent to this control
  unless they are explicitly used as the service authentication mechanism.
- Production secrets must be stored in platform or vendor secret managers, such
  as Supabase Function secrets, GitHub Actions secrets, EAS/Expo credentials,
  Apple credentials, provider dashboards, or an approved secure credential
  store.
- Secrets must not be committed to source control.
- Expiring provider secrets should be tracked through the existing Kwilt secret
  expiration workflow where practical. The workflow stores secret names and
  expiry metadata, not secret values.
- Exposed or suspected-exposed credentials must be revoked or rotated according
  to the incident response runbook.

## Access Provisioning

Before granting access, the security owner should confirm:

- the business or operational purpose for access,
- the minimum role or permission level required,
- whether MFA is enabled where available,
- whether access to production data is required, and
- whether the access should be temporary or ongoing.

Access to production systems, financial-data provider dashboards, service-role
credentials, deployment credentials, and sensitive user data should be granted
only when needed.

## Access Modification And Deprovisioning

Access must be changed or removed when:

- a role changes,
- a contractor or collaborator no longer needs access,
- a vendor account is replaced,
- a device, credential, or account may be compromised,
- a sensitive system is retired or migrated, or
- an incident response requires containment.

Deprovisioning is currently a manual process owned by the security owner. Kwilt
Labs does not currently claim automated deprovisioning or centralized IAM-driven
access lifecycle management.

## Access Reviews

The security owner should review access:

- before requesting or expanding production financial-data access,
- when adding sensitive systems or vendors,
- when personnel, contractor, or collaborator access changes,
- after a security incident,
- after material architecture changes, and
- at least annually while the product is active.

The review should include production vendors, source control, CI/CD, Supabase,
financial-data provider dashboards, Apple/Expo release tooling, service
credentials, and any accounts with access to sensitive user data.

## Exceptions

Exceptions to this policy must be documented with:

- the reason for the exception,
- the affected system or data,
- the compensating controls,
- the owner, and
- the date the exception should be reviewed or closed.

## Related Documents

- [Information Security Policy](information-security-policy.md)
- [Incident Response Runbook](incident-response.md)

## Not Currently Claimed

This policy does not claim that Kwilt Labs currently has centralized IAM,
company-wide SSO, automated deprovisioning, a formal zero-trust architecture,
SOC 2 certification, ISO 27001 certification, a formal SIEM, annual third-party
penetration testing, or enterprise access-governance tooling. These controls may
be added as Kwilt Labs grows.
