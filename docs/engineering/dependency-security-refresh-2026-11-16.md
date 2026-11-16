# JavaScript security refresh — November 16, 2026

Scope: the outstanding November dependency-review cohort. Expo 55.0.28,
React 19.2.0, React Native 0.83.10, react-native-maps 1.20.1 and its existing
patch, HealthKit, RevenueCat, and Plaid remain at their prior lockfile versions.

| Package | Before | After |
| --- | --- | --- |
| markdown-it override for react-native-markdown-display | 14.2.0 | 14.3.3 |
| React Navigation native / bottom tabs / drawer / native stack | 7.3.14 / 7.18.14 / 7.13.5 / 7.18.6 | 7.5.2 / 7.22.0 / 7.14.5 / 7.21.1 |
| Storybook and React Native web framework | 10.5.6 | 10.6.7 |
| Vite | 8.2.0 | 8.3.8 |

The navigation update removes the vulnerable query-string/decode-uri-component
path in the previous installed graph. The Markdown override follows the
[maintainer advisory](https://github.com/markdown-it/markdown-it/security/advisories/GHSA-gfr2-rv44-r23c).
The Storybook update addresses its
[origin-validation advisory](https://github.com/storybookjs/storybook/security/advisories/GHSA-f2ph-cmg5-wxc8).

Regression evidence under Node 22.23.2: unclosed multiline reference title and
label cases both exceeded a five-second child-process deadline before updating;
both complete in roughly 200ms afterward. The cases deliberately exceed the
chat display limit to exercise the installed parser for current/future callers.
CI executes this bounded regression after npm ci. Linking and persistence tests
passed 102 assertions; Storybook static build passed.

The initial full npm audit had 48 findings (10 low, 19 moderate, 17 high,
2 critical); the updated graph has 39 (10 low, 18 moderate, 10 high, 1 critical).
Markdown, navigation decoder, Storybook itself, and Vite advisories no longer
appear. Storybook adapters still inherit a moderate glob finding; shell-quote
remains critical through development tooling. This is a bounded remediation,
not a clean audit or a claim that all remaining findings are harmless.

Clean-install, patch validation, local/integration checks and final-candidate
release checks are recorded separately. Mac lock prevents interactive Simulator
acceptance; signed-device external-link, chat-rendering and OAuth/Plaid-return
cases remain in the internal beta checklist. Do not claim those were tested.
Rollback is the cohort commit, without native-library or schema rollback.


Integration findings: the newer drawer-layout package required regenerating
Kwilt's existing two-line Reduce Motion patch for 4.2.13. Its behavior remains
ReduceMotion.System in both source and compiled module. Postinstall now uses
patch-package --error-on-fail so local installs cannot silently lose a patch.
New navigation types also exposed an absent root-state case in Games replace;
a failing regression reproduced the throw before an optional-chain fix restored
the existing navigate fallback. All three focused navigation suites passed.
