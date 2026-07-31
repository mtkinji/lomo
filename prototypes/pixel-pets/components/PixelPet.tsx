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
  const content = (
    <span
      className={`pixel-pet pet-${kind} stage-${stage} reaction-${reaction} ${compact ? "pet-compact" : ""} ${reducedMotion ? "motion-reduced" : ""}`}
      aria-hidden="true"
    >
      <span className="pet-shadow" />
      <span className="pet-tail" />
      <span className="pet-wing pet-wing-left" />
      <span className="pet-wing pet-wing-right" />
      <span className="pet-shell" />
      <span className="pet-body" />
      <span className="pet-head">
        <span className="pet-ear pet-ear-left" />
        <span className="pet-ear pet-ear-right" />
        <span className="pet-antenna pet-antenna-left" />
        <span className="pet-antenna pet-antenna-right" />
        <span className="pet-eye pet-eye-left" />
        <span className="pet-eye pet-eye-right" />
        <span className="pet-beak" />
        <span className="pet-cheek pet-cheek-left" />
        <span className="pet-cheek pet-cheek-right" />
      </span>
      <span className="pet-foot pet-foot-left" />
      <span className="pet-foot pet-foot-right" />
      <span className="pet-spark pet-spark-one">✦</span>
      <span className="pet-spark pet-spark-two">·</span>
    </span>
  );

  if (!onInteract) return content;

  return (
    <button className="pet-touch-target" type="button" onClick={onInteract} aria-label={label}>
      {content}
    </button>
  );
}
