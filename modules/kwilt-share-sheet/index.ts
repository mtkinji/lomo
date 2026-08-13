import { NativeModule, requireOptionalNativeModule } from 'expo';

export type KwiltShareSheetResult = {
  action: 'askHousehold' | 'shared' | 'dismissed';
  activityType: string | null;
};

type KwiltShareSheetEvents = {
  onDismissStart(event: Record<string, never>): void;
};

declare class KwiltShareSheetNativeModule extends NativeModule<KwiltShareSheetEvents> {
  present(url: string, subject: string | null, askHouseholdTitle: string): Promise<KwiltShareSheetResult>;
}

export default requireOptionalNativeModule<KwiltShareSheetNativeModule>('KwiltShareSheet');
