import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useCoachmarkHost } from '../../../ui/hooks/useCoachmarkHost';
import type { View, TextInput } from 'react-native';

export type UseActivitiesGuideOptions = {
  isFocused: boolean;
  activityCoachVisible: boolean;
  viewEditorVisible: boolean;
  hasActivities: boolean;
  /** Ref to the quick-add input (for empty state guide) */
  quickAddInputRef: React.RefObject<TextInput | null>;
  /** Ref to the Views button */
  viewsButtonRef: React.RefObject<View | null>;
  /** Ref to the Filter button */
  filterButtonRef: React.RefObject<View | null>;
  /** Ref to the Sort button */
  sortButtonRef: React.RefObject<View | null>;
};

export type GuideCopy = {
  title: string;
  body: string;
};

export type UseActivitiesGuideReturn = {
  guideVariant: 'full' | 'empty';
  guideTotalSteps: number;
  activitiesGuideStep: number;
  setActivitiesGuideStep: React.Dispatch<React.SetStateAction<number>>;
  shouldShowActivitiesListGuide: boolean;
  dismissActivitiesListGuide: () => void;
  activitiesGuideHost: ReturnType<typeof useCoachmarkHost>;
  guideTargetRef: React.RefObject<any>;
  guideCopy: GuideCopy;
};

export function useActivitiesGuide({
  isFocused,
  activityCoachVisible,
  viewEditorVisible,
  hasActivities,
  quickAddInputRef,
  viewsButtonRef,
  filterButtonRef,
  sortButtonRef,
}: UseActivitiesGuideOptions): UseActivitiesGuideReturn {
  const hasDismissedActivitiesListGuide = useAppStore(
    (state) => state.hasDismissedActivitiesListGuide,
  );
  const setHasDismissedActivitiesListGuide = useAppStore(
    (state) => state.setHasDismissedActivitiesListGuide,
  );
  const [activitiesGuideStep, setActivitiesGuideStep] = React.useState(0);

  const guideVariant = hasActivities ? 'full' : 'empty';
  const guideTotalSteps = guideVariant === 'full' ? 3 : 1;
  const shouldShowActivitiesListGuide =
    isFocused && !hasDismissedActivitiesListGuide && !activityCoachVisible && !viewEditorVisible;

  const dismissActivitiesListGuide = React.useCallback(() => {
    setHasDismissedActivitiesListGuide(true);
    setActivitiesGuideStep(0);
  }, [setHasDismissedActivitiesListGuide]);

  const activitiesGuideHost = useCoachmarkHost({
    active: shouldShowActivitiesListGuide,
    stepKey: activitiesGuideStep,
  });

  const guideTargetRef =
    guideVariant === 'empty'
      ? quickAddInputRef
      : activitiesGuideStep === 0
      ? viewsButtonRef
      : activitiesGuideStep === 1
      ? filterButtonRef
      : sortButtonRef;

  const guideCopy = React.useMemo<GuideCopy>(() => {
    if (guideVariant === 'empty') {
      return {
        title: 'Start here',
        body: 'Use the field at the bottom to add your first to-do. Then use Plan to schedule it for Today. Views, Filters, and Sort help when the list grows.',
      };
    }
    if (activitiesGuideStep === 0) {
      return {
        title: 'Views = saved setups',
        body: 'Views save your Filter + Sort (and whether completed items show). Create a few like "This week" or "Starred only."',
      };
    }
    if (activitiesGuideStep === 1) {
      return {
        title: 'Filter the list',
        body: 'Switch between All, Active, Completed, or Starred. Swipe right on a to-do to star it.',
      };
    }
    return {
      title: 'Sort changes the order',
      body: 'Try Priority when the list grows. Manual keeps your custom ordering.',
    };
  }, [activitiesGuideStep, guideVariant]);

  return {
    guideVariant,
    guideTotalSteps,
    activitiesGuideStep,
    setActivitiesGuideStep,
    shouldShowActivitiesListGuide,
    dismissActivitiesListGuide,
    activitiesGuideHost,
    guideTargetRef,
    guideCopy,
  };
}
