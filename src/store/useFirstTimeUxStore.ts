import { create } from 'zustand';

export type FirstTimeUxStage =
  | 'collectingContext'
  | 'reviewingArcs'
  | 'confirmingPlan'
  | 'complete';

type FirstTimeUxState = {
  isFlowActive: boolean;
  triggerCount: number;
  lastTriggeredAt: number | null;
  stage: FirstTimeUxStage;
  /**
   * DEV-ONLY: when true, the onboarding presenters should auto-complete the
   * v2 workflow and land the user on the final interactive step instead of
   * walking through each card manually.
   */
  devAutoCompleteToAvatar: boolean;
  startFlow: () => void;
  dismissFlow: () => void;
  completeFlow: () => void;
  setStage: (stage: FirstTimeUxStage) => void;
  requestDevAutoCompleteToAvatar: () => void;
  clearDevAutoCompleteToAvatar: () => void;
};

const INITIAL_STAGE: FirstTimeUxStage = 'collectingContext';

export const useFirstTimeUxStore = create<FirstTimeUxState>((set) => ({
  isFlowActive: false,
  triggerCount: 0,
  lastTriggeredAt: null,
  stage: INITIAL_STAGE,
  devAutoCompleteToAvatar: false,
  startFlow: () =>
    set((state) => ({
      isFlowActive: true,
      triggerCount: state.triggerCount + 1,
      lastTriggeredAt: Date.now(),
      stage: INITIAL_STAGE,
    })),
  dismissFlow: () =>
    set(() => ({
      isFlowActive: false,
      stage: INITIAL_STAGE,
    })),
  completeFlow: () =>
    set(() => ({
      isFlowActive: false,
      stage: 'complete',
    })),
  setStage: (stage) =>
    set(() => ({
      stage,
    })),
  requestDevAutoCompleteToAvatar: () =>
    set(() => ({
      devAutoCompleteToAvatar: true,
    })),
  clearDevAutoCompleteToAvatar: () =>
    set(() => ({
      devAutoCompleteToAvatar: false,
    })),
}));


