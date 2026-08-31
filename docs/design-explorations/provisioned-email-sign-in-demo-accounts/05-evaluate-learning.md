# Evaluate Learning: Provisioned Email Sign-In And Demo Accounts

## Learning questions

- Can an external reviewer discover and complete email sign-in without help?
- Does an email-authenticated session behave identically to social-auth sessions after authentication?
- Does the synthetic account tell a coherent Kwilt story without implying false provider evidence?
- Can the account be reset or recreated predictably after mutation or deletion?
- Does a secondary existing-account path confuse ordinary signed-out users?
- Can paired accounts exercise sharing and Household boundaries without special authority?

## Evidence plan

Supporting evidence:

- cold-install TestFlight sign-in succeeds with the published credentials;
- auth hydration, sync, Chat, Settings, sign-out, and sign-in-again work on the same account;
- RLS negative tests show the account cannot read another owner or household's private data;
- a recorded reset preflight restores the exact fixture version and expected representative records;
- App Review completes without requesting alternative credentials or operator intervention;
- invited evaluators can name the main Kwilt story and do not mistake synthetic provider state for a real connection.

Disconfirming evidence:

- reviewers cannot find the path or assume they must create an account;
- password sign-in creates a different downstream identity or skips ordinary setup;
- reset changes credentials unexpectedly, interrupts active evaluation, or leaves mixed fixture versions;
- demo metadata changes authorization;
- ordinary users repeatedly attempt to register through the form;
- provider-bound screens imply successful real connections.

## Instrumentation

- `auth_method_selected` with method `email_password` and surface, but no email address.
- `auth_result` with method, surface, and bounded outcome code.
- server-side provisioning/reset receipt with fixture version, target alias, result, and timestamp; never log passwords.
- manual App Review preflight checklist and result.
- evaluator feedback notes about discoverability, coherence, and trust.

Do not track typed email addresses, passwords, synthetic private content, or reviewer navigation beyond the existing privacy-governed product analytics.

## Decision rule

Proceed to accepted permanent provisioned access after:

- one production-candidate cold-install sign-in and return-path matrix passes;
- one reset and one delete/recreate recovery pass;
- RLS and demo-authority negative tests pass;
- the next relevant App Review or two invited evaluations complete without credential help.

Revise the entry treatment if discoverability or ordinary-user confusion is the failure. Revise provisioning/reset if state drift is the failure. Retire the path if it requires privileged exceptions or a parallel product engine.

## Expected next action

Turn the accepted concept into a feature brief and implementation plan with separate client-auth, demo-lifecycle, and release-preflight workstreams.
