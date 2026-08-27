import { create } from 'zustand';
import type { ManagedChildAccess } from './managedChildAccess';

type PendingSetup = { transport: 'link' | 'manual_code'; secret: string };
type ManagedChildAccessStore = {
  hydrated: boolean;
  access: ManagedChildAccess | null;
  pendingSetup: PendingSetup | null;
  manualEntryOpen: boolean;
  hydrate: (access: ManagedChildAccess | null) => void;
  receiveLink: (token: string) => void;
  openManualEntry: () => void;
  submitManualCode: (code: string) => void;
  cancelSetup: () => void;
  setAccess: (access: ManagedChildAccess) => void;
  clear: () => void;
};

export const useManagedChildAccessStore = create<ManagedChildAccessStore>((set) => ({
  hydrated: false,
  access: null,
  pendingSetup: null,
  manualEntryOpen: false,
  hydrate: (access) => set({ access, hydrated: true }),
  receiveLink: (token) => set({ pendingSetup: { transport: 'link', secret: token }, manualEntryOpen: false }),
  openManualEntry: () => set({ manualEntryOpen: true, pendingSetup: null }),
  submitManualCode: (code) => set({
    pendingSetup: { transport: 'manual_code', secret: code.trim().toUpperCase() }, manualEntryOpen: false,
  }),
  cancelSetup: () => set({ pendingSetup: null, manualEntryOpen: false }),
  setAccess: (access) => set({ access, pendingSetup: null, manualEntryOpen: false }),
  clear: () => set({ access: null, pendingSetup: null, manualEntryOpen: false }),
}));
