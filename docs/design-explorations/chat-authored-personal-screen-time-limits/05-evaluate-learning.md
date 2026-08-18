# Evaluate Learning: Chat-Authored Personal Screen Time Limits

## Learning questions

- Does Chat preserve self versus child across the initial request and correction?
- Does the native handoff feel like completion of the conversational job rather than a restart?
- Does the daily threshold reliably shield the selected app and reset on the next local day?

## Evidence

Automated routing, schema, persistence, and generated-native contract tests; Simulator inspection of the handoff and builder; signed-device observation of threshold and next-day reset.

## Decision rule

Keep the capability only if the exact screenshot replay reaches the self builder without child tools, the saved rule remains independently governable, and signed-device threshold/reset behavior is reliable. Revise or hide it if native callbacks or reset behavior are inconsistent.

Do not collect app identity or detailed usage telemetry.
