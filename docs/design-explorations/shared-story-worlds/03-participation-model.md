# Participation Model: Players Are Not Devices

## Decision

A player is a **seat in the story**, not a phone or an account. Every seat receives the same character, spotlight turns, Power, Keepsake, choices, and influence on the ending.

A phone is only an optional **controller** for one or more seats. It may make choosing more private or convenient, but it never grants additional information, abilities, rewards, or authority inside the story.

The complete game must be fun with one phone casting to a TV and everyone else playing in the room. If that version does not work, optional controllers do not rescue the design.

## Three separate roles

| Role | What it owns | Examples |
| --- | --- | --- |
| Player seat | Character, Power, Keepsake, spotlight, choice history, ending impact | Olive the Pathfinder |
| Controller binding | Permission to submit choices for one or more seats | Host phone, Olive's phone |
| Shared display | Public story state, choices, countdown, reveal, consequences | Cast TV, host phone, iPad |

The story command records both `actorSeatId` and `submittedByControllerId`. When an adult taps a choice for a child, the action still belongs to the child's character.

## Supported configurations

| Group | How it works | Quality bar |
| --- | --- | --- |
| Four local players, one phone and TV | All four seats are controlled on the host phone; players discuss and reveal choices physically | Complete experience; no account or second phone required |
| Four local players, two phones and TV | One or more seats may be claimed by the second phone; the remaining seats stay on the host phone | Same decisions and outcomes for every seat |
| Four local players, four phones and TV | Each player may claim a seat and lock choices privately | Faster input, not a richer game |
| Three local players and one remote player | Local seats use the room flow; the remote player claims their seat on their phone | One canonical story and shared reveal |
| A claimed phone disconnects | Its seat remains intact and returns to host control after a short reconnect window | No lost character, choice history, or resource |

## Default couch flow

The shared screen presents two or three choices as a color, icon, and simple verb. Players may talk, but everyone chooses independently.

1. The TV asks everyone to choose.
2. Players without controllers hold up one, two, or three fingers at the reveal countdown.
3. Players with controllers lock their choice; the TV shows only that they are ready.
4. On **Reveal**, joined-phone choices appear while in-room players show their fingers.
5. The host records the visible in-room choices by tapping each player chip and the matching choice.
6. The consequence begins immediately after the final local choice is recorded.

The physical reveal is the core interaction. Private phone input is a useful enhancement for remote play, accessibility, or groups that enjoy secrecy; it is not the source of player agency.

The host-recording step is the largest interaction risk. The first prototype should measure whether recording four local choices feels like a lively scorekeeper beat or clerical drag. If it is drag, simplify the combination rule or capture only the aggregate without removing individual spotlight ownership.

## Mixed-age experience

- A child gets their own named character and resources even when an adult submits for them.
- Choices use icons and plain verbs and can be read aloud from the shared screen.
- The game addresses the child by seat name before the adult touches the host phone.
- An adult may clarify a choice but should not receive a mechanical prompt to decide for the child.
- No-phone players receive every consequential cue through the TV's picture and sound.
- A phone's haptic confirmation is supplemental; the shared reveal confirms acceptance for the whole room.

If a child receives fewer choices, weaker Powers, less feedback, or less influence because they do not have a phone, this model has failed.

## Joining and leaving

All local seats begin **In the room**. Device setup stays out of the primary start flow.

A player may optionally choose **Join on a phone**, scan a QR code, and claim an existing seat. Claiming changes only the controller binding. It does not create a second character or restart the seat. A claimed seat can be released back to the host at any time.

Plain setup labels:

- **In the room**
- **On this phone**
- **On their phone**

Local children and guests do not need Kwilt accounts. A remote participant does need a connected device because the shared room cannot otherwise receive their input.

## Sound and haptics across devices

- The casting or host device plays the soundtrack, narration, and shared event effects once.
- Joined phones play a quiet personal lock cue and personal haptic confirmation only.
- Shared reveals and outcomes remain complete on the TV; joined-phone haptics may reinforce them once without duplicating room audio.
- Reconnected phones do not replay old story or sound events.
- Sound-off on the host silences the room mix. Personal haptics continue according to the existing app and system preference.

## Existing system fit

Kwilt's remote Bank model already separates `seatIndex`, `controllerUserId`, and `joinStatus`. Local and invited seats remain host-controlled until another user claims them; joined seats are controlled by the joined user. Story Worlds should generalize that seat/controller distinction rather than inventing device-owned characters.

The story domain will need to support:

- A controller owning more than one local seat.
- Claiming and releasing a seat without changing its story state.
- Commands that distinguish the acting seat from the submitting controller.
- Returning a disconnected seat to host control safely.
- One canonical reveal event across the shared display and optional controllers.

## Explicit exclusions

- No one-device-per-player requirement.
- No mandatory account for an in-room player.
- No phone-only clues, Powers, rewards, or story branches.
- No secret objectives in the first version.
- No dependency on a special native external-display implementation; ordinary screen mirroring remains viable.
- No controller setup before the family can begin.

## Prototype acceptance test

Seat two adults and two children around one casting phone. Give only one adult a second phone. Without explaining controller architecture, all four should be able to create a character, make an independent choice, understand the shared reveal, use their own resource, and influence the ending.

The optional phone succeeds only if the family describes it as convenient—not necessary.
