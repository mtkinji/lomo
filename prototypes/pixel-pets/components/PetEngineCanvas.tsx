"use client";

import { useEffect, useRef } from "react";

import {
  ENGINE_SCENE,
  LEAFLING_RIG,
  animationFrameAt,
  pixelsForLayer,
  type AnimationSnapshot,
  type EngineMotion,
  type PetColor,
  type PixelRun,
  type RigLayer,
} from "@/lib/pet-engine";
import type { PetPalette, PetStage } from "@/lib/pet-state";

interface PetEngineCanvasProps {
  stage: PetStage;
  palette: PetPalette;
  motion: EngineMotion;
  reducedMotion: boolean;
  paused?: boolean;
  manualElapsed?: number;
  showRig?: boolean;
  onFrame?: (snapshot: AnimationSnapshot) => void;
  onPet?: () => void;
  label: string;
}

const PALETTES: Record<PetPalette, Record<PetColor | "sky" | "skyLight" | "ground" | "groundDark", string>> = {
  moss: {
    outline: "#26372d", deep: "#3f5b42", main: "#6f9455", mid: "#8fb568", light: "#c4d98a",
    leaf: "#4f793f", leafLight: "#a8ca65", cream: "#e7e6ba", cheek: "#df8f78", white: "#fffdf4",
    sky: "#cfe1bf", skyLight: "#e8efd8", ground: "#91a866", groundDark: "#667b4c",
  },
  lagoon: {
    outline: "#203b42", deep: "#315f66", main: "#518e84", mid: "#73aaa0", light: "#b8d9c5",
    leaf: "#39736b", leafLight: "#86c5aa", cream: "#e7e3b9", cheek: "#dc8e79", white: "#fffdf4",
    sky: "#c7e2dd", skyLight: "#e3f0e9", ground: "#78a98d", groundDark: "#4f7869",
  },
  ember: {
    outline: "#4a3029", deep: "#704537", main: "#b96d45", mid: "#d48a55", light: "#efbd72",
    leaf: "#79623a", leafLight: "#c6ad5b", cream: "#f1dfb6", cheek: "#d96d62", white: "#fff9ec",
    sky: "#efd2aa", skyLight: "#f8e5c7", ground: "#b98658", groundDark: "#79563d",
  },
  clay: {
    outline: "#3c302e", deep: "#684b42", main: "#976c59", mid: "#b5856d", light: "#d6b08d",
    leaf: "#65714b", leafLight: "#a4aa6a", cream: "#eadfbe", cheek: "#d48677", white: "#fffaf0",
    sky: "#e3d7c5", skyLight: "#f1eadc", ground: "#aa9370", groundDark: "#756448",
  },
  sky: {
    outline: "#243747", deep: "#3e5d74", main: "#638bad", mid: "#80a9c7", light: "#bed8e9",
    leaf: "#4c7469", leafLight: "#91bba0", cream: "#eee1b9", cheek: "#da8b7a", white: "#fffdf5",
    sky: "#cfe3ef", skyLight: "#e8f1f4", ground: "#8aaf93", groundDark: "#607c67",
  },
};

function drawRuns(
  context: CanvasRenderingContext2D,
  runs: PixelRun[],
  palette: (typeof PALETTES)[PetPalette],
  x: number,
  y: number,
) {
  for (const pixel of runs) {
    context.fillStyle = palette[pixel.color];
    context.fillRect(x + pixel.x, y + pixel.y, pixel.width, pixel.height ?? 1);
  }
}

function boundsFor(runs: PixelRun[]) {
  let right = 0;
  let bottom = 0;
  for (const run of runs) {
    right = Math.max(right, run.x + run.width);
    bottom = Math.max(bottom, run.y + (run.height ?? 1));
  }
  return { width: right, height: bottom };
}

function drawHabitat(
  context: CanvasRenderingContext2D,
  palette: (typeof PALETTES)[PetPalette],
  motion: EngineMotion,
  progress: number,
) {
  context.fillStyle = palette.sky;
  context.fillRect(0, 0, ENGINE_SCENE.width, ENGINE_SCENE.height);

  context.fillStyle = palette.skyLight;
  context.fillRect(0, 0, ENGINE_SCENE.width, 20);
  context.fillRect(12, 39, 26, 4);
  context.fillRect(17, 35, 13, 4);
  context.fillRect(121, 63, 25, 4);
  context.fillRect(128, 59, 11, 4);

  context.fillStyle = "#f7dc73";
  context.fillRect(128, 22, 17, 17);
  context.fillRect(132, 18, 9, 25);
  context.fillRect(124, 26, 25, 9);

  context.fillStyle = palette.ground;
  context.fillRect(0, 176, 160, 64);
  context.fillStyle = palette.groundDark;
  context.fillRect(0, 176, 160, 5);
  context.fillRect(0, 194, 28, 4);
  context.fillRect(39, 188, 34, 3);
  context.fillRect(116, 204, 44, 4);

  context.fillStyle = palette.leaf;
  context.fillRect(13, 157, 4, 24);
  context.fillRect(9, 162, 4, 8);
  context.fillRect(17, 153, 5, 9);
  context.fillRect(143, 161, 4, 20);
  context.fillRect(138, 165, 5, 8);
  context.fillRect(147, 157, 5, 9);

  context.fillStyle = palette.deep;
  context.fillRect(123, 170, 19, 7);
  context.fillRect(128, 166, 11, 4);

  if (motion === "care") {
    const berryY = 147 + Math.round(Math.min(progress * 2, 1) * 14);
    context.fillStyle = "#d8615f";
    context.fillRect(76, berryY, 6, 6);
    context.fillRect(82, berryY + 2, 4, 4);
    context.fillStyle = palette.leaf;
    context.fillRect(80, berryY - 3, 3, 4);
  }

  if (["greet", "discover", "evolve"].includes(motion)) {
    const rise = Math.round(progress * 14);
    const effectColor = motion === "evolve" ? "#f7dc73" : palette.cream;
    context.fillStyle = effectColor;
    context.fillRect(112, 102 - rise, 4, 4);
    context.fillRect(119, 91 - rise, 3, 3);
    context.fillRect(105, 87 - rise, 2, 2);
    if (motion === "evolve") {
      context.fillRect(43, 102 - rise, 4, 4);
      context.fillRect(35, 90 - rise, 2, 2);
    }
  }

  if (motion === "sleep") {
    context.fillStyle = palette.outline;
    context.font = "bold 9px monospace";
    context.fillText("z", 116, 118);
    context.font = "bold 6px monospace";
    context.fillText("z", 124, 108);
  }
}

function drawRigLayer(
  context: CanvasRenderingContext2D,
  layer: RigLayer,
  stage: PetStage,
  snapshot: AnimationSnapshot,
  palette: (typeof PALETTES)[PetPalette],
  baseX: number,
  baseY: number,
  showRig: boolean,
  debugIndex: number,
) {
  const pose = snapshot.layers[layer.id];
  const pixels = pixelsForLayer(layer, stage, pose.frame);
  const x = baseX + layer.anchor.x + pose.x;
  const y = baseY + layer.anchor.y + pose.y;
  drawRuns(context, pixels, palette, x, y);

  if (!showRig) return;
  const bounds = boundsFor(pixels);
  const colors = ["#e14f62", "#316ee8", "#be4ee6", "#f08a34", "#2eaa7b", "#c55a92", "#111111", "#7d6c24"];
  context.strokeStyle = colors[debugIndex % colors.length];
  context.lineWidth = 1;
  context.strokeRect(x - 1, y - 1, bounds.width + 2, bounds.height + 2);
  context.fillStyle = colors[debugIndex % colors.length];
  context.fillRect(x - 1, y - 1, 3, 3);
}

function renderScene(
  context: CanvasRenderingContext2D,
  paletteId: PetPalette,
  stage: PetStage,
  snapshot: AnimationSnapshot,
  showRig: boolean,
) {
  const palette = PALETTES[paletteId];
  context.clearRect(0, 0, ENGINE_SCENE.width, ENGINE_SCENE.height);
  drawHabitat(context, palette, snapshot.motion, snapshot.progress);

  const baseX = stage === "evolved" ? 41 : 48;
  const baseY = 127;

  context.fillStyle = "rgba(30, 42, 34, 0.22)";
  context.fillRect(stage === "evolved" ? 48 : 54, 173, stage === "evolved" ? 70 : 58, 5);
  context.fillRect(stage === "evolved" ? 56 : 62, 178, stage === "evolved" ? 54 : 42, 3);

  LEAFLING_RIG.layers.forEach((layer, index) =>
    drawRigLayer(context, layer, stage, snapshot, palette, baseX, baseY, showRig, index),
  );
}

export function PetEngineCanvas({
  stage,
  palette,
  motion,
  reducedMotion,
  paused = false,
  manualElapsed = 0,
  showRig = false,
  onFrame,
  onPet,
  label,
}: PetEngineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(0);
  const lastFrameRef = useRef(-1);

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
    startRef.current = performance.now();
    lastFrameRef.current = -1;

    let animationId = 0;
    const draw = (time: number) => {
      const elapsed = paused ? manualElapsed : time - startRef.current;
      const snapshot = animationFrameAt(motion, elapsed, reducedMotion);
      renderScene(context, palette, stage, snapshot, showRig);
      if (snapshot.frame !== lastFrameRef.current) {
        lastFrameRef.current = snapshot.frame;
        onFrame?.(snapshot);
      }
      if (!paused) animationId = requestAnimationFrame(draw);
    };

    draw(performance.now());
    return () => cancelAnimationFrame(animationId);
  }, [manualElapsed, motion, onFrame, palette, paused, reducedMotion, showRig, stage]);

  return (
    <button type="button" className="engine-canvas-button" onClick={onPet} aria-label={label}>
      <canvas ref={canvasRef} className="engine-canvas" />
    </button>
  );
}
