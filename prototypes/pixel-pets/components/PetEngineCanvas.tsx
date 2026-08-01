"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";

import {
  ENGINE_SCENE,
  clipForMotion,
  resolveGroundCue,
  resolveRequestedClip,
  shouldRunEvolutionCeremony,
  type EngineMotion,
} from "@/lib/pet-engine";
import { resolveEvolutionComposition, type EvolutionComposition } from "@/lib/pet-evolution";
import {
  PET_WORLD,
  TREE_PLAY,
  applyWorldIntent,
  beginCompanionFocus,
  beginAfterRainSplash,
  beginPetEvening,
  beginPetMorning,
  beginPetReunion,
  beginSharedPlayEcho,
  beginMemoryVisit,
  beginTreeRest,
  beginTreePlay,
  beginTreeReturn,
  beginRainGuestShelter,
  beginVisitorChase,
  cancelWorldHandGuide,
  chooseCompanionFocusPlace,
  CARE_ECHO_TARGET,
  clipForWorldAction,
  createPetWorldState,
  dragWorldWindLeaf,
  guideWorldWithHand,
  grabWorldWindLeaf,
  holdCareEcho,
  nextWeatherKind,
  plantLifeEcho,
  resolveFocusAtmosphere,
  resolveCompanionFocusPlaceHit,
  resolveCareEchoHit,
  resolveAfterRainHit,
  resolveAfterRainSplashPresentation,
  resolveAfterRainPlayProfile,
  resolveGuardianWakePresentation,
  resolveTwilightEchoPresentation,
  resolveTapIntent,
  resolveTreePlayHit,
  resolveTreeReturnHit,
  resolveRainGuestHit,
  resolveVisitorHit,
  releaseWorldHandGuide,
  screenPointToWorldPoint,
  setWorldZoom,
  setWorldWeather,
  spawnVisitor,
  stepPetWorld,
  tossWorldWindLeaf,
  type PetWorldAction,
  type PetWorldState,
  type GuardianWakePresentation,
  type WorldPoint,
  type WorldVisitor,
} from "@/lib/pet-world";
import { createWindLeaf, isWindLeafHit } from "@/lib/pet-plaything";
import { isPetContactHit, resolvePetContactGesture } from "@/lib/pet-affection";
import {
  resolveHabitatPerformanceIntensity,
  resolveHabitatPerformance,
  type HabitatPerformanceSnapshot,
} from "@/lib/pet-habitat-performance";
import { resolveVisitorPerformance, type VisitorPerformanceSnapshot } from "@/lib/pet-visitor-performance";
import {
  createLivingDayDirector,
  interruptLivingDay,
  stepLivingDayDirector,
  type LivingDayCommand,
  type LivingDayDirectorState,
} from "@/lib/pet-life-director";
import { LEAFLING_HABITAT } from "@/lib/pet-habitat";
import { LEAFLING_PRESENTATION, leaflingManifestForStage } from "@/lib/leafling";
import { clipDuration, resolvePetFrame, type PetAnimationManifest, type PetFrameSnapshot } from "@/lib/pet-runtime";
import type { MeaningfulAction, PetPalette, PetStage } from "@/lib/pet-state";

export type PetWorldCommand = {
  serial: number;
  type: "visitor" | "tree-play" | "after-rain" | "affection" | "rollover" | "reunion" | "guardian-wake-left" | "guardian-wake-right" | "center" | "sunny" | "breeze" | "rain" | "focus" | "focus-memory" | "play" | "todo-memory" | "evening" | "morning" | "reset";
  source?: MeaningfulAction | null;
};

interface PetEngineCanvasProps {
  initialWorld: PetWorldState;
  stage: PetStage;
  evolutionFromStage?: PetStage | null;
  palette: PetPalette;
  motion: EngineMotion;
  reducedMotion: boolean;
  paused?: boolean;
  manualElapsed?: number;
  showRig?: boolean;
  previewing?: boolean;
  worldCommand?: PetWorldCommand | null;
  onFrame?: (snapshot: PetFrameSnapshot) => void;
  onWorldFrame?: (world: PetWorldState) => void;
  onLivingDayFrame?: (director: LivingDayDirectorState) => void;
  onWorldInteraction?: (action: PetWorldAction, world: PetWorldState) => void;
  careEchoSource?: MeaningfulAction | null;
  onCareEcho?: (source: MeaningfulAction) => void;
  label: string;
}

type HabitatImages = {
  backdrop: HTMLImageElement;
  shelterTree: HTMLImageElement;
  foreground: HTMLImageElement;
};

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

type FocusAtmosphere = ReturnType<typeof resolveFocusAtmosphere>;

function applyLivingDayCommand(
  world: PetWorldState,
  command: LivingDayCommand,
  stage: PetStage,
) {
  if (command.kind === "wind-play") return setWorldWeather(world, "breeze");
  if (command.kind === "roam") {
    return applyWorldIntent(world, { kind: "move", worldX: command.targetX });
  }
  if (command.kind === "visit-bloom") return beginMemoryVisit(world, command.bloomX);
  if (command.kind === "tree-rest") return beginTreeRest(world);
  if (command.kind === "visitor") return spawnVisitor(world, stage, { sharedInvitation: true });
  return setWorldWeather(world, nextWeatherKind(world.weather));
}

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

function drawPixelCloud(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  palette: HabitatPalette,
  rain: boolean,
) {
  const unit = Math.max(2, Math.round(width / 12));
  context.fillStyle = rain ? palette.deep : palette.skyLight;
  context.fillRect(x + unit, y + unit * 2, width - unit * 2, unit * 2);
  context.fillRect(x + unit * 3, y + unit, width - unit * 6, unit * 3);
  context.fillRect(x + unit * 5, y, width - unit * 9, unit * 4);
  context.fillStyle = rain ? palette.outline : palette.cream;
  context.globalAlpha = rain ? 0.22 : 0.46;
  context.fillRect(x + unit * 2, y + unit * 2, width - unit * 5, unit);
  context.globalAlpha = 1;
}

function drawDistantPines(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  startX: number,
  endX: number,
  baseline: number,
) {
  context.fillStyle = palette.deep;
  context.globalAlpha = 0.46;
  for (let x = startX; x < endX; x += 17) {
    const height = 11 + Math.abs((x * 7) % 14);
    context.fillRect(x, baseline - height, 2, height);
    context.fillRect(x - 3, baseline - height + 5, 8, 2);
    context.fillRect(x - 5, baseline - height + 9, 12, 2);
    context.fillRect(x - 7, baseline - height + 13, 16, 2);
  }
  context.globalAlpha = 1;
}

function drawWorldPlant(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  x: number,
  groundY: number,
  height: number,
  sway: number,
  bloom = false,
) {
  context.save();
  context.translate(x, groundY);
  context.rotate((sway * Math.PI) / 180);
  context.fillStyle = palette.deep;
  context.fillRect(0, -height, 1, height);
  context.fillStyle = palette.leaf;
  context.fillRect(-4, -height + 5, 4, 2);
  context.fillRect(1, -height + 9, 5, 2);
  context.fillRect(-3, -height + 13, 3, 2);
  context.fillStyle = palette.leafLight;
  context.fillRect(-3, -height + 5, 2, 1);
  context.fillRect(2, -height + 9, 2, 1);
  if (bloom) {
    context.fillStyle = palette.bloom;
    context.fillRect(-2, -height - 2, 5, 3);
    context.fillRect(0, -height - 4, 2, 7);
    context.fillStyle = palette.cream;
    context.fillRect(0, -height - 1, 1, 1);
  }
  context.restore();
}

function drawShelterTree(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  x: number,
  groundY: number,
  sway: number,
) {
  context.save();
  context.translate(x, groundY);

  // Root shadow is embedded in the terrain, never a separate platform.
  context.fillStyle = palette.groundDark;
  context.globalAlpha = 0.52;
  context.fillRect(-40, 1, 80, 3);
  context.fillRect(-31, 4, 61, 2);
  context.globalAlpha = 1;

  // Ancient stepped trunk and roots.
  context.fillStyle = palette.outline;
  context.fillRect(-10, -67, 20, 68);
  context.fillRect(-7, -83, 14, 18);
  context.fillRect(-16, -4, 32, 5);
  context.fillRect(-23, -2, 12, 3);
  context.fillRect(11, -2, 17, 3);
  context.fillRect(-14, -57, 9, 11);
  context.fillRect(6, -63, 11, 9);
  context.fillStyle = palette.deep;
  context.fillRect(-7, -65, 14, 63);
  context.fillRect(-4, -80, 9, 17);
  context.fillRect(-13, -54, 7, 7);
  context.fillRect(7, -60, 8, 5);
  context.fillStyle = palette.groundDark;
  context.fillRect(-5, -59, 4, 51);
  context.fillRect(3, -71, 3, 34);
  context.fillRect(-11, -48, 3, 27);
  context.fillRect(-19, -1, 18, 2);
  context.fillRect(5, -1, 21, 2);
  context.fillStyle = palette.groundLight;
  context.globalAlpha = 0.5;
  context.fillRect(0, -61, 2, 18);
  context.fillRect(-4, -34, 2, 9);
  context.globalAlpha = 1;

  context.translate(0, -78);
  context.rotate((sway * Math.PI) / 180);

  // One broad canopy assembled from layered pixel clusters.
  context.fillStyle = palette.outline;
  context.fillRect(-42, -24, 82, 29);
  context.fillRect(-34, -35, 67, 44);
  context.fillRect(-21, -44, 43, 55);
  context.fillRect(-49, -12, 24, 17);
  context.fillRect(28, -17, 19, 20);
  context.fillStyle = palette.leaf;
  context.fillRect(-39, -21, 76, 23);
  context.fillRect(-31, -32, 61, 35);
  context.fillRect(-18, -41, 37, 46);
  context.fillRect(-46, -9, 20, 11);
  context.fillRect(29, -14, 15, 14);
  context.fillStyle = palette.deep;
  context.fillRect(-33, -16, 19, 10);
  context.fillRect(8, -29, 18, 12);
  context.fillRect(21, -10, 14, 8);
  context.fillRect(-13, -37, 12, 9);
  context.fillStyle = palette.leafLight;
  context.fillRect(-27, -28, 16, 7);
  context.fillRect(-9, -35, 13, 6);
  context.fillRect(8, -38, 10, 8);
  context.fillRect(19, -23, 13, 7);
  context.fillRect(-39, -8, 12, 5);
  context.fillRect(33, -9, 8, 5);
  context.fillStyle = palette.cream;
  context.globalAlpha = 0.36;
  context.fillRect(-24, -26, 5, 3);
  context.fillRect(-4, -34, 4, 3);
  context.fillRect(12, -36, 4, 3);
  context.fillRect(24, -21, 4, 3);
  context.globalAlpha = 1;

  // Hanging vines make the canopy feel inhabited and clarify shelter depth.
  context.fillStyle = palette.deep;
  context.fillRect(-34, 1, 1, 13);
  context.fillRect(34, -1, 1, 18);
  context.fillRect(20, 2, 1, 10);
  context.fillStyle = palette.leafLight;
  context.fillRect(-36, 8, 3, 2);
  context.fillRect(34, 10, 3, 2);
  context.fillRect(18, 7, 3, 2);
  context.restore();
}

function drawWeather(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
  foreground: boolean,
) {
  const intensity = world.weatherIntensity;
  const rainIntensity = world.weather === "rain" ? intensity : world.clearingRainIntensity;
  if (intensity <= 0 && rainIntensity <= 0) return;
  if (rainIntensity > 0) {
    context.save();
    context.globalAlpha = (foreground ? 0.5 : 0.28) * rainIntensity;
    context.strokeStyle = foreground ? palette.skyLight : palette.deep;
    context.lineWidth = foreground ? 1 : 0.75;
    const offset = (world.weatherElapsed * 0.08) % 26;
    for (let x = foreground ? -12 : 2; x < ENGINE_SCENE.width + 20; x += foreground ? 17 : 23) {
      const y = (x * 7 + offset * 3) % 238;
      context.beginPath();
      context.moveTo(x + offset * 0.18, y - 8);
      context.lineTo(x - 2 + offset * 0.18, y);
      context.stroke();
    }
    if (foreground) {
      context.fillStyle = palette.skyLight;
      context.globalAlpha = 0.42 * rainIntensity;
      const ripple = Math.floor(world.weatherElapsed / 180) % 10;
      context.fillRect(14 - ripple / 2, 214, 18 + ripple, 1);
      context.fillRect(102 - ripple / 3, 224, 12 + ripple, 1);
      context.fillRect(139 - ripple / 4, 218, 8 + ripple / 2, 1);
      context.fillStyle = palette.deep;
      context.globalAlpha = 0.18 * rainIntensity;
      context.fillRect(0, 207, ENGINE_SCENE.width, 4);
    }
    context.restore();
  }

  if (world.weather === "breeze" && foreground) {
    context.save();
    context.globalAlpha = 0.66 * intensity;
    for (let index = 0; index < 8; index += 1) {
      const travel = (world.weatherElapsed * (0.018 + index * 0.001) + index * 31) % 210;
      const x = travel - 24;
      const y = 58 + ((index * 29) % 102) + Math.sin(world.weatherElapsed / 240 + index) * 8;
      context.fillStyle = index % 3 === 0 ? palette.bloom : index % 2 === 0 ? palette.leafLight : palette.cream;
      context.fillRect(Math.round(x), Math.round(y), 3, 2);
      context.fillRect(Math.round(x + 2), Math.round(y + 1), 2, 1);
    }
    context.restore();
  }

  if (world.weather === "sunny" && foreground) {
    context.save();
    const pulse = 0.055 + (Math.sin(world.weatherElapsed / 900) + 1) * 0.02;
    const sunPatchScreenX = ENGINE_SCENE.width / 2 + (PET_WORLD.sunPatchX - world.cameraX) * world.zoom;
    context.globalAlpha = pulse * intensity;
    context.fillStyle = palette.bloom;
    context.beginPath();
    context.moveTo(Math.max(84, sunPatchScreenX - 19), 0);
    context.lineTo(Math.min(166, sunPatchScreenX + 11), 0);
    context.lineTo(Math.min(174, sunPatchScreenX + 31), 208);
    context.lineTo(Math.max(-14, sunPatchScreenX - 31), 208);
    context.closePath();
    context.fill();
    context.restore();
  }
}

function drawVisitor(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
  reducedMotion: boolean,
) {
  if (!world.visitor.active) return;
  drawVisitorCreature(context, palette, world.visitor, world.weather, reducedMotion);
}

function drawVisitorCreature(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  visitor: WorldVisitor,
  weather: PetWorldState["weather"],
  reducedMotion: boolean,
  scale = 1,
) {
  const pose = resolveVisitorPerformance(visitor, weather, reducedMotion);

  context.save();
  context.translate(Math.round(visitor.x), Math.round(visitor.y));
  context.rotate((pose.bank * Math.PI) / 180);
  context.scale(visitor.direction * scale, scale);
  context.translate(0, pose.rigDrop);
  context.globalAlpha = visitor.engaged
    ? Math.max(0.85, 1 - visitor.engagedAgeMs / 2600)
    : 1;

  if (visitor.kind === "crawler") {
    drawCrawlerVisitor(context, palette, pose);
  } else if (visitor.kind === "firefly") {
    drawFireflyVisitor(context, palette, pose);
  } else {
    drawSkyMothVisitor(context, palette, pose);
  }
  context.restore();
}

function drawRainGuest(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
  reducedMotion: boolean,
) {
  if (world.rainGuest.phase === "quiet") return;
  const direction = world.rainGuest.phase === "carried"
    ? world.facing
    : world.rainGuest.x < world.petX ? 1 : -1;
  const visitor: WorldVisitor = {
    active: true,
    kind: "firefly",
    x: world.rainGuest.x,
    y: world.rainGuest.y,
    originY: world.rainGuest.y,
    direction,
    ageMs: world.rainGuest.elapsedMs,
    engaged: false,
    engagedAgeMs: 0,
    launchX: world.rainGuest.x,
  };

  if (world.rainGuest.phase === "waiting") {
    context.save();
    const pulse = reducedMotion ? 0.16 : 0.11 + (Math.sin(world.rainGuest.elapsedMs / 270) + 1) * 0.045;
    context.globalAlpha = pulse;
    context.fillStyle = palette.bloom;
    context.fillRect(Math.round(world.rainGuest.x - 8), Math.round(world.rainGuest.y - 6), 12, 8);
    context.fillRect(Math.round(world.rainGuest.x - 5), Math.round(world.rainGuest.y - 9), 6, 14);
    context.restore();
  }
  drawVisitorCreature(context, palette, visitor, "rain", reducedMotion, 0.66);
}

function drawCrawlerVisitor(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  pose: VisitorPerformanceSnapshot,
) {
  const groundOffset = ENGINE_SCENE.groundY - PET_WORLD.visitorGroundY;
  if (pose.dust > 0) {
    context.save();
    context.globalAlpha = 0.2 + pose.dust * 0.35;
    context.fillStyle = palette.groundLight;
    context.fillRect(-14, groundOffset - 1, 3, 1);
    context.fillRect(-11, groundOffset - 3, 2, 1);
    if (pose.dust > 0.55) context.fillRect(-17, groundOffset, 2, 1);
    context.restore();
  }

  const stride = pose.legPhase;
  context.fillStyle = palette.outline;
  for (let index = 0; index < 3; index += 1) {
    const x = -5 + index * 4;
    const reach = index % 2 === 0 ? stride : -stride;
    context.fillRect(x - reach, 3, 1, 3 + Math.max(0, reach));
    context.fillRect(x - 2 - reach, 5 + Math.max(0, reach), 3, 1);
    context.fillRect(x + reach, -5 - Math.max(0, -reach), 1, 3 + Math.max(0, -reach));
    context.fillRect(x - 1 + reach, -6 - Math.max(0, -reach), 3, 1);
  }

  context.save();
  context.translate(0, pose.bodyDrop);
  context.fillStyle = palette.outline;
  context.fillRect(-8, -5, 13, 9);
  context.fillRect(-10, -3, 17, 5);
  context.fillStyle = palette.deep;
  context.fillRect(-7, -4, 11, 7);
  context.fillRect(-9, -2, 15, 3);

  context.fillStyle = palette.leaf;
  context.fillRect(-8 + pose.shellShift, -4, 7, 6);
  context.fillRect(-6 + pose.shellShift, -6, 7, 9);
  context.fillStyle = palette.leafLight;
  context.fillRect(-5 + pose.shellShift, -5, 4, 2);
  context.fillRect(-3 + pose.shellShift, -2, 3, 1);
  context.fillStyle = palette.deep;
  context.fillRect(-2 + pose.shellShift, -5, 1, 8);

  context.fillStyle = palette.outline;
  context.fillRect(4, -4, 5, 6);
  context.fillRect(7, -2, 3, 3);
  context.fillStyle = palette.cream;
  context.fillRect(5, -3, 3, 4);
  context.fillStyle = palette.bloom;
  context.fillRect(7, -2, 1, 1);

  const antenna = Math.max(1, Math.round(pose.antennaLift * 3));
  context.fillStyle = palette.outline;
  context.fillRect(8, -5 - antenna, 1, antenna + 2);
  context.fillRect(10, -4 - antenna, 1, antenna + 2);
  context.fillRect(9, -6 - antenna, 2, 1);
  context.restore();
}

function drawFireflyVisitor(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  pose: VisitorPerformanceSnapshot,
) {
  const wingLift = Math.round((pose.wingPhase + 1) * 2);

  // A stepped halo belongs to the abdomen, never to the visitor's bounding box.
  context.save();
  context.globalAlpha = 0.08 + pose.glow * 0.12;
  context.fillStyle = palette.bloom;
  context.fillRect(-9, -2, 11, 5);
  context.fillRect(-7, -5, 7, 11);
  context.globalAlpha = 0.14 + pose.glow * 0.2;
  context.fillRect(-8, -1, 9, 3);
  context.fillRect(-6, -3, 5, 7);
  context.restore();

  // Four independently posed wings leave negative space around the body.
  context.save();
  context.globalAlpha = pose.material === "wet" ? 0.38 : 0.5;
  context.fillStyle = palette.outline;
  context.fillRect(-3, -8 - wingLift, 5, 2);
  context.fillRect(-5, -6 - wingLift, 6, 3);
  context.fillRect(-4, 5 + wingLift, 5, 2);
  context.fillRect(-6, 3 + wingLift, 6, 3);
  context.globalAlpha = pose.material === "wet" ? 0.58 : 0.84;
  context.fillStyle = palette.leafLight;
  context.fillRect(-2, -7 - wingLift, 3, 1);
  context.fillRect(-4, -5 - wingLift, 4, 1);
  context.fillRect(-3, 6 + wingLift, 3, 1);
  context.fillRect(-5, 4 + wingLift, 4, 1);
  context.fillStyle = palette.cream;
  context.fillRect(-2, -6 - wingLift, 3, 1);
  context.fillRect(-3, 4 + wingLift, 3, 1);
  context.restore();

  // Tapered abdomen, thorax, head, eye, and antennae keep a readable facing.
  context.fillStyle = palette.outline;
  context.fillRect(-8, -1, 2, 2);
  context.fillRect(-7, -2, 4, 4);
  context.fillRect(-4, -3, 6, 6);
  context.fillRect(1, -2, 5, 4);
  context.fillStyle = palette.deep;
  context.fillRect(-3, -2, 4, 4);
  context.fillStyle = palette.bloom;
  context.globalAlpha = 0.64 + pose.glow * 0.36;
  context.fillRect(-7, -1, 4, 3);
  context.fillStyle = palette.cream;
  context.fillRect(-6, 0, 2, 1);
  context.globalAlpha = 1;
  context.fillStyle = palette.cream;
  context.fillRect(2, -1, 3, 2);
  context.fillStyle = palette.bloom;
  context.fillRect(5, -1, 1, 1);
  context.fillStyle = palette.outline;
  context.fillRect(6, -4, 1, 2);
  context.fillRect(7, -5, 1, 1);
  context.fillRect(8, -6, 1, 1);
  context.fillRect(7, -3, 1, 1);
  context.fillRect(9, -4, 1, 1);
  context.fillRect(10, -5, 1, 1);
}

function drawSkyMothVisitor(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  pose: VisitorPerformanceSnapshot,
) {
  const wingLift = Math.round((pose.wingPhase + 1) * 3);
  const wetDrop = pose.material === "wet" ? 1 : 0;

  context.fillStyle = palette.outline;
  context.fillRect(-7, -10 - wingLift + wetDrop, 6, 2);
  context.fillRect(-11, -8 - wingLift + wetDrop, 10, 2);
  context.fillRect(-14, -6 - wingLift + wetDrop, 13, 3);
  context.fillRect(-12, -3 - wingLift + wetDrop, 11, 3);
  context.fillRect(-7, 8 + wingLift, 6, 2);
  context.fillRect(-11, 6 + wingLift, 10, 2);
  context.fillRect(-14, 3 + wingLift, 13, 3);
  context.fillRect(-12, wingLift, 11, 3);

  context.fillStyle = pose.material === "wet" ? palette.skyDeep : palette.leafLight;
  context.fillRect(-7, -9 - wingLift + wetDrop, 5, 2);
  context.fillRect(-10, -7 - wingLift + wetDrop, 8, 2);
  context.fillRect(-12, -5 - wingLift + wetDrop, 10, 2);
  context.fillRect(-7, 8 + wingLift, 5, 1);
  context.fillRect(-10, 6 + wingLift, 8, 2);
  context.fillRect(-12, 4 + wingLift, 10, 2);

  context.fillStyle = palette.cream;
  context.fillRect(-6, -8 - wingLift + wetDrop, 3, 1);
  context.fillRect(-9, -6 - wingLift + wetDrop, 4, 1);
  context.fillRect(-10, -4 - wingLift + wetDrop, 3, 1);
  context.fillRect(-6, 7 + wingLift, 3, 1);
  context.fillRect(-9, 5 + wingLift, 4, 1);

  context.fillStyle = palette.bloom;
  context.fillRect(-8, -6 - wingLift + wetDrop, 4, 2);
  context.fillRect(-5, -8 - wingLift + wetDrop, 2, 2);
  context.fillRect(-8, 4 + wingLift, 4, 2);
  context.fillRect(-5, 6 + wingLift, 2, 2);
  context.fillStyle = palette.leafLight;
  context.fillRect(-10, -4 - wingLift + wetDrop, 5, 1);
  context.fillRect(-10, 3 + wingLift, 5, 1);

  context.fillStyle = palette.outline;
  context.fillRect(-8, -1, 13, 3);
  context.fillRect(-6, -2, 9, 5);
  context.fillRect(3, -3, 6, 6);
  context.fillRect(5, -4, 2, 8);
  context.fillRect(-10, 0, 3, 2);
  context.fillStyle = palette.deep;
  context.fillRect(-6, 0, 9, 2);
  context.fillStyle = palette.cream;
  context.fillRect(4, -2, 4, 4);
  context.fillStyle = palette.bloom;
  context.fillRect(6, -1, 1, 1);

  const antenna = Math.max(2, Math.round(pose.antennaLift * 5));
  context.fillStyle = palette.outline;
  context.fillRect(7, -5, 1, 2);
  context.fillRect(8, -6, 1, 1);
  context.fillRect(9, -7 - Math.round(antenna / 3), 1, 2 + Math.round(antenna / 3));
  context.fillRect(10, -8 - Math.round(antenna / 3), 2, 1);
  context.fillRect(8, -4, 1, 1);
  context.fillRect(10, -5, 1, 1);
  context.fillRect(11, -6, 1, 1);
  context.fillRect(12, -7 - Math.round(antenna / 4), 1, 2 + Math.round(antenna / 4));
  context.fillRect(-11, 0, 2, 1);
  context.fillRect(-12, 1, 2, 1);
}

function drawWindLeaf(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
) {
  const leaf = world.playLeaf;
  const heldPulse = leaf.phase === "held" ? 1 + Math.sin(world.weatherElapsed / 90) * 0.08 : 1;
  const angle = leaf.phase === "flying"
    ? Math.atan2(leaf.velocityY, leaf.velocityX || 0.001) + leaf.ageMs / 120
    : (world.weatherSway * 0.7 * Math.PI) / 180;

  context.save();
  context.translate(Math.round(leaf.x), Math.round(leaf.y));
  if (world.action === "leaf-invite") {
    const glint = Math.floor(leaf.ageMs / 90) % 4;
    context.fillStyle = "#fff0a5";
    context.globalAlpha = 0.58 + glint * 0.1;
    context.fillRect(-10 - glint, 0, 4 + glint, 1);
    context.fillRect(7, 0, 4 + glint, 1);
    context.fillRect(0, -10 - glint, 1, 4 + glint);
    context.fillRect(0, 7, 1, 4 + glint);
    context.globalAlpha = 1;
  }
  if (leaf.phase === "flying" && leaf.flight.id === "wind-drift") {
    const direction = leaf.flight.windX < 0 ? 1 : -1;
    context.fillStyle = palette.cream;
    context.globalAlpha = 0.52;
    context.fillRect(direction * 7, -5, direction * 7, 1);
    context.fillRect(direction * 10, 0, direction * 10, 1);
    context.fillRect(direction * 5, 5, direction * 5, 1);
    context.globalAlpha = 1;
  }
  if (leaf.phase === "flying" && leaf.flight.id === "sun-updraft") {
    const lift = Math.floor(leaf.ageMs / 110) % 3;
    context.fillStyle = "#fff0a5";
    context.globalAlpha = 0.72;
    context.fillRect(-7, 5 + lift, 1, 2);
    context.fillRect(7, 1 + ((lift + 1) % 3), 1, 1);
    context.globalAlpha = 1;
  }
  if ((leaf.phase === "flying" || leaf.phase === "landed") && leaf.flight.id === "rain-heavy") {
    context.fillStyle = palette.skyLight;
    context.globalAlpha = 0.68;
    if (leaf.phase === "flying") {
      context.fillRect(-6, -6, 1, 3);
      context.fillRect(6, 3, 1, 3);
    } else {
      context.fillRect(-7, 3, 5, 1);
      context.fillRect(3, 3, 5, 1);
      context.fillRect(-2, 4, 5, 1);
    }
    context.globalAlpha = 1;
  }
  context.rotate(angle);
  context.scale(heldPulse, heldPulse);
  if (leaf.phase === "held") {
    context.globalAlpha = 0.17;
    context.fillStyle = "#fff0a5";
    context.fillRect(-6, -5, 12, 10);
    context.globalAlpha = 1;
  }
  if (leaf.phase === "perched") {
    context.fillStyle = "#6e5526";
    context.fillRect(3, -9, 1, 8);
    context.fillRect(2, -8, 2, 1);
  }
  const wet = leaf.flight.id === "rain-heavy" && leaf.phase !== "perched";
  context.fillStyle = wet ? "#4f6045" : "#6e5526";
  context.fillRect(-4, -2, 8, 4);
  context.fillRect(-2, -4, 4, 8);
  context.fillRect(3, 1, 4, 1);
  context.fillStyle = wet ? "#ae8e45" : "#f0b83e";
  context.fillRect(-3, -1, 6, 3);
  context.fillRect(-1, -3, 3, 6);
  context.fillStyle = wet ? "#d7c784" : "#fff0a5";
  context.fillRect(-1, -2, 2, 2);
  context.fillStyle = wet ? "#65704f" : "#8d6726";
  context.fillRect(0, -2, 1, 5);
  context.restore();
}

function drawHandMote(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
) {
  if (world.hand.phase === "quiet") return;
  const pulse = Math.floor(world.hand.ageMs / 90) % 4;
  const foundFade = world.action === "hand-found"
    ? Math.max(0, 1 - world.actionElapsed / PET_WORLD.handFoundDuration)
    : 1;

  context.save();
  context.translate(Math.round(world.hand.x), Math.round(world.hand.y));
  context.globalAlpha = foundFade;
  context.fillStyle = palette.bloom;
  context.fillRect(-2, -2, 5, 5);
  context.fillStyle = "#fff0a5";
  context.fillRect(-1, -1, 3, 3);
  context.globalAlpha = foundFade * (0.48 + pulse * 0.12);
  context.fillRect(-7 - pulse, 0, 4 + pulse, 1);
  context.fillRect(4, 0, 4 + pulse, 1);
  context.fillRect(0, -7 - pulse, 1, 4 + pulse);
  context.fillRect(0, 4, 1, 4 + pulse);
  context.fillRect(-5, 5, 1, 1);
  context.fillRect(5, -5, 1, 1);
  context.restore();
}

function drawProgressBlooms(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
) {
  for (const bloom of world.blooms) {
    const growth = bloom.growth;
    const side = bloom.id % 2 === 0 ? -1 : 1;

    if (bloom.source === "focus") {
      const height = Math.max(3, Math.round(growth * 14));
      const lightY = ENGINE_SCENE.groundY - height;
      context.save();
      context.translate(Math.round(bloom.x), 0);
      context.globalAlpha = 0.52 + growth * 0.34;
      context.fillStyle = palette.deep;
      context.fillRect(0, lightY, 1, height);
      if (growth > 0.5) {
        const pulse = Math.floor(world.weatherElapsed / 480) % 2;
        context.globalAlpha = 0.12 + pulse * 0.05;
        context.fillStyle = palette.skyLight;
        context.fillRect(-6, lightY - 7, 13, 13);
        context.globalAlpha = 0.9;
        context.fillStyle = palette.cream;
        context.fillRect(-3, lightY - 3, 7, 7);
        context.fillRect(0, lightY - 6, 1, 13);
        context.fillStyle = palette.skyLight;
        context.fillRect(0, lightY, 1, 1);
      }
      context.restore();
      continue;
    }

    if (bloom.source === "play") {
      const height = Math.max(3, Math.round(growth * 13));
      const headY = ENGINE_SCENE.groundY - height;
      context.save();
      context.translate(Math.round(bloom.x), 0);
      context.globalAlpha = 0.56 + growth * 0.4;
      context.fillStyle = palette.deep;
      context.fillRect(-4, headY + 3, 2, height - 3);
      context.fillRect(3, headY + 3, 2, height - 3);
      if (growth > 0.42) {
        context.fillRect(-3, headY + 1, 2, 5);
        context.fillRect(2, headY + 1, 2, 5);
      }
      if (growth > 0.65) {
        context.fillStyle = palette.cream;
        context.fillRect(-7, headY - 2, 6, 4);
        context.fillRect(2, headY - 2, 6, 4);
        context.fillStyle = palette.bloom;
        context.fillRect(-3, headY, 1, 1);
        context.fillRect(3, headY, 1, 1);
      }
      context.restore();
      continue;
    }

    const stemHeight = Math.max(2, Math.round(growth * 15));
    const bloomY = ENGINE_SCENE.groundY - stemHeight;

    context.save();
    context.translate(Math.round(bloom.x), 0);
    context.globalAlpha = 0.58 + growth * 0.42;
    context.fillStyle = palette.deep;
    context.fillRect(0, ENGINE_SCENE.groundY - stemHeight, 1, stemHeight);
    if (growth > 0.28) context.fillRect(side, ENGINE_SCENE.groundY - Math.max(2, Math.round(stemHeight * 0.45)), 3 * side, 2);
    if (growth > 0.52) context.fillRect(-side, ENGINE_SCENE.groundY - Math.max(3, Math.round(stemHeight * 0.68)), -2 * side, 2);

    if (growth > 0.62) {
      const opening = Math.max(2, Math.round((growth - 0.62) / 0.38 * 4));
      context.fillStyle = palette.cream;
      context.fillRect(-opening, bloomY - 1, opening * 2 + 1, 3);
      context.fillRect(-1, bloomY - opening, 3, opening * 2 + 1);
      context.fillStyle = palette.bloom;
      context.fillRect(0, bloomY, 1, 1);
      if (growth > 0.9) {
        context.fillStyle = palette.leafLight;
        context.fillRect(-5 * side, bloomY + 3, 2 * side, 2);
        context.fillStyle = palette.bloom;
        context.fillRect(-5 * side, bloomY + 1, 3 * side, 3);
      }
    }
    context.restore();
  }
}

function drawAfterRainPuddle(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
) {
  if (world.afterRain.phase === "quiet") return;
  const arriving = world.afterRain.phase === "shimmer"
    ? Math.min(1, world.afterRain.elapsedMs / 620)
    : 1;
  const leaving = world.afterRain.phase === "spent"
    ? Math.max(0, 1 - world.afterRain.elapsedMs / PET_WORLD.puddleSpentDuration)
    : 1;
  const alpha = arriving * leaving;
  const glint = Math.floor(world.weatherElapsed / 240) % 3;

  context.save();
  context.translate(Math.round(world.afterRain.x), PET_WORLD.puddleY);
  context.globalAlpha = alpha * 0.5;
  context.fillStyle = "#385657";
  context.fillRect(-21, -1, 43, 5);
  context.fillRect(-15, -3, 31, 9);
  context.globalAlpha = alpha * 0.88;
  context.fillStyle = "#90bfc4";
  context.fillRect(-19, 0, 39, 3);
  context.fillRect(-12, -2, 25, 7);
  context.globalAlpha = alpha * 0.82;
  context.fillStyle = "#e5f2dd";
  context.fillRect(-14, -1, 16, 1);
  context.fillRect(6, 1, 9, 1);
  if (world.afterRain.phase === "shimmer") {
    context.globalAlpha = alpha * (0.52 + glint * 0.18);
    context.fillStyle = palette.cream;
    context.fillRect(-4, -7 - glint, 1, 5);
    context.fillRect(-6 - glint, -5, 5, 1);
  }
  context.restore();
}

function drawAfterRainSplash(
  context: CanvasRenderingContext2D,
  world: PetWorldState,
  reducedMotion: boolean,
  stage: PetStage,
) {
  const profile = resolveAfterRainPlayProfile(stage);
  const splash = resolveAfterRainSplashPresentation(world, reducedMotion, stage);
  if (!splash.visible) return;
  const { progress, lift, spread } = splash;
  context.save();
  worldTransform(context, world);
  context.translate(Math.round(world.afterRain.x), PET_WORLD.puddleY);
  context.fillStyle = "#91d3d7";
  context.globalAlpha = 0.94 * (1 - progress * 0.3);
  context.fillRect(-spread, 1, spread * 2, 1);
  context.fillRect(-Math.round(spread * 0.65), 3, Math.round(spread * 1.3), 1);
  context.fillStyle = "#e8f7e8";
  context.fillRect(-10, -2, 21, 2);
  if (!splash.animated) {
    context.restore();
    return;
  }
  for (let index = 0; index < profile.droplets; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const distance = 5 + Math.floor(index / 2) * 5;
    const x = side * Math.round(distance + progress * (5 + index));
    const y = -Math.round(lift * (9 + index * 1.7)) + Math.floor(index / 3);
    const size = index < 4 ? 2 : 1;
    context.fillRect(x, y, size, size + (index % 3 === 0 ? 1 : 0));
  }
  context.restore();
}

function drawGuardianWake(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
  wake: GuardianWakePresentation,
) {
  if (!wake.visible) return;
  context.save();
  worldTransform(context, world);
  context.translate(Math.round(wake.centerX), ENGINE_SCENE.groundY);

  if (wake.mode === "gathering") {
    context.globalAlpha = wake.intensity * 0.42;
    context.fillStyle = palette.skyLight;
    for (let band = 0; band < 3; band += 1) {
      const width = 10 + band * 6 + Math.round(wake.progress * 8);
      const y = -18 - band * 13 - Math.round(wake.lift * (5 + band * 3));
      context.fillRect(-width, y, Math.round(width * 0.62), 1);
      context.fillRect(3 + band * 2, y - 2, Math.round(width * 0.72), 1);
      context.fillRect(-2 - band, y - 5, 2, 2);
    }
  } else {
    // The air itself stays quiet; the readable force comes from the meadow it crosses.
    // Two broken pressure lines keep the wake directional without turning it into a spell.
    context.fillStyle = palette.cream;
    context.globalAlpha = wake.intensity * 0.72;
    for (let band = 0; band < 4; band += 1) {
      const radius = Math.max(8, wake.radius - band * 11);
      const y = -2 - band * 4;
      const segment = Math.max(5, Math.round(radius * 0.34));
      context.fillRect(-radius, y, segment, 2);
      context.fillRect(-Math.round(radius * 0.38), y - 1, Math.round(radius * 0.25), 1);
      context.fillRect(radius - segment, y, segment, 2);
      context.fillRect(Math.round(radius * 0.14), y - 1, Math.round(radius * 0.25), 1);
    }
    context.fillStyle = palette.cream;
    context.globalAlpha = wake.intensity * 0.38;
    context.fillRect(-Math.round(wake.radius * 0.52), -1, Math.round(wake.radius * 1.04), 1);
  }

  if (wake.particles) {
    for (let index = 0; index < 12; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const lane = Math.floor(index / 2);
      const travel = wake.mode === "released"
        ? wake.radius * (0.28 + lane * 0.08)
        : wake.radius * (0.34 + lane * 0.04);
      const x = side * Math.round(travel);
      const y = wake.mode === "released"
        ? -5 - Math.round(wake.lift * (7 + lane * 2)) - (lane % 3) * 3
        : -12 - lane * 6 - Math.round(wake.lift * 10);
      context.globalAlpha = wake.intensity * (0.68 + (index % 3) * 0.1);
      context.fillStyle = index % 3 === 0 ? palette.bloom : index % 2 === 0 ? palette.leafLight : palette.leaf;
      context.fillRect(x, y, index % 4 === 0 ? 4 : 3, 2);
      context.fillRect(x + (side > 0 ? 2 : -1), y + 2, 2, 1);
    }
  }
  context.restore();
}

function drawCareEchoInvitation(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
  source: MeaningfulAction | null,
) {
  if (!source) return;
  const bloom = [...world.blooms].reverse().find((candidate) => candidate.source === source);
  if (!bloom) return;

  const pulse = Math.floor(world.weatherElapsed / 320) % 2;
  const reach = 10 + pulse * 2;
  context.save();
  worldTransform(context, world);
  context.translate(Math.round(bloom.x), CARE_ECHO_TARGET.anchorY);
  context.globalAlpha = 0.58 + pulse * 0.16;
  context.fillStyle = palette.cream;
  context.fillRect(-reach, -8, 3, 1);
  context.fillRect(-reach, -8, 1, 3);
  context.fillRect(reach - 2, -8, 3, 1);
  context.fillRect(reach, -8, 1, 3);
  context.fillRect(-reach, 8, 3, 1);
  context.fillRect(-reach, 6, 1, 3);
  context.fillRect(reach - 2, 8, 3, 1);
  context.fillRect(reach, 6, 1, 3);
  context.globalAlpha = 0.34 + pulse * 0.12;
  context.fillStyle = palette.bloom;
  if (source === "focus") {
    context.fillRect(-1, -12, 3, 3);
    context.fillRect(-1, 10, 3, 3);
  } else if (source === "play") {
    context.fillRect(-7, -11, 2, 2);
    context.fillRect(6, -11, 2, 2);
  } else {
    context.fillRect(-1, -12, 3, 2);
  }
  context.restore();
}

function drawProceduralHabitat(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  motion: EngineMotion,
  progress: number,
  world: PetWorldState,
  reducedMotion: boolean,
) {
  const groundY = ENGINE_SCENE.groundY;

  // Sky is built from broad color bands so it gains depth without losing the
  // crisp pixel language of the creature.
  context.fillStyle = palette.skyLight;
  context.fillRect(0, 0, ENGINE_SCENE.width, 58);
  context.fillStyle = palette.sky;
  context.fillRect(0, 58, ENGINE_SCENE.width, 71);
  context.fillStyle = palette.skyDeep;
  context.fillRect(0, 129, ENGINE_SCENE.width, groundY - 129);

  if (world.weather === "rain") {
    context.fillStyle = "rgba(31, 49, 55, 0.22)";
    context.fillRect(0, 0, ENGINE_SCENE.width, groundY);
  }

  // Celestial light belongs to the sunny destination, so camera travel subtly
  // changes its relationship to the meadow instead of pinning it to the UI.
  if (world.weather !== "rain") {
    const sunX = 126 + (PET_WORLD.sunPatchX - world.cameraX) * 0.035;
    context.fillStyle = palette.bloom;
    context.globalAlpha = world.weather === "sunny" ? 0.94 : 0.62;
    context.fillRect(Math.round(sunX - 5), 28, 11, 11);
    context.fillRect(Math.round(sunX - 2), 23, 5, 21);
    context.fillRect(Math.round(sunX - 10), 31, 21, 5);
    context.fillStyle = palette.skyLight;
    context.fillRect(Math.round(sunX - 1), 31, 3, 3);
    context.globalAlpha = 1;
  }

  // Slow clouds: independent atmospheric motion layered behind the terrain.
  context.save();
  const cloudDrift = world.weather === "breeze" ? world.weatherElapsed * 0.003 : world.weatherElapsed * 0.00035;
  context.translate(80 - world.cameraX * 0.055 - cloudDrift, 0);
  for (let x = -90; x < PET_WORLD.width + 180; x += 154) {
    drawPixelCloud(context, x, 48 + Math.abs((x / 11) % 29), 34 + Math.abs(x % 15), palette, world.weather === "rain");
  }
  context.restore();

  // Two mountain planes and a pine line create actual parallax as the camera
  // follows Leafling through the wider world.
  context.save();
  context.translate(80 - world.cameraX * 0.08, 0);
  context.fillStyle = palette.sky;
  context.globalAlpha = 0.78;
  for (let x = -120; x < PET_WORLD.width + 180; x += 128) drawPixelHill(context, x, 174, 118, 51 + Math.abs(x % 21));
  context.globalAlpha = 1;
  context.restore();

  context.save();
  context.translate(80 - world.cameraX * 0.19, 0);
  context.fillStyle = palette.deep;
  context.globalAlpha = world.weather === "rain" ? 0.34 : 0.25;
  for (let x = -80; x < PET_WORLD.width + 160; x += 91) drawPixelHill(context, x, 188, 86, 28 + Math.abs(x % 17));
  context.globalAlpha = 1;
  drawDistantPines(context, palette, -100, PET_WORLD.width + 150, 190);
  context.restore();

  context.save();
  worldTransform(context, world);

  // Terrain has an inset edge, roots, and scattered strata rather than a flat
  // two-tone slab. Every cue remains inside the ground plane.
  context.fillStyle = palette.ground;
  context.fillRect(0, groundY, PET_WORLD.width, ENGINE_SCENE.height - groundY + 30);
  context.fillStyle = palette.groundLight;
  context.fillRect(0, groundY + 3, PET_WORLD.width, 3);
  context.fillStyle = palette.groundDark;
  context.fillRect(0, groundY, PET_WORLD.width, 2);
  context.fillStyle = palette.leaf;
  context.fillRect(0, groundY - 2, PET_WORLD.width, 2);

  // Persistent cool shade and a weather-dependent pool of warm light make the
  // two behavioral destinations visually legible without labels or meters.
  context.fillStyle = palette.outline;
  context.globalAlpha = 0.19;
  context.fillRect(PET_WORLD.treeShelterX - 43, groundY + 2, 86, 3);
  context.fillRect(PET_WORLD.treeShelterX - 31, groundY + 5, 61, 2);
  context.globalAlpha = 1;
  if (world.weather === "sunny") {
    context.fillStyle = palette.bloom;
    context.globalAlpha = 0.28;
    context.fillRect(PET_WORLD.sunPatchX - 37, groundY - 1, 74, 4);
    context.fillRect(PET_WORLD.sunPatchX - 27, groundY + 3, 54, 3);
    context.fillRect(PET_WORLD.sunPatchX - 17, groundY + 6, 34, 2);
    context.globalAlpha = 1;
  }

  context.fillStyle = palette.groundDark;
  for (let x = 8; x < PET_WORLD.width; x += 43) {
    context.fillRect(x, groundY + 15 + ((x / 43) % 3) * 4, 18 + (x % 9), 2);
    context.fillRect(x + 11, groundY + 27 + (x % 7), 9, 1);
  }

  context.fillStyle = palette.groundDark;
  for (let x = 12; x < PET_WORLD.width; x += 17) drawGrassTuft(context, x, groundY);
  context.fillStyle = palette.groundLight;
  for (let x = 7; x < PET_WORLD.width; x += 29) {
    context.fillRect(x, groundY + 10 + (x % 11), 2, 1);
    context.fillRect(x + 8, groundY + 29 + (x % 7), 3, 1);
  }

  for (let x = 31; x < PET_WORLD.width; x += 73) {
    drawWorldPlant(
      context,
      palette,
      x,
      groundY,
      14 + Math.abs(x % 9),
      world.weatherSway * (0.75 + (x % 3) * 0.12),
      x % 2 === 1,
    );
  }

  drawShelterTree(context, palette, PET_WORLD.treeShelterX, groundY, world.weatherSway * 0.7);

  // Distinct rock and flower clusters recur with variation but never become
  // collectibles or an inventory layer.
  for (let x = 61; x < PET_WORLD.width; x += 109) {
    context.fillStyle = palette.outline;
    context.fillRect(x + 2, groundY - 7, 15, 7);
    context.fillRect(x, groundY - 3, 21, 3);
    context.fillStyle = palette.deep;
    context.fillRect(x + 6, groundY - 9, 9, 4);
    context.fillRect(x + 14, groundY - 5, 5, 3);
    context.fillStyle = palette.groundLight;
    context.fillRect(x + 8, groundY - 8, 4, 1);
    context.fillStyle = palette.bloom;
    context.fillRect(x + 27, groundY - 6, 3, 3);
    context.fillRect(x + 23, groundY - 9, 3, 3);
    context.fillStyle = palette.deep;
    context.fillRect(x + 24, groundY - 6, 1, 6);
    context.fillRect(x + 28, groundY - 4, 1, 4);
  }

  if (motion === "care") {
    const berryY = groundY - 28 + Math.round(Math.min(progress * 2, 1) * 23);
    context.fillStyle = "#d8615f";
    context.fillRect(world.petX - 2, berryY, 3, 3);
    context.fillRect(world.petX + 1, berryY + 1, 2, 2);
    context.fillStyle = palette.leaf;
    context.fillRect(world.petX, berryY - 2, 2, 2);
  }

  drawProgressBlooms(context, palette, world);
  drawAfterRainPuddle(context, palette, world);
  drawHandMote(context, palette, world);
  drawVisitor(context, palette, world, reducedMotion);
  if (world.rainGuest.phase === "waiting") drawRainGuest(context, palette, world, reducedMotion);
  if (world.playLeaf.phase !== "carried") drawWindLeaf(context, palette, world);

  context.restore();
  drawWeather(context, palette, world, false);
}

function habitatImageReady(image: HTMLImageElement) {
  return image.complete && image.naturalWidth > 0;
}

function drawCanopyCluster(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  x: number,
  y: number,
  shiftX: number,
  shiftY: number,
  scale = 1,
) {
  const px = Math.round(x + shiftX);
  const py = Math.round(y + shiftY);
  context.fillStyle = palette.deep;
  context.fillRect(px - 4 * scale, py - 2 * scale, 9 * scale, 4 * scale);
  context.fillRect(px - 2 * scale, py - 4 * scale, 5 * scale, 8 * scale);
  context.fillStyle = palette.leaf;
  context.fillRect(px - 3 * scale, py - 3 * scale, 6 * scale, 3 * scale);
  context.fillRect(px, py - 1 * scale, 5 * scale, 3 * scale);
  context.fillStyle = palette.leafLight;
  context.fillRect(px - 2 * scale, py - 3 * scale, 3 * scale, 2 * scale);
  context.fillStyle = palette.bloom;
  context.globalAlpha *= 0.5;
  context.fillRect(px + 2 * scale, py - 2 * scale, scale, scale);
}

function drawAuthoredHabitatPerformance(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  performance: HabitatPerformanceSnapshot,
) {
  const lead = performance.canopyLead;
  const follow = performance.canopyFollow;
  const drop = performance.canopyDrop;

  context.save();
  context.globalAlpha = 0.72;
  drawCanopyCluster(context, palette, PET_WORLD.treeShelterX - 70, 107, lead * 0.9, drop, 1);
  context.globalAlpha = 0.68;
  drawCanopyCluster(context, palette, PET_WORLD.treeShelterX - 49, 80, lead * 0.72, drop * 0.8, 1);
  context.globalAlpha = 0.62;
  drawCanopyCluster(context, palette, PET_WORLD.treeShelterX - 20, 66, follow * 0.58, drop * 0.65, 1);
  context.globalAlpha = 0.58;
  drawCanopyCluster(context, palette, PET_WORLD.treeShelterX + 12, 84, follow * 0.76, drop * 0.82, 1);
  context.restore();

  const vines = [
    { x: PET_WORLD.treeShelterX - 48, y: 113, length: 31, phase: 0.82 },
    { x: PET_WORLD.treeShelterX - 25, y: 105, length: 23, phase: 1.08 },
    { x: PET_WORLD.treeShelterX + 22, y: 101, length: 19, phase: 0.66 },
  ];
  context.save();
  context.fillStyle = palette.deep;
  context.globalAlpha = performance.material === "wet" ? 0.86 : 0.7;
  for (const vine of vines) {
    const bend = performance.vineLag * vine.phase;
    for (let segment = 0; segment < vine.length; segment += 3) {
      const progress = segment / vine.length;
      const x = Math.round(vine.x + bend * progress * progress);
      const y = Math.round(vine.y + segment + performance.canopyDrop * progress);
      context.fillRect(x, y, segment % 6 === 0 ? 2 : 1, 3);
    }
    context.fillStyle = palette.leafLight;
    context.fillRect(
      Math.round(vine.x + bend),
      Math.round(vine.y + vine.length + performance.canopyDrop),
      3,
      2,
    );
    context.fillStyle = palette.deep;
  }
  context.restore();

  if (performance.dapple > 0.08) {
    context.save();
    context.fillStyle = palette.bloom;
    context.globalAlpha = performance.dapple * 0.22;
    context.fillRect(PET_WORLD.treeShelterX - 52, ENGINE_SCENE.groundY - 3, 18, 2);
    context.fillRect(PET_WORLD.treeShelterX - 19, ENGINE_SCENE.groundY - 1, 11, 2);
    context.fillRect(PET_WORLD.treeShelterX + 9, ENGINE_SCENE.groundY - 4, 15, 2);
    context.restore();
  }

  if (performance.drip > 0.2) {
    context.save();
    context.fillStyle = palette.skyDeep;
    context.globalAlpha = 0.4 + performance.drip * 0.34;
    const dripOffset = performance.frame % 2 === 0 ? 0 : 5;
    for (const [x, y] of [[-62, 119], [-39, 102], [-8, 92], [22, 104]] as const) {
      context.fillRect(
        Math.round(PET_WORLD.treeShelterX + x + performance.canopyLead * 0.35),
        y + dripOffset,
        1,
        2 + Math.round(performance.drip * 2),
      );
    }
    context.restore();
  }

  if (performance.looseLeaf > 0.18) {
    context.save();
    context.fillStyle = palette.leafLight;
    context.globalAlpha = Math.min(0.72, performance.looseLeaf);
    const travel = performance.role === "accent" ? 0 : 7;
    context.fillRect(
      Math.round(PET_WORLD.treeShelterX - 61 + performance.canopyLead * 1.4 + travel),
      115 + travel,
      3,
      2,
    );
    context.restore();
  }
}

function drawAuthoredHabitat(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  motion: EngineMotion,
  progress: number,
  world: PetWorldState,
  habitat: HabitatImages,
  habitatPerformance: HabitatPerformanceSnapshot,
  reducedMotion: boolean,
) {
  if (!habitatImageReady(habitat.backdrop) || !habitatImageReady(habitat.shelterTree)) {
    drawProceduralHabitat(context, palette, motion, progress, world, reducedMotion);
    return;
  }

  const backdropX = -(world.cameraX - PET_WORLD.viewportWidth / 2) * LEAFLING_HABITAT.backdrop.parallax;
  context.imageSmoothingEnabled = false;
  context.drawImage(
    habitat.backdrop,
    Math.round(backdropX),
    0,
    LEAFLING_HABITAT.backdrop.size.width,
    LEAFLING_HABITAT.backdrop.size.height,
  );

  context.save();
  context.globalAlpha = world.weather === "rain"
    ? 0.07 + 0.17 * world.weatherIntensity
    : 0.07;
  context.fillStyle = world.weather === "rain" ? palette.outline : palette.sky;
  context.fillRect(0, 0, ENGINE_SCENE.width, ENGINE_SCENE.height);
  context.restore();

  context.save();
  worldTransform(context, world);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    habitat.shelterTree,
    PET_WORLD.treeShelterX - LEAFLING_HABITAT.shelterTree.anchor.x,
    ENGINE_SCENE.groundY - LEAFLING_HABITAT.shelterTree.anchor.y,
    LEAFLING_HABITAT.shelterTree.size.width,
    LEAFLING_HABITAT.shelterTree.size.height,
  );
  drawAuthoredHabitatPerformance(context, palette, habitatPerformance);
  context.restore();

  context.save();
  worldTransform(context, world);
  context.fillStyle = palette.outline;
  context.globalAlpha = world.weather === "rain"
    ? 0.17 + 0.13 * world.weatherIntensity
    : 0.17;
  context.fillRect(PET_WORLD.treeShelterX - 46, ENGINE_SCENE.groundY + 1, 92, 2);
  if (world.weather === "sunny") {
    context.fillStyle = palette.bloom;
    context.globalAlpha = 0.24 * world.weatherIntensity;
    context.fillRect(PET_WORLD.sunPatchX - 38, ENGINE_SCENE.groundY - 1, 76, 3);
    context.fillRect(PET_WORLD.sunPatchX - 27, ENGINE_SCENE.groundY + 2, 54, 2);
  }

  if (motion === "care") {
    const berryY = ENGINE_SCENE.groundY - 28 + Math.round(Math.min(progress * 2, 1) * 23);
    context.globalAlpha = 1;
    context.fillStyle = "#d8615f";
    context.fillRect(world.petX - 2, berryY, 3, 3);
    context.fillRect(world.petX + 1, berryY + 1, 2, 2);
    context.fillStyle = palette.leaf;
    context.fillRect(world.petX, berryY - 2, 2, 2);
  }

  drawProgressBlooms(context, palette, world);
  drawAfterRainPuddle(context, palette, world);
  drawHandMote(context, palette, world);
  drawVisitor(context, palette, world, reducedMotion);
  if (world.rainGuest.phase === "waiting") drawRainGuest(context, palette, world, reducedMotion);
  if (world.playLeaf.phase !== "carried") drawWindLeaf(context, palette, world);
  context.restore();

  drawWeather(context, palette, world, false);
}

function drawNearForeground(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
  habitat: HabitatImages,
  guardianWake: GuardianWakePresentation,
  habitatPerformance: HabitatPerformanceSnapshot,
) {
  const hasAuthoredForeground = habitatImageReady(habitat.foreground);
  if (hasAuthoredForeground) {
    context.save();
    worldTransform(context, world);
    context.imageSmoothingEnabled = false;
    context.drawImage(
      habitat.foreground,
      0,
      ENGINE_SCENE.groundY - LEAFLING_HABITAT.foreground.baseline,
      LEAFLING_HABITAT.foreground.size.width,
      LEAFLING_HABITAT.foreground.size.height,
    );
    context.restore();
  }

  context.save();
  worldTransform(context, world);
  context.fillStyle = palette.deep;
  context.globalAlpha = hasAuthoredForeground ? 0.42 : 0.82;
  for (let x = 5; x < PET_WORLD.width; x += 19) {
    const distanceFromWake = Math.abs(x - guardianWake.centerX);
    const wakeDirection = x < guardianWake.centerX ? -1 : 1;
    const wakeBand = guardianWake.visible && guardianWake.mode === "released" && guardianWake.radius > 0
      ? Math.max(
          0,
          1 - Math.abs(distanceFromWake - guardianWake.radius * 0.62) / Math.max(12, guardianWake.radius * 0.54),
        )
      : 0;
    const wakeBend = wakeDirection * Math.round(wakeBand * guardianWake.intensity * 8);
    const materialBend = habitatPerformance.grassLean * (0.78 + (x % 4) * 0.11);
    const bend = Math.round(materialBend) + wakeBend;
    context.fillRect(x, ENGINE_SCENE.groundY - 4, 1, 5);
    context.fillRect(x + bend, ENGINE_SCENE.groundY - 6 - (x % 3), 1, 3 + (x % 3));
    if (x % 3 === 0) context.fillRect(x - 2 + bend, ENGINE_SCENE.groundY - 4, 3, 1);
  }

  // A released Guardian wake travels as an authored row of grass laying away
  // from the landing. This sits over the detailed foreground so it remains
  // legible at phone scale, while still being made only from meadow colors.
  if (guardianWake.visible && guardianWake.mode === "released" && guardianWake.radius > 0) {
    const ringCenter = guardianWake.radius * 0.68;
    const ringWidth = Math.max(18, guardianWake.radius * 0.42);
    for (let x = 9; x < PET_WORLD.width; x += 11) {
      const signedDistance = x - guardianWake.centerX;
      const distance = Math.abs(signedDistance);
      const response = Math.max(0, 1 - Math.abs(distance - ringCenter) / ringWidth)
        * guardianWake.intensity;
      if (response <= 0.08) continue;
      const direction = signedDistance < 0 ? -1 : 1;
      const height = 7 + (x % 4);
      const bend = direction * Math.max(3, Math.round(response * 13));
      const baseY = ENGINE_SCENE.groundY;

      context.globalAlpha = 0.5 + response * 0.38;
      context.fillStyle = palette.deep;
      context.fillRect(x - 1, baseY - 2, 3, 2);
      context.fillRect(x, baseY - height, 2, height - 1);
      context.fillRect(x + Math.round(bend * 0.45), baseY - height - 2, Math.max(2, Math.abs(bend) - 2), 2);
      context.fillStyle = palette.leafLight;
      context.fillRect(x + bend, baseY - height - 3, 3, 2);
      context.fillRect(x + bend + direction, baseY - height - 2, 2, 1);
    }
  }
  context.fillStyle = palette.leafLight;
  context.globalAlpha = 0.44;
  for (let x = 17; x < PET_WORLD.width; x += 47) {
    context.fillRect(x, ENGINE_SCENE.groundY - 2, 4, 1);
  }
  context.restore();
}

function drawFocusStillness(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
  atmosphere: FocusAtmosphere,
) {
  if (!world.focus.active || atmosphere.hush <= 0) return;

  context.save();
  context.fillStyle = palette.skyLight;
  context.globalAlpha = atmosphere.hush * 0.055;
  context.fillRect(0, 0, ENGINE_SCENE.width, ENGINE_SCENE.height);
  context.restore();

  const breath = atmosphere.breath;
  const radiusX = 23 + breath * 4;
  const radiusY = 10 + breath * 2;
  context.save();
  worldTransform(context, world);
  context.translate(world.focus.anchorX, ENGINE_SCENE.groundY - 13);
  context.fillStyle = palette.skyLight;
  context.globalAlpha = atmosphere.hush * (0.08 + breath * 0.045);
  context.beginPath();
  context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = palette.bloom;
  context.globalAlpha = atmosphere.hush * (0.035 + breath * 0.025);
  context.fillRect(-Math.round(radiusX), 10, Math.round(radiusX * 2), 2);
  context.restore();
}

function drawEvolutionMotes(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
  progress: number,
  opacity: number,
) {
  if (opacity <= 0) return;
  const gathering = progress < 0.52;
  const travel = gathering ? progress / 0.52 : (progress - 0.52) / 0.48;
  const radius = gathering
    ? 42 - Math.min(1, travel) * 29
    : 13 + Math.min(1, travel) * 24;
  const colors = [palette.bloom, palette.cream, palette.leafLight, palette.skyLight];

  context.save();
  worldTransform(context, world);
  context.translate(world.petX, ENGINE_SCENE.groundY - 31);
  context.globalAlpha = opacity * 0.92;
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2 + progress * (index % 2 === 0 ? 1.8 : -1.35);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.62;
    context.save();
    context.translate(Math.round(x), Math.round(y));
    context.rotate(angle + Math.PI / 4);
    context.fillStyle = colors[index % colors.length];
    context.fillRect(-2, -1, index % 3 === 0 ? 5 : 4, 2);
    context.fillRect(-1, -2, 2, 4);
    context.restore();
  }
  context.restore();
}

function drawPetSprite(
  context: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  manifest: PetAnimationManifest,
  stage: PetStage,
  snapshot: PetFrameSnapshot,
  world: PetWorldState,
  opacity: number,
  scaleMultiplier: number,
  yOffset: number,
  showRig: boolean,
) {
  if (opacity <= 0) return;
  const size = LEAFLING_PRESENTATION.stages[stage];
  const scaleX = (size.height / manifest.atlas.frameHeight) * scaleMultiplier;
  const scaleY = scaleX;
  const destinationWidth = manifest.atlas.frameWidth * scaleX;
  const destinationHeight = manifest.atlas.frameHeight * scaleY;
  const sourceX = snapshot.cell.column * manifest.atlas.frameWidth;
  const sourceY = snapshot.cell.row * manifest.atlas.frameHeight;
  const destinationX = -snapshot.anchor.x * scaleX + snapshot.transform.x;
  const destinationY = -snapshot.anchor.y * scaleY + snapshot.transform.y;

  context.save();
  worldTransform(context, world);
  context.translate(world.petX, ENGINE_SCENE.groundY + world.poseY + yOffset);
  context.globalAlpha = opacity;
  if (world.rotation !== 0) {
    context.translate(0, -size.height * scaleMultiplier * 0.42);
    context.rotate((world.rotation * world.facing * Math.PI) / 180);
    context.translate(0, size.height * scaleMultiplier * 0.42);
  }
  context.scale(world.facing, 1);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    sprite,
    sourceX,
    sourceY,
    manifest.atlas.frameWidth,
    manifest.atlas.frameHeight,
    Math.round(destinationX),
    Math.round(destinationY),
    destinationWidth,
    destinationHeight,
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
      layer.cell.column * manifest.atlas.frameWidth,
      layer.cell.row * manifest.atlas.frameHeight,
      manifest.atlas.frameWidth,
      manifest.atlas.frameHeight,
      Math.round(destinationX + layer.offset.x * scaleX),
      Math.round(destinationY + layer.offset.y * scaleY),
      destinationWidth,
      destinationHeight,
    );
    context.restore();
  }

  if (showRig) {
    const colors = ["#e14f62", "#316ee8", "#be4ee6", "#f08a34", "#2eaa7b", "#c55a92", "#111111", "#7d6c24"];
    LEAFLING_PRESENTATION.channels.forEach((channel, index) => {
      const bounds = channel.bounds;
      context.strokeStyle = colors[index % colors.length];
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

function drawAffectionContact(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  stage: PetStage,
  world: PetWorldState,
  reducedMotion: boolean,
) {
  if (world.action !== "affection") return;
  const presentation = LEAFLING_PRESENTATION.stages[stage];
  const progress = Math.min(1, world.actionElapsed / PET_WORLD.affectionDuration);
  const contactX = world.petX + world.facing * presentation.width * 0.24;
  const contactY = ENGINE_SCENE.groundY - presentation.height * 0.69;
  const lift = reducedMotion ? 0 : Math.round(Math.sin(progress * Math.PI) * 3);
  const alpha = reducedMotion ? 0.52 : Math.sin(progress * Math.PI) * 0.76;

  context.save();
  worldTransform(context, world);
  context.translate(Math.round(contactX), Math.round(contactY - lift));
  context.globalAlpha = Math.max(0.28, alpha);
  context.fillStyle = palette.cream;
  context.fillRect(-1, -3, 3, 1);
  context.fillRect(0, -4, 1, 3);
  context.fillStyle = palette.bloom;
  context.globalAlpha *= 0.72;
  context.fillRect(world.facing * 4 - 1, -1, 2, 2);
  context.restore();
}

function renderScene(
  context: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  manifest: PetAnimationManifest,
  paletteId: PetPalette,
  stage: PetStage,
  motion: EngineMotion,
  snapshot: PetFrameSnapshot,
  showRig: boolean,
  world: PetWorldState,
  habitat: HabitatImages,
  previousSprite: HTMLImageElement | null,
  previousManifest: PetAnimationManifest | null,
  previousStage: PetStage | null,
  previousSnapshot: PetFrameSnapshot | null,
  evolution: EvolutionComposition | null,
  focusAtmosphere: FocusAtmosphere,
  careEchoSource: MeaningfulAction | null,
  reducedMotion: boolean,
) {
  const palette = PALETTES[paletteId];
  const guardianWake = resolveGuardianWakePresentation(world, reducedMotion);
  const habitatPerformance = resolveHabitatPerformance(
    world.weather,
    resolveHabitatPerformanceIntensity(world.weatherIntensity, focusAtmosphere.hush),
    world.weatherElapsed,
    reducedMotion,
  );
  context.clearRect(0, 0, ENGINE_SCENE.width, ENGINE_SCENE.height);
  drawAuthoredHabitat(context, palette, motion, snapshot.progress, world, habitat, habitatPerformance, reducedMotion);
  drawGuardianWake(context, palette, world, guardianWake);
  drawCareEchoInvitation(context, palette, world, careEchoSource);
  drawFocusStillness(context, palette, world, focusAtmosphere);

  const showingPrevious = Boolean(
    evolution && previousManifest && previousStage && previousSnapshot && evolution.previousOpacity > evolution.currentOpacity,
  );
  const groundManifest = showingPrevious ? previousManifest! : manifest;
  const groundStage = showingPrevious ? previousStage! : stage;
  const groundSnapshot = showingPrevious ? previousSnapshot! : snapshot;
  const groundScale = LEAFLING_PRESENTATION.stages[groundStage].height / groundManifest.atlas.frameHeight;
  const groundCue = resolveGroundCue(
    groundSnapshot.contact,
    groundSnapshot.shadow.width,
    groundSnapshot.shadow.opacity,
    groundScale,
  );
  const contactBaseline = world.action === "tree-perch"
    ? ENGINE_SCENE.groundY + world.poseY
    : ENGINE_SCENE.groundY;

  context.save();
  worldTransform(context, world);
  context.globalAlpha = groundCue.opacity;
  context.fillStyle = palette.outline;
  context.fillRect(
    Math.round(world.petX - groundCue.width / 2),
    contactBaseline + groundCue.yOffset,
    groundCue.width,
    groundCue.height,
  );
  context.restore();
  if (evolution) drawEvolutionMotes(context, palette, world, snapshot.progress, evolution.motesOpacity);
  if (evolution && previousSprite && previousManifest && previousStage && previousSnapshot) {
    drawPetSprite(
      context,
      previousSprite,
      previousManifest,
      previousStage,
      previousSnapshot,
      world,
      evolution.previousOpacity,
      evolution.previousScale,
      0,
      false,
    );
  }
  drawPetSprite(
    context,
    sprite,
    manifest,
    stage,
    snapshot,
    world,
    evolution?.currentOpacity ?? 1,
    (evolution?.currentScale ?? 1) * (world.focus.phase === "together" ? 0.995 + focusAtmosphere.breath * 0.01 : 1),
    evolution?.currentYOffset ?? 0,
    showRig,
  );
  if (world.playLeaf.phase === "carried") {
    context.save();
    worldTransform(context, world);
    drawWindLeaf(context, palette, world);
    context.restore();
  }
  if (world.rainGuest.phase === "carried" || world.rainGuest.phase === "sheltered") {
    context.save();
    worldTransform(context, world);
    drawRainGuest(context, palette, world, reducedMotion);
    context.restore();
  }
  drawAffectionContact(context, palette, stage, world, reducedMotion);
  drawAfterRainSplash(context, world, reducedMotion, stage);
  drawNearForeground(context, palette, world, habitat, guardianWake, habitatPerformance);
  drawWeather(context, palette, world, true);
  drawDaylight(context, palette, world);
  drawTwilightEcho(context, palette, world, reducedMotion);
}

function drawDaylight(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
) {
  const { phase, elapsedMs } = world.daylight;
  if (phase === "day") return;
  const goldenProgress = Math.min(1, elapsedMs / PET_WORLD.goldenDuration);
  const duskProgress = Math.min(1, elapsedMs / PET_WORLD.duskDuration);
  const dawnProgress = Math.min(1, elapsedMs / PET_WORLD.dawnDuration);
  const nightAmount = phase === "night"
    ? 1
    : phase === "dusk"
      ? 0.28 + duskProgress * 0.72
      : phase === "dawn"
        ? 1 - dawnProgress
        : goldenProgress * 0.22;

  context.save();
  if (phase === "golden") {
    context.fillStyle = `rgba(244, 157, 67, ${0.08 + goldenProgress * 0.1})`;
    context.fillRect(0, 0, ENGINE_SCENE.width, ENGINE_SCENE.height);
    const glow = context.createRadialGradient(136, 55, 4, 136, 55, 92);
    glow.addColorStop(0, "rgba(255, 225, 132, 0.34)");
    glow.addColorStop(1, "rgba(255, 185, 92, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, ENGINE_SCENE.width, 170);
  } else {
    context.fillStyle = `rgba(22, 28, 70, ${0.16 + nightAmount * 0.48})`;
    context.fillRect(0, 0, ENGINE_SCENE.width, ENGINE_SCENE.height);
  }

  if (nightAmount > 0.36) {
    const skyAlpha = Math.min(1, (nightAmount - 0.36) / 0.64);
    context.globalAlpha = skyAlpha;
    context.fillStyle = "#f7efbd";
    context.fillRect(20, 54, 9, 9);
    context.fillStyle = "rgba(22, 28, 70, 0.92)";
    context.fillRect(16, 50, 9, 9);
    context.fillStyle = "#fff4c7";
    [[18, 29], [42, 18], [71, 38], [98, 16], [147, 52], [115, 69], [28, 74]].forEach(([x, y], index) => {
      const twinkle = index % 3 === 0 && !world.daylight.eveningActive ? 2 : 1;
      context.fillRect(x, y, twinkle, twinkle);
    });
    context.fillStyle = palette.leafLight;
    for (let index = 0; index < 4; index += 1) {
      const age = world.weatherElapsed / (720 + index * 90);
      const x = 24 + index * 36 + Math.sin(age + index * 2.1) * 8;
      const y = 128 + Math.cos(age * 1.4 + index) * 14;
      context.globalAlpha = skyAlpha * (0.38 + (Math.sin(age * 3) + 1) * 0.22);
      context.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }
  context.restore();
}

function drawTwilightEcho(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
  reducedMotion: boolean,
) {
  const echo = resolveTwilightEchoPresentation(world, reducedMotion);
  if (!echo.visible) return;

  context.save();
  worldTransform(context, world);
  for (const mote of echo.motes) {
    context.save();
    context.translate(Math.round(mote.x), Math.round(mote.y));
    context.scale(mote.scale, mote.scale);
    context.globalAlpha = mote.alpha;

    if (echo.material === "seed-light") {
      context.fillStyle = "#8b5a35";
      context.fillRect(-1, 2, 3, 2);
      context.fillStyle = palette.bloom;
      context.fillRect(-2, -2, 5, 4);
      context.fillStyle = palette.cream;
      context.fillRect(-1, -1, 3, 2);
      context.fillStyle = palette.leafLight;
      context.fillRect(2, -4, 3, 2);
    } else if (echo.material === "still-light") {
      context.globalAlpha *= 0.2;
      context.fillStyle = palette.skyLight;
      context.fillRect(-7, -7, 15, 15);
      context.globalAlpha = mote.alpha;
      context.fillStyle = palette.cream;
      context.fillRect(-3, -3, 7, 7);
      context.fillRect(0, -6, 1, 13);
      context.fillRect(-6, 0, 13, 1);
      context.fillStyle = "#fff3af";
      context.fillRect(-1, -1, 3, 3);
    } else {
      context.globalAlpha *= 0.2;
      context.fillStyle = palette.bloom;
      context.fillRect(-5, -5, 11, 11);
      context.globalAlpha = mote.alpha;
      context.fillStyle = palette.cream;
      context.fillRect(-2, -2, 5, 5);
      context.fillStyle = palette.bloom;
      context.fillRect(-1, -1, 3, 3);
    }

    context.restore();
  }
  context.restore();
}

export function PetEngineCanvas({
  initialWorld,
  stage,
  evolutionFromStage = null,
  palette,
  motion,
  reducedMotion,
  paused = false,
  manualElapsed = 0,
  showRig = false,
  previewing = false,
  worldCommand,
  onFrame,
  onWorldFrame,
  onLivingDayFrame,
  onWorldInteraction,
  careEchoSource = null,
  onCareEcho,
  label,
}: PetEngineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef(initialWorld);
  const pointersRef = useRef(new Map<number, {
    start: WorldPoint;
    current: WorldPoint;
    startedAt: number;
    startedOnPet: boolean;
    leftPet: boolean;
  }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const leafPointerRef = useRef<number | null>(null);
  const leafMotionRef = useRef<{
    previous: WorldPoint;
    previousAt: number;
    current: WorldPoint;
    currentAt: number;
  } | null>(null);
  const lastFrameRef = useRef("");
  const lastWorldReportRef = useRef(0);
  const livingDayRef = useRef(createLivingDayDirector());
  const stageRef = useRef(stage);
  const callbackRef = useRef({ onFrame, onWorldFrame, onLivingDayFrame, onWorldInteraction, onCareEcho });
  const manifest = leaflingManifestForStage(stage);
  const previousManifest = evolutionFromStage ? leaflingManifestForStage(evolutionFromStage) : null;
  const ceremonyActive = motion === "evolve" && previousManifest !== null;

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    callbackRef.current = { onFrame, onWorldFrame, onLivingDayFrame, onWorldInteraction, onCareEcho };
  }, [onCareEcho, onFrame, onLivingDayFrame, onWorldFrame, onWorldInteraction]);

  useEffect(() => {
    if (!worldCommand) return;
    livingDayRef.current = interruptLivingDay(livingDayRef.current);
    if (worldCommand.type === "visitor" && !worldRef.current.focus.active) {
      worldRef.current = spawnVisitor({
        ...worldRef.current,
        action: "idle",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
      }, stageRef.current);
    }
    if (worldCommand.type === "tree-play") {
      worldRef.current = beginTreePlay(worldRef.current, stageRef.current);
    }
    if (worldCommand.type === "after-rain") {
      worldRef.current = beginAfterRainSplash(worldRef.current);
    }
    if (worldCommand.type === "rollover") {
      worldRef.current = applyWorldIntent(worldRef.current, { kind: "rollover", worldX: worldRef.current.petX });
    }
    if (worldCommand.type === "reunion") {
      worldRef.current = beginPetReunion(worldRef.current, stageRef.current);
    }
    if (worldCommand.type === "affection") {
      worldRef.current = applyWorldIntent(worldRef.current, {
        kind: "affection",
        worldX: worldRef.current.petX + worldRef.current.facing * 8,
      });
    }
    if (worldCommand.type === "guardian-wake-left" || worldCommand.type === "guardian-wake-right") {
      const direction = worldCommand.type === "guardian-wake-left" ? -1 : 1;
      const targetX = Math.max(
        PET_WORLD.minX,
        Math.min(PET_WORLD.maxX, worldRef.current.petX + direction * 62),
      );
      worldRef.current = releaseWorldHandGuide(
        guideWorldWithHand(worldRef.current, { x: targetX, y: 58 }, "guardian"),
        "guardian",
      );
    }
    if (worldCommand.type === "center") {
      worldRef.current = setWorldZoom({ ...worldRef.current, cameraX: worldRef.current.petX }, 1);
    }
    if (worldCommand.type === "reset") {
      worldRef.current = createPetWorldState();
      livingDayRef.current = createLivingDayDirector();
    }
    if (worldCommand.type === "sunny" || worldCommand.type === "breeze" || worldCommand.type === "rain") {
      if (!worldRef.current.focus.active) {
        worldRef.current = setWorldWeather(worldRef.current, worldCommand.type);
      }
    }
    if (worldCommand.type === "focus") {
      worldRef.current = beginCompanionFocus(worldRef.current, 15000);
    }
    if (worldCommand.type === "todo-memory" && !worldRef.current.focus.active) {
      worldRef.current = plantLifeEcho(worldRef.current, "todo");
    }
    if (worldCommand.type === "focus-memory") {
      worldRef.current = plantLifeEcho(worldRef.current, "focus", worldRef.current.focus.anchorX);
    }
    if (worldCommand.type === "play" && !worldRef.current.focus.active) {
      worldRef.current = beginSharedPlayEcho(worldRef.current, stageRef.current);
    }
    if (worldCommand.type === "evening") {
      worldRef.current = beginPetEvening(worldRef.current, worldCommand.source ?? null);
    }
    if (worldCommand.type === "morning") {
      worldRef.current = beginPetMorning(worldRef.current);
    }

    callbackRef.current.onWorldFrame?.(worldRef.current);
    callbackRef.current.onLivingDayFrame?.(livingDayRef.current);
    callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
  }, [worldCommand]);

  useEffect(() => {
    if (!careEchoSource) return;
    livingDayRef.current = interruptLivingDay(livingDayRef.current);
    worldRef.current = holdCareEcho(worldRef.current, careEchoSource);
    callbackRef.current.onWorldFrame?.(worldRef.current);
    callbackRef.current.onLivingDayFrame?.(livingDayRef.current);
  }, [careEchoSource]);

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
    const sprite = new Image();
    const previousSprite = previousManifest ? new Image() : null;
    const habitat: HabitatImages = {
      backdrop: new Image(),
      shelterTree: new Image(),
      foreground: new Image(),
    };
    habitat.backdrop.src = LEAFLING_HABITAT.backdrop.src;
    habitat.shelterTree.src = LEAFLING_HABITAT.shelterTree.src;
    habitat.foreground.src = LEAFLING_HABITAT.foreground.src;

    const draw = (time: number) => {
      if (disposed) return;
      const dt = paused ? 0 : Math.min(64, Math.max(0, time - previousTime));
      previousTime = time;
      const beforeAction = worldRef.current.action;
      const ceremonyOwnsFrame = shouldRunEvolutionCeremony(ceremonyActive, worldRef.current.focus.active);
      if (ceremonyOwnsFrame) {
        livingDayRef.current = interruptLivingDay(livingDayRef.current);
        worldRef.current = {
          ...worldRef.current,
          action: "idle",
          actionElapsed: 0,
          targetX: null,
          poseY: 0,
          rotation: 0,
          visitor: { ...worldRef.current.visitor, active: false, engaged: false, engagedAgeMs: 0 },
          treePlay: {
            ...(worldRef.current.treePlay ?? createPetWorldState().treePlay),
            active: false,
            perchY: 0,
          },
          playLeaf: createWindLeaf(),
        };
      } else if (!paused) {
        worldRef.current = stepPetWorld(worldRef.current, dt, reducedMotion, stageRef.current);
      }

      if (previewing && livingDayRef.current.activeEpisode) {
        livingDayRef.current = interruptLivingDay(livingDayRef.current);
      }
      if (careEchoSource) {
        if (livingDayRef.current.activeEpisode) {
          livingDayRef.current = interruptLivingDay(livingDayRef.current);
        }
      } else {
        const livingDayStep = stepLivingDayDirector(
          livingDayRef.current,
          {
            stage,
            petX: worldRef.current.petX,
            bloomXs: worldRef.current.blooms.map((bloom) => bloom.x),
            action: worldRef.current.action,
            focusActive: worldRef.current.focus.active,
            visitorActive: worldRef.current.visitor.active,
            weather: worldRef.current.weather,
            weatherPhase: worldRef.current.weatherPhase,
            ceremonyActive: ceremonyOwnsFrame || previewing,
          },
          dt,
        );
        livingDayRef.current = livingDayStep.state;
        if (livingDayStep.command) {
          worldRef.current = applyLivingDayCommand(worldRef.current, livingDayStep.command, stage);
        }
      }
      if (worldRef.current.action !== beforeAction) callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);

      const worldClip = clipForWorldAction(worldRef.current.action, reducedMotion, stageRef.current);
      const requestedClip = resolveRequestedClip(
        clipForMotion(motion),
        worldClip,
        worldRef.current.action === "idle",
        previewing,
      );
      if (requestedClip !== activeClip) {
        activeClip = requestedClip;
        clipStartedAt = time;
        lastFrameRef.current = "";
      }
      const elapsed = paused ? manualElapsed : time - clipStartedAt;
      const snapshot = resolvePetFrame(manifest, requestedClip, elapsed, reducedMotion);
      const evolution = ceremonyOwnsFrame
        ? resolveEvolutionComposition(snapshot.progress, reducedMotion)
        : null;
      const previousSnapshot = previousManifest && evolution
        ? resolvePetFrame(
            previousManifest,
            "evolve",
            snapshot.progress * clipDuration(previousManifest.clips.evolve),
            reducedMotion,
          )
        : null;
      const focusAtmosphere = resolveFocusAtmosphere(worldRef.current.focus, reducedMotion);
      renderScene(
        context,
        sprite,
        manifest,
        palette,
        stage,
        motion,
        snapshot,
        showRig,
        worldRef.current,
        habitat,
        previousSprite,
        previousManifest,
        evolutionFromStage,
        previousSnapshot,
        evolution,
        focusAtmosphere,
        careEchoSource,
        reducedMotion,
      );

      const frameKey = `${snapshot.clip}:${snapshot.frameIndex}`;
      if (frameKey !== lastFrameRef.current) {
        lastFrameRef.current = frameKey;
        callbackRef.current.onFrame?.(snapshot);
      }
      if (time - lastWorldReportRef.current > 120) {
        lastWorldReportRef.current = time;
        callbackRef.current.onWorldFrame?.(worldRef.current);
        callbackRef.current.onLivingDayFrame?.(livingDayRef.current);
      }
      if (!paused) animationId = requestAnimationFrame(draw);
    };

    let spriteReady = false;
    let previousSpriteReady = previousSprite === null;
    const beginWhenReady = () => {
      if (spriteReady && previousSpriteReady && !disposed) draw(performance.now());
    };
    sprite.onload = () => {
      spriteReady = true;
      beginWhenReady();
    };
    sprite.src = manifest.atlas.src;
    if (previousSprite && previousManifest) {
      previousSprite.onload = () => {
        previousSpriteReady = true;
        beginWhenReady();
      };
      previousSprite.src = previousManifest.atlas.src;
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      sprite.onload = null;
      if (previousSprite) previousSprite.onload = null;
    };
  }, [careEchoSource, ceremonyActive, evolutionFromStage, manualElapsed, manifest, motion, palette, paused, previewing, previousManifest, reducedMotion, showRig, stage]);

  function pointFromEvent(event: PointerEvent<HTMLDivElement>): WorldPoint {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * ENGINE_SCENE.width,
      y: ((event.clientY - bounds.top) / bounds.height) * ENGINE_SCENE.height,
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (worldRef.current.focus.active && worldRef.current.focus.phase !== "choosing") return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic browser QA and older pointer implementations may not own
      // the pointer yet; the world interaction still remains well-defined.
    }
    livingDayRef.current = interruptLivingDay(livingDayRef.current);
    const point = pointFromEvent(event);
    const worldPoint = screenPointToWorldPoint(worldRef.current, point);
    if (isWindLeafHit(worldRef.current.playLeaf, worldPoint)) {
      leafPointerRef.current = event.pointerId;
      leafMotionRef.current = {
        previous: worldPoint,
        previousAt: event.timeStamp,
        current: worldPoint,
        currentAt: event.timeStamp,
      };
      worldRef.current = grabWorldWindLeaf(worldRef.current, worldPoint, stageRef.current);
      callbackRef.current.onWorldFrame?.(worldRef.current);
      callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      return;
    }
    pointersRef.current.set(event.pointerId, {
      start: point,
      current: point,
      startedAt: event.timeStamp,
      startedOnPet: isPetContactHit(worldRef.current, stageRef.current, point),
      leftPet: false,
    });
    if (pointersRef.current.size === 2) {
      worldRef.current = cancelWorldHandGuide(worldRef.current);
      const [first, second] = [...pointersRef.current.values()];
      pinchRef.current = { distance: Math.hypot(first.current.x - second.current.x, first.current.y - second.current.y), zoom: worldRef.current.zoom };
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (leafPointerRef.current === event.pointerId) {
      const point = screenPointToWorldPoint(worldRef.current, pointFromEvent(event));
      const prior = leafMotionRef.current;
      leafMotionRef.current = prior
        ? { previous: prior.current, previousAt: prior.currentAt, current: point, currentAt: event.timeStamp }
        : { previous: point, previousAt: event.timeStamp, current: point, currentAt: event.timeStamp };
      worldRef.current = dragWorldWindLeaf(worldRef.current, point);
      callbackRef.current.onWorldFrame?.(worldRef.current);
      return;
    }
    const pointer = pointersRef.current.get(event.pointerId);
    if (!pointer) return;
    pointer.current = pointFromEvent(event);
    if (worldRef.current.focus.active && worldRef.current.focus.phase === "choosing") return;
    if (pointer.startedOnPet && !isPetContactHit(worldRef.current, stageRef.current, pointer.current)) {
      pointer.leftPet = true;
    }
    const gestureDistance = Math.hypot(pointer.current.x - pointer.start.x, pointer.current.y - pointer.start.y);
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [first, second] = [...pointersRef.current.values()];
      const distance = Math.hypot(first.current.x - second.current.x, first.current.y - second.current.y);
      worldRef.current = setWorldZoom(worldRef.current, pinchRef.current.zoom * (distance / Math.max(1, pinchRef.current.distance)));
    } else if (pointersRef.current.size === 1 && gestureDistance > 6) {
      const contactGesture = resolvePetContactGesture({
        startedOnPet: pointer.startedOnPet,
        leftPet: pointer.leftPet,
        start: pointer.start,
        current: pointer.current,
        durationMs: Math.max(0, event.timeStamp - pointer.startedAt),
      });
      if (pointer.startedOnPet && contactGesture !== "guide") return;
      const worldPoint = screenPointToWorldPoint(worldRef.current, pointer.current);
      worldRef.current = guideWorldWithHand(worldRef.current, worldPoint, stageRef.current);
      callbackRef.current.onWorldFrame?.(worldRef.current);
      callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (leafPointerRef.current === event.pointerId) {
      const point = screenPointToWorldPoint(worldRef.current, pointFromEvent(event));
      worldRef.current = dragWorldWindLeaf(worldRef.current, point);
      const motion = leafMotionRef.current;
      const elapsed = motion ? Math.max(16, event.timeStamp - motion.previousAt) : 16;
      const velocity = motion
        ? { x: (point.x - motion.previous.x) / elapsed, y: (point.y - motion.previous.y) / elapsed }
        : { x: 0, y: 0 };
      worldRef.current = tossWorldWindLeaf(worldRef.current, velocity, reducedMotion);
      leafPointerRef.current = null;
      leafMotionRef.current = null;
      callbackRef.current.onWorldFrame?.(worldRef.current);
      callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      return;
    }
    const pointer = pointersRef.current.get(event.pointerId);
    const wasPinching = pinchRef.current !== null;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (!pointer || wasPinching) return;

    pointer.current = pointFromEvent(event);
    if (pointer.startedOnPet && !isPetContactHit(worldRef.current, stageRef.current, pointer.current)) {
      pointer.leftPet = true;
    }

    const contactGesture = resolvePetContactGesture({
      startedOnPet: pointer.startedOnPet,
      leftPet: pointer.leftPet,
      start: pointer.start,
      current: pointer.current,
      durationMs: Math.max(0, event.timeStamp - pointer.startedAt),
    });
    if (worldRef.current.focus.active && worldRef.current.focus.phase === "choosing") {
      if (contactGesture !== "tap") return;
      const focusPoint = screenPointToWorldPoint(worldRef.current, pointer.current);
      const requestedX = resolveCompanionFocusPlaceHit(worldRef.current, focusPoint);
      if (requestedX === null) return;
      worldRef.current = chooseCompanionFocusPlace(worldRef.current, requestedX);
      callbackRef.current.onWorldFrame?.(worldRef.current);
      callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      return;
    }
    if (contactGesture === "affection") {
      const contact = screenPointToWorldPoint(worldRef.current, pointer.current);
      worldRef.current = applyWorldIntent(worldRef.current, { kind: "affection", worldX: contact.x });
      callbackRef.current.onWorldFrame?.(worldRef.current);
      callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      return;
    }
    if (contactGesture === "rollover") {
      worldRef.current = applyWorldIntent(worldRef.current, { kind: "rollover", worldX: worldRef.current.petX });
      callbackRef.current.onWorldInteraction?.("rollover", worldRef.current);
      return;
    }
    if (worldRef.current.hand.phase === "held") {
      worldRef.current = releaseWorldHandGuide(worldRef.current, stageRef.current);
      callbackRef.current.onWorldFrame?.(worldRef.current);
      callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      return;
    }
    if (contactGesture !== "tap") return;
    const worldPoint = screenPointToWorldPoint(worldRef.current, pointer.current);
    if (resolveVisitorHit(worldRef.current, worldPoint)) {
      worldRef.current = beginVisitorChase(worldRef.current);
      livingDayRef.current = interruptLivingDay(livingDayRef.current);
      callbackRef.current.onWorldFrame?.(worldRef.current);
      callbackRef.current.onLivingDayFrame?.(livingDayRef.current);
      callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      return;
    }
    const careEcho = resolveCareEchoHit(
      worldRef.current,
      careEchoSource,
      worldPoint,
    );
    if (careEcho) {
      callbackRef.current.onCareEcho?.(careEcho.source);
      return;
    }
    if (worldRef.current.rainGuest.phase === "waiting") {
      if (resolveRainGuestHit(worldRef.current, worldPoint)) {
        worldRef.current = beginRainGuestShelter(worldRef.current);
        livingDayRef.current = interruptLivingDay(livingDayRef.current);
        callbackRef.current.onWorldFrame?.(worldRef.current);
        callbackRef.current.onLivingDayFrame?.(livingDayRef.current);
        callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      }
      return;
    }
    if (worldRef.current.action === "tree-perch" && worldRef.current.treePlay.active) {
      if (resolveTreeReturnHit(worldRef.current, worldPoint)) {
        worldRef.current = beginTreeReturn(worldRef.current, worldPoint.x);
        callbackRef.current.onWorldFrame?.(worldRef.current);
        callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      }
      return;
    }
    if (resolveAfterRainHit(worldRef.current, worldPoint)) {
      worldRef.current = beginAfterRainSplash(worldRef.current);
      livingDayRef.current = interruptLivingDay(livingDayRef.current);
      callbackRef.current.onWorldFrame?.(worldRef.current);
      callbackRef.current.onLivingDayFrame?.(livingDayRef.current);
      callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      return;
    }
    if (resolveTreePlayHit(worldRef.current, worldPoint)) {
      worldRef.current = beginTreePlay(worldRef.current, stageRef.current);
      livingDayRef.current = interruptLivingDay(livingDayRef.current);
      callbackRef.current.onWorldFrame?.(worldRef.current);
      callbackRef.current.onLivingDayFrame?.(livingDayRef.current);
      callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      return;
    }
    const intent = resolveTapIntent(worldRef.current, pointer.current);
    worldRef.current = applyWorldIntent(worldRef.current, intent);
    callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const world = worldRef.current;
    if (world.focus.active) {
      if (
        world.focus.phase === "choosing"
        && (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Enter")
      ) {
        event.preventDefault();
        const requestedX = event.key === "ArrowLeft"
          ? world.petX - 96
          : event.key === "ArrowRight"
            ? world.petX + 96
            : world.petX;
        worldRef.current = chooseCompanionFocusPlace(world, requestedX);
        callbackRef.current.onWorldFrame?.(worldRef.current);
        callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      }
      return;
    }
    if (world.rainGuest.phase === "waiting" && event.key === "Enter") {
      event.preventDefault();
      livingDayRef.current = interruptLivingDay(livingDayRef.current);
      worldRef.current = beginRainGuestShelter(world);
      callbackRef.current.onWorldFrame?.(worldRef.current);
      callbackRef.current.onLivingDayFrame?.(livingDayRef.current);
      callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      return;
    }
    if (world.action === "visitor-invite" && event.key === "Enter") {
      event.preventDefault();
      livingDayRef.current = interruptLivingDay(livingDayRef.current);
      worldRef.current = beginVisitorChase(world);
      callbackRef.current.onWorldFrame?.(worldRef.current);
      callbackRef.current.onLivingDayFrame?.(livingDayRef.current);
      callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      return;
    }
    if (world.action === "tree-perch" && world.treePlay.active && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      livingDayRef.current = interruptLivingDay(livingDayRef.current);
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      worldRef.current = beginTreeReturn(
        world,
        world.treePlay.perchX + direction * TREE_PLAY[world.treePlay.stage === "guardian" ? "guardian" : "young"].landingReach,
      );
      callbackRef.current.onWorldFrame?.(worldRef.current);
      callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      livingDayRef.current = interruptLivingDay(livingDayRef.current);
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      worldRef.current = applyWorldIntent(world, { kind: "move", worldX: world.petX + direction * 72 });
    } else if (event.key === "ArrowUp" || event.key === " ") {
      event.preventDefault();
      livingDayRef.current = interruptLivingDay(livingDayRef.current);
      worldRef.current = applyWorldIntent(world, { kind: "jump", worldX: world.petX });
    } else if (event.key.toLowerCase() === "r") {
      livingDayRef.current = interruptLivingDay(livingDayRef.current);
      worldRef.current = applyWorldIntent(world, { kind: "rollover", worldX: world.petX });
    } else if (event.key.toLowerCase() === "p") {
      livingDayRef.current = interruptLivingDay(livingDayRef.current);
      worldRef.current = applyWorldIntent(world, {
        kind: "affection",
        worldX: world.petX + world.facing * 8,
      });
    } else if (event.key === "Enter") {
      livingDayRef.current = interruptLivingDay(livingDayRef.current);
      worldRef.current = applyWorldIntent(world, { kind: "greet", worldX: world.petX });
    } else return;
    callbackRef.current.onWorldInteraction?.(worldRef.current.action, worldRef.current);
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
