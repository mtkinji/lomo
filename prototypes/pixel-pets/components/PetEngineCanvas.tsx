"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";

import {
  ENGINE_SCENE,
  clipForMotion,
  resolveGroundCue,
  type EngineMotion,
} from "@/lib/pet-engine";
import {
  PET_WORLD,
  applyWorldIntent,
  clipForWorldAction,
  createPetWorldState,
  resolveRolloverPose,
  resolveTapIntent,
  setWorldZoom,
  spawnInsect,
  stepPetWorld,
  type PetWorldAction,
  type PetWorldState,
  type WorldPoint,
} from "@/lib/pet-world";
import { LEAFLING_MANIFEST, LEAFLING_PRESENTATION } from "@/lib/leafling";
import { resolvePetFrame, type PetFrameSnapshot } from "@/lib/pet-runtime";
import type { PetPalette, PetStage } from "@/lib/pet-state";

export type PetWorldCommand = {
  serial: number;
  type: "firefly" | "rollover" | "center";
};

interface PetEngineCanvasProps {
  stage: PetStage;
  palette: PetPalette;
  motion: EngineMotion;
  reducedMotion: boolean;
  paused?: boolean;
  manualElapsed?: number;
  showRig?: boolean;
  worldCommand?: PetWorldCommand | null;
  onFrame?: (snapshot: PetFrameSnapshot) => void;
  onWorldFrame?: (world: PetWorldState) => void;
  onWorldInteraction?: (action: PetWorldAction) => void;
  label: string;
}

type HabitatPalette = {
  outline: string;
  deep: string;
  leaf: string;
  leafLight: string;
  cream: string;
  sky: string;
  skyLight: string;
  skyDeep: string;
  ground: string;
  groundLight: string;
  groundDark: string;
  bloom: string;
};

const PALETTES: Record<PetPalette, HabitatPalette> = {
  moss: { outline: "#26372d", deep: "#3f5b42", leaf: "#4f793f", leafLight: "#7fa55d", cream: "#e7e6ba", sky: "#cfe1bf", skyLight: "#e8efd8", skyDeep: "#aecb9d", ground: "#91a866", groundLight: "#adc17f", groundDark: "#667b4c", bloom: "#f3d58a" },
  lagoon: { outline: "#203b42", deep: "#315f66", leaf: "#39736b", leafLight: "#6fa58f", cream: "#e7e3b9", sky: "#c7e2dd", skyLight: "#e3f0e9", skyDeep: "#99c6bf", ground: "#78a98d", groundLight: "#9bc1a7", groundDark: "#4f7869", bloom: "#f2cf87" },
  ember: { outline: "#4a3029", deep: "#704537", leaf: "#79623a", leafLight: "#a58b54", cream: "#f1dfb6", sky: "#efd2aa", skyLight: "#f8e5c7", skyDeep: "#dcae85", ground: "#b98658", groundLight: "#d0a36f", groundDark: "#79563d", bloom: "#f6c96c" },
  clay: { outline: "#3c302e", deep: "#684b42", leaf: "#65714b", leafLight: "#899264", cream: "#eadfbe", sky: "#e3d7c5", skyLight: "#f1eadc", skyDeep: "#c5b59d", ground: "#aa9370", groundLight: "#c3ae89", groundDark: "#756448", bloom: "#e8c77f" },
  sky: { outline: "#243747", deep: "#3e5d74", leaf: "#4c7469", leafLight: "#75a08b", cream: "#eee1b9", sky: "#cfe3ef", skyLight: "#e8f1f4", skyDeep: "#a7c7da", ground: "#8aaf93", groundLight: "#a8c7a8", groundDark: "#607c67", bloom: "#f2d17e" },
};

function worldTransform(context: CanvasRenderingContext2D, world: PetWorldState) {
  context.translate(ENGINE_SCENE.width / 2, ENGINE_SCENE.groundY);
  context.scale(world.zoom, world.zoom);
  context.translate(-world.cameraX, -ENGINE_SCENE.groundY);
}

function drawPixelHill(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + width * 0.12, y - height * 0.25);
  context.lineTo(x + width * 0.22, y - height * 0.25);
  context.lineTo(x + width * 0.22, y - height * 0.48);
  context.lineTo(x + width * 0.34, y - height * 0.48);
  context.lineTo(x + width * 0.34, y - height * 0.74);
  context.lineTo(x + width * 0.46, y - height * 0.74);
  context.lineTo(x + width * 0.46, y - height);
  context.lineTo(x + width * 0.56, y - height);
  context.lineTo(x + width * 0.56, y - height * 0.68);
  context.lineTo(x + width * 0.7, y - height * 0.68);
  context.lineTo(x + width * 0.7, y - height * 0.42);
  context.lineTo(x + width * 0.86, y - height * 0.42);
  context.lineTo(x + width, y);
  context.closePath();
  context.fill();
}

function drawGrassTuft(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillRect(x, y - 5, 1, 5);
  context.fillRect(x - 2, y - 3, 2, 1);
  context.fillRect(x + 1, y - 4, 2, 1);
}

function drawHabitat(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  motion: EngineMotion,
  progress: number,
  world: PetWorldState,
) {
  const groundY = ENGINE_SCENE.groundY;
  context.fillStyle = palette.sky;
  context.fillRect(0, 0, ENGINE_SCENE.width, ENGINE_SCENE.height);
  context.fillStyle = palette.skyLight;
  context.fillRect(0, 0, ENGINE_SCENE.width, 24);
  context.fillStyle = palette.skyDeep;
  context.fillRect(0, 112, ENGINE_SCENE.width, 96);

  context.fillStyle = palette.bloom;
  context.fillRect(125, 34, 7, 7);
  context.fillRect(127, 30, 3, 15);
  context.fillRect(121, 36, 15, 3);
  context.fillStyle = palette.skyLight;
  context.fillRect(128, 35, 2, 2);

  context.save();
  context.translate(ENGINE_SCENE.width / 2, 0);
  context.translate(-world.cameraX * 0.12, 0);
  context.fillStyle = palette.sky;
  for (let x = -80; x < PET_WORLD.width + 120; x += 118) drawPixelHill(context, x, 164, 102, 34 + (x % 3) * 4);
  context.fillStyle = palette.deep;
  for (let x = -30; x < PET_WORLD.width + 80; x += 29) {
    context.fillRect(x, 154 - (x % 4), 1, 10 + (x % 4));
    context.fillRect(x - 2, 156 - (x % 3), 5, 2);
  }
  context.fillStyle = palette.skyLight;
  context.fillRect(34, 44, 19, 3);
  context.fillRect(39, 41, 10, 3);
  context.fillRect(196, 67, 24, 3);
  context.fillRect(202, 64, 12, 3);
  context.fillRect(356, 34, 17, 3);
  context.fillRect(360, 31, 9, 3);
  context.restore();

  context.save();
  worldTransform(context, world);

  context.fillStyle = palette.ground;
  context.fillRect(0, groundY, PET_WORLD.width, ENGINE_SCENE.height - groundY + 30);
  context.fillStyle = palette.groundLight;
  context.fillRect(0, groundY + 3, PET_WORLD.width, 4);
  context.fillStyle = palette.groundDark;
  context.fillRect(0, groundY, PET_WORLD.width, 3);

  for (let x = 8; x < PET_WORLD.width; x += 47) {
    context.fillRect(x, groundY + 17 + ((x / 47) % 3) * 3, 22, 3);
  }

  context.fillStyle = palette.groundDark;
  for (let x = 14; x < PET_WORLD.width; x += 23) drawGrassTuft(context, x, groundY);
  context.fillStyle = palette.groundLight;
  for (let x = 7; x < PET_WORLD.width; x += 31) {
    context.fillRect(x, groundY + 10 + (x % 11), 2, 1);
    context.fillRect(x + 8, groundY + 29 + (x % 7), 3, 1);
  }

  for (let x = 28; x < PET_WORLD.width; x += 86) {
    context.fillStyle = palette.deep;
    context.fillRect(x, groundY - 12, 2, 15);
    context.fillStyle = palette.leaf;
    context.fillRect(x - 4, groundY - 16, 5, 5);
    context.fillRect(x + 1, groundY - 22, 5, 9);
    context.fillRect(x - 7, groundY - 11, 6, 4);
    context.fillStyle = palette.leafLight;
    context.fillRect(x + 2, groundY - 20, 2, 5);
  }

  for (let x = 64; x < PET_WORLD.width; x += 132) {
    context.fillStyle = palette.outline;
    context.fillRect(x + 2, groundY - 6, 13, 6);
    context.fillRect(x, groundY - 3, 18, 3);
    context.fillStyle = palette.deep;
    context.fillRect(x + 5, groundY - 8, 8, 3);
    context.fillStyle = palette.groundLight;
    context.fillRect(x + 7, groundY - 7, 3, 1);
    context.fillStyle = palette.bloom;
    context.fillRect(x + 25, groundY - 5, 2, 3);
    context.fillRect(x + 22, groundY - 7, 2, 2);
    context.fillStyle = palette.deep;
    context.fillRect(x + 23, groundY - 5, 1, 5);
  }

  if (motion === "care") {
    const berryY = groundY - 28 + Math.round(Math.min(progress * 2, 1) * 23);
    context.fillStyle = "#d8615f";
    context.fillRect(world.petX - 2, berryY, 3, 3);
    context.fillRect(world.petX + 1, berryY + 1, 2, 2);
    context.fillStyle = palette.leaf;
    context.fillRect(world.petX, berryY - 2, 2, 2);
  }

  if (world.insect.active) {
    const wing = Math.floor(world.insect.ageMs / 90) % 2;
    context.fillStyle = palette.cream;
    context.fillRect(Math.round(world.insect.x) - 2, Math.round(world.insect.y) - wing, 2, 2);
    context.fillRect(Math.round(world.insect.x) + 2, Math.round(world.insect.y) + wing, 2, 2);
    context.fillStyle = palette.bloom;
    context.fillRect(Math.round(world.insect.x), Math.round(world.insect.y), 2, 2);
    context.fillStyle = palette.outline;
    context.fillRect(Math.round(world.insect.x), Math.round(world.insect.y) + 2, 1, 1);
  }

  context.restore();
}

function renderScene(
  context: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  paletteId: PetPalette,
  stage: PetStage,
  motion: EngineMotion,
  snapshot: PetFrameSnapshot,
  showRig: boolean,
  world: PetWorldState,
) {
  const palette = PALETTES[paletteId];
  context.clearRect(0, 0, ENGINE_SCENE.width, ENGINE_SCENE.height);
  drawHabitat(context, palette, motion, snapshot.progress, world);

  const size = LEAFLING_PRESENTATION.stages[stage];
  const scaleX = size.width / LEAFLING_MANIFEST.atlas.frameWidth;
  const scaleY = size.height / LEAFLING_MANIFEST.atlas.frameHeight;
  const sourceX = snapshot.cell.column * LEAFLING_MANIFEST.atlas.frameWidth;
  const sourceY = snapshot.cell.row * LEAFLING_MANIFEST.atlas.frameHeight;
  const destinationX = -snapshot.anchor.x * scaleX + snapshot.transform.x;
  const destinationY = -snapshot.anchor.y * scaleY + snapshot.transform.y;
  const groundCue = resolveGroundCue(snapshot.contact, snapshot.shadow.width, snapshot.shadow.opacity, scaleX);

  context.save();
  worldTransform(context, world);
  context.globalAlpha = groundCue.opacity;
  context.fillStyle = palette.outline;
  context.fillRect(
    Math.round(world.petX - groundCue.width / 2),
    ENGINE_SCENE.groundY + groundCue.yOffset,
    groundCue.width,
    groundCue.height,
  );
  context.restore();

  context.save();
  worldTransform(context, world);
  context.translate(world.petX, ENGINE_SCENE.groundY + world.poseY);
  if (world.rotation !== 0) {
    context.translate(0, -size.height * 0.42);
    context.rotate((world.rotation * world.facing * Math.PI) / 180);
    context.translate(0, size.height * 0.42);
  }
  context.scale(world.facing, 1);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    sprite,
    sourceX,
    sourceY,
    LEAFLING_MANIFEST.atlas.frameWidth,
    LEAFLING_MANIFEST.atlas.frameHeight,
    Math.round(destinationX),
    Math.round(destinationY),
    size.width,
    size.height,
  );

  for (const layer of snapshot.layers) {
    context.save();
    context.beginPath();
    for (const mask of layer.masks) {
      context.ellipse(
        destinationX + (mask.x + mask.width / 2) * scaleX,
        destinationY + (mask.y + mask.height / 2) * scaleY,
        (mask.width * scaleX) / 2,
        (mask.height * scaleY) / 2,
        0,
        0,
        Math.PI * 2,
      );
    }
    context.clip();
    context.drawImage(
      sprite,
      layer.cell.column * LEAFLING_MANIFEST.atlas.frameWidth,
      layer.cell.row * LEAFLING_MANIFEST.atlas.frameHeight,
      LEAFLING_MANIFEST.atlas.frameWidth,
      LEAFLING_MANIFEST.atlas.frameHeight,
      Math.round(destinationX + layer.offset.x * scaleX),
      Math.round(destinationY + layer.offset.y * scaleY),
      size.width,
      size.height,
    );
    context.restore();
  }

  if (showRig) {
    const colors = ["#e14f62", "#316ee8", "#be4ee6", "#f08a34", "#2eaa7b", "#c55a92", "#111111", "#7d6c24"];
    LEAFLING_PRESENTATION.channels.forEach((channel, index) => {
      const bounds = channel.bounds;
      const color = colors[index % colors.length];
      context.strokeStyle = color;
      context.lineWidth = 1 / world.zoom;
      context.strokeRect(
        Math.round(-snapshot.anchor.x * scaleX + bounds.x * scaleX),
        Math.round(-snapshot.anchor.y * scaleY + bounds.y * scaleY),
        Math.round(bounds.width * scaleX),
        Math.round(bounds.height * scaleY),
      );
    });
  }
  context.restore();
}

export function PetEngineCanvas({
  stage,
  palette,
  motion,
  reducedMotion,
  paused = false,
  manualElapsed = 0,
  showRig = false,
  worldCommand,
  onFrame,
  onWorldFrame,
  onWorldInteraction,
  label,
}: PetEngineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef(createPetWorldState());
  const pointersRef = useRef(new Map<number, { start: WorldPoint; current: WorldPoint }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const gestureMovedRef = useRef(false);
  const lastFrameRef = useRef("");
  const lastWorldReportRef = useRef(0);
  const nextInsectRef = useRef(1800);
  const callbackRef = useRef({ onFrame, onWorldFrame, onWorldInteraction });

  useEffect(() => {
    callbackRef.current = { onFrame, onWorldFrame, onWorldInteraction };
  }, [onFrame, onWorldFrame, onWorldInteraction]);

  useEffect(() => {
    if (!worldCommand) return;
    if (worldCommand.type === "firefly") worldRef.current = spawnInsect(worldRef.current);
    if (worldCommand.type === "rollover") {
      worldRef.current = applyWorldIntent(worldRef.current, { kind: "rollover", worldX: worldRef.current.petX });
    }
    if (worldCommand.type === "center") {
      worldRef.current = setWorldZoom({ ...worldRef.current, cameraX: worldRef.current.petX }, 1);
    }
    callbackRef.current.onWorldInteraction?.(worldRef.current.action);
  }, [worldCommand]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const renderScale = 4;
    canvas.width = ENGINE_SCENE.width * renderScale;
    canvas.height = ENGINE_SCENE.height * renderScale;
    context.imageSmoothingEnabled = false;
    context.setTransform(renderScale, 0, 0, renderScale, 0, 0);

    let animationId = 0;
    let disposed = false;
    let previousTime = performance.now();
    let clipStartedAt = previousTime;
    let activeClip = "";
    let worldClock = 0;
    const sprite = new Image();

    const draw = (time: number) => {
      if (disposed) return;
      const dt = paused ? 0 : Math.min(64, Math.max(0, time - previousTime));
      previousTime = time;
      worldClock += dt;

      const beforeAction = worldRef.current.action;
      if (!paused) worldRef.current = stepPetWorld(worldRef.current, dt, reducedMotion);
      if (!worldRef.current.insect.active && worldClock >= nextInsectRef.current) {
        worldRef.current = spawnInsect(worldRef.current);
        nextInsectRef.current = worldClock + 7800;
      }
      if (worldRef.current.action !== beforeAction) callbackRef.current.onWorldInteraction?.(worldRef.current.action);

      const worldClip = clipForWorldAction(worldRef.current.action);
      const requestedClip = worldRef.current.action === "idle" ? clipForMotion(motion) : worldClip;
      if (requestedClip !== activeClip) {
        activeClip = requestedClip;
        clipStartedAt = time;
        lastFrameRef.current = "";
      }
      const elapsed = worldRef.current.action === "rollover"
        ? resolveRolloverPose(worldRef.current.actionElapsed).clipElapsed
        : paused ? manualElapsed : time - clipStartedAt;
      const snapshot = resolvePetFrame(LEAFLING_MANIFEST, requestedClip, elapsed, reducedMotion);
      renderScene(context, sprite, palette, stage, motion, snapshot, showRig, worldRef.current);

      const frameKey = `${snapshot.clip}:${snapshot.frameIndex}`;
      if (frameKey !== lastFrameRef.current) {
        lastFrameRef.current = frameKey;
        callbackRef.current.onFrame?.(snapshot);
      }
      if (time - lastWorldReportRef.current > 120) {
        lastWorldReportRef.current = time;
        callbackRef.current.onWorldFrame?.(worldRef.current);
      }
      if (!paused) animationId = requestAnimationFrame(draw);
    };

    sprite.onload = () => draw(performance.now());
    sprite.src = LEAFLING_MANIFEST.atlas.src;
    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      sprite.onload = null;
    };
  }, [manualElapsed, motion, palette, paused, reducedMotion, showRig, stage]);

  function pointFromEvent(event: PointerEvent<HTMLDivElement>): WorldPoint {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * ENGINE_SCENE.width,
      y: ((event.clientY - bounds.top) / bounds.height) * ENGINE_SCENE.height,
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    pointersRef.current.set(event.pointerId, { start: point, current: point });
    gestureMovedRef.current = false;
    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      pinchRef.current = { distance: Math.hypot(first.current.x - second.current.x, first.current.y - second.current.y), zoom: worldRef.current.zoom };
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const pointer = pointersRef.current.get(event.pointerId);
    if (!pointer) return;
    pointer.current = pointFromEvent(event);
    if (Math.hypot(pointer.current.x - pointer.start.x, pointer.current.y - pointer.start.y) > 4) gestureMovedRef.current = true;
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [first, second] = [...pointersRef.current.values()];
      const distance = Math.hypot(first.current.x - second.current.x, first.current.y - second.current.y);
      worldRef.current = setWorldZoom(worldRef.current, pinchRef.current.zoom * (distance / Math.max(1, pinchRef.current.distance)));
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const pointer = pointersRef.current.get(event.pointerId);
    const wasPinching = pinchRef.current !== null;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (!pointer || wasPinching) return;

    const travelX = pointer.current.x - pointer.start.x;
    const travelY = pointer.current.y - pointer.start.y;
    const petScreenX = ENGINE_SCENE.width / 2 + (worldRef.current.petX - worldRef.current.cameraX) * worldRef.current.zoom;
    const startedNearPet = Math.abs(pointer.start.x - petScreenX) < 28 && pointer.start.y > 145;
    if (startedNearPet && Math.abs(travelX) > 22 && Math.abs(travelX) > Math.abs(travelY)) {
      worldRef.current = applyWorldIntent(worldRef.current, { kind: "rollover", worldX: worldRef.current.petX });
      callbackRef.current.onWorldInteraction?.("rollover");
      return;
    }
    if (gestureMovedRef.current) return;
    const intent = resolveTapIntent(worldRef.current, pointer.current);
    worldRef.current = applyWorldIntent(worldRef.current, intent);
    callbackRef.current.onWorldInteraction?.(worldRef.current.action);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const world = worldRef.current;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      worldRef.current = applyWorldIntent(world, { kind: "move", worldX: world.petX + direction * 72 });
    } else if (event.key === "ArrowUp" || event.key === " ") {
      event.preventDefault();
      worldRef.current = applyWorldIntent(world, { kind: "jump", worldX: world.petX });
    } else if (event.key.toLowerCase() === "r") {
      worldRef.current = applyWorldIntent(world, { kind: "rollover", worldX: world.petX });
    } else if (event.key === "Enter") {
      worldRef.current = applyWorldIntent(world, { kind: "greet", worldX: world.petX });
    } else return;
    callbackRef.current.onWorldInteraction?.(worldRef.current.action);
  }

  return (
    <div
      ref={surfaceRef}
      className="engine-canvas-surface"
      role="application"
      tabIndex={0}
      aria-label={label}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <canvas ref={canvasRef} className="engine-canvas" />
    </div>
  );
}
