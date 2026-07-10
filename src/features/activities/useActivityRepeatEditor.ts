import { useCallback, useEffect, useRef, useState } from 'react';
import type { Activity, ActivityRepeatCustom } from '../../domain/types';
import type { useAppStore } from '../../store/useAppStore';
import {
  buildActivityCustomRepeatPayload,
  resolveActivityCustomRepeatDraft,
} from './activityCustomRepeat';
import { formatActivityRepeatLabel } from './activityRepeatLabels';

type UpdateActivity = ReturnType<typeof useAppStore.getState>['updateActivity'];

type ActivityRepeatEditorProps = {
  activity: Activity | undefined;
  updateActivity: UpdateActivity;
  onClose: () => void;
  onOpenCustom: () => void;
  onReturnToPresets: () => void;
};

export type ActivityRepeatEditorController = {
  repeatLabel: string;
  cadence: ActivityRepeatCustom['cadence'];
  interval: number;
  weekdays: number[];
  hydrateCustom: () => void;
  openCustom: () => void;
  returnToPresets: () => void;
  selectPreset: (rule: NonNullable<Activity['repeatRule']>) => void;
  clear: () => void;
  setCadence: (cadence: ActivityRepeatCustom['cadence']) => void;
  setInterval: (interval: number) => void;
  toggleWeekday: (weekday: number) => void;
  commitCustom: () => void;
  close: () => void;
};

const TRANSITION_MS = 260;

export function useActivityRepeatEditor({
  activity,
  updateActivity,
  onClose,
  onOpenCustom,
  onReturnToPresets,
}: ActivityRepeatEditorProps): ActivityRepeatEditorController {
  const fallbackWeekday = new Date().getDay();
  const initial = resolveActivityCustomRepeatDraft({
    repeatRule: activity?.repeatRule,
    repeatCustom: activity?.repeatCustom,
    fallbackWeekday,
  });
  const [cadence, setCadence] = useState(initial.cadence);
  const [interval, setInterval] = useState(initial.interval);
  const [weekdays, setWeekdays] = useState(initial.weekdays);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTransition = useCallback(() => {
    if (!transitionRef.current) return;
    clearTimeout(transitionRef.current);
    transitionRef.current = null;
  }, []);

  useEffect(() => clearTransition, [clearTransition]);

  const hydrateCustom = useCallback(() => {
    const draft = resolveActivityCustomRepeatDraft({
      repeatRule: activity?.repeatRule,
      repeatCustom: activity?.repeatCustom,
      fallbackWeekday: new Date().getDay(),
    });
    setCadence(draft.cadence);
    setInterval(draft.interval);
    setWeekdays(draft.weekdays);
  }, [activity?.repeatCustom, activity?.repeatRule]);

  const transition = useCallback((next: () => void) => {
    onClose();
    clearTransition();
    transitionRef.current = setTimeout(next, TRANSITION_MS);
  }, [clearTransition, onClose]);

  const updateRepeat = useCallback((
    repeatRule: Activity['repeatRule'],
    repeatCustom?: ActivityRepeatCustom,
  ) => {
    if (!activity) return;
    const updatedAt = new Date().toISOString();
    updateActivity(activity.id, (previous) => ({
      ...previous,
      repeatRule,
      repeatCustom,
      updatedAt,
    }));
    onClose();
  }, [activity, onClose, updateActivity]);

  return {
    repeatLabel: formatActivityRepeatLabel({
      repeatRule: activity?.repeatRule,
      repeatCustom: activity?.repeatCustom,
    }),
    cadence,
    interval,
    weekdays,
    hydrateCustom,
    openCustom: () => {
      hydrateCustom();
      transition(onOpenCustom);
    },
    returnToPresets: () => transition(onReturnToPresets),
    selectPreset: (rule) => updateRepeat(rule, rule === 'custom' ? activity?.repeatCustom : undefined),
    clear: () => updateRepeat(undefined, undefined),
    setCadence,
    setInterval,
    toggleWeekday: (weekday) => {
      setWeekdays((current) => {
        if (!current.includes(weekday)) return [...current, weekday];
        const next = current.filter((value) => value !== weekday);
        return next.length > 0 ? next : current;
      });
    },
    commitCustom: () => {
      const payload = buildActivityCustomRepeatPayload({
        cadence,
        interval,
        weekdays,
        fallbackWeekday: new Date().getDay(),
      });
      updateRepeat('custom', payload);
    },
    close: onClose,
  };
}
