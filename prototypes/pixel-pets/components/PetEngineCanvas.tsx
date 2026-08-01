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
  applyWorldIntent,
  beginCompanionFocus,
  clipForWorldAction,
  createPetWorldState,
  nextWeatherKind,
  plantProgressBloom,
  resolveFocusAtmosphere,
  resolveTapIntent,
  setWorldZoom,
  setWorldWeather,
  spawnVisitor,
  stepPetWorld,
  type PetWorldAction,
  type PetWorldState,
  type WorldPoint,
} from "@/lib/pet-world";
import { LEAFLING_HABITAT } from "@/lib/pet-habitat";
import { LEAFLING_PRESENTATION, leaflingManifestForStage } from "@/lib/leafling";
import { clipDuration, resolvePetFrame, type PetAnimationManifest, type PetFrameSnapshot } from "@/lib/pet-runtime";
import type { PetPalette, PetStage } from "@/lib/pet-state";

export type PetWorldCommand = {
  serial: number;
  type: "visitor" | "rollover" | "center" | "sunny" | "breeze" | "rain" | "focus" | "play" | "bloom" | "reset";
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
  onWorldInteraction?: (action: PetWorldAction) => void;
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
  if (intensity <= 0) return;
  if (world.weather === "rain") {
    context.save();
    context.globalAlpha = (foreground ? 0.5 : 0.28) * intensity;
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
      context.globalAlpha = 0.42 * intensity;
      const ripple = Math.floor(world.weatherElapsed / 180) % 10;
      context.fillRect(14 - ripple / 2, 214, 18 + ripple, 1);
      context.fillRect(102 - ripple / 3, 224, 12 + ripple, 1);
      context.fillRect(139 - ripple / 4, 218, 8 + ripple / 2, 1);
      context.fillStyle = palette.deep;
      context.globalAlpha = 0.18 * intensity;
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
) {
  if (!world.visitor.active) return;
  const visitor = world.visitor;

  context.save();
  context.translate(Math.round(visitor.x), Math.round(visitor.y));
  context.scale(visitor.direction, 1);
  context.globalAlpha = visitor.engaged
    ? Math.max(0.85, 1 - visitor.engagedAgeMs / 2600)
    : 1;

  if (visitor.kind === "crawler") {
    const step = Math.floor(visitor.ageMs / 110) % 2;
    context.fillStyle = palette.outline;
    context.fillRect(-4, -2, 7, 3);
    context.fillRect(3, -1, 2, 2);
    context.fillRect(-3, 1, 1, 1 + step);
    context.fillRect(0, 1, 1, 2 - step);
    context.fillRect(3, 1, 1, 1 + step);
    context.fillRect(4, -3, 1, 2);
    context.fillRect(5, -4, 1, 2);
    context.fillStyle = palette.leafLight;
    context.fillRect(-3, -1, 5, 2);
    context.fillStyle = palette.bloom;
    context.fillRect(3, -1, 1, 1);
  } else if (visitor.kind === "firefly") {
    const wing = Math.floor(visitor.ageMs / 90) % 2;
    context.fillStyle = palette.cream;
    context.fillRect(-3, -wing, 2, 2);
    context.fillRect(3, wing, 2, 2);
    context.fillStyle = palette.bloom;
    context.fillRect(-1, -1, 3, 3);
    context.fillStyle = palette.outline;
    context.fillRect(0, 2, 1, 1);
  } else {
    const wingLift = Math.floor(visitor.ageMs / 105) % 2;
    const leftWingY = -wingLift;
    const rightWingY = wingLift;
    context.fillStyle = palette.outline;
    context.fillRect(-1, -7, 3, 14);
    context.fillRect(-2, -9, 5, 4);
    context.fillRect(-4, -11, 1, 3);
    context.fillRect(4, -11, 1, 3);
    context.fillRect(-5, -7 + leftWingY, 4, 1);
    context.fillRect(-8, -6 + leftWingY, 7, 1);
    context.fillRect(-11, -5 + leftWingY, 10, 2);
    context.fillRect(-13, -3 + leftWingY, 12, 2);
    context.fillRect(-10, -1 + leftWingY, 9, 2);
    context.fillRect(-8, 1 + leftWingY, 7, 2);
    context.fillRect(-5, 3 + leftWingY, 4, 2);
    context.fillRect(2, -7 + rightWingY, 4, 1);
    context.fillRect(2, -6 + rightWingY, 7, 1);
    context.fillRect(2, -5 + rightWingY, 10, 2);
    context.fillRect(2, -3 + rightWingY, 12, 2);
    context.fillRect(2, -1 + rightWingY, 9, 2);
    context.fillRect(2, 1 + rightWingY, 7, 2);
    context.fillRect(2, 3 + rightWingY, 4, 2);
    context.fillStyle = palette.bloom;
    context.fillRect(-7, -5 + leftWingY, 6, 1);
    context.fillRect(-10, -4 + leftWingY, 9, 2);
    context.fillRect(-11, -2 + leftWingY, 10, 1);
    context.fillRect(-8, -1 + leftWingY, 7, 2);
    context.fillRect(-6, 1 + leftWingY, 5, 2);
    context.fillRect(2, -5 + rightWingY, 6, 1);
    context.fillRect(2, -4 + rightWingY, 9, 2);
    context.fillRect(2, -2 + rightWingY, 11, 1);
    context.fillRect(2, -1 + rightWingY, 8, 2);
    context.fillRect(2, 1 + rightWingY, 6, 2);
    context.fillStyle = palette.cream;
    context.fillRect(-8, -3 + leftWingY, 3, 2);
    context.fillRect(6, -3 + rightWingY, 3, 2);
    context.fillRect(-5, 1 + leftWingY, 2, 1);
    context.fillRect(4, 1 + rightWingY, 2, 1);
    context.fillStyle = palette.leafLight;
    context.fillRect(0, -5, 1, 9);
  }
  context.restore();
}

function drawProgressBlooms(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
) {
  for (const bloom of world.blooms) {
    const growth = bloom.growth;
    const stemHeight = Math.max(1, Math.round(growth * 10));
    const bloomY = ENGINE_SCENE.groundY - stemHeight;
    const side = bloom.id % 2 === 0 ? -1 : 1;

    context.save();
    context.translate(Math.round(bloom.x), 0);
    context.globalAlpha = 0.58 + growth * 0.42;
    context.fillStyle = palette.deep;
    context.fillRect(0, ENGINE_SCENE.groundY - stemHeight, 1, stemHeight);
    if (growth > 0.28) context.fillRect(side, ENGINE_SCENE.groundY - Math.max(2, Math.round(stemHeight * 0.45)), 3 * side, 2);
    if (growth > 0.52) context.fillRect(-side, ENGINE_SCENE.groundY - Math.max(3, Math.round(stemHeight * 0.68)), -2 * side, 2);

    if (growth > 0.62) {
      const opening = Math.max(1, Math.round((growth - 0.62) / 0.38 * 3));
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

function drawProceduralHabitat(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  motion: EngineMotion,
  progress: number,
  world: PetWorldState,
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
  drawVisitor(context, palette, world);

  context.restore();
  drawWeather(context, palette, world, false);
}

function habitatImageReady(image: HTMLImageElement) {
  return image.complete && image.naturalWidth > 0;
}

function drawAuthoredHabitat(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  motion: EngineMotion,
  progress: number,
  world: PetWorldState,
  habitat: HabitatImages,
) {
  if (!habitatImageReady(habitat.backdrop) || !habitatImageReady(habitat.shelterTree)) {
    drawProceduralHabitat(context, palette, motion, progress, world);
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
  context.translate(PET_WORLD.treeShelterX, ENGINE_SCENE.groundY);
  context.rotate((world.weatherSway * 0.32 * Math.PI) / 180);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    habitat.shelterTree,
    -LEAFLING_HABITAT.shelterTree.anchor.x,
    -LEAFLING_HABITAT.shelterTree.anchor.y,
    LEAFLING_HABITAT.shelterTree.size.width,
    LEAFLING_HABITAT.shelterTree.size.height,
  );
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
  drawVisitor(context, palette, world);
  context.restore();

  drawWeather(context, palette, world, false);
}

function drawNearForeground(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
  world: PetWorldState,
  habitat: HabitatImages,
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
    const bend = Math.round(world.weatherSway * (1 + (x % 4) * 0.15));
    context.fillRect(x, ENGINE_SCENE.groundY - 4, 1, 5);
    context.fillRect(x + bend, ENGINE_SCENE.groundY - 6 - (x % 3), 1, 3 + (x % 3));
    if (x % 3 === 0) context.fillRect(x - 2 + bend, ENGINE_SCENE.groundY - 4, 3, 1);
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
  context.translate(PET_WORLD.treeShelterX, ENGINE_SCENE.groundY - 13);
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
) {
  const palette = PALETTES[paletteId];
  context.clearRect(0, 0, ENGINE_SCENE.width, ENGINE_SCENE.height);
  drawAuthoredHabitat(context, palette, motion, snapshot.progress, world, habitat);
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
    (evolution?.currentScale ?? 1) * (world.focus.active ? 0.995 + focusAtmosphere.breath * 0.01 : 1),
    evolution?.currentYOffset ?? 0,
    showRig,
  );
  drawNearForeground(context, palette, world, habitat);
  drawWeather(context, palette, world, true);
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
  onWorldInteraction,
  label,
}: PetEngineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef(initialWorld);
  const pointersRef = useRef(new Map<number, { start: WorldPoint; current: WorldPoint }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const gestureMovedRef = useRef(false);
  const lastFrameRef = useRef("");
  const lastWorldReportRef = useRef(0);
  const worldClockRef = useRef(0);
  const nextVisitorRef = useRef(1800);
  const nextWeatherRef = useRef(12000);
  const stageRef = useRef(stage);
  const callbackRef = useRef({ onFrame, onWorldFrame, onWorldInteraction });
  const manifest = leaflingManifestForStage(stage);
  const previousManifest = evolutionFromStage ? leaflingManifestForStage(evolutionFromStage) : null;
  const ceremonyActive = motion === "evolve" && previousManifest !== null;

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    callbackRef.current = { onFrame, onWorldFrame, onWorldInteraction };
  }, [onFrame, onWorldFrame, onWorldInteraction]);

  useEffect(() => {
    if (!worldCommand) return;
    if (worldCommand.type === "visitor" && !worldRef.current.focus.active) {
      worldRef.current = spawnVisitor(worldRef.current, stageRef.current);
      nextVisitorRef.current = worldClockRef.current + 7800;
    }
    if (worldCommand.type === "rollover") {
      worldRef.current = applyWorldIntent(worldRef.current, { kind: "rollover", worldX: worldRef.current.petX });
    }
    if (worldCommand.type === "center") {
      worldRef.current = setWorldZoom({ ...worldRef.current, cameraX: worldRef.current.petX }, 1);
    }
    if (worldCommand.type === "reset") {
      worldRef.current = createPetWorldState();
      nextVisitorRef.current = worldClockRef.current + 1800;
      nextWeatherRef.current = worldClockRef.current + 12000;
    }
    if (worldCommand.type === "sunny" || worldCommand.type === "breeze" || worldCommand.type === "rain") {
      if (!worldRef.current.focus.active) {
        worldRef.current = setWorldWeather(worldRef.current, worldCommand.type);
        nextWeatherRef.current = worldClockRef.current + 14000;
        nextVisitorRef.current = worldClockRef.current + 3600;
      }
    }
    if (worldCommand.type === "focus") {
      worldRef.current = beginCompanionFocus(worldRef.current, 15000);
    }
    if (worldCommand.type === "bloom" && !worldRef.current.focus.active) {
      worldRef.current = plantProgressBloom(worldRef.current);
      nextVisitorRef.current = worldClockRef.current + 9000;
      nextWeatherRef.current = worldClockRef.current + 9000;
    }
    if (worldCommand.type === "play" && !worldRef.current.focus.active) {
      worldRef.current = spawnVisitor(setWorldWeather(worldRef.current, "breeze"), stageRef.current);
      nextVisitorRef.current = worldClockRef.current + 7800;
      nextWeatherRef.current = worldClockRef.current + 14000;
    }
    callbackRef.current.onWorldFrame?.(worldRef.current);
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
      worldClockRef.current += dt;

      const beforeAction = worldRef.current.action;
      const ceremonyOwnsFrame = shouldRunEvolutionCeremony(ceremonyActive, worldRef.current.focus.active);
      if (ceremonyOwnsFrame) {
        worldRef.current = {
          ...worldRef.current,
          action: "idle",
          actionElapsed: 0,
          targetX: null,
          poseY: 0,
          rotation: 0,
          visitor: { ...worldRef.current.visitor, active: false, engaged: false, engagedAgeMs: 0 },
        };
      } else if (!paused) {
        worldRef.current = stepPetWorld(worldRef.current, dt, reducedMotion);
      }
      if (worldRef.current.focus.active) {
        nextVisitorRef.current = Math.max(nextVisitorRef.current, worldClockRef.current + 2200);
        nextWeatherRef.current = Math.max(nextWeatherRef.current, worldClockRef.current + 2200);
      }
      const stableForWeather = ["idle", "shelter", "shade", "bask"].includes(worldRef.current.action);
      if (!ceremonyOwnsFrame && !worldRef.current.focus.active && !worldRef.current.visitor.active && stableForWeather && worldClockRef.current >= nextWeatherRef.current) {
        worldRef.current = setWorldWeather(worldRef.current, nextWeatherKind(worldRef.current.weather));
        nextWeatherRef.current = worldClockRef.current + 14000;
        nextVisitorRef.current = Math.max(nextVisitorRef.current, worldClockRef.current + 3600);
      } else if (worldClockRef.current >= nextWeatherRef.current && !stableForWeather) {
        nextWeatherRef.current = worldClockRef.current + 1000;
      }
      const stableForVisitor = worldRef.current.action === "idle" && worldRef.current.weather !== "rain";
      if (!ceremonyOwnsFrame && !worldRef.current.focus.active && worldRef.current.weatherPhase === "settled" && stableForVisitor && !worldRef.current.visitor.active && worldClockRef.current >= nextVisitorRef.current) {
        worldRef.current = spawnVisitor(worldRef.current, stage);
        nextVisitorRef.current = worldClockRef.current + 7800;
      }
      if (worldRef.current.action !== beforeAction) callbackRef.current.onWorldInteraction?.(worldRef.current.action);

      const worldClip = clipForWorldAction(worldRef.current.action);
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
      );

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
  }, [ceremonyActive, evolutionFromStage, manualElapsed, manifest, motion, palette, paused, previewing, previousManifest, reducedMotion, showRig, stage]);

  function pointFromEvent(event: PointerEvent<HTMLDivElement>): WorldPoint {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * ENGINE_SCENE.width,
      y: ((event.clientY - bounds.top) / bounds.height) * ENGINE_SCENE.height,
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (worldRef.current.focus.active) return;
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
    if (world.focus.active) return;
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
