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
   * Optional, lightweight developmental insights attached to this Arc.
   * These are short bullet-point lists generated during onboarding that
   * help users understand how people typically grow into this kind of Arc.
   *
   * Each array is intentionally compact (2–3 items) and written in a
   * grounded, non-diagnostic tone so they can be rendered as quick-scan
   * bullets in the Arc detail view.
   */
  developmentStrengths?: string[];
  developmentGrowthEdges?: string[];
  developmentPitfalls?: string[];
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
    source: 'ai' | 'upload' | 'curated' | 'unsplash';
    /**
     * Free-form description or prompt used when generating the image.
     */
    prompt?: string;
    createdAt: string;
    /**
     * Identifier for curated images chosen from the built-in Arc hero library.
     */
    curatedId?: string;
    /**
     * When the hero image originates from the searchable image library, capture the photo id and
     * lightweight attribution details so we can render proper credit and
     * reconstruct links.
     */
    unsplashPhotoId?: string;
    unsplashAuthorName?: string;
    unsplashAuthorLink?: string;
    unsplashLink?: string;
  };
  /**
   * When true, hide the visual hero banner for this Arc and render a minimal
   * header treatment instead. The underlying thumbnailUrl / hero metadata are
   * preserved so the hero can be restored later.
   */
  heroHidden?: boolean;
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
  /**
   * Metric shape used for lightweight, structured "definition of done" and progress signals.
   *
   * - count: reach a numeric count (e.g. 6 essays).
   * - threshold: reach a numeric threshold (e.g. run 5K, save $10k).
   * - event_count: like count, but conceptually "checkable events" (e.g. 4 catch-ups).
   * - milestone: a binary done/not-done milestone (e.g. TestFlight build shipped).
   *
   * Optional for backward compatibility; default interpretation is `count`.
   */
  kind?: 'count' | 'threshold' | 'event_count' | 'milestone';
  label: string;
  baseline?: number | null;
  target?: number | null;
  unit?: string;
  /**
   * For milestone-style metrics, marks completion time.
   */
  completedAt?: string | null;
}

export interface Goal {
  id: string;
  /**
   * Optional Arc container for this goal.
   *
   * Goals can be drafted/adopted before the user decides where they belong
   * (or before any Arcs exist). In that case `arcId` is null and the goal is
   * considered "unassigned" until the user links it to an Arc later.
   */
  arcId: string | null;
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
    source: 'ai' | 'upload' | 'curated' | 'unsplash';
    /**
     * Free-form description or prompt used when generating the image.
     */
    prompt?: string;
    createdAt: string;
    curatedId?: string;
    unsplashPhotoId?: string;
    unsplashAuthorName?: string;
    unsplashAuthorLink?: string;
    unsplashLink?: string;
  };
  status: 'planned' | 'in_progress' | 'completed' | 'archived';
  /**
   * Goal quality lifecycle.
   *
   * - draft: missing required structured quality fields (target date + definition-of-done metric).
   * - ready: sufficiently specified to count as an active goal and to drive progress UI.
   *
   * Optional for backward compatibility; omitted implies `ready`.
   */
  qualityState?: 'draft' | 'ready';
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

export type ActivityDifficulty = 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';

/**
 * Activity "kind" used to shape planning + UI behaviors.
 *
 * - Keep this small and deterministic so the UI can offer clear affordances.
 * - We allow an escape hatch via `custom:${string}` so AI / power-users can
 *   introduce additional types without blocking on a schema change.
 */
export type ActivityType =
  | 'task'
  | 'checklist'
  | 'shopping_list'
  | 'instructions'
  | 'plan'
  | `custom:${string}`;

export interface ActivityStep {
  id: string;
  title: string;
  /**
   * When set, this step has been converted into (and now redirects to) a standalone Activity.
   * The step remains in-place for plan continuity, but its completion becomes derived from
   * the linked Activity and the row becomes a tappable redirect.
   */
  linkedActivityId?: string | null;
  /**
   * ISO timestamp for when this step was linked to an Activity.
   */
  linkedAt?: string;
  /**
   * Optional micro-checklist items that are nice to do but not required for
   * completing the activity.
   */
  isOptional?: boolean;
  /**
   * When set, the step has been checked off. Null or undefined means not done.
   */
  completedAt?: string | null;
  /**
   * Optional ordering hint when steps are rendered; the array order remains
   * the canonical sequence.
   */
  orderIndex?: number | null;
}

export interface ActivityAiPlanning {
  /**
   * AI-suggested time estimate for this activity, in minutes.
   * This is advisory only; the user-controlled canonical estimate lives
   * on `Activity.estimateMinutes`.
   */
  estimateMinutes?: number | null;
  /**
   * AI-suggested difficulty bucket for this activity. This is rendered
   * as a simple qualitative label (e.g., \"Easy\", \"Medium\", \"Hard\")
   * and can be copied into the canonical `Activity.difficulty` field.
   */
  difficulty?: ActivityDifficulty;
  /**
   * Optional model-reported confidence from 0–1 for the suggestion.
   * This is primarily useful for tuning UI (e.g., showing a softer
   * copy tone on low-confidence estimates).
   */
  confidence?: number;
  /**
   * ISO timestamp for when this suggestion was last updated.
   */
  lastUpdatedAt?: string;
  /**
   * Lightweight source marker so we can distinguish between quick,
   * inline suggestions and heavier-weight planning flows.
   */
  source?: 'quick_suggest' | 'full_context';
}

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

export type ActivityRepeatRule =
  | 'daily'
  | 'weekly'
  | 'weekdays'
  | 'monthly'
  | 'yearly'
  | 'custom';

/**
 * Custom recurrence config for Activities.
 * Kept intentionally small: start with "custom weekly" (interval + weekday selection).
 * Future extensions (monthly patterns, RRULE-style options) can layer on.
 */
export type ActivityRepeatCustom =
  | {
      cadence: 'days';
      /**
       * Repeat every N days (1 = every day).
       */
      interval: number;
    }
  | {
      cadence: 'weeks';
      /**
       * Repeat every N weeks (1 = weekly).
       */
      interval: number;
      /**
       * Weekdays selection in JS weekday format: 0=Sunday ... 6=Saturday.
       */
      weekdays: number[];
    }
  | {
      cadence: 'months';
      /**
       * Repeat every N months (1 = monthly).
       *
       * Day-of-month is implied by the Activity's `reminderAt` timestamp.
       */
      interval: number;
    }
  | {
      cadence: 'years';
      /**
       * Repeat every N years (1 = yearly).
       *
       * Month/day are implied by the Activity's `reminderAt` timestamp.
       */
      interval: number;
    };

export interface ActivityForceActual {
  [forceId: string]: ForceLevel;
}

export type ActivityAttachmentKind = 'photo' | 'video' | 'audio' | 'document';

export type ActivityAttachmentUploadStatus = 'uploading' | 'uploaded' | 'failed';

export interface ActivityAttachment {
  id: string;
  kind: ActivityAttachmentKind;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  storagePath: string;
  sharedWithGoalMembers: boolean;
  /**
   * Client-only state for optimistic UI while uploads are in-flight.
   * Server rows always represent "uploaded" files.
   */
  uploadStatus: ActivityAttachmentUploadStatus;
  uploadError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  goalId: string | null;
  title: string;
  /**
   * Optional provenance so Activities created from other objects can link back to their origin.
   */
  origin?: {
    kind: 'activity_step';
    parentActivityId: string;
    parentStepId: string;
  };
  /**
   * High-level category of this activity (e.g. task vs shopping list vs recipe).
   * Used by planning views + AI to generate different *kinds* of helpful activity artifacts.
   */
  type: ActivityType;
  /**
   * User-defined tags for lightweight grouping / filtering (e.g. "errands", "outdoors").
   * Stored as simple strings; UI typically edits these as a comma-separated list.
   */
  tags: string[];
  notes?: string;
  /**
   * Small, ordered checklist that keeps a single activity concrete and
   * executable in one sitting.
   */
  steps?: ActivityStep[];
  /**
   * Optional rich media attached to this activity (photos, videos, audio notes).
   * Persisted in Supabase + mirrored locally for offline UX.
   */
  attachments?: ActivityAttachment[];
  /**
   * Optional location metadata for place-based activities.
   * Used for inline map previews and (future) arrive/leave completion offers.
   */
  location?: {
    label?: string;
    latitude: number;
    longitude: number;
    /**
     * Trigger semantics used by location-based completion offers.
     * v1: a single trigger per Activity.
     */
    trigger?: 'arrive' | 'leave';
    /**
     * Radius used for place semantics (geofence / "nearby"). UI can default this.
     */
    radiusM?: number;
  } | null;
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
  /**
   * User-facing difficulty bucket for this activity. This is the
   * canonical field used by the app for filtering/sorting; AI writes
   * only to `aiPlanning` and the user can choose to copy values into
   * this field.
   */
  difficulty?: ActivityDifficulty;
  /**
   * Lightweight provenance marker so we can distinguish AI-created activities
   * from manual ones and measure adoption.
   */
  creationSource?: 'ai' | 'manual';
  /**
   * Optional grouping key for AI-generated mini-plans. All activities that
   * belong to the same plan share this id.
   */
  planGroupId?: string | null;
  scheduledDate?: string | null;
  /**
   * Optional ISO timestamp representing the intended start time of this Activity
   * (used for calendar export + scheduled-time semantics). This is additive and
   * intentionally separate from `scheduledDate` which behaves more like a due
   * date / "anytime today" marker.
   *
   * See: `docs/prds/calendar-export-ics-prd.md`
   */
  scheduledAt?: string | null;
  /**
   * Optional recurrence rule for Activities that repeat on a cadence. This is
   * intentionally lightweight for now; a future implementation can expand this
   * to a richer RRULE-style structure if needed.
   */
  repeatRule?: ActivityRepeatRule;
  /**
   * Optional details for custom repeat rules (for example, weekly with
   * selected days). Only used when repeatRule === 'custom'.
   */
  repeatCustom?: ActivityRepeatCustom;
  orderIndex?: number | null;
  phase?: string | null;
  status: ActivityStatus;
  actualMinutes?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  /**
   * Optional AI planning metadata for this activity. These fields
   * are advisory and never override user-entered values unless the
   * user explicitly applies them.
   */
  aiPlanning?: ActivityAiPlanning;
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
   * System views (like "Default view" or "Starred focus") act as
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

export interface IdentityProfileSlices {
  identity: string;
  why: string;
  daily: string;
}

import type {
  ArchetypeAdmiredQualityId,
  ArchetypeRoleModelTypeId,
  ArchetypeRoleModelWhyId,
  ArchetypeSpecificRoleModelId,
} from './archetypeTaps';

export interface IdentityProfile {
  domainIds: string[];
  motivationIds: string[];
  signatureTraitIds: string[];
  growthEdgeIds: string[];
  proudMomentIds: string[];
  meaningIds: string[];
  impactIds: string[];
  valueIds: string[];
  philosophyIds: string[];
  vocationIds: string[];
  /**
   * Tap-centric archetype signals captured during FTUE / Arc creation.
   * These are optional; the hybrid model should still work if the user skips them.
   */
  roleModelTypeId?: ArchetypeRoleModelTypeId;
  specificRoleModelId?: ArchetypeSpecificRoleModelId | 'none' | 'not_sure';
  roleModelWhyId?: ArchetypeRoleModelWhyId;
  admiredQualityIds?: ArchetypeAdmiredQualityId[];
  nickname?: string;
  aspirationArcName?: string;
  aspirationNarrative?: string;
  aspirationSlices?: IdentityProfileSlices;
  lastUpdatedAt: string;
}

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
  /**
   * Structured snapshot of the user's identity aspiration collected during the
   * first-time onboarding Identity flow. This captures which part of
   * themselves they most want to grow, the motivational style, proud moments,
   * and the synthesized Arc narrative so later flows (like Arc creation) can
   * quietly reuse that context without re-asking the 10-question sequence.
   */
  identityProfile?: IdentityProfile;
  focusAreas?: FocusAreaId[];
  notifications?: {
    remindersEnabled?: boolean;
  };
  timezone?: string;
  preferences?: {
  };
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

