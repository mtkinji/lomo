import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/ui/DraggableList.tsx'), 'utf8');

describe('DraggableList immediate handle gesture', () => {
  it('activates the native pan on the first handle movement', () => {
    expect(source).toContain("activationMode?: 'longPress' | 'handle'");
    expect(source).toContain('.manualActivation(true)');
    expect(source).toContain('.onTouchesMove((_event, stateManager) =>');
    expect(source).toContain('stateManager.activate()');
  });

  it('keeps finger tracking in shared values and commits only after release', () => {
    expect(source).toContain('dragTranslateY.value = event.translationY + scrollDelta');
    expect(source).toContain('runOnJS(onReorderWithPendingReset)(fromIdx, toIdx)');
  });

  it('reports cancellation so consumers can clear transient drop state', () => {
    expect(source).toContain('onDragCancel?: (fromIndex: number, toIndex: number) => void');
    expect(source).toContain('runOnJS(onDragCancel)(fromIdx, toIdx)');
  });

  it('uses distinct drag haptics so rapid slot changes are not swallowed by pickup', () => {
    expect(source).toContain("HapticsService.trigger('canvas.drag.pickup')");
  });
});
