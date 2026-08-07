import { NativeModule, requireOptionalNativeModule } from 'expo';

type BargeInEvent = { level: number };

declare class KwiltCookVoiceProcessingNativeModule extends NativeModule<{
  onBargeIn(event: BargeInEvent): void;
}> {
  isAvailable(): boolean;
  startMonitoring(thresholdDecibels: number, minimumSpeechMilliseconds: number): Promise<void>;
  stopMonitoring(): Promise<void>;
}

export default requireOptionalNativeModule<KwiltCookVoiceProcessingNativeModule>(
  'KwiltCookVoiceProcessing',
);
