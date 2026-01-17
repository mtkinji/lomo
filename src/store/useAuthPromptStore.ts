import { create } from 'zustand';

export type AuthPromptReason =
  | 'share_goal'
  | 'share_goal_email'
  | 'join_goal'
  | 'claim_arc_draft'
  | 'follow'
  | 'upload_attachment'
  | 'admin'
  | 'settings';

type Deferred<T> = {
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
};

type AuthPromptState = {
  visible: boolean;
  reason: AuthPromptReason | null;
  busy: boolean;
  deferred: Deferred<any> | null;

  open: <T = unknown>(reason: AuthPromptReason) => Promise<T>;
  close: (params?: { reject?: boolean; error?: Error }) => void;
  setBusy: (busy: boolean) => void;
};

export const useAuthPromptStore = create<AuthPromptState>((set, get) => ({
  visible: false,
  reason: null,
  busy: false,
  deferred: null,

  open: (reason) => {
    // If already open, close and reject the previous one to avoid dangling promises.
    const existing = get().deferred;
    if (existing) {
      try {
        existing.reject(new Error('Sign-in cancelled'));
      } catch {
        // ignore
      }
    }

    return new Promise((resolve, reject) => {
      set({
        visible: true,
        reason,
        busy: false,
        deferred: { resolve, reject },
      });
    });
  },

  close: (params) => {
    const shouldReject = params?.reject ?? false;
    const err = params?.error ?? new Error('Sign-in cancelled');
    const deferred = get().deferred;
    if (shouldReject && deferred) {
      try {
        deferred.reject(err);
      } catch {
        // ignore
      }
    }
    set({ visible: false, reason: null, busy: false, deferred: null });
  },

  setBusy: (busy) => set({ busy }),
}));


