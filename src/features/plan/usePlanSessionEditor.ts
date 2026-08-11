import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';
import type { Activity } from '../../domain/types';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import { moveManagedEvent } from '../../services/calendar/managedEvents';
import { moveActivityScheduleSession } from '../../services/plan/activityScheduleSessions';
import { startCalendarConnect } from '../../services/plan/calendarApi';
import type { KwiltCalendarBlock } from '../../services/plan/kwiltCalendarBlocks';
import type { PlanMode } from '../../services/plan/planAvailability';
import type { BusyInterval } from '../../services/scheduling/schedulingEngine';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import type { PlanSlotDraft } from './planSlotDraft';
import {
  createPlanSessionEdit,
  getPlanSessionEditConflict,
  isPlanSessionEditDirty,
  updatePlanSessionEditDraft,
  type PlanSessionEdit,
} from './planSessionEdit';

type SessionIdentity = { activityId: string; sessionId: string };
type SessionEditStart = SessionIdentity & { start: Date; end: Date };

export function usePlanSessionEditor({
  blocks,
  busyIntervals,
  getPlanMode,
  isWithinWindows,
  onBegin,
  onCalendarAccessStatusChange,
}: {
  blocks: KwiltCalendarBlock[];
  busyIntervals: BusyInterval[];
  getPlanMode: (activity: Activity) => PlanMode;
  isWithinWindows: (mode: PlanMode, start: Date, end: Date) => boolean;
  onBegin: () => void;
  onCalendarAccessStatusChange: (status: 'refreshing' | 'expired') => void;
}) {
  const updateActivity = useAppStore((state) => state.updateActivity);
  const showToast = useToastStore((state) => state.showToast);
  const [edit, setEdit] = useState<PlanSessionEdit | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const reset = useCallback(() => {
    setEdit(null);
    setIsSaving(false);
    setIsAdjusting(false);
  }, []);

  const begin = useCallback((input: SessionEditStart) => {
    onBegin();
    setEdit(createPlanSessionEdit(input));
  }, [onBegin]);

  const changeDraft = useCallback((draft: PlanSlotDraft) => {
    setEdit((current) => current ? updatePlanSessionEditDraft(current, draft) : current);
  }, []);

  const changeBlockDraft = useCallback((input: SessionIdentity & { draft: PlanSlotDraft }) => {
    setEdit((current) => {
      if (current?.activityId === input.activityId && current.sessionId === input.sessionId) {
        return updatePlanSessionEditDraft(current, input.draft);
      }
      const block = blocks.find((candidate) =>
        candidate.activity.id === input.activityId && candidate.sessionId === input.sessionId,
      );
      if (!block) return current;
      return updatePlanSessionEditDraft(createPlanSessionEdit({
        ...input,
        start: block.start,
        end: block.end,
      }), input.draft);
    });
  }, [blocks]);

  const cancel = useCallback(() => {
    if (!isSaving) reset();
  }, [isSaving, reset]);

  const updateScheduledCommitment = useCallback(async (
    activityId: string,
    sessionId: string,
    start: Date,
    end: Date,
  ): Promise<boolean> => {
    const block = blocks.find((candidate) =>
      candidate.activity.id === activityId && candidate.sessionId === sessionId,
    );
    if (!block) return false;
    if (!isWithinWindows(getPlanMode(block.activity), start, end)) {
      Alert.alert('Outside availability', 'Pick a time within your availability windows.');
      return false;
    }
    const candidateEdit = updatePlanSessionEditDraft(createPlanSessionEdit({
      activityId,
      sessionId,
      start: block.start,
      end: block.end,
    }), { start, end });
    if (getPlanSessionEditConflict({ edit: candidateEdit, busyIntervals })) {
      Alert.alert('Time conflict', 'That time conflicts with your calendar.');
      return false;
    }
    if (!block.binding) {
      Alert.alert('Unable to move', 'This block is not linked to a calendar event Kwilt can manage.');
      return false;
    }
    const binding = block.binding;
    try {
      await ensureSignedInWithPrompt('plan');
      await moveManagedEvent({ binding, start, end });
      const timestamp = new Date().toISOString();
      updateActivity(activityId, (activity) => ({
        ...moveActivityScheduleSession(activity, sessionId, {
          start: start.toISOString(),
          end: end.toISOString(),
          updatedAt: timestamp,
        }, new Date(timestamp)),
        updatedAt: timestamp,
      }));
      return true;
    } catch {
      const provider = binding.kind === 'device' ? null : binding.provider;
      Alert.alert(
        'Unable to move',
        binding.kind === 'device'
          ? 'Kwilt needs Calendar permission to update this event.'
          : 'Kwilt needs refreshed calendar access to update this event.',
        [
          { text: 'OK' },
          ...(binding.kind === 'device'
            ? [{
                text: 'Open Settings',
                onPress: () => {
                  try { Linking.openSettings(); } catch { /* no-op */ }
                },
              }]
            : provider
              ? [{
                  text: 'Reconnect',
                  onPress: async () => {
                    try {
                      onCalendarAccessStatusChange('refreshing');
                      await ensureSignedInWithPrompt('plan');
                      const { authUrl } = await startCalendarConnect(provider);
                      await Linking.openURL(authUrl);
                    } catch {
                      onCalendarAccessStatusChange('expired');
                    }
                  },
                }]
              : []),
        ],
      );
      return false;
    }
  }, [blocks, busyIntervals, getPlanMode, isWithinWindows, onCalendarAccessStatusChange, updateActivity]);

  const commitDraft = useCallback(async (draft: PlanSlotDraft): Promise<boolean> => {
    if (!edit || isSaving) return false;
    const candidate = updatePlanSessionEditDraft(edit, draft);
    setEdit(candidate);
    if (!isPlanSessionEditDirty(candidate)) return true;
    setIsSaving(true);
    const didUpdate = await updateScheduledCommitment(
      candidate.activityId,
      candidate.sessionId,
      candidate.draft.start,
      candidate.draft.end,
    );
    setIsSaving(false);
    if (!didUpdate) {
      setEdit(edit);
      return false;
    }

    const saved = createPlanSessionEdit({
      activityId: candidate.activityId,
      sessionId: candidate.sessionId,
      start: candidate.draft.start,
      end: candidate.draft.end,
    });
    setEdit(saved);
    const previous = edit.original;
    showToast({
      message: 'Plan updated.',
      variant: 'light',
      durationMs: 5000,
      actionLabel: 'Undo',
      actionOnPress: async () => {
        const didUndo = await updateScheduledCommitment(
          candidate.activityId,
          candidate.sessionId,
          previous.start,
          previous.end,
        );
        if (!didUndo) return;
        setEdit((current) => {
          if (
            current?.activityId !== candidate.activityId
            || current.sessionId !== candidate.sessionId
          ) return current;
          return createPlanSessionEdit({
            activityId: candidate.activityId,
            sessionId: candidate.sessionId,
            start: previous.start,
            end: previous.end,
          });
        });
        showToast({ message: 'Plan change undone.', variant: 'light' });
      },
    });
    return true;
  }, [edit, isSaving, showToast, updateScheduledCommitment]);

  const model = useMemo(() => {
    if (!edit) return null;
    const block = blocks.find((candidate) =>
      candidate.activity.id === edit.activityId && candidate.sessionId === edit.sessionId,
    );
    if (!block) return null;
    return {
      title: block.activity.title,
      start: edit.draft.start,
      end: edit.draft.end,
      isSaving,
    };
  }, [blocks, edit, isSaving]);

  return {
    edit,
    model,
    isAdjusting,
    setIsAdjusting,
    begin,
    cancel,
    reset,
    changeDraft,
    changeBlockDraft,
    commitDraft,
    updateScheduledCommitment,
  };
}
