export type GuidedOvertureReleaseStage = 'local-lab' | 'internal-first-run';

export type GuidedOvertureStartingPoint =
  | 'developer-tools'
  | 'unscoped-download'
  | 'exact-task'
  | 'invitation'
  | 'resume'
  | 'returning-user';

export type GuidedOvertureEntry =
  | 'guided-overture'
  | 'current-ftux'
  | 'exact-destination'
  | 'app-shell';

export function resolveGuidedOvertureEntry({
  releaseStage,
  startingPoint,
  assignedToOverture,
}: {
  releaseStage: GuidedOvertureReleaseStage;
  startingPoint: GuidedOvertureStartingPoint;
  assignedToOverture: boolean;
}): GuidedOvertureEntry {
  if (startingPoint === 'exact-task' || startingPoint === 'invitation' || startingPoint === 'resume') {
    return 'exact-destination';
  }
  if (startingPoint === 'returning-user') return 'app-shell';
  if (releaseStage === 'local-lab') {
    return startingPoint === 'developer-tools' ? 'guided-overture' : 'current-ftux';
  }
  if (startingPoint === 'unscoped-download' && assignedToOverture) return 'guided-overture';
  return 'current-ftux';
}
