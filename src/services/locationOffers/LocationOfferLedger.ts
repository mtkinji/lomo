import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kwilt-location-offer-ledger-v1';

type Entry = {
  lastFiredAtIso: string;
};

type Ledger = Record<string, Entry>;

function keyFor(params: { activityId: string; event: 'enter' | 'exit' }): string {
  return `${params.activityId}:${params.event}`;
}

async function loadLedger(): Promise<Ledger> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Ledger;
  } catch {
    return {};
  }
}

async function saveLedger(next: Ledger): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function shouldFireLocationOffer(params: {
  activityId: string;
  event: 'enter' | 'exit';
  minSpacingMs: number;
  nowIso: string;
}): Promise<boolean> {
  const nowMs = new Date(params.nowIso).getTime();
  if (Number.isNaN(nowMs)) return false;
  const ledger = await loadLedger();
  const entry = ledger[keyFor(params)];
  if (!entry?.lastFiredAtIso) return true;
  const lastMs = new Date(entry.lastFiredAtIso).getTime();
  if (Number.isNaN(lastMs)) return true;
  return nowMs - lastMs >= params.minSpacingMs;
}

export async function recordLocationOfferFired(params: {
  activityId: string;
  event: 'enter' | 'exit';
  firedAtIso: string;
}): Promise<void> {
  const ledger = await loadLedger();
  ledger[keyFor(params)] = { lastFiredAtIso: params.firedAtIso };
  await saveLedger(ledger);
}


