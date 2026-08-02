import { NativeModule, requireOptionalNativeModule } from 'expo';

export type KwiltNearbyPlace = {
  id: string;
  name: string;
  category: string | null;
  latitude: number;
  longitude: number;
};

declare class KwiltPlaceSearchNativeModule extends NativeModule {
  isAvailable(): boolean;
  searchNearby(latitude: number, longitude: number, radiusMeters: number): Promise<KwiltNearbyPlace[]>;
}

export default requireOptionalNativeModule<KwiltPlaceSearchNativeModule>('KwiltPlaceSearch');
