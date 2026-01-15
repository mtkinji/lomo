import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useEntitlementsStore } from '../../../store/useEntitlementsStore';
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
  const isPro = useEntitlementsStore((state) => state.isPro);

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
        body: 'Use the Quick Add bar at the bottom to add your first Activity. Once you have a few, Pro Tools lets you use Views, Filters, and Sort to stay focused.',
      };
    }
    if (activitiesGuideStep === 0) {
      return {
        title: isPro ? 'Views = saved setups' : 'Pro Tools: Views',
        body: isPro
          ? 'Views save your Filter + Sort (and whether completed items show). Create a few like "This week" or "Starred only."'
          : 'Upgrade to Pro to save Views (Filter + Sort) so you can switch contexts without reconfiguring your list.',
      };
    }
    if (activitiesGuideStep === 1) {
      return {
        title: isPro ? 'Filter the list' : 'Pro Tools: Filters',
        body: isPro
          ? 'Switch between All, Active, Completed, or Starred. Tap the ★ on an activity to star it.'
          : 'Upgrade to Pro to filter your Activities list (All, Active, Completed, Starred).',
      };
    }
    return {
      title: isPro ? 'Sort changes the order' : 'Pro Tools: Sort',
      body: isPro
        ? 'Try due date or "Starred first" when the list grows. Manual keeps your custom ordering.'
        : 'Upgrade to Pro to sort by title, due date, or starred first when the list grows.',
    };
  }, [activitiesGuideStep, guideVariant, isPro]);

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

