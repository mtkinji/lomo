"use client";

import { useEffect, useRef } from "react";

import {
  ENGINE_SCENE,
  clipForMotion,
  type EngineMotion,
} from "@/lib/pet-engine";
import { LEAFLING_MANIFEST, LEAFLING_PRESENTATION } from "@/lib/leafling";
import { resolvePetFrame, type PetFrameSnapshot } from "@/lib/pet-runtime";
import type { PetPalette, PetStage } from "@/lib/pet-state";

interface PetEngineCanvasProps {
  stage: PetStage;
  palette: PetPalette;
  motion: EngineMotion;
  reducedMotion: boolean;
  paused?: boolean;
  manualElapsed?: number;
  showRig?: boolean;
  onFrame?: (snapshot: PetFrameSnapshot) => void;
  onPet?: () => void;
  label: string;
}

type HabitatPalette = {
  outline: string;
  deep: string;
  leaf: string;
  cream: string;
  sky: string;
  skyLight: string;
  ground: string;
  groundDark: string;
};

const PALETTES: Record<PetPalette, HabitatPalette> = {
  moss: { outline: "#26372d", deep: "#3f5b42", leaf: "#4f793f", cream: "#e7e6ba", sky: "#cfe1bf", skyLight: "#e8efd8", ground: "#91a866", groundDark: "#667b4c" },
  lagoon: { outline: "#203b42", deep: "#315f66", leaf: "#39736b", cream: "#e7e3b9", sky: "#c7e2dd", skyLight: "#e3f0e9", ground: "#78a98d", groundDark: "#4f7869" },
  ember: { outline: "#4a3029", deep: "#704537", leaf: "#79623a", cream: "#f1dfb6", sky: "#efd2aa", skyLight: "#f8e5c7", ground: "#b98658", groundDark: "#79563d" },
  clay: { outline: "#3c302e", deep: "#684b42", leaf: "#65714b", cream: "#eadfbe", sky: "#e3d7c5", skyLight: "#f1eadc", ground: "#aa9370", groundDark: "#756448" },
  sky: { outline: "#243747", deep: "#3e5d74", leaf: "#4c7469", cream: "#eee1b9", sky: "#cfe3ef", skyLight: "#e8f1f4", ground: "#8aaf93", groundDark: "#607c67" },
};

function drawHabitat(
  context: CanvasRenderingContext2D,
  palette: HabitatPalette,
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

}

function renderScene(
  context: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  paletteId: PetPalette,
  stage: PetStage,
  motion: EngineMotion,
  snapshot: PetFrameSnapshot,
  showRig: boolean,
) {
  const palette = PALETTES[paletteId];
  context.clearRect(0, 0, ENGINE_SCENE.width, ENGINE_SCENE.height);
  drawHabitat(context, palette, motion, snapshot.progress);

  const size = LEAFLING_PRESENTATION.stages[stage];
  const scaleX = size.width / LEAFLING_MANIFEST.atlas.frameWidth;
  const scaleY = size.height / LEAFLING_MANIFEST.atlas.frameHeight;
  const worldAnchorX = ENGINE_SCENE.width / 2;
  const destinationX = Math.round(worldAnchorX - snapshot.anchor.x * scaleX + snapshot.transform.x);
  const destinationY = Math.round(ENGINE_SCENE.groundY - snapshot.anchor.y * scaleY + snapshot.transform.y);
  const sourceX = snapshot.cell.column * LEAFLING_MANIFEST.atlas.frameWidth;
  const sourceY = snapshot.cell.row * LEAFLING_MANIFEST.atlas.frameHeight;

  const shadowWidth = Math.round(snapshot.shadow.width * scaleX);
  context.save();
  context.globalAlpha = snapshot.shadow.opacity;
  context.fillStyle = palette.outline;
  context.fillRect(Math.round(worldAnchorX - shadowWidth / 2), ENGINE_SCENE.groundY - 2, shadowWidth, 4);
  context.fillRect(Math.round(worldAnchorX - shadowWidth * 0.34), ENGINE_SCENE.groundY + 2, Math.round(shadowWidth * 0.68), 2);
  context.restore();

  context.imageSmoothingEnabled = false;
  context.drawImage(
    sprite,
    sourceX,
    sourceY,
    LEAFLING_MANIFEST.atlas.frameWidth,
    LEAFLING_MANIFEST.atlas.frameHeight,
    destinationX,
    destinationY,
    size.width,
    size.height,
  );

  if (!showRig) return;
  const colors = ["#e14f62", "#316ee8", "#be4ee6", "#f08a34", "#2eaa7b", "#c55a92", "#111111", "#7d6c24"];
  LEAFLING_PRESENTATION.channels.forEach((channel, index) => {
    const bounds = channel.bounds;
    const color = colors[index % colors.length];
    context.strokeStyle = color;
    context.lineWidth = 1;
    context.strokeRect(
      Math.round(destinationX + bounds.x * scaleX),
      Math.round(destinationY + bounds.y * scaleY),
      Math.round(bounds.width * scaleX),
      Math.round(bounds.height * scaleY),
    );
    context.fillStyle = color;
    context.fillRect(
      Math.round(destinationX + bounds.x * scaleX),
      Math.round(destinationY + bounds.y * scaleY),
      3,
      3,
    );
  });
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
    let disposed = false;
    const sprite = new Image();

    const draw = (time: number) => {
      if (disposed) return;
      const elapsed = paused ? manualElapsed : time - startRef.current;
      const snapshot = resolvePetFrame(LEAFLING_MANIFEST, clipForMotion(motion), elapsed, reducedMotion);
      renderScene(context, sprite, palette, stage, motion, snapshot, showRig);
      if (snapshot.frameIndex !== lastFrameRef.current) {
        lastFrameRef.current = snapshot.frameIndex;
        onFrame?.(snapshot);
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
  }, [manualElapsed, motion, onFrame, palette, paused, reducedMotion, showRig, stage]);

  return (
    <button type="button" className="engine-canvas-button" onClick={onPet} aria-label={label}>
      <canvas ref={canvasRef} className="engine-canvas" />
    </button>
  );
}
