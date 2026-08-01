# Pet Engine Study 34 — Look First, Then Leap

## Frame and system alignment

> When something in this tiny world catches my attention, I want Moss to notice it, understand where it is, and move toward it believably so play feels responsive rather than mechanical.

The wildlife ladder already gives each form a different reachable world: Baby meets a crawler near the ground, Young meets a low firefly, and Guardian meets a sky moth high in the air. The missing layer is attention. A visitor that begins close enough can currently trigger a pounce on the first simulation frame. That makes the body commit before the eyes, ears, and head have established a direction, and a correct path can still read as a backward jump.

- **Audience:** `audience-aspirational-family-organizers`
- **Representative persona:** Maya, pressure-tested through Charlie as the teen participant
- **Hero JTBD:** `jtbd-help-us-enjoy-being-together`
- **Active JTBDs:** `jtbd-feel-arc-progress-without-tracking-tools` and `jtbd-trust-this-app-with-my-life`
- **Job-flow gap:** **Keep using the system because it feels helpful, not fussy** remains 3/5.
- **Constraint posture:** Preserve the portable renderer, current stage atlases, direct touch, causal wildlife, reduced-motion meaning, and the inspector as a deterministic lab surface. Add no new user-facing control.

```yaml
serves: [jtbd-help-us-enjoy-being-together, jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

How might we make every pursuit begin with a readable anime-style attention beat, then let maturity change what Moss can reach without making direct play feel delayed?

## Yes-and decision

Broader expansion is skipped. The crawler, firefly, sky moth, pounce, Guardian aerial, and hand guide already exist. This is a behavioral-engine refinement that makes those systems legible and alive.

## Divergence

### Add more pounce frames

More in-betweens could smooth the body after launch, but they would not explain why Moss launched in the wrong apparent direction. The causality problem happens before the pounce clip begins.

### Draw a target marker or gaze line

A marker would make the destination explicit, but it would add game UI over a relationship the character should be able to act. It also would not guarantee that facing and movement agree.

### Require attention before commitment

Every new hand or wildlife target first requests the existing `discover` vocabulary. Moss remains planted while eyes, ears, and head settle toward the target's current side. Only after that bounded beat may the engine choose walking, pouncing, or aerial pursuit. If the target crosses during attention, the latest visible side wins before the action locks.

## Convergence

Choose **require attention before commitment**.

The rule is:

1. a new wildlife or hand target starts in a planted attention action;
2. the visitor begins inside the readable camera safe area, never behind edge scenery;
3. facing may follow the target during this notice beat, but the body may not translate;
4. the target's latest reachable position is sampled when attention completes;
5. commitment locks facing, launch origin, intercept, and escape to one side for the full performance;
6. Baby receives the longest curious look and walks or makes a low ground pounce;
7. Young responds sooner and can bound toward a low flying firefly;
8. Guardian responds fastest and can enter the longer authored aerial bank toward a high sky moth;
9. reduced motion preserves target meaning and final placement without animated travel;
10. rain shelter, Focus, committed landings, and other stronger scenes retain priority.

### Capability delta

Before this study, a nearby visitor can move directly from spawn to pounce, and a new high hand can trigger an aerial clip before Moss visibly looks up. After this study, the same inputs read as a sentence: **notice, turn, coil, leap, land**. Maturity is visible in both the world layer that attracts Moss and the movement vocabulary Moss earns.

### Reductive decisions

- Do not add a target reticle, gaze beam, prompt, tutorial, meter, or dialogue.
- Do not add another animation renderer or replace the current atlas contract.
- Do not let target prediction cross through Moss before commitment.
- Do not turn during a committed pounce merely because the visitor keeps moving.
- Do not use the Guardian aerial vocabulary for Baby or Young.

We're betting that a few hundred milliseconds of authored attention will feel like intention, not input lag, because the character immediately acknowledges the target with face and head acting. If it feels sluggish, tune the notice durations and acquisition distances without removing the attention phase.

## Learning release and evaluation

The private standalone site remains the release channel. At 390 × 844, invite wildlife in all three stages and hold a hand on both sides and at different heights. Confirm that Moss first stays planted and looks; that a crossing target changes facing before launch; that no committed path travels opposite the body; that Baby stays grounded, Young bounds into the low air, and Guardian performs the high bank and grounded wake; and that reduced motion preserves the same stage and direction meaning.

Supporting evidence is that the viewer describes Moss as seeing, deciding, and then moving. Disconfirming evidence is a launch that begins before the head turn, a moonwalk or backward pounce, repeated left-right flipping, sluggish direct touch, a target that vanishes before contact, or maturity that changes only sprite size.

## Spec refinement

Pure world logic owns notice duration, acquisition, latest-side sampling, commitment, and stage-specific action choice; regression tests precede implementation. Existing `discover`, `pounce`, and `aerial` clips own the visible acting. React and Canvas receive no new behavior state, persistence field, or user-facing control. The inspector continues to expose action, facing, visitor layer, hand position, and reach layer for deterministic QA.
