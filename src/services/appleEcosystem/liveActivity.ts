import { NativeModules, Platform } from 'react-native';

type KwiltLiveActivityNativeModule = {
  start: (activityId: string, title: string, startedAtMs: number, endAtMs: number) => Promise<boolean>;
  update: (activityId: string, title: string, startedAtMs: number, endAtMs: number) => Promise<boolean>;
  end: () => Promise<boolean>;
};

const native: KwiltLiveActivityNativeModule | undefined = (NativeModules as any)?.KwiltLiveActivity;

export async function syncLiveActivity(params: {
  mode: 'running' | 'paused' | 'ended';
  activityId: string;
  title: string;
  startedAtMs: number;
  endAtMs: number;
}): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (!native) return;
  try {
    if (params.mode !== 'running') {
      await native.end();
      return;
    }
    // Best-effort: update first; if no activity exists, start.
    const ok = await native.update(params.activityId, params.title, params.startedAtMs, params.endAtMs);
    if (!ok) {
      await native.start(params.activityId, params.title, params.startedAtMs, params.endAtMs);
    }
  } catch {
    // best-effort only
  }
}

export async function endLiveActivity(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (!native) return;
  try {
    await native.end();
  } catch {
    // best-effort
  }
}


