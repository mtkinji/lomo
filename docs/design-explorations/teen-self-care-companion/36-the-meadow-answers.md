# Pet Engine Study 32 — The Meadow Answers

## Frame and system alignment

> I should feel like the character can evolve from a baby to a powerful adult creature. I am not just watching that world. I am playing with my little character from it.

Charlie can feel Moss grow through a larger silhouette and a higher reachable sky, but Guardian's power still ends at its own body. The meadow does not acknowledge the difference between a Young bound and a Guardian landing. A powerful adult should not need a labeled ability; the same direct relationship should produce a consequence the world can feel.

- **Audience:** `audience-aspirational-family-organizers`
- **Representative persona:** Maya, pressure-tested through Charlie as the teen participant
- **Hero JTBD:** `jtbd-move-the-few-things-that-matter`
- **Active JTBDs:** `jtbd-feel-arc-progress-without-tracking-tools`, `jtbd-help-us-enjoy-being-together`, and `jtbd-trust-this-app-with-my-life`
- **Job-flow gap:** **Keep using the system because it feels helpful, not fussy** remains 3/5.
- **Constraint posture:** Fit the existing hand grammar, three-stage evolution, authored aerial timing, world priority, and transient renderer contract. Extend only the environmental response to one already-earned Guardian movement.

Restated in user voice: when the little creature has grown beside the things I have done in real life, I want one familiar gesture to reveal that it has become genuinely powerful, so I can feel our shared history without reading a level or unlocking a game menu.

```yaml
serves: [jtbd-feel-arc-progress-without-tracking-tools, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
```

How might we let Charlie feel Guardian's maturity through direct play and environmental consequence, while preserving calm progression, believable contact, and freedom from stats or power controls?

## Yes-and decision

Broader expansion is skipped. Guardian might eventually protect wildlife in rain, carry seeds between places, or alter how Focus feels, but the next proof should answer one narrow question: can a mature movement make the existing world answer without becoming a spell, reward, or minigame?

## Divergence

### Give Guardian an ability button

Add a visible Gust control after evolution. The capability delta would be obvious, but the world would become a controller-driven game and maturity would be explained by UI rather than discovered through relationship.

### Make Guardian's sprite more dramatic

Add longer leaf crests, glow, or larger aerial frames. This improves spectacle but keeps power trapped inside the character art; it does not deepen the simulation or the person's agency.

### Let the landing travel through the meadow

Keep the existing upward hand invitation. Baby remains grounded. Young performs its bounded leap. Guardian gathers nearby air during its authored aerial reach; when its paws return to the terrain, one broad but gentle wake moves outward through grass and loose leaves before settling. The effect is weather-aware in feel but creates no resource or permanent scenery.

### Let Guardian change the weather

An aerial gesture could clear rain or summon wind. This is visually powerful, but it overstates control, competes with the habitat's causal weather system, and risks making healthy progress into magic currency.

## Convergence

Choose **let the landing travel through the meadow**.

The sequence is:

1. Baby and Young retain their current reachable layers and leave no adult-scale wake;
2. drawing a hand high enough for Guardian commits the existing aerial performance;
3. air and a few loose leaves gather around the authored ascent without obscuring Moss;
4. the effect waits for the same landing boundary as the body, never firing at gesture start;
5. one outward wake bends nearby grass and carries leaf pixels across the terrain;
6. the wake settles once and never loops while the finger remains held;
7. rain shelter and Focus still refuse the invitation; ordinary touch returns after landing;
8. Reduce Motion preserves one static bowed-grass contact image without expanding rings or airborne particles.

Guardian is powerful because the world responds to its physical commitment, not because the app announces a power.

### Capability delta

Today, Guardian reaches a higher part of the world but lands into the same visual quiet as Young. After this study, the same direct gesture culminates in a stage-exclusive environmental consequence synchronized to the authored landing. The person still cannot summon weather, repeatedly farm the effect, steer Moss like a cursor, spend energy, damage scenery, or unlock a power menu.

### Reductive decisions

- No ability name, button, tutorial, level, cooldown, meter, currency, or reward.
- No new persisted state; the wake is transient renderer-neutral world state and never survives a reload.
- No new sprite row; use the existing Guardian aerial performance and synchronize the environment to it.
- No bloom or durable memory from casual play; meaningful Kwilt actions remain the only source of lasting world traces and growth.
- No camera shake, flash, explosion, or heroic fanfare. Power should feel graceful and physical.
- No wake for Baby or Young, even when inspector clips are selected.

We're betting that **environmental consequence** will make Guardian feel more powerful than additional size, speed, or UI. If the wake reads as decorative particles rather than a force passing through the meadow, revisit ground contact, grass displacement, radius, and timing before adding more power behaviors.

## Learning release and evaluation

The private standalone site remains the release channel. At 390 × 844, use the same upward hand gesture as Baby, Young, and Guardian. Confirm that only Guardian gathers air; the wake waits for landing; the nearby grass bows away from contact; loose leaves travel outward once; the pet stays grounded after recovery; holding the hand does not retrigger it; Focus and settled rain refuse it; ordinary touch interrupts only after the committed landing; and Reduce Motion shows meaning without environmental travel.

Supporting evidence is that a person can identify Guardian as powerful without seeing the inspector or being told about an ability. Disconfirming evidence is a generic sparkle aura, a wake that precedes contact, grass moving toward the landing, repeated shockwaves, a Young form producing the same effect, camera shake, or a result visible only in tests.

## Spec refinement

Pure world logic owns a transient Guardian wake with `quiet`, `gathering`, and `released` phases, authored landing transition, expiry, interruption cleanup, and a renderer-neutral presentation resolver. Tests must precede implementation. Canvas owns deterministic leaf pixels, wind bands, and local grass displacement. The wake must remain absent from serialized world memory. Existing hand, Focus, rain, camera, clip, and stage contracts remain authoritative. No user-owned product decision remains for this study.
