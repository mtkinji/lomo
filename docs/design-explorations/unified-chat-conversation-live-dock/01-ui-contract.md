# Unified Chat Conversation Live Dock UI Contract

## Contract

**Job:** When Conversation Mode is starting or active, the user needs to know immediately whether Kwilt is connecting, listening, thinking, speaking, or recovering, so they can speak or intervene without guessing whether the mode started.

**Authority chain:** Andrew's approved Live Dock direction -> `live-conversational-action-runtime.md` Chat conversation contract -> Kwilt UI Constitution and semantic tokens -> existing adaptive composer contract -> iOS microphone and accessibility conventions -> task-scoped external exemplars.

**Three-second read:** Conversation Mode is unmistakably active; Kwilt's current phase is named; the rightmost control is the relevant End, Stop, or Send action.

**Primary action:** The adaptive rightmost action remains authoritative: End while listening with an empty draft, Stop while a response is active, and Send or Steer after typing.

**Primary information:** Current conversation phase and elapsed listening time.

**Secondary information:** Provisional transcript while the user is speaking.

**Reveal later:** Ordinary attachment and context controls return after Conversation Mode ends. Existing timeline evidence, proposals, receipts, and corrections remain in their current progressive-disclosure locations.

**Scan order:** Animated state presence -> phase label or provisional transcript -> adaptive rightmost action.

**Must not add:** A separate voice screen, floating orb, fake input metering, another conversation history, a second dominant action, a settings surface, or a network dependency for entry acknowledgement.

**Reuse map:** Existing composer shell and mounted textarea for layout and typed steering; existing `Button` primitive for actions; current WebRTC connection for microphone control; `HapticsService` for semantic feedback; device-local speech for the ready acknowledgement.

**Nearest precedent:** The existing recording composer establishes a focused in-place voice state with clear elapsed time and controls. Live Dock keeps the durable timeline and mounted textarea but replaces recording's waveform with phase-specific, non-metering motion and the adaptive Conversation Mode action.

**External exemplar ledger:**

- ChatGPT Voice, official help, reviewed 2026-08-15: preserve voice inside the durable chat and explicit microphone/exit controls; translate its persistent active-state clarity into the composer; reject its separate orb/full-screen expression.
- Apple Voice Memos, iOS 26 guide, reviewed 2026-08-15: preserve immediate recording presence, elapsed time, and an explicit end control; translate waveform activity into honest state motion; reject recording-editor chrome.
- Gemini Live, official help, reviewed 2026-08-15: preserve interruptible session clarity; translate it into Kwilt's existing adaptive rightmost action; reject a separate session surface.

**Behavior sources:** Immediate activation haptic and connected verbal acknowledgement are Andrew's explicit decision. Phase visibility comes from the accepted `LiveConversationSession` contract. Timeline continuity and adaptive End/Stop/Send behavior come from the existing Chat conversation and composer contracts.

**Unresolved decisions:** None that change first-release behavior. Physical-device calibration may change speech rate or haptic strength without changing the contract.

**Required states:** Connecting, listening, provisional transcript, thinking, speaking, interrupted, recovering, failed, reduced motion, typed steering, stop, and end.

**Proof path:** Enter Chat from the Home Screen widget and from the open app on an iPhone 17 Pro Simulator using one branch-owned Metro server; exercise permission, connect, listen, think, speak, type/steer, stop/end, recovery/error, and Reduce Motion. Treat haptic strength, microphone echo suppression, audio routing, and verbal acknowledgement as signed physical-device gates.

## Reduction decision

The Live Dock changes only the composer contents. The timeline remains the conversation record, so no second voice-stage heading, transcript panel, or duplicated mode badge is added. Color supports the phase but does not carry it; motion is calm and stops under Reduce Motion.
