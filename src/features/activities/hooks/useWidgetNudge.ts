import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useFirstTimeUxStore } from '../../../store/useFirstTimeUxStore';
import { useFeatureFlag } from '../../../services/analytics/useFeatureFlag';
import { useFeatureFlagVariant } from '../../../services/analytics/useFeatureFlagVariant';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';

export type UseWidgetNudgeOptions = {
  isFocused: boolean;
  navigation: any; // Navigation prop from react-navigation
};

export type UseWidgetNudgeReturn = {
  shouldShowWidgetNudgeInline: boolean;
  widgetModalVisible: boolean;
  setWidgetModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  openWidgetSetup: (surface: 'inline' | 'modal') => void;
  handleDismissWidgetPrompt: (surface: 'inline' | 'modal') => void;
  widgetCopyVariant: string | undefined;
};

export function useWidgetNudge({
  isFocused,
  navigation,
}: UseWidgetNudgeOptions): UseWidgetNudgeReturn {
  const { capture } = useAnalytics();
  const activities = useAppStore((state) => state.activities);
  const appOpenCount = useAppStore((state) => state.appOpenCount);
  const widgetNudge = useAppStore((state) => state.widgetNudge);
  const markWidgetPromptShown = useAppStore((state) => state.markWidgetPromptShown);
  const dismissWidgetPrompt = useAppStore((state) => state.dismissWidgetPrompt);
  const ftueActive = useFirstTimeUxStore((state) => state.isFlowActive);
  const widgetNudgesEnabled = useFeatureFlag('widget_nudges_enabled', false);
  const widgetSurfaceVariant = useFeatureFlagVariant('widget_nudge_surface', 'inline_modal');
  const widgetTimingVariant = useFeatureFlagVariant('widget_nudge_timing', '3_5');
  const widgetCopyVariant = useFeatureFlagVariant('widget_nudge_copy', 'today_glance');

  const [widgetModalVisible, setWidgetModalVisible] = React.useState(false);
  const hasTrackedWidgetInlineThisFocusRef = React.useRef(false);
  const hasOpenedWidgetModalThisFocusRef = React.useRef(false);

  const shouldShowWidgetNudgeInline = React.useMemo(() => {
    if (!widgetNudgesEnabled) return false;
    if (ftueActive) return false;
    if (!isFocused) return false;
    if (!activities || activities.length === 0) return false;
    if ((widgetNudge as any)?.status === 'completed') return false;
    if ((widgetNudge as any)?.cooldownUntilMs && Date.now() < (widgetNudge as any).cooldownUntilMs) return false;
    // Timing: avoid first-run; show after a few returns.
    const inlineThreshold =
      widgetTimingVariant === '4_6' ? 4 : widgetTimingVariant === '5_7' ? 5 : 3;
    if ((appOpenCount ?? 0) < inlineThreshold) return false;
    return true;
  }, [appOpenCount, activities, ftueActive, isFocused, widgetNudgesEnabled, widgetNudge, widgetTimingVariant]);

  const shouldAutoShowWidgetModal = React.useMemo(() => {
    if (!widgetNudgesEnabled) return false;
    if (widgetSurfaceVariant === 'inline_only') return false;
    if (ftueActive) return false;
    if (!isFocused) return false;
    if (!activities || activities.length === 0) return false;
    if ((widgetNudge as any)?.status === 'completed') return false;
    if ((widgetNudge as any)?.cooldownUntilMs && Date.now() < (widgetNudge as any).cooldownUntilMs) return false;
    // Escalation: only after at least one inline exposure, and on later opens.
    if (((widgetNudge as any)?.shownCount ?? 0) < 1) return false;
    const modalThreshold =
      widgetTimingVariant === '4_6' ? 6 : widgetTimingVariant === '5_7' ? 7 : 5;
    if ((appOpenCount ?? 0) < modalThreshold) return false;
    if (((widgetNudge as any)?.modalShownCount ?? 0) >= 1) return false;
    return true;
  }, [appOpenCount, activities, ftueActive, isFocused, widgetNudgesEnabled, widgetNudge, widgetSurfaceVariant, widgetTimingVariant]);

  // Track inline nudge exposure
  React.useEffect(() => {
    if (!shouldShowWidgetNudgeInline) {
      hasTrackedWidgetInlineThisFocusRef.current = false;
      return;
    }
    if (hasTrackedWidgetInlineThisFocusRef.current) return;
    hasTrackedWidgetInlineThisFocusRef.current = true;
    markWidgetPromptShown('inline');
    capture(AnalyticsEvent.WidgetPromptExposed, {
      surface: 'inline',
      app_open_count: appOpenCount ?? 0,
    });
  }, [appOpenCount, capture, markWidgetPromptShown, shouldShowWidgetNudgeInline]);

  // Auto-show modal
  React.useEffect(() => {
    if (!shouldAutoShowWidgetModal) {
      hasOpenedWidgetModalThisFocusRef.current = false;
      return;
    }
    if (hasOpenedWidgetModalThisFocusRef.current) return;
    hasOpenedWidgetModalThisFocusRef.current = true;
    // Defer to next tick so we don't stack on top of other startup UI.
    const t = setTimeout(() => {
      setWidgetModalVisible(true);
      markWidgetPromptShown('modal');
      capture(AnalyticsEvent.WidgetPromptExposed, {
        surface: 'modal',
        app_open_count: appOpenCount ?? 0,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [appOpenCount, capture, markWidgetPromptShown, shouldAutoShowWidgetModal]);

  const openWidgetSetup = React.useCallback(
    (surface: 'inline' | 'modal') => {
      capture(AnalyticsEvent.WidgetPromptCtaTapped, {
        surface,
        app_open_count: appOpenCount ?? 0,
      });
      setWidgetModalVisible(false);
      // Navigate into the Settings stack without breaking the shell/canvas structure.
      (navigation as any).navigate('Settings', { screen: 'SettingsWidgets' });
    },
    [appOpenCount, capture, navigation],
  );

  const handleDismissWidgetPrompt = React.useCallback(
    (surface: 'inline' | 'modal') => {
      dismissWidgetPrompt(surface);
      capture(AnalyticsEvent.WidgetPromptDismissed, {
        surface,
        app_open_count: appOpenCount ?? 0,
      });
      setWidgetModalVisible(false);
    },
    [appOpenCount, capture, dismissWidgetPrompt],
  );

  return {
    shouldShowWidgetNudgeInline,
    widgetModalVisible,
    setWidgetModalVisible,
    openWidgetSetup,
    handleDismissWidgetPrompt,
    widgetCopyVariant,
  };
}

