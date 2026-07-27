import { HapticsService } from '../../../services/HapticsService';

export function signalMoneyChoice(): void {
  void HapticsService.trigger('canvas.selection');
}

export function signalMoneyToggle(enabled: boolean): void {
  void HapticsService.trigger(enabled ? 'canvas.toggle.on' : 'canvas.toggle.off');
}

export function signalMoneyMutationOutcome(outcome: 'succeeded' | 'failed'): void {
  void HapticsService.trigger(outcome === 'succeeded' ? 'outcome.success' : 'outcome.error');
}
