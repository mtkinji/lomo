import { NativeModule, requireOptionalNativeModule } from 'expo';

export type KwiltRouteResult = {
  coordinates: Array<{ latitude: number; longitude: number }>;
  distanceM: number;
};

declare class KwiltRouteReconstructionNativeModule extends NativeModule {
  isAvailable(): boolean;
  routeBetween(
    fromLatitude: number,
    fromLongitude: number,
    toLatitude: number,
    toLongitude: number,
    transport: 'walking' | 'automobile',
  ): Promise<KwiltRouteResult>;
}

export default requireOptionalNativeModule<KwiltRouteReconstructionNativeModule>('KwiltRouteReconstruction');
