# Plaid Security Questionnaire Notes

Last updated: 2026-06-24

These notes are working copy for Plaid onboarding. Keep answers truthful and
update them as controls change.

## Q1: Information Security Contact

Use the current responsible person and a monitored email address.

```text
Andrew Watanabe
Founder / Information Security Responsible Person
[monitored email address]
```

## Q2: Documented Information Security Policy

If asked whether Kwilt Labs has documented information security policy and
procedures, answer yes only if the active documents are in place and you intend
to operate by them:

- [information-security-policy.md](information-security-policy.md)
- [access-control-policy.md](access-control-policy.md)
- [incident-response.md](incident-response.md)

Suggested comment if a text explanation is requested:

```text
Yes. Kwilt Labs maintains a lightweight information security policy and incident
response runbook appropriate for a founder-led early-stage company. The policy
covers access control, MFA where supported, least-privilege access, secret
management, Supabase Auth/RLS and Edge Function authorization posture,
financial-data handling, vendor access, production data handling, logging and
analytics minimization, CI/release verification, and incident response. Kwilt
Budget will request Plaid Transactions only for the initial use case, keep Plaid
tokens and provider credentials server-side, and expand these controls as
production Plaid access and user financial-data usage increase.
```

## Q3: Access Controls

Select only controls that are actually in place. Likely controls for the current
early-stage setup may include:

- Multi-factor authentication where supported.
- Unique user accounts where supported.
- Least-privilege access.
- Password manager for credentials.
- Secrets stored outside source code.
- Encrypted data in transit through managed providers.
- Source control with CI checks for TypeScript/tests/product or architecture lint.
- Supabase Row Level Security / server-side authorization for user-data paths.
- Platform secret managers for production secrets.

Do not select controls unless they are real, such as SOC 2, SSO, formal SIEM,
annual penetration testing, or company-wide employee security training.

If Plaid asks which access-control controls are in place, the most accurate
dropdown selections from the current setup are:

- A defined and documented access control policy is in place.
- Role-based access control (RBAC).

Select "Periodic access reviews and audits are performed" only if Kwilt Labs is
ready to treat the access-review cadence in the policy as an active operating
practice. In the current founder-led context, that means reviews before
production financial-data access, when sensitive systems are added, when
personnel or vendor access changes, after incidents, and at least annually.

Do not select:

- Automated de-provisioning / modification of access for terminated or
  transferred employees.
- Implementation of a zero trust access architecture.
- Centralized identity and access management solutions.

For "Use of OAuth tokens or TLS certificates for non-human authentication," do
not select it unless Kwilt Labs is specifically using OAuth/OIDC service tokens
or mutual TLS client certificates for service-to-service authentication in the
Plaid-relevant production environment. User login sessions, Plaid Link tokens,
provider API keys, webhook secrets, Supabase JWTs, HTTPS/TLS transport, and
platform-managed credentials do not necessarily satisfy this control as written.

Suggested comment if a text explanation is requested:

```text
Kwilt Labs maintains a documented access control policy for a founder-led
early-stage company. Production and vendor access is limited to people and
services that need access for development, operations, support, release
management, or incident response. Sensitive systems use unique accounts and MFA
where supported, and access follows least privilege.

Kwilt Labs uses platform-provided roles and permissions where available,
including GitHub repository permissions, Supabase project roles and Row Level
Security, Apple/App Store Connect roles, Expo/EAS permissions, Google Drive
sharing, and provider dashboard roles. Supabase service-role access is limited
to server-side code paths, administrative scripts, provider dashboards, or
controlled operational workflows where required.

Access is reviewed before production financial-data access, when sensitive
systems are added, when personnel or vendor access changes, after incidents, and
at least annually while the product is active. Deprovisioning is currently
manual and owned by the security owner. Kwilt Labs does not currently claim
centralized IAM, automated deprovisioning, formal zero-trust architecture, SOC 2
certification, ISO 27001 certification, a formal SIEM, or annual third-party
penetration testing.
```

## Q4: Consumer MFA Before Plaid Link

If asked whether Kwilt Labs provides MFA for consumers before Plaid Link is
surfaced, answer no unless Kwilt Money actually requires consumer MFA before
showing Plaid Link.

Suggested selection:

```text
No - We do not currently deploy MFA on our consumer-facing applications.
```

Suggested explanation:

```text
Kwilt Money is an early-stage mobile app and does not currently require
consumer MFA before Plaid Link is surfaced. Plaid Link will be available only
inside the signed-in app experience, and linked financial data will be protected
through server-side token handling, least-privilege production access, platform
MFA for administrative/vendor systems where supported, Supabase Auth/RLS or
server-side authorization, and logging/analytics minimization. Kwilt Labs can
evaluate adding consumer MFA before Plaid Link as production usage and risk
requirements mature.
```

Avoid saying that the Plaid-integrated app lacks sensitive information. Once
Plaid is enabled, the app will process consumer financial data, so the safer
explanation is that consumer MFA is not currently deployed while administrative
and backend access controls protect the financial-data path.

## Q5: MFA For Critical Systems Processing Financial Data

If asked whether MFA is in place for access to critical systems that store or
process consumer financial data, answer yes only if MFA is enabled on the
relevant administrative/vendor systems and accounts.

Critical systems for Q5 are the accounts that can administer financial data,
production authentication/data stores, production secrets, source code/CI, or
release artifacts for the Plaid-integrated app.

For the current Plaid onboarding path, likely in-scope systems are:

- Plaid dashboard / Plaid production access.
- Supabase project and database administration.
- GitHub repositories and CI/CD secrets.
- Apple Developer / App Store Connect and Expo/EAS release systems.
- Google Workspace/Drive account used for security documents and business
  administration.
- Any password manager or secure credential store used for production secrets.

Treat these as conditional rather than automatically in scope:

- RevenueCat / Apple billing: critical if Kwilt Money uses paid entitlements or
  if billing state gates access to the Plaid-linked product.
- PostHog: critical only if it can expose sensitive financial data, which the
  policy says analytics should avoid.
- Resend: critical only if it is used for account, security, or financial-data
  operational email for this app.
- Model-provider dashboards: critical only if model-provider access can reach
  sensitive user or financial data through production server-side workflows.

Prefer a general MFA answer unless every critical system uses passkeys, hardware
security keys, or another phishing-resistant method. Do not choose the
"phishing-resistant MFA" option unless the screenshots and current settings
prove that phishing-resistant MFA is active for the critical systems in scope.

Documentation to collect:

- Screenshot of MFA/2FA enabled in Plaid account settings, if available.
- Screenshot of MFA enabled for the Supabase account or identity provider used
  to access Supabase.
- Screenshot of GitHub two-factor authentication enabled.
- Screenshot of Apple ID / App Store Connect account security with two-factor
  authentication enabled.
- Screenshot of Google account or Google Workspace two-step verification /
  passkey settings, if that account is used for administration.

Suggested explanation if a text field is requested:

```text
Yes. Access to critical systems that store or process consumer financial data is
limited to authorized administrative accounts and uses MFA where supported by the
platform. This includes the financial-data provider dashboard, Supabase
administration, source control/CI systems, release tooling, and credential
stores used for production secrets. Kwilt Labs is founder-led and currently
manages access manually under its access control policy, with least-privilege
access, server-side handling of financial provider credentials, and access
reviews before production financial-data access and when sensitive systems or
personnel access change.
```
