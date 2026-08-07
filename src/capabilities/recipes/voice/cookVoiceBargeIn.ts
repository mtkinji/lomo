import voiceProcessingModule from '../../../../modules/kwilt-cook-voice-processing';

let subscription: { remove(): void } | null = null;

export const cookVoiceBargeIn = {
  isAvailable(): boolean {
    return voiceProcessingModule?.isAvailable() ?? false;
  },
  async start(onInterrupt: () => void): Promise<void> {
    await this.stop();
    if (!voiceProcessingModule?.isAvailable()) return;
    subscription = voiceProcessingModule.addListener('onBargeIn', onInterrupt);
    try {
      await voiceProcessingModule.startMonitoring(-32, 140);
    } catch (error) {
      subscription?.remove();
      subscription = null;
      throw error;
    }
  },
  async stop(): Promise<void> {
    subscription?.remove();
    subscription = null;
    await voiceProcessingModule?.stopMonitoring().catch(() => undefined);
  },
};
