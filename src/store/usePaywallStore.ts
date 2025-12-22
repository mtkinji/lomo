import { create } from 'zustand';
import type { PaywallReason, PaywallSource } from '../services/paywall';

export type PaywallState = {
  visible: boolean;
  reason: PaywallReason | null;
  source: PaywallSource | null;
  open: (params: { reason: PaywallReason; source: PaywallSource }) => void;
  close: () => void;
};

export const usePaywallStore = create<PaywallState>((set) => ({
  visible: false,
  reason: null,
  source: null,
  open: ({ reason, source }) => set({ visible: true, reason, source }),
  close: () => set({ visible: false, reason: null, source: null }),
}));


