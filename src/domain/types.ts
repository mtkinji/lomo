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
  /**
   * Optional thumbnail image for visually distinguishing this Arc in lists.
   * Can be a remote URL or a local asset URI.
   */
  thumbnailUrl?: string;
  /**
   * Optional counter used to rotate deterministic, system-generated thumbnails.
   * Incrementing this value changes the seed passed to the appearance helpers.
   */
  thumbnailVariant?: number;
  /**
   * Optional metadata about the Arc hero / thumbnail image.
   * The thumbnailUrl is still the canonical image URL used both for
   * the hero on the detail page and the thumbnail in lists.
   */
  heroImageMeta?: {
    source: 'ai' | 'upload';
    /**
     * Free-form description or prompt used when generating the image.
     */
    prompt?: string;
    createdAt: string;
  };
  status: 'active' | 'paused' | 'archived';
  startDate?: string;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ArcProposalFeedbackReason =
  | 'too_generic'
  | 'project_not_identity'
  | 'wrong_domain'
  | 'tone_off'
  | 'does_not_feel_like_me';

export interface ArcProposalFeedback {
  id: string;
  arcName: string;
  arcNarrative?: string;
  /**
   * Whether the user felt this Arc was a good fit.
   */
  decision: 'up' | 'down';
  /**
   * Structured reasons collected from quick-select chips so we can
   * aggregate and feed them back into the Arc Creation Agent prompt.
   */
  reasons: ArcProposalFeedbackReason[];
  /**
   * Optional free-form explanation from the user describing what
   * felt off or especially right about this Arc.
   */
  note?: string;
  createdAt: string;
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
  /**
   * Optional thumbnail image for visually distinguishing this Goal in lists.
   * Can be a remote URL or a local asset URI.
   */
  thumbnailUrl?: string;
  /**
   * Optional counter used to rotate deterministic, system-generated thumbnails.
   * Incrementing this value changes the seed passed to the appearance helpers.
   */
  thumbnailVariant?: number;
  /**
   * Optional metadata about the Goal hero / thumbnail image.
   * The thumbnailUrl is still the canonical image URL used both for
   * the hero on the detail page and the thumbnail in lists.
   */
  heroImageMeta?: {
    source: 'ai' | 'upload';
    /**
     * Free-form description or prompt used when generating the image.
     */
    prompt?: string;
    createdAt: string;
  };
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

// Shared activity list view types so sort / filter modes can be reused across
// screens and persisted in the app store.
export type ActivityFilterMode = 'all' | 'priority1' | 'active' | 'completed';

export type ActivitySortMode =
  | 'manual'
  | 'titleAsc'
  | 'titleDesc'
  | 'dueDateAsc'
  | 'dueDateDesc'
  | 'priority';

export interface ActivityForceActual {
  [forceId: string]: ForceLevel;
}

export interface Activity {
  id: string;
  goalId: string | null;
  title: string;
  notes?: string;
  /**
   * Optional timestamp for a reminder notification associated with this
   * activity (for example, "remind me tomorrow morning"). This is stored as an
   * ISO string in the user's local timezone and can be interpreted by
   * scheduling logic in a future notifications layer.
   */
  reminderAt?: string | null;
  /**
   * Optional priority bucket for Activities. When set, 1 represents the
   * highest priority (e.g., "Priority 1"), with larger numbers indicating
   * lower urgency. Unset/null means the activity is not explicitly ranked.
   */
  priority?: 1 | 2 | 3;
  estimateMinutes?: number | null;
  scheduledDate?: string | null;
  /**
   * Optional recurrence rule for Activities that repeat on a cadence. This is
   * intentionally lightweight for now; a future implementation can expand this
   * to a richer RRULE-style structure if needed.
   */
  repeatRule?:
    | 'daily'
    | 'weekly'
    | 'weekdays'
    | 'monthly'
    | 'yearly'
    | 'custom';
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

export type ActivityViewId = string;

export interface ActivityView {
  id: ActivityViewId;
  name: string;
  filterMode: ActivityFilterMode;
  sortMode: ActivitySortMode;
  /**
   * Whether this view includes the "Completed" section in the Activities list.
   * When false, completed activities are still stored but hidden in the UI.
   * Defaults to true when omitted.
   */
  showCompleted?: boolean;
  /**
   * System views (like "Default view" or "Priority 1 focus") act as
   * guardrails and can't be deleted. They can still be edited and those
   * changes are persisted just like custom views.
   */
  isSystem?: boolean;
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

export type AgeRange =
  | 'under-18'
  | '18-24'
  | '25-34'
  | '35-44'
  | '45-54'
  | '55-64'
  | '65-plus'
  | 'prefer-not-to-say';

export type FocusAreaId =
  | 'health_energy'
  | 'work_career'
  | 'learning_skills'
  | 'relationships_family'
  | 'creativity_hobbies'
  | 'organizing_life';

export type CommunicationTone = 'gentle' | 'direct' | 'playful' | 'neutral';

export type DetailLevel = 'short' | 'medium' | 'deep';

export type SpiritualLanguagePreference = 'explicit' | 'subtle' | 'secular' | 'no-preference';

export type VisualStyle = 'minimal' | 'vibrant' | 'photographic' | 'illustrated';

export type ThumbnailPalette = 'warm' | 'cool' | 'neutral' | 'high-contrast';

export type ThumbnailStyle =
  | 'topographyDots'
  | 'geoMosaic'
  | 'contourRings'
  | 'pixelBlocks'
  | 'plainGradient';

export interface UserProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  /**
   * Optional birthdate for the user in ISO YYYY-MM-DD format. This is the
   * canonical source of truth for age; other fields like ageRange can be
   * derived from it.
   */
  birthdate?: string;
  ageRange?: AgeRange;
  /**
   * Optional free-form description of how the user sees themselves in this
   * season (roles, responsibilities, what matters most). Edited directly by
   * the user in the Profile screen.
   */
  identitySummary?: string;
  /**
   * Optional longer-form context the user wants the kwilt Agent to know about
   * them (pasted background, life story, etc). This can be several paragraphs
   * and is not passed to the model directly; instead it is summarized into
   * `coachContextSummary` for use in prompts.
   */
  coachContextRaw?: string;
  /**
   * Short, model-ready summary of the user’s identity and background compiled
   * from `identitySummary`, `coachContextRaw`, and other profile fields. This
   * is the primary blob we include in prompts alongside structured fields.
   */
  coachContextSummary?: string;
  focusAreas?: FocusAreaId[];
  notifications?: {
    remindersEnabled?: boolean;
  };
  timezone?: string;
  communication: {
    tone?: CommunicationTone;
    detailLevel?: DetailLevel;
    askBeforePushing?: boolean;
    emojiAllowed?: boolean;
    spiritualLanguage?: SpiritualLanguagePreference;
  };
  visuals: {
    style?: VisualStyle;
    palette?: ThumbnailPalette;
    prefersPhotography?: boolean;
    prefersIcons?: boolean;
    /**
     * Preferred Arc thumbnail treatment. When unset, the app falls back
     * to the current default style.
     */
    thumbnailStyle?: ThumbnailStyle;
    /**
     * Optional multi-select preference for Arc thumbnail styles. When present,
     * the renderer will pick a style per Arc from this list (typically using
     * a stable hash of the Arc id / name).
     */
    thumbnailStyles?: ThumbnailStyle[];
  };
  accessibility?: {
    prefersLargeText?: boolean;
    highContrastMode?: boolean;
    reduceMotion?: boolean;
  };
  consent?: {
    personalizedSuggestionsEnabled?: boolean;
    useHistoryForCoaching?: boolean;
  };
}

