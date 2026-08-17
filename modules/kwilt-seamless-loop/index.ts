import { NativeModule, requireOptionalNativeModule } from 'expo';

export type LoopState = 'idle' | 'preparing' | 'ready' | 'playing' | 'paused' | 'error';

export type LoopDiagnostics = {
  state: LoopState;
  assetKey: string | null;
  queuedSegments: number;
  completedBoundaries: number;
  underrunCount: number;
  lastErrorCode: string | null;
};

export type PrepareOptions = {
  uri: string;
  assetKey: string;
  expectedSampleRateHz: number;
  expectedChannels: number;
};

export type ContinuityProbeResult = LoopDiagnostics & {
  worstBoundaryJumpDbfs: number;
};

export type LoopStateSubscription = { remove(): void };

export interface KwiltSeamlessLoopModuleLike {
  isAvailable(): boolean;
  prepare(options: PrepareOptions): Promise<LoopDiagnostics>;
  play(volume: number, fadeDurationMs: number): Promise<LoopDiagnostics>;
  pause(fadeDurationMs: number): Promise<LoopDiagnostics>;
  setVolume(volume: number, fadeDurationMs: number): Promise<LoopDiagnostics>;
  unload(): Promise<LoopDiagnostics>;
  getDiagnostics(): LoopDiagnostics;
  runContinuityProbe(loopCount: number): Promise<ContinuityProbeResult>;
  addListener(event: 'onStateChanged', listener: (event: LoopDiagnostics) => void): LoopStateSubscription;
}

declare class KwiltSeamlessLoopNativeModule extends NativeModule<{
  onStateChanged(event: LoopDiagnostics): void;
}> implements KwiltSeamlessLoopModuleLike {
  isAvailable(): boolean;
  prepare(options: PrepareOptions): Promise<LoopDiagnostics>;
  play(volume: number, fadeDurationMs: number): Promise<LoopDiagnostics>;
  pause(fadeDurationMs: number): Promise<LoopDiagnostics>;
  setVolume(volume: number, fadeDurationMs: number): Promise<LoopDiagnostics>;
  unload(): Promise<LoopDiagnostics>;
  getDiagnostics(): LoopDiagnostics;
  runContinuityProbe(loopCount: number): Promise<ContinuityProbeResult>;
}

export default requireOptionalNativeModule<KwiltSeamlessLoopNativeModule>('KwiltSeamlessLoop');
