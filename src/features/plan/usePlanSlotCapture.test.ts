import { act, renderHook } from '@testing-library/react-native';
import type { PlanSlotDraft } from './planSlotDraft';
import { usePlanSlotSelectionState } from './usePlanSlotCapture';

describe('usePlanSlotSelectionState', () => {
  it('clears the selected and created to-do when capture closes', () => {
    let currentSlot: PlanSlotDraft | null = {
      start: new Date('2026-07-13T10:00:00.000-06:00'),
      end: new Date('2026-07-13T11:00:00.000-06:00'),
    };
    const { result, rerender } = renderHook(() => usePlanSlotSelectionState(currentSlot));

    act(() => {
      result.current.setSelectedActivityId('activity-existing');
      result.current.setCreatedActivityId('activity-created');
    });

    expect(result.current.selectedActivityId).toBe('activity-existing');
    expect(result.current.createdActivityId).toBe('activity-created');

    currentSlot = null;
    rerender(undefined);

    expect(result.current.selectedActivityId).toBeNull();
    expect(result.current.createdActivityId).toBeNull();
  });
});
