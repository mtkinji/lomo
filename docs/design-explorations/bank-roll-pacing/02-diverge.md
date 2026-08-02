# Diverge: Bank Roll Pacing

Axis of variation: how much of the existing cooldown to preserve.

## Remove the cooldown

Every settled roll immediately enables Roll. This is fastest, but removes the useful shared beat once several players are deciding whether to bank. It changes more than the reported friction requires.

## Make the cooldown state-aware

Keep the existing timer, but expose it only after all three safe rolls and while more than one unbanked player remains. This directly matches the table's meaningful decision state and uses existing domain facts without new UI or settings.

## Shorten instead of skip

Use a one-second delay during safe and last-player states. This softens the friction but still forces waiting where the user says no pause is useful, and it introduces another timing rule to learn.

All three alternatives leave game rules and randomness unchanged. The state-aware option best fits the existing system and the responsive-shared-play job.
