import { create } from 'zustand';
import type { PersonalScreenTimeRuleBuilderParams } from './personalRuleBuilderLaunch';

type PersonalRuleBuilderDrawerRequest = {
  id: number;
  params: PersonalScreenTimeRuleBuilderParams;
};

type PersonalRuleBuilderDrawerState = {
  request: PersonalRuleBuilderDrawerRequest | null;
  open: (params: PersonalScreenTimeRuleBuilderParams) => void;
  close: () => void;
};

let nextRequestId = 0;

export const usePersonalRuleBuilderDrawerStore = create<PersonalRuleBuilderDrawerState>((set) => ({
  request: null,
  open: (params) => {
    nextRequestId += 1;
    set({ request: { id: nextRequestId, params } });
  },
  close: () => set({ request: null }),
}));

export function openPersonalScreenTimeRuleBuilder(
  params: PersonalScreenTimeRuleBuilderParams,
): void {
  usePersonalRuleBuilderDrawerStore.getState().open(params);
}
