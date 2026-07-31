# Portable Pet Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that Leafling's behavior and clip playback are platform-neutral while the existing site remains a Canvas renderer, using independent authored Idle and Greet clips.

**Architecture:** A pure TypeScript runtime resolves named clips into renderer-neutral frame snapshots. A Leafling manifest owns atlas coordinates, durations, loop rules, event markers, stage sizing, and authoring channels. The Canvas component translates snapshots into `drawImage` calls; a future Skia adapter can consume the same snapshot contract.

**Tech Stack:** TypeScript, Node test runner, React, Canvas 2D, generated PNG sprite strips.

---

### Task 1: Define the renderer-neutral playback contract

**Files:**
- Create: `prototypes/pixel-pets/lib/pet-runtime.ts`
- Modify: `prototypes/pixel-pets/tests/pet-engine.test.ts`

- [ ] **Step 1: Write failing tests for clip timing, looping, completion, events, and reduced motion**

```ts
const manifest = fixtureManifest();
assert.deepEqual(resolvePetFrame(manifest, "idle", 0, false), {
  clip: "idle", frameIndex: 0, cell: { column: 0, row: 0 },
  progress: 0, completed: false, events: [], transform: { x: 0, y: 0 },
});
assert.equal(resolvePetFrame(manifest, "idle", 240, false).frameIndex, 0);
assert.equal(resolvePetFrame(manifest, "greet", 9999, false).completed, true);
assert.deepEqual(resolvePetFrame(manifest, "greet", 220, false).events, ["chirp"]);
assert.deepEqual(resolvePetFrame(manifest, "greet", 220, true).transform, { x: 0, y: 0 });
```

- [ ] **Step 2: Run the focused test and confirm it fails because the runtime does not exist**

Run: `npm --prefix prototypes/pixel-pets test`

Expected: FAIL resolving `../lib/pet-runtime.ts`.

- [ ] **Step 3: Implement the pure playback resolver**

```ts
export interface PetFrameSnapshot {
  clip: string;
  frameIndex: number;
  cell: { column: number; row: number };
  progress: number;
  completed: boolean;
  events: string[];
  transform: { x: number; y: number };
}

export function resolvePetFrame(
  manifest: PetAnimationManifest,
  clipId: string,
  elapsedMs: number,
  reducedMotion: boolean,
): PetFrameSnapshot {
  const clip = manifest.clips[clipId] ?? manifest.clips[manifest.fallbackClip];
  const total = clip.frames.reduce((sum, frame) => sum + frame.duration, 0);
  const safeElapsed = Math.max(0, elapsedMs);
  const completed = !clip.loop && safeElapsed >= total;
  const playhead = clip.loop ? safeElapsed % total : Math.min(safeElapsed, total - 1);
  let frameIndex = 0;
  let cursor = 0;
  for (let index = 0; index < clip.frames.length; index += 1) {
    cursor += clip.frames[index].duration;
    if (playhead < cursor) { frameIndex = index; break; }
  }
  const frame = clip.frames[frameIndex];
  return {
    clip: clipId in manifest.clips ? clipId : manifest.fallbackClip,
    frameIndex,
    cell: frame.cell,
    progress: total === 0 ? 0 : playhead / total,
    completed,
    events: frame.events ?? [],
    transform: reducedMotion ? { x: 0, y: 0 } : (frame.transform ?? { x: 0, y: 0 }),
  };
}
```

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `npm --prefix prototypes/pixel-pets test`

Expected: all runtime and existing state tests pass.

### Task 2: Give Leafling a portable manifest and independent clips

**Files:**
- Create: `prototypes/pixel-pets/lib/leafling.ts`
- Create: `prototypes/pixel-pets/public/leafling-atlas.png`
- Modify: `prototypes/pixel-pets/lib/pet-engine.ts`
- Modify: `prototypes/pixel-pets/tests/pet-engine.test.ts`

- [ ] **Step 1: Generate and visually inspect a six-frame Idle strip and eight-frame Greet strip grounded in the approved Leafling**

Use the approved `public/leafling-idle-strip.png` as the identity reference. Idle is a quiet breath/blink cycle. Greet is a readable attention, lift, friendly response, and settle cycle. Preserve silhouette, face, palette, pixel density, baseline, and transparent output.

- [ ] **Step 2: Assemble both strips deterministically into a fixed-cell two-row atlas**

```text
row 0: idle-0 idle-1 idle-2 idle-3 idle-4 idle-5 [empty] [empty]
row 1: greet-0 greet-1 greet-2 greet-3 greet-4 greet-5 greet-6 greet-7
```

- [ ] **Step 3: Define the Leafling manifest without renderer imports**

```ts
export const LEAFLING_MANIFEST = {
  atlas: { src: "/leafling-atlas.png", frameWidth: 112, frameHeight: 112 },
  clips: {
    idle: { loop: true, frames: [
      { cell: { column: 0, row: 0 }, duration: 420 },
      { cell: { column: 1, row: 0 }, duration: 260 },
      { cell: { column: 2, row: 0 }, duration: 120 },
      { cell: { column: 3, row: 0 }, duration: 320 },
      { cell: { column: 4, row: 0 }, duration: 140 },
      { cell: { column: 5, row: 0 }, duration: 460 },
    ] },
    greet: { loop: false, frames: [
      { cell: { column: 0, row: 1 }, duration: 120 },
      { cell: { column: 1, row: 1 }, duration: 100 },
      { cell: { column: 2, row: 1 }, duration: 100, events: ["chirp"] },
      { cell: { column: 3, row: 1 }, duration: 120 },
      { cell: { column: 4, row: 1 }, duration: 140 },
      { cell: { column: 5, row: 1 }, duration: 140 },
      { cell: { column: 6, row: 1 }, duration: 180 },
      { cell: { column: 7, row: 1 }, duration: 260 },
    ] },
  },
  fallbackClip: "idle",
} satisfies PetAnimationManifest;
```

- [ ] **Step 4: Test that every manifest cell is in bounds and that Idle and Greet occupy independent rows**

Run: `npm --prefix prototypes/pixel-pets test`

Expected: all manifest tests pass.

### Task 3: Make Canvas an adapter rather than the engine

**Files:**
- Modify: `prototypes/pixel-pets/components/PetEngineCanvas.tsx`
- Modify: `prototypes/pixel-pets/components/PetPrototype.tsx`
- Modify: `prototypes/pixel-pets/tests/rendered-html.test.mjs`

- [ ] **Step 1: Replace Canvas-owned clip selection with `resolvePetFrame()` output**

```ts
const snapshot = resolvePetFrame(LEAFLING_MANIFEST, clipId, elapsed, reducedMotion);
drawAtlasCell(context, sprite, LEAFLING_MANIFEST.atlas, snapshot.cell, destination);
```

- [ ] **Step 2: Update the inspector to expose the portable contract**

Show the active clip, frame, atlas cell, loop/one-shot rule, renderer name (`Canvas 2D`), and emitted event marker. Keep the Pet capability as the dominant surface.

- [ ] **Step 3: Verify Idle and Greet visually, including pause/step and reduced motion**

Run the site locally, inspect both clips at normal size, and confirm there is no size pop, baseline jump, identity drift, smoothing, or false claim of independently composited anatomy.

- [ ] **Step 4: Run completion verification**

Run:

```bash
npm --prefix prototypes/pixel-pets test
npm --prefix prototypes/pixel-pets run lint
npm --prefix prototypes/pixel-pets run build
npm run verify:changed -- --run
git diff --check
```

Expected: all commands pass; production visual verification remains required after deployment.
