# Study 31 — After the rain

## Frame and system alignment

> I should feel immersed in a beautiful tiny world where weather affects the character, and I can play with the character inside it.

When Charlie watches Moss shelter from rain, he should be able to feel that the storm really passed through their shared place—and discover one small way to play with what it left behind—so weather feels like a story rather than a visual mode.

- **Audience:** `audience-aspirational-family-organizers`
- **Representative persona:** Maya, pressure-tested through Charlie as the teen participant
- **Hero JTBD:** `jtbd-move-the-few-things-that-matter`
- **Active JTBDs:** `jtbd-feel-arc-progress-without-tracking-tools`, `jtbd-help-us-enjoy-being-together`, and `jtbd-trust-this-app-with-my-life`
- **Job-flow gap:** **Keep using the system because it feels helpful, not fussy** remains 3/5.
- **Constraint posture:** Extend the portable world with one bounded weather-residue state while preserving the existing weather, touch, animation, camera, and priority contracts.

Restated in user voice: when a storm passes through Moss’s meadow, I want the world to still carry a little evidence of it and answer my touch, so it feels like a place we inhabit together rather than a background that swaps skins.

```yaml
serves: [jtbd-feel-arc-progress-without-tracking-tools, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
```

How might we let Charlie play with the aftermath of a weather event, while preserving calm pacing, believable ground contact, direct control, and freedom from meters or rewards?

## Yes-and decision

Broader expansion is skipped. Weather aftermath could eventually include fallen leaves, snow, heat shimmer, or seasonal traces, but this study should prove one complete causal chain before creating a generalized environment inventory.

## Divergence

### A prettier clearing transition

Crossfade rain into sunlight and add a rainbow. This improves atmosphere but leaves Charlie watching the renderer instead of playing in the changed world.

### Weather souvenirs

Let storms award droplets or unlock decorations. This makes persistence obvious but turns nature into currency and adds an economy unrelated to the relationship.

### One puddle the world leaves behind

When rain yields to sun, one puddle remains on the terrain. Moss notices the glint but does not immediately consume the scene. Tapping the puddle invites a grounded approach and one complete pounce-and-splash performance. The water settles and fades naturally; nothing is collected.

## Convergence

Choose **one puddle the world leaves behind**.

The sequence is:

1. rain arrives; Moss notices, flinches, and reaches shelter using the existing authored behavior;
2. sun returns; rain intensity eases while one puddle catches the clearing light;
3. Moss turns toward the glint, giving the person a readable but unobtrusive invitation;
4. tapping that exact puddle commits Moss to face it, approach on the terrain, and pounce once;
5. a brief splash is derived from the same portable action timing, then Moss lands and the puddle becomes quiet;
6. ignoring the puddle remains valid; it fades without sadness, penalty, or missed reward;
7. Focus, care, evening, and direct hand guidance remain stronger than ambient aftermath.

### Reductive decisions

- No weather history, forecast, season, puddle count, water currency, badge, or collection.
- No automatic repeated splashing and no generic “Play” button.
- No new animation atlas row in the first proof; compose notice, walk, and pounce with environmental splash timing.
- The puddle is world-space geometry, not an HTML target or modal.
- The puddle never survives a reload and stores no personal data.
- Reduce Motion preserves the cause and touch result without travel or spray animation.

We’re betting that **playable aftermath** will make the habitat feel more like a directed anime world than adding another weather effect during the storm. If the puddle reads as a minigame target or the splash feels detached from Moss’s landing, revisit invitation strength, timing, and contact before generalizing weather residue.

## Learning release and evaluation

The private site remains the release channel. At 390 × 844, trigger Rain and observe the complete shelter response; then trigger Sun and verify the sky clears, one puddle remains in the framed terrain, Moss notices without teleporting, a direct puddle tap produces a correctly faced grounded approach and exactly one pounce, the splash peaks at landing, and ordinary touch returns afterward. Repeat with Baby, Young, Guardian, and Reduce Motion.

Disconfirming evidence is an ungrounded splash, backward pounce, puddle hidden by the dock, rain residue appearing without prior rain, ambient direction stealing the scene, repeated splash loops, or a target only discoverable through the inspector.

## Spec refinement

Pure world logic owns residue creation, bounded placement, hit testing, invitation, commitment, completion, expiry, and priority; tests must precede implementation. Canvas owns only puddle and splash pixels plus pointer arbitration. Reuse the existing pounce clip and terrain anchor. Keep residue out of serialized world memory. No user-owned decision remains for this prototype study.
