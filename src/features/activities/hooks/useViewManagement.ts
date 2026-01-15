import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useEntitlementsStore } from '../../../store/useEntitlementsStore';
import { HapticsService } from '../../../services/HapticsService';
import { openPaywallInterstitial } from '../../../services/paywall';
import type { ActivityView } from '../../../domain/types';

export type UseViewManagementReturn = {
  // Views state
  activityViews: ActivityView[];
  activeView: ActivityView | undefined;
  effectiveActiveViewId: string | null;
  
  // Editor state
  viewEditorVisible: boolean;
  setViewEditorVisible: React.Dispatch<React.SetStateAction<boolean>>;
  viewEditorMode: 'create' | 'settings';
  viewEditorTargetId: string | null;
  viewEditorName: string;
  setViewEditorName: React.Dispatch<React.SetStateAction<string>>;

  // Actions
  applyView: (viewId: string) => void;
  handleOpenCreateView: () => void;
  handleOpenViewSettings: (view: ActivityView) => void;
  handleConfirmViewEdit: () => void;
  handleDuplicateView: (view: ActivityView) => void;
  handleDeleteView: (view: ActivityView) => void;
  handleDuplicateCurrentView: () => void;
  handleDeleteCurrentView: () => void;
};

export function useViewManagement(): UseViewManagementReturn {
  const isPro = useEntitlementsStore((state) => state.isPro);
  const activityViews = useAppStore((state) => state.activityViews);
  const activeActivityViewId = useAppStore((state) => state.activeActivityViewId);
  const setActiveActivityViewId = useAppStore((state) => state.setActiveActivityViewId);
  const addActivityView = useAppStore((state) => state.addActivityView);
  const updateActivityView = useAppStore((state) => state.updateActivityView);
  const removeActivityView = useAppStore((state) => state.removeActivityView);

  const [viewEditorVisible, setViewEditorVisible] = React.useState(false);
  const [viewEditorMode, setViewEditorMode] = React.useState<'create' | 'settings'>('create');
  const [viewEditorTargetId, setViewEditorTargetId] = React.useState<string | null>(null);
  const [viewEditorName, setViewEditorName] = React.useState('');

  // Close view editor if Pro is lost
  React.useEffect(() => {
    if (!isPro && viewEditorVisible) {
      setViewEditorVisible(false);
    }
  }, [isPro, viewEditorVisible]);

  const effectiveActiveViewId = isPro ? activeActivityViewId : 'default';

  const activeView: ActivityView | undefined = React.useMemo(() => {
    const targetId = effectiveActiveViewId ?? 'default';
    const current = activityViews.find((view) => view.id === targetId) ?? activityViews[0];
    return current;
  }, [activityViews, effectiveActiveViewId]);

  const applyView = React.useCallback(
    (viewId: string) => {
      if (!isPro) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_views' });
        return;
      }
      // Haptic only when the view actually changes.
      if (viewId !== activeActivityViewId) {
        void HapticsService.trigger('canvas.selection');
      }
      setActiveActivityViewId(viewId);
    },
    [activeActivityViewId, isPro, setActiveActivityViewId],
  );

  const handleOpenCreateView = React.useCallback(() => {
    if (!isPro) {
      openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_views' });
      return;
    }
    setViewEditorMode('create');
    setViewEditorTargetId(null);
    setViewEditorName('New view');
    setViewEditorVisible(true);
  }, [isPro]);

  const handleOpenViewSettings = React.useCallback(
    (view: ActivityView) => {
      if (!isPro) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_views' });
        return;
      }
      setViewEditorMode('settings');
      setViewEditorTargetId(view.id);
      setViewEditorName(view.name);
      setViewEditorVisible(true);
    },
    [isPro],
  );

  const handleConfirmViewEdit = React.useCallback(() => {
    const trimmedName = viewEditorName.trim() || 'Untitled view';

    if (viewEditorMode === 'create') {
      const id = `view-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const nextView: ActivityView = {
        id,
        name: trimmedName,
        // New views always start from the base default configuration.
        filterMode: 'all',
        sortMode: 'manual',
        isSystem: false,
      };
      addActivityView(nextView);
      setActiveActivityViewId(id);
    } else if (viewEditorMode === 'settings' && viewEditorTargetId) {
      updateActivityView(viewEditorTargetId, (view) => ({
        ...view,
        name: trimmedName,
      }));
    }

    setViewEditorVisible(false);
  }, [
    addActivityView,
    setActiveActivityViewId,
    updateActivityView,
    viewEditorMode,
    viewEditorName,
    viewEditorTargetId,
  ]);

  const handleDuplicateView = React.useCallback(
    (view: ActivityView) => {
      const id = `view-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const nextView: ActivityView = {
        id,
        name: `${view.name} copy`,
        filterMode: view.filterMode,
        sortMode: view.sortMode,
        isSystem: false,
      };
      addActivityView(nextView);
      setActiveActivityViewId(id);
    },
    [addActivityView, setActiveActivityViewId],
  );

  const handleDeleteView = React.useCallback(
    (view: ActivityView) => {
      if (view.isSystem) {
        return;
      }
      removeActivityView(view.id);
    },
    [removeActivityView],
  );

  const handleDuplicateCurrentView = React.useCallback(() => {
    if (!viewEditorTargetId) return;
    const view = activityViews.find((v) => v.id === viewEditorTargetId);
    if (!view) return;
    handleDuplicateView(view);
    setViewEditorVisible(false);
  }, [activityViews, handleDuplicateView, viewEditorTargetId]);

  const handleDeleteCurrentView = React.useCallback(() => {
    if (!viewEditorTargetId) return;
    const view = activityViews.find((v) => v.id === viewEditorTargetId);
    if (!view || view.isSystem) return;
    handleDeleteView(view);
    setViewEditorVisible(false);
  }, [activityViews, handleDeleteView, viewEditorTargetId]);

  return {
    activityViews,
    activeView,
    effectiveActiveViewId,
    viewEditorVisible,
    setViewEditorVisible,
    viewEditorMode,
    viewEditorTargetId,
    viewEditorName,
    setViewEditorName,
    applyView,
    handleOpenCreateView,
    handleOpenViewSettings,
    handleConfirmViewEdit,
    handleDuplicateView,
    handleDeleteView,
    handleDuplicateCurrentView,
    handleDeleteCurrentView,
  };
}

