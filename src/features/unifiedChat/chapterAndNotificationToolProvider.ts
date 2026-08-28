import type { AgentToolCall, AgentToolExecutionResult } from '@kwilt/agent-runtime';
import { previewChapterAlignments } from '../../capabilities/life-structure/actions/chapterAlignmentActions';
import {
  applyChapterDigestSettingsUpdate,
  projectChapterDigestSettings,
  type ChapterDigestSettingsPatch,
} from '../../capabilities/life-structure/actions/chapterDigestSettingsActions';
import {
  buildNotificationPreferenceReview,
  type NotificationPreferencePatch,
} from '../../capabilities/notifications/actions/notificationPreferenceActions';
import { getWeeklyDigestSettings } from '../../services/chapters';
import { useAppStore } from '../../store/useAppStore';
import type { UnifiedChatCapabilitySnapshots } from './capabilityAdapters';
import type { StagedUnifiedChatToolProposal } from './unifiedChatToolProvider';

const failed = (code: string, message: string): AgentToolExecutionResult => ({
  status: 'failed', code, message, retryable: false,
});

export async function executeChapterAndNotificationTool({ call, snapshots, stageProposal }: {
  call: AgentToolCall;
  snapshots: UnifiedChatCapabilitySnapshots;
  stageProposal: (proposal: StagedUnifiedChatToolProposal) => void;
}): Promise<AgentToolExecutionResult | null> {
  if (call.toolId === 'notifications.preferences.read' || call.toolId === 'notifications.preferences.update') {
    const current = useAppStore.getState().notificationPreferences;
    if (call.toolId === 'notifications.preferences.read') {
      return { status: 'completed', receipt: null, output: { preferences: current } };
    }
    const rawFields = call.arguments.fields;
    const fields = rawFields && typeof rawFields === 'object' && !Array.isArray(rawFields)
      ? rawFields as NotificationPreferencePatch : {};
    try {
      const review = buildNotificationPreferenceReview(current, fields);
      if (review.changedFields.length === 0) {
        return { status: 'completed', receipt: null, output: { preferences: current, changed: false } };
      }
      return { status: 'pending_client_action', provider: 'device', request: {
        actionType: 'review_notification_preferences', targetType: 'notification_preferences', targetId: 'self',
        title: 'Review notification changes',
        consequenceSummary: review.requiresNativePermission
          ? 'Reviews these settings and asks iOS for notification permission only after you continue.'
          : 'Reviews these exact notification settings before applying them.',
        payload: { fields, changedFields: review.changedFields, requiresNativePermission: review.requiresNativePermission },
      } };
    } catch (error) {
      return failed('invalid_notification_preferences', error instanceof Error ? error.message : 'Review supported notification settings.');
    }
  }

  if (call.toolId === 'chapters.digest_settings.read' || call.toolId === 'chapters.digest_settings.update') {
    const current = await getWeeklyDigestSettings();
    if (!current) return failed('chapter_digest_settings_unavailable', 'Weekly Chapter settings are unavailable right now.');
    const projection = projectChapterDigestSettings(current);
    if (call.toolId === 'chapters.digest_settings.read') {
      return { status: 'completed', receipt: null, output: { settings: projection } };
    }
    const templateId = typeof call.arguments.templateId === 'string' ? call.arguments.templateId.trim() : '';
    const expectedUpdatedAt = typeof call.arguments.expectedUpdatedAt === 'string' ? call.arguments.expectedUpdatedAt : '';
    const rawFields = call.arguments.fields;
    const fields = rawFields && typeof rawFields === 'object' && !Array.isArray(rawFields)
      ? rawFields as ChapterDigestSettingsPatch : {};
    if (templateId !== projection.templateId) return failed('chapter_digest_settings_stale', 'Those weekly Chapter settings are no longer current.');
    try {
      await applyChapterDigestSettingsUpdate({
        input: { expectedUpdatedAt, fields }, load: async () => current, update: async () => current,
      });
    } catch (error) {
      return failed('invalid_chapter_digest_settings', error instanceof Error ? error.message : 'Review valid weekly Chapter settings.');
    }
    const proposal: StagedUnifiedChatToolProposal = {
      capabilityId: 'chapters', title: 'Update weekly Chapter settings',
      body: 'Reviews the exact generation and email delivery changes before saving them.',
      operation: { type: 'update_chapter_digest_settings', targetId: templateId, expectedUpdatedAt, payload: { fields } },
    };
    stageProposal(proposal);
    return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
  }

  if (call.toolId !== 'chapters.alignment.preview' && call.toolId !== 'chapters.alignment.apply') return null;
  const chapterId = typeof call.arguments.chapterId === 'string' ? call.arguments.chapterId.trim() : '';
  const chapter = snapshots.chapters.chapters.find((candidate) => candidate.id === chapterId);
  if (!chapter) return failed('chapter_not_found', 'The selected Chapter is no longer available.');
  const previews = previewChapterAlignments({
    chapter: { id: chapter.id, updatedAt: chapter.updated_at, output: chapter.output_json },
    goals: snapshots.goals?.goals.map((goal) => ({ id: goal.id, title: goal.title })) ?? [],
    activities: snapshots.todos.activities.map((activity) => ({
      id: activity.id, title: activity.title, goalId: activity.goalId, updatedAt: activity.updatedAt,
    })),
  });
  if (call.toolId === 'chapters.alignment.preview') {
    return { status: 'completed', receipt: null, output: { alignments: previews } };
  }
  const recommendationId = typeof call.arguments.recommendationId === 'string' ? call.arguments.recommendationId.trim() : '';
  const expectedUpdatedAt = typeof call.arguments.expectedUpdatedAt === 'string' ? call.arguments.expectedUpdatedAt : '';
  const requested = Array.isArray(call.arguments.activities) ? call.arguments.activities : [];
  const activities = requested.flatMap((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    return typeof item.activityId === 'string' && typeof item.expectedUpdatedAt === 'string'
      ? [{ activityId: item.activityId, expectedUpdatedAt: item.expectedUpdatedAt }] : [];
  });
  const preview = previews.find((candidate) => candidate.recommendationId === recommendationId);
  const versions = new Map(preview?.activities.map((activity) => [activity.id, activity.expectedUpdatedAt]));
  if (!preview || expectedUpdatedAt !== preview.expectedUpdatedAt || activities.length !== requested.length
      || activities.length === 0 || activities.some((activity) => versions.get(activity.activityId) !== activity.expectedUpdatedAt)) {
    return failed('chapter_alignment_stale', 'That Chapter alignment changed. Review the current To-dos before applying it.');
  }
  const proposal: StagedUnifiedChatToolProposal = {
    capabilityId: 'chapters', title: `Tag ${activities.length} To-do${activities.length === 1 ? '' : 's'} to ${preview.goal.title}`,
    body: `Reviews the exact ${activities.length} To-do${activities.length === 1 ? '' : 's'} before tagging them to this Goal.`,
    operation: { type: 'apply_chapter_alignment', targetId: chapter.id, expectedUpdatedAt, payload: { recommendationId, activities } },
  };
  stageProposal(proposal);
  return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
}
