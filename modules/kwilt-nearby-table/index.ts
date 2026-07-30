import { NativeModule, requireOptionalNativeModule } from 'expo';

export type NearbyTable = {
  code: string;
  game: 'bank' | 'slanguage';
};

type Events = {
  onTablesChanged(event: { tables: NearbyTable[] }): void;
  onNearbyState(event: { state: string; message?: string }): void;
};

declare class KwiltNearbyTableNativeModule extends NativeModule<Events> {
  isAvailable(): boolean;
  startAdvertising(code: string, game: string): Promise<void>;
  stopAdvertising(): void;
  startBrowsing(): Promise<void>;
  stopBrowsing(): void;
}

export default requireOptionalNativeModule<KwiltNearbyTableNativeModule>('KwiltNearbyTable');
