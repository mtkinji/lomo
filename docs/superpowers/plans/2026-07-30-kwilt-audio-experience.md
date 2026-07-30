# Kwilt Audio Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use subagent-driven development only if Andrew explicitly requests delegation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Kwilt a coherent, volume-balanced audio system spanning player-selected Games signatures, adaptive gameplay music, story-game atmosphere, Focus soundscapes, and calm To-do completion feedback.

**Architecture:** Treat audio as three coordinated layers: game- or surface-owned background music, game-owned mechanical feedback, and player-owned signature cues. A shared catalog and gain policy defines category, mastering target, runtime gain, ducking priority, and provenance for every asset; pure state selectors decide which music state should play, while `expo-audio` or the existing surface owner performs best-effort playback. Generated candidates remain outside the app until they pass technical loudness checks, fixed-volume listening comparisons, and Andrew's review.

**Tech Stack:** React Native, Expo SDK 54, `expo-audio`, existing `expo-av` Focus playback pending its separate migration, TypeScript, Jest, ElevenLabs Music v2 and Sound Effects, FFmpeg/EBU R128 analysis through repository development tooling, iPhone Simulator, signed iPhone/TestFlight for final audio-route and speaker proof.

---

## Product frame

Primary audience: `audience-aspirational-family-organizers`, represented by Maya and her family.

Hero JTBD: `jtbd-help-us-enjoy-being-together` — help a family turn a small opening into easy shared play.

Supporting JTBDs:

- `jtbd-trust-this-app-with-my-life` — sound must be controllable, stable, non-startling, and honest about mute/background behavior.
- `jtbd-move-the-few-things-that-matter` — Focus and completion audio should support attention and meaningful movement without productivity pressure.

Restated in user voice: when a family begins playing together, they want the table to feel alive, suspenseful, and personal so that the game creates a memorable shared moment without becoming noisy, punishing, or hard to control. When someone completes ordinary work or enters Focus, they want calm reinforcement rather than a jarring reward system.

Constraint posture: `Extend the system`. Reuse the existing Games sound setting, player identity model, Bank state, Focus soundscape picker, completion hooks, haptic vocabulary, and bundled-offline asset approach. Do not add a second audio settings hierarchy in the first release.

## Current system facts

- `src/capabilities/games/audio/useGameFeedback.ts` owns dice, success, failure, selection haptics, and current runtime gains.
- `src/capabilities/games/audio/usePatternAudio.ts` pitch-shifts one sparkle asset into six Pass Pattern notes.
- `src/capabilities/games/players/playerIdentity.ts` persists one success and one failure sound id per player. Existing ids must remain valid.
- `src/capabilities/games/domain/bank.ts` exposes `rollInRound`, `pot`, status, last roll, and deterministic outcome transitions.
- `src/capabilities/games/features/tumble/BankPot.tsx` enters visual risk at `rollInRound >= 3`; audio should use the same transition.
- `src/services/uiSounds.ts` owns step and whole-To-do completion sounds.
- `src/services/soundscape.ts` owns four bundled Focus tracks and currently defaults asset playback to full linear gain.
- The current checkout is `codex/family-screen-time-learning-slice` with extensive unrelated tracked and untracked work. This document may be written here, but audio implementation must not begin in this dirty lane.

## Audio design principles

1. **Sound communicates hierarchy.** Background music establishes atmosphere, mechanical effects explain game state, and player signatures own personal outcomes.
2. **Personal signatures win the mix.** Music ducks before a selected success or setback cue so the player's choice remains recognizable.
3. **Failure stays playful.** Setback cues may be comic but never humiliating. Do not play a sad/failure cue when the resulting game status is already `finished`.
4. **Silence is designed.** Do not put music beneath Pass Pattern's memory notes, private handoff instructions, or read-aloud story reveals when it competes with comprehension.
5. **Audio never gates play.** Loading, route changes, interruptions, or a failed player must not block a game action or completion.
6. **One coherent material palette.** Favor warm wood, felt mallets, ceramic taps, restrained bells, soft percussion, paper/air textures, and playful acoustic or lightly electronic color. Avoid casino sounds, generic notification pings, cinematic trailer hits, and copyrighted-style imitation.
7. **Settings remain reductive.** The existing Games sound toggle controls both music and effects for the learning release. Add separate Music and Effects controls only if family use shows a real need.

## Volume and mastering contract

Volume consistency is an acceptance criterion, not a finishing preference. No asset is production-ready merely because it sounds good in isolation.

### Mastering targets

| Category | Use | Loudness target | Allowed spread | True-peak ceiling | Initial runtime gain |
| --- | --- | ---: | ---: | ---: | ---: |
| `ui.micro` | Step completion and tiny acknowledgements | -22 LUFS | +/- 1.5 LU | -3 dBTP | 0.72 |
| `ui.outcome` | Whole To-do completion | -20 LUFS | +/- 1.5 LU | -2 dBTP | 0.72 |
| `game.mechanic` | Dice, bank, reveal, selection | -20 LUFS | +/- 1.5 LU | -2 dBTP | 0.68 |
| `game.signature` | Player-selected win/setback cues | -18 LUFS | +/- 1 LU across the entire library | -1.5 dBTP | 0.78 |
| `game.pattern` | Pass Pattern notes | -21 LUFS | +/- 0.75 LU across all six notes | -2.5 dBTP | 0.62 |
| `game.music` | Adaptive or atmospheric gameplay loops | -24 LUFS-I nominal; -22 LUFS-I maximum-intensity mix | +/- 1 LU per intensity tier | -3 dBTP | 0.42 |
| `focus.music` | Continuous Focus soundscapes | -24 LUFS-I | +/- 1 LU across all bundled tracks | -2 dBTP | 0.55 |

Notes:

- LUFS is a comparison tool, not the only judge. For very short transients, also compare trimmed integrated/short-term loudness, RMS energy, peak, attack, spectral balance, and fixed-device perceived loudness.
- Remove leading silence before measurement. One-shots may have at most 30 ms before the audible attack unless timing is intentionally part of the effect.
- Avoid tails longer than the interaction they represent. Micro cues should normally end within 400 ms; signature cues within 2.5 seconds; failure cues within 1.8 seconds.
- Reject clipped, limited-to-flatness, bass-heavy, or piercing files even when their numeric loudness is inside tolerance.
- Do not compensate for inconsistent masters with a growing list of per-file magic gain constants. Per-file trim may correct a final 1–2 dB discrepancy, but the library must first be mastered by category.

### Mixing and ducking rules

- A `game.signature` cue reduces the active music bus by 12 dB over 80 ms, holds through the cue plus 100 ms, then releases over 450 ms.
- A prominent `game.mechanic` cue such as seven-out or a reveal reduces music by 6 dB over 60 ms and releases over 300 ms.
- Equal-power music crossfades last 800–1,200 ms. Two full-level tracks must never simply overlap; the transition itself must not exceed the target tier by more than 1 LU or the -1.5 dBTP mix ceiling.
- Success and setback previews in the player editor use the same master and runtime gain as actual play.
- Focus soundscape changes crossfade or stop/fade/start; they never hard-cut at full volume.
- Haptics remain synchronized with the audible attack, not with the beginning of leading silence in a file.

### Required listening matrix

Every final candidate is reviewed at fixed system volumes instead of adjusting the volume for each file:

| Output | Levels | Required comparisons |
| --- | --- | --- |
| Recent physical iPhone speaker | 25%, 50%, 75% | Every player signature in randomized order; dice -> mechanic -> signature; all Focus tracks |
| AirPods or comparable headphones | 25%, 50% | Harshness, bass bloom, stereo imbalance, noise floor, loop seam |
| Simulator/Mac output | Fixed recorded level | Functional playback, cue timing, crossfade, interruption recovery; not final loudness proof |
| Noisy family-room environment | One normal listening level | Signature recognition, instructions remaining understandable, music not masking conversation |

Acceptance questions:

- Does any signature sound cause an instinctive volume adjustment compared with the previous one?
- Can each signature be recognized through a phone speaker without being substantially louder?
- Does Bank tension feel stronger because of arrangement, rhythm, and density rather than a volume jump?
- Can players speak over story/adventure music without raising their voices?
- Does whole-To-do completion feel distinct from a step without sounding disproportionately loud?
- Is the Focus picker safe when moving from the quietest existing track to the loudest new one?

## Production asset catalog

### Player-selected success signatures

Preserve the ids `chime`, `sparkle`, `fanfare`, and `hawk`, replacing the asset only after A/B approval. Add:

| Id | Label | Direction |
| --- | --- | --- |
| `royal-horns` | Royal horns | Compact, playful courtly flourish |
| `power-chord` | Power chord | Bright clean-guitar hit, not distorted or aggressive |
| `drum-triumph` | Drum triumph | Short ensemble cadence |
| `wolf-howl` | Wolf howl | Clear, fun field-recording character |
| `lion-roar` | Lion roar | Majestic rather than threatening |
| `magic-portal` | Magic portal | Airy rising shimmer with resolved landing |
| `tiny-crowd` | Tiny cheering crowd | Brief whimsical cheer, no intelligible words |
| `banjo-victory` | Banjo victory | Two-second acoustic flourish |

### Player-selected setback signatures

Preserve the ids `trombone`, `bonk`, and `wobble`, with higher-quality replacements after approval. Add:

| Id | Label | Direction |
| --- | --- | --- |
| `air-leak` | Air leak | Quick comic deflation |
| `record-scratch` | Record scratch | Compact stop, no copyrighted music underneath |
| `squeaky-toy` | Squeaky toy | One clear toy squeak |
| `slide-whistle` | Slide whistle | Short descending gesture |
| `chicken` | Chicken cluck | Clean, surprising, brief |
| `goat` | Goat bleat | Comic animal reaction, brief |
| `tiny-violin` | Tiny violin | One tiny melodramatic phrase |
| `cartoon-splat` | Cartoon splat | Soft impact without gross texture |
| `deflating-balloon` | Deflating balloon | Fast comic spiral, under 1.8 seconds |

### Bank adaptive score

| File | State | Direction |
| --- | --- | --- |
| `assets/games/music/bank-tension-low.mp3` | First at-risk state | Muted plucked bass, woodblock pulse, sparse hand percussion |
| `assets/games/music/bank-tension-building.mp3` | Additional safe risky rolls | Same tempo/key with denser pulse and playful brass punctuation |
| `assets/games/music/bank-tension-maximum.mp3` | Deep run or maximum pot | Full rhythmic density without simply becoming louder |
| `assets/games/bank-lock-in.wav` | Player banks | Compact satisfying mechanical latch/cashbox gesture |
| `assets/games/bank-doubles-hit.wav` | Pot doubles | Quick upward musical accent |
| `assets/games/bank-seven-release.wav` | Seven out | Brief musical collapse used before the player's selected setback cue |

Bank intensity uses state, not wall-clock time:

```ts
export type BankMusicTier = 'silent' | 'low' | 'building' | 'maximum';

export function bankMusicTier(game: Pick<BankGame, 'status' | 'rollInRound' | 'pot'>): BankMusicTier {
  if (game.status === 'finished' || game.rollInRound < 3) return 'silent';
  if (game.rollInRound >= 7 || game.pot >= 75) return 'maximum';
  if (game.rollInRound >= 5 || game.pot >= 25) return 'building';
  return 'low';
}
```

The exact thresholds are a starting contract to test against current visual tiers, not a reason to duplicate rules inside screens. The pure selector becomes the single audio owner and receives focused tests.

### Adventure and atmosphere scores

| File | Surface | Playback contract |
| --- | --- | --- |
| `story-relay-adventure.mp3` | Story Relay | 60–90 second loop during writing and handoff; duck or stop for read-aloud reveals |
| `doodle-bridge-whimsy.mp3` | Doodle Bridge | 60 second curious handmade loop during drawing; resolve on final reveal |
| `object-quest-expedition.mp3` | Object Quest | Short quest launch plus restrained waiting loop while players search |
| `clue-circle-mystery.mp3` | Clue Circle | Light suspense during guessing; stop before spoken explanation/reveal |
| `slanguage-clubhouse.mp3` | Slanguage | Low rhythmic bed during composition; reveal/vote cues remain distinct |

Do not add background music to Pass Pattern. Show of Hands and Family Forecast receive bounded anticipation/reveal stings only unless use proves a continuous score helps.

### Pass Pattern notes

Replace pitch-shifted copies with six separately mastered, harmonically related assets:

- `pattern-coral.wav`
- `pattern-pine.wav`
- `pattern-gold.wav`
- `pattern-sky.wav`
- `pattern-violet.wav`
- `pattern-rose.wav`
- `pattern-success.wav`
- `pattern-miss.wav`

The six notes must remain within 0.75 LU, share similar attack/tail lengths, remain distinguishable on an iPhone speaker, and avoid frequencies that disappear at low playback volume.

### Focus additions

Generate two variants of each, four minutes, instrumental, restrained melody, no dramatic intro/outro:

- `Rainlit Library.mp3` — rain against glass, warm analog pad, distant felt piano, almost beatless.
- `Cedar Workshop.mp3` — muted wood percussion, soft marimba, brushed rhythm, warm bass, 82 BPM.
- `Open Road Focus.mp3` — minimal downtempo electronica, gentle pulse, airy synths, 96 BPM.

Evaluate the existing ElevenLabs generation `The Tinkerer's Workshop` as a possible Cedar Workshop candidate before spending replacement credits.

### To-do completion

- Replace `assets/audio/sfx/list-tap.wav` with a 250–400 ms felt/wood acknowledgment at the `ui.micro` target.
- Replace `assets/audio/sfx/mark-complete.wav` with a 650–900 ms warm two-part resolution at the `ui.outcome` target.
- Do not add points, streak, reward, or escalating completion sounds.

## Credit and generation budget

Current observed ElevenLabs balance and project ceiling: **300,000 credits** on the Creator workspace. The purpose of the ceiling is to make a genuinely strong audio library, not to preserve credits at the expense of quality. It is still a ceiling rather than a spending target: generation proceeds in bounded batches, and weak directions stop rather than consuming their whole allocation.

| Program area | Planning allocation | Checkpoint |
| --- | ---: | --- |
| Player signature candidates and core one-shots | 25,000 | Andrew/family listens before ids or assets change; expand the strongest sound families rather than accepting the first viable take |
| Bank adaptive score and transitions | 45,000 | Choose one coherent musical system and reject variants whose intensity comes primarily from loudness |
| Adventure and atmosphere scores | 60,000 | Review one game at a time; do not force music onto every game merely because credits remain |
| Focus soundscapes | 60,000 | Compare multiple variants per direction, then spend refinement credits only on the strongest compositions |
| Pass Pattern, To-do, and additional mechanical effects | 20,000 | Require fixed-volume comparison and mechanical clarity before integration |
| Cross-program refinements and regeneration reserve | 90,000 | Use for prompt corrections, alternate instrumentation, loop repair, missing player choices, and stronger finalists after a documented review reason |
| **Total ceiling** | **300,000** | No overage or usage-based billing without separate explicit approval |

The first **90,000 credits** remain the initial production tranche, not the project cap. Pause for a cumulative portfolio review before spending beyond 90,000, again before spending beyond 200,000, and before drawing from the final 50,000. Every normal batch still stops at its asset-review checkpoint even when the cumulative threshold has not been reached.

## File structure for implementation

**Create:**

- `src/capabilities/games/audio/audioCatalog.ts` — typed asset metadata, categories, labels, and requires.
- `src/capabilities/games/audio/audioGainPolicy.ts` — shared runtime gains and duck/crossfade constants.
- `src/capabilities/games/audio/audioGainPolicy.test.ts` — range, completeness, and category-policy tests.
- `src/capabilities/games/audio/bankMusicState.ts` — pure Bank state-to-music-tier selector.
- `src/capabilities/games/audio/bankMusicState.test.ts` — safe, at-risk, building, maximum, terminal cases.
- `src/capabilities/games/audio/useGameMusic.ts` — best-effort player lifecycle, crossfade, duck, stop, and route cleanup.
- `src/capabilities/games/audio/useGameMusic.test.tsx` — state transitions and cleanup with mocked players.
- `scripts/audio/audit-assets.mjs` — reproducible format, duration, silence, loudness, and true-peak report.
- `scripts/audio/normalize-assets.mjs` — two-pass category mastering into a staging directory; never overwrite source candidates.
- `assets/audio/AUDIO_MANIFEST.md` — source, prompt, ElevenLabs generation id/date/model, license-plan provenance, transforms, targets, and measured results.

**Modify:**

- `package.json` and `package-lock.json` — development-only audio audit dependencies/scripts if the chosen tooling requires them.
- `src/capabilities/games/audio/useGameFeedback.ts` — typed catalog and central gain policy.
- `src/capabilities/games/audio/usePatternAudio.ts` — six real note assets and shared gain policy.
- `src/capabilities/games/players/playerIdentity.ts` — expanded backward-compatible sound ids.
- `src/capabilities/games/players/__tests__/playerIdentity.test.ts` — new choices and old-id normalization.
- `src/capabilities/games/features/tumble/TumbleScreen.tsx` — Bank music tier and outcome duck/stop behavior.
- `src/capabilities/games/features/tumble/RemoteBankScreen.tsx` — same selector from canonical remote state.
- Story/connection game components only where their explicit playback contracts require it.
- `src/services/uiSounds.ts` and tests — shared gain tokens and replacement assets.
- `src/services/soundscape.ts` and tests — Focus gain, crossfade, and expanded catalog.
- `assets/games/AUDIO_CREDITS.md` — retain legacy provenance or redirect to the consolidated manifest without losing history.

## Implementation releases

### Release 0: Clean-lane and runtime entry conditions

- [ ] Finish/preserve the current family Screen Time changes or receive explicit approval for the separate worktree `/Users/andrewwatanabe/Kwilt/.worktrees/audio-experience` on `codex/audio-experience`, targeting `origin/main`.
- [ ] Record the audio checkout, branch, HEAD, dirty state, Metro port/owner, Simulator device, installed binary provenance, and signed-device availability.
- [ ] Confirm no other checkout owns Metro or audio runtime verification.
- [ ] Capture the current assets' duration, format, and perceived-loudness baseline before changing anything.
- [ ] Commit only the accepted plan/brief documentation if publication is requested.

### Release 1: Reproducible loudness foundation

- [ ] Write failing tests that require a policy entry for `ui.micro`, `ui.outcome`, `game.mechanic`, `game.signature`, `game.pattern`, `game.music`, and `focus.music`.
- [ ] Run `npm test -- --runInBand src/capabilities/games/audio/audioGainPolicy.test.ts` and confirm failure because the policy does not exist.
- [ ] Implement `audioGainPolicy.ts` with the targets, gains, ducking, and crossfade constants in this document.
- [ ] Add the non-runtime audit/normalization tooling and commands `npm run audio:audit` and `npm run audio:normalize -- --manifest <path>`.
- [ ] Run the audit against every existing audio asset and save the report in the execution log; do not normalize existing files blindly.
- [ ] Add `AUDIO_MANIFEST.md` with the existing asset inventory and proof boundaries.
- [ ] Run focused tests, `npm run verify:changed -- --run`, and `git diff --check`.
- [ ] Commit the tooling/policy foundation independently.

### Release 2: Player signature library

- [ ] Generate candidates outside tracked app assets, recording prompt, model, settings, generation id, date, and credit cost.
- [ ] Trim silence and normalize each candidate into a review staging directory using `game.signature` targets.
- [ ] Reject any candidate more than 1 LU from the reference group before subjective review.
- [ ] Present randomized playable candidates to Andrew/family at a fixed device volume; record keep/reject and reason.
- [ ] Write failing player-identity tests proving all current ids normalize unchanged and new ids round-trip.
- [ ] Add only approved final files and catalog entries.
- [ ] Verify preview and live-play volume use the same policy.
- [ ] Run focused player/audio tests, repository gate, and fixed-volume iPhone comparison.
- [ ] Commit the signature library independently.

### Release 3: Bank adaptive score

- [ ] Write failing pure tests for silent safe rolls, low risk at roll three, building risk, maximum risk, and terminal silence.
- [ ] Implement `bankMusicTier(game)` as the only tier selector.
- [ ] Generate two coherent variants for each tier at the same key/tempo and master them to `game.music` targets.
- [ ] Reject candidates whose perceived intensity comes mainly from louder mastering.
- [ ] Implement `useGameMusic` with equal-power crossfade, signature/mechanic ducking, route cleanup, mute behavior, and best-effort error handling.
- [ ] Wire local and remote Bank to the same selector.
- [ ] Preserve `shouldPlayFailureCue(nextStatus)` so a terminal seven never plays a sad cue before victory.
- [ ] Verify repeated rolling, banking, seven-out, doubles, win, replay, background/foreground, mute, and route exit.
- [ ] Run focused tests, repository gate, and physical-iPhone fixed-volume play.
- [ ] Commit Bank music independently.

### Release 4: Story and connection-game atmosphere

- [ ] Implement one game at a time in this order: Story Relay, Doodle Bridge, Object Quest, Clue Circle, Slanguage.
- [ ] For each game, write a phase-to-audio-state test before wiring playback.
- [ ] Generate two variants, normalize to `game.music`, and review at fixed volume against spoken instructions.
- [ ] Add music only when it improves the game's job; a rejected/no-music result is valid.
- [ ] Duck or stop at read-aloud, private handoff, and reveal phases according to each playback contract.
- [ ] Verify restart and route cleanup before moving to the next game.
- [ ] Commit each accepted game score independently.

### Release 5: Pass Pattern notes

- [ ] Generate six harmonically related notes plus success/miss candidates.
- [ ] Normalize all notes within 0.75 LU and align attack/tail timing.
- [ ] Write failing tests that require each beat id to resolve to a distinct asset rather than one source plus playback-rate mutation.
- [ ] Replace playback-rate pitch shifting with the approved assets.
- [ ] Verify gentle and faster sequences on an iPhone speaker at 25% and 50% volume.
- [ ] Commit Pass Pattern audio independently.

### Release 6: Focus and To-do audio

- [ ] Audit the four existing Focus tracks and both completion sounds against the new categories before generating replacements.
- [ ] Generate Focus candidates and review loop seam, distraction level, and relative loudness.
- [ ] Add only three approved tracks and update `SoundscapeId`, source map, and picker titles.
- [ ] Implement Focus runtime gain/crossfade without changing background/lock-screen ownership.
- [ ] Generate and review step/whole-To-do cues at one fixed volume.
- [ ] Replace the two existing filenames only after whole-To-do versus step differentiation passes.
- [ ] Verify rapid step completion, repeated whole-To-do completion, undo, Focus switching, background/lock, interruption, and route cleanup.
- [ ] Run focused tests and repository gate; use a signed physical device for background/lock/audio-route proof.
- [ ] Commit Focus and To-do work separately if either can ship independently.

### Release 7: Final integration and release proof

- [ ] Run `npm run audio:audit` and require every shipped asset to pass its category target, tolerance, peak, format, silence, and duration contract.
- [ ] Run `npm run verify:changed -- --run`.
- [ ] Run the complete Games audio/player suites and broader Jest if shared services changed.
- [ ] Run `npm run product:lint`, `npm run architecture:lint`, and `git diff --check`.
- [ ] Record Simulator proof separately from signed-device proof.
- [ ] Complete the physical-iPhone listening matrix, Bluetooth route change, silent switch, interruption, background/foreground, and lock-screen Focus checks.
- [ ] Build/install TestFlight only after source, Simulator, and signed local-device gates pass; record build commit and installed build number.
- [ ] Update the job-flow delivery score only after observed family use shows the audio improves play rather than merely existing.

## Generation checkpoints

At each checkpoint, provide:

1. Playable candidate files with stable names.
2. Prompt and generation settings.
3. Credits spent and remaining observed balance.
4. Duration, sample rate, channel count, LUFS, true peak, and silence measurements.
5. A fixed-volume comparison order.
6. Recommendation with explicit keep/reject reasons.
7. No asset replacement or code integration until Andrew approves the candidates.

## Success signals

- Children can find multiple signature sounds they genuinely want to attach to themselves, and the library does not contain an obvious “best because loudest” choice.
- Randomized signature playback does not cause listeners to adjust system volume between sounds.
- Bank tension rises through arrangement and state, not a loudness jump, and chosen player cues remain legible over it.
- Story music makes play feel adventurous while ordinary conversation and read-aloud instructions remain effortless.
- Pass Pattern notes are distinct at low phone-speaker volume and remain evenly loud.
- Switching Focus tracks does not create a startling volume change.
- Whole-To-do completion feels warmer than a step cue without being dramatically louder.
- Muting Games reliably silences both music and effects, and audio failure never blocks play.

## Proof boundaries

- Audio metadata and automated loudness checks do not prove perceived balance on a phone speaker.
- Simulator playback does not prove physical-device volume, silent-switch, Bluetooth, interruption, background, or lock-screen behavior.
- One adult's headphones do not prove a family-room mix or children's perception of the signature library.
- A generated asset is not cleared for the app until its generation provenance, paid-plan timing, model/terms status, and allowed commercial use are recorded.
- A merged change is not a shipped or installed audio experience; record the exact bundle and device used for proof.
