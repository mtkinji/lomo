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
  startFlow: () => void;
  dismissFlow: () => void;
  completeFlow: () => void;
  setStage: (stage: FirstTimeUxStage) => void;
};

const INITIAL_STAGE: FirstTimeUxStage = 'collectingContext';

export const useFirstTimeUxStore = create<FirstTimeUxState>((set) => ({
  isFlowActive: false,
  triggerCount: 0,
  lastTriggeredAt: null,
  stage: INITIAL_STAGE,
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
}));


