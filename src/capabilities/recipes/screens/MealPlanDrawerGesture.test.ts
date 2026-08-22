import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(process.cwd(), 'src/capabilities/recipes/screens/MealPlanDrawer.tsx'),
  'utf8',
);
describe('Meal Plan cross-section drag gesture', () => {
  it('uses the native-thread Kwilt list with handle-first activation', () => {
    expect(source).toContain('from "../../../ui/DraggableList"');
    expect(source).toContain('<DraggableList');
    expect(source).toContain('activationMode="handle"');
    expect(source).toContain('renderDragHandle');
    expect(source).not.toContain("from \"react-native-draggable-flatlist\"");
  });

  it('keeps the handle persistent without routing pickup through Pressable', () => {
    expect(source).not.toContain('onPressIn={drag}');
    expect(source).not.toContain('onTouchStart={drag}');
    expect(source).toContain('styles.planMoveHandle');
  });

  it('provides tactile pickup, position, and drop feedback', () => {
    expect(source).toContain('onDragPositionChange=');
    expect(source).toContain('HapticsService.trigger("canvas.drag.position")');
    expect(source).toContain('HapticsService.trigger("canvas.toggle.on")');
    expect(source).toContain('HapticsService.trigger("canvas.toggle.off")');
    expect(source).toContain('HapticsService.trigger("canvas.primary.confirm")');
  });

  it('clears destination feedback when the native gesture is cancelled', () => {
    expect(source).toContain('onDragCancel={clearDragFeedback}');
  });
});
