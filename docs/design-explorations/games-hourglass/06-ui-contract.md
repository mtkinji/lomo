# UI Contract: Games Hourglass

Job: When a physical game calls for a missing one-minute timer, the user needs to replace it immediately so the group can keep playing.

Primary action: In Physical, turn the phone end-over-end; in Classic and Simple, touch to start. Touch remains the Physical fallback.

Must show: one compact Physical / Classic / Simple choice, the selected timer face, remaining seconds, unmistakable completion, back navigation, and whether optional music is on. Physical must also show checking, hold-to-arm, armed, and unavailable states.

Reveal later: a small reset action appears only while running. Physical guidance changes with live motion state rather than opening instructions.

Must not add: duration choice, player setup, pause, scoring, history, remote state, onboarding, notification permission, or a second completion action.

Reuse map: Games shelf utility card → existing utility pattern; route → Games native stack; palette/type → `gamesTheme`; style selection → compact segmented-control semantics composed in the Games visual system; music → `useGameMusic`; completion cue → `useGameFeedback`; haptics → existing semantic service; geometry → `react-native-svg`; visual motion → React Native Animated with reduced-motion fallback; physical turn detection → the existing Expo DeviceMotion package and Games motion convention; preference → Games settings store.

Behavior sources: fixed 60 seconds and optional music → explicit user decision; three faces, physical turn-to-start, touch fallback, and remembered style → explicit user-approved direction; utility placement and guest-first launch → accepted Games integration contract; completion accuracy → `jtbd-trust-this-app-with-my-life`; no player setup → existing Basic Dice Roller utility contract.

Unresolved decisions: the exact signed-device motion thresholds may need tuning after physical proof. A dedicated music track remains deferred.

Required states: each face ready/running/finished; Physical motion checking/unavailable/unarmed/armed/opposite-end flip; touch fallback; reset-to-ready; music off/on; app background/foreground reconciliation; reduced motion; and compact phone viewport.

Proof path: Kwilt → Play → Games → Utilities → Hourglass on the iOS Simulator from this worktree’s installed build and Metro runtime; inspect all three faces and touch paths, background/resume, finish, music, reset, repeat, and back. Then repeat Physical arming, two opposite turns, and false-start handling on a signed iPhone; Simulator cannot establish motion proof.
