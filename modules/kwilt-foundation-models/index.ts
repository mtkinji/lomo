import { NativeModule, requireOptionalNativeModule } from 'expo';

export type KwiltFoundationModelsAvailability =
  | { state: 'available' }
  | {
      state: 'unavailable';
      reason:
        | 'os_unavailable'
        | 'device_not_eligible'
        | 'apple_intelligence_not_enabled'
        | 'model_not_ready'
        | 'unsupported_locale';
    };

export type KwiltFoundationModelsGenerationOptions = {
  requestId: string;
  prompt: string;
  instructions: string;
  maximumResponseTokens: number;
};

export type KwiltFoundationModelsGenerationResult = {
  text: string;
  durationMs: number;
};

export interface KwiltFoundationModelsNativeModule extends NativeModule {
  availability(localeIdentifier?: string): Promise<KwiltFoundationModelsAvailability>;
  generateText(
    options: KwiltFoundationModelsGenerationOptions,
  ): Promise<KwiltFoundationModelsGenerationResult>;
  cancelGeneration(requestId: string): void;
}

export default requireOptionalNativeModule<KwiltFoundationModelsNativeModule>(
  'KwiltFoundationModels',
);
