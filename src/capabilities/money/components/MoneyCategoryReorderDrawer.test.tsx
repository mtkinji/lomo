import { fireEvent, render } from '@testing-library/react-native';
import { MoneyCategoryReorderDrawer } from './MoneyCategoryReorderDrawer';

jest.mock('react-native-draggable-flatlist', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ data, renderItem }: { data: unknown[]; renderItem: (input: Record<string, unknown>) => React.ReactNode }) => (
      <View>{data.map((item, index) => (
        <View key={(item as { sourceId: string }).sourceId}>
          {renderItem({ item, drag: jest.fn(), isActive: false, getIndex: () => index })}
        </View>
      ))}</View>
    ),
  };
});

jest.mock('../../../ui/BottomDrawer', () => {
  const { View } = require('react-native');
  return { BottomDrawer: ({ children, visible }: { children: React.ReactNode; visible: boolean }) => visible ? <View>{children}</View> : null };
});

const categories = [
  { sourceId: 'health', name: 'Health & Activities' },
  { sourceId: 'grooming', name: 'Dress and Grooming' },
  { sourceId: 'shopping', name: 'Shopping' },
];

describe('MoneyCategoryReorderDrawer', () => {
  it('supports accessible moves and saves the complete source-id sequence', () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <MoneyCategoryReorderDrawer categories={categories} onClose={jest.fn()} onSave={onSave} saving={false} visible />,
    );

    fireEvent(screen.getByLabelText('Shopping, position 3 of 3'), 'accessibilityAction', {
      nativeEvent: { actionName: 'moveUp' },
    });
    expect(screen.getByLabelText('Shopping, position 2 of 3')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Save category order' }));

    expect(onSave).toHaveBeenCalledWith(['health', 'shopping', 'grooming']);
  });

  it('does not enable Done until the order changes', () => {
    const screen = render(
      <MoneyCategoryReorderDrawer categories={categories} onClose={jest.fn()} onSave={jest.fn()} saving={false} visible />,
    );

    expect(screen.getByRole('button', { name: 'Save category order' }).props.accessibilityState)
      .toMatchObject({ disabled: true });
  });
});
