import KwiltNearbyTable, { type NearbyTable } from '../../../../modules/kwilt-nearby-table';

export type { NearbyTable };

export function nearbyTablesAvailable() {
  return KwiltNearbyTable?.isAvailable() ?? false;
}

export async function advertiseNearbyTable(code: string, game: NearbyTable['game'] = 'bank') {
  if (!KwiltNearbyTable) return false;
  await KwiltNearbyTable.startAdvertising(code, game);
  return true;
}

export function stopAdvertisingNearbyTable() {
  KwiltNearbyTable?.stopAdvertising();
}

export async function browseNearbyTables(onChange: (tables: NearbyTable[]) => void, onError: (message: string) => void) {
  const nearbyModule = KwiltNearbyTable;
  if (!nearbyModule) return null;
  const tablesSubscription = nearbyModule.addListener('onTablesChanged', ({ tables }) => onChange(tables));
  const stateSubscription = nearbyModule.addListener('onNearbyState', ({ state, message }) => {
    if (state === 'failed') onError(message ?? 'Nearby tables are unavailable.');
  });
  await nearbyModule.startBrowsing();
  return () => {
    tablesSubscription.remove();
    stateSubscription.remove();
    nearbyModule.stopBrowsing();
  };
}
