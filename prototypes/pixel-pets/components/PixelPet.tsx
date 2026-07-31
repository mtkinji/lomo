import { PET_SPRITES, SPRITE_SIZE } from "@/lib/pet-sprites";
import type { PetKind, PetReaction, PetStage } from "@/lib/pet-state";

interface PixelPetProps {
  kind: PetKind;
  stage: PetStage;
  reaction?: PetReaction;
  compact?: boolean;
  reducedMotion?: boolean;
  onInteract?: () => void;
  label: string;
}

export function PixelPet({
  kind,
  stage,
  reaction = "idle",
  compact = false,
  reducedMotion = false,
  onInteract,
  label,
}: PixelPetProps) {
  const rows = PET_SPRITES[kind][stage];
  const content = (
    <span
      className={`pixel-pet pet-${kind} stage-${stage} reaction-${reaction} ${compact ? "pet-compact" : ""} ${reducedMotion ? "motion-reduced" : ""}`}
      aria-hidden="true"
    >
      <span className="sprite-shadow" />
      <span
        className="sprite-grid"
        style={{ "--sprite-size": SPRITE_SIZE } as React.CSSProperties}
      >
        {rows.flatMap((row, rowIndex) =>
          [...row].map((color, columnIndex) => (
            <span
              key={`${rowIndex}-${columnIndex}`}
              className={color === "." ? "sprite-pixel transparent" : `sprite-pixel color-${color}`}
            />
          )),
        )}
      </span>
      <span className="sprite-spark sprite-spark-one">✦</span>
      <span className="sprite-spark sprite-spark-two">·</span>
    </span>
  );

  if (!onInteract) return content;

  return (
    <button className="pet-touch-target" type="button" onClick={onInteract} aria-label={label}>
      {content}
    </button>
  );
}
