export type ForceKind = 'canonical' | 'custom';

export type ForceLevel = 0 | 1 | 2 | 3;

export interface Force {
  id: string;
  name: string;
  emoji?: string;
  kind: ForceKind;
  definition?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Arc {
  id: string;
  name: string;
  narrative?: string;
  northStar?: string;
  status: 'active' | 'paused' | 'archived';
  startDate?: string;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalForceIntent {
  [forceId: string]: ForceLevel;
}

export interface Metric {
  id: string;
  label: string;
  baseline?: number | null;
  target?: number | null;
  unit?: string;
}

export interface Goal {
  id: string;
  arcId: string;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'archived';
  startDate?: string;
  targetDate?: string;
  forceIntent: GoalForceIntent;
  metrics: Metric[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalDraft {
  title: string;
  description?: string;
  status: Goal['status'];
  forceIntent: GoalForceIntent;
  suggestedActivities?: string[];
}

export type ActivityStatus = 'planned' | 'in_progress' | 'done' | 'skipped' | 'cancelled';

export interface ActivityForceActual {
  [forceId: string]: ForceLevel;
}

export interface Activity {
  id: string;
  goalId: string | null;
  title: string;
  notes?: string;
  estimateMinutes?: number | null;
  scheduledDate?: string | null;
  orderIndex?: number | null;
  phase?: string | null;
  status: ActivityStatus;
  actualMinutes?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  forceActual: ActivityForceActual;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterArcStats {
  arcId: string;
  totalMinutes?: number;
  activityCount: number;
  notableGoalIds: string[];
}

export interface ChapterGoalHighlight {
  goalId: string;
  statusChange?: string;
  summary?: string;
}

export interface ChapterForceStatsEntry {
  averageLevel: number;
  totalMinutes?: number;
  activityCount: number;
}

export interface ChapterForceStats {
  [forceId: string]: ChapterForceStatsEntry;
}

export interface ChapterHighlightActivity {
  activityId: string;
  note?: string;
}

export interface ChapterInsight {
  id: string;
  text: string;
  category?: string;
}

export interface ChapterSuggestedNextGoal {
  id: string;
  arcId: string;
  proposedTitle: string;
  rationale?: string;
}

export interface Chapter {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  summaryText: string;
  arcStats: ChapterArcStats[];
  goalHighlights: ChapterGoalHighlight[];
  forceStats: ChapterForceStats;
  highlightActivities: ChapterHighlightActivity[];
  insights: ChapterInsight[];
  suggestedNextGoals: ChapterSuggestedNextGoal[];
  createdAt: string;
}


