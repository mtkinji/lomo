# Evaluate Learning: Kwilt Games Capability Integration

## Questions

- Does one Games row under Fun make the capability easy to find without crowding the global menu?
- Does the playful Games surface feel native to Kwilt without inheriting productivity grammar?
- Can an unfamiliar group begin any local game without an account or rules wall?
- Do saved players, personal bests, sound, orientation, joining, and remote rooms retain the behavior people already had?
- Does host navigation preserve game flow and return behavior?

## Evidence

Automated registry, navigation, imported Games, server-rule, and screen-flow checks; local Supabase verification; Simulator and signed-device review of the full shelf, representative game families, setup, play, completion, replay, join, nearby, remote, and back.

## Disconfirming signals

People expect each game in the global menu, setup feels administered, the table feels visually flattened into Kwilt, or host lifecycle/navigation interrupts active play.

## Instrumentation

Capability selection and anonymous game-start/completion/replay events are sufficient later. Do not capture player names, prompts, room contents, or child identity for this learning.

## Decision rule

Proceed to release only after full source parity survives the host and the backend/native proof boundaries are closed. Revise the adapter boundary first if Games cannot preserve instant play or its distinct table grammar inside the host.
