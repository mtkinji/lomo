# Yes-And: Focus Protection

Original idea: Let users optionally configure device-level distraction protection once, then have Kwilt apply it automatically whenever a normal Focus Session starts.

**Yes, and what if it could...** make Focus feel like a protected container without adding a second session type.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: The user does not just intend to focus; the environment quietly supports follow-through.
- New value: Kwilt can improve execution quality while preserving the single "Start Focus Session" mental model.
- Cost delta vs. original: low
- Anti-pattern check: pass; protection stays an implementation detail, not a productivity-app badge.

**Yes, and what if it could...** use a provider architecture so Screen Time is the first protection, not the whole product concept.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The app can grow into deeper system integration without reshaping the user's workflow each time.
- New value: Notification suppression, Apple Focus integration, website restrictions, and scheduled focus can plug into the same lifecycle.
- Cost delta vs. original: medium
- Anti-pattern check: pass if new providers remain optional and explainable.

**Yes, and what if it could...** provide a calm recovery path when protections fail to apply or fail to clear.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Trust comes from clean cleanup, honest status, and a visible off switch more than from maximal blocking.
- New value: The system can handle permission drift, OS errors, app termination, and stale shields without surprising the user.
- Cost delta vs. original: medium
- Anti-pattern check: pass; this is reliability work, not a scary warning layer.

**Yes, and what if it could...** make app selection feel like choosing distractions to quiet, not building a parental-control rule set.

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: The setup step stays tied to the user's meaningful work instead of becoming Screen Time administration.
- New value: Defaults such as Social Media, Entertainment, Video, and Games can reduce setup effort while still preserving user choice.
- Cost delta vs. original: medium
- Anti-pattern check: pass; avoid language like "bad apps," "limits," or "discipline."

**Yes, and what if it could...** treat protected minutes as a lightweight quality signal, not a gamified streak.

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Kwilt can learn whether protected focus helps follow-through without pressuring users to maximize minutes.
- New value: Future reflection can distinguish ordinary Focus from Focus where the user asked for environmental help.
- Cost delta vs. original: low
- Anti-pattern check: pass if analytics stay internal and do not become a score or streak.

**Yes, and what if it could...** support scheduled focus blocks later with the same automatic activation model.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: The user can set an intention for future work and trust Kwilt to prepare the focus environment when the moment arrives.
- New value: Schedule, reminders, and Focus Sessions become a stronger follow-through loop.
- Cost delta vs. original: high
- Anti-pattern check: pass if scheduled blocks still start normal Focus Sessions and do not create profile management.

**Frame Recommendation:** Run design-thinking-loop with the original frame. Focus Protection is already the right level of abstraction: the user-visible promise is lightweight and optional, while the technical architecture should be broader than Screen Time alone.
