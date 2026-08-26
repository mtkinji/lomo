import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { MoneyCategoryReorderDrawer } from './MoneyCategoryReorderDrawer';

jest.mock('react-native-draggable-flatlist', () => {
  const { Pressable, Text, View } = require('react-native');
  const List = ({ data, onDragEnd, renderItem }: {
    data: unknown[];
    onDragEnd?: (input: { data: unknown[] }) => void;
    renderItem: (input: Record<string, unknown>) => React.ReactNode;
  }) => (
    <View>
      {data.map((item, index) => (
        <View key={(item as { sourceId: string }).sourceId}>
          {renderItem({ item, drag: jest.fn(), isActive: false, getIndex: () => index })}
        </View>
      ))}
      <Pressable accessibilityLabel="Finish test drag" accessibilityRole="button" onPress={() => onDragEnd?.({ data: [...data].reverse() })}>
        <Text>Finish test drag</Text>
      </Pressable>
    </View>
  );
  return {
    __esModule: true,
    default: List,
    NestableDraggableFlatList: List,
    NestableScrollContainer: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('../../../ui/BottomDrawer', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    BottomDrawer: ({ children, footer, visible }: {
      children: React.ReactNode;
      footer?: { primaryAction: { accessibilityLabel?: string; disabled?: boolean; label: string; onPress: () => void } };
      visible: boolean;
    }) => visible ? (
      <View>
        {children}
        {footer ? (
          <Pressable
            accessibilityLabel={footer.primaryAction.accessibilityLabel ?? footer.primaryAction.label}
            accessibilityRole="button"
            accessibilityState={{ disabled: footer.primaryAction.disabled }}
            disabled={footer.primaryAction.disabled}
            onPress={footer.primaryAction.onPress}
          >
            <Text>{footer.primaryAction.label}</Text>
          </Pressable>
        ) : null}
      </View>
    ) : null,
  };
});

const categories = [
  { sourceId: 'health', name: 'Health & Activities', planRole: 'flexible' as const },
  { sourceId: 'housing', name: 'Housing & Utilities', planRole: 'protected' as const },
  { sourceId: 'shopping', name: 'Shopping', planRole: 'flexible' as const },
  { sourceId: 'transport', name: 'Cars and Transportation', planRole: 'protected' as const },
];

describe('MoneyCategoryReorderDrawer', () => {
  it('autosaves accessible moves with the complete source-id sequence', () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <MoneyCategoryReorderDrawer categories={categories} onClose={jest.fn()} onSave={onSave} saving={false} visible />,
    );

    expect(screen.getByText('Flexible spending')).toBeTruthy();
    expect(screen.getByText('Committed spending')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close category reordering' })).toBeTruthy();
    expect(screen.queryByText('Cancel')).toBeNull();
    fireEvent.press(screen.getByRole('tab', { name: 'Category list, Committed spending' }));
    expect(screen.getByLabelText('Housing & Utilities, position 1 of 2 in Committed spending')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'Category list, Flexible spending' }));

    fireEvent(screen.getByLabelText('Shopping, position 2 of 2 in Flexible spending'), 'accessibilityAction', {
      nativeEvent: { actionName: 'moveUp' },
    });
    expect(screen.getByLabelText('Shopping, position 1 of 2 in Flexible spending')).toBeTruthy();
    expect(onSave).toHaveBeenCalledWith(['shopping', 'housing', 'health', 'transport']);
    expect(screen.queryByText('Done')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save category order' })).toBeNull();
  });

  it('autosaves a completed drag and keeps close independent of persistence', () => {
    const onClose = jest.fn();
    const onSave = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <MoneyCategoryReorderDrawer categories={categories} onClose={onClose} onSave={onSave} saving={false} visible />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Finish test drag' }));
    expect(onSave).toHaveBeenCalledWith(['shopping', 'housing', 'health', 'transport']);
    fireEvent.press(screen.getByRole('button', { name: 'Close category reordering' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the reordered list visible and reports an autosave failure', async () => {
    const screen = render(
      <MoneyCategoryReorderDrawer
        categories={categories}
        onClose={jest.fn()}
        onSave={jest.fn().mockRejectedValue(new Error('Order could not be saved.'))}
        saving={false}
        visible
      />,
    );

    fireEvent(screen.getByLabelText('Shopping, position 2 of 2 in Flexible spending'), 'accessibilityAction', {
      nativeEvent: { actionName: 'moveUp' },
    });

    expect(screen.getByLabelText('Shopping, position 1 of 2 in Flexible spending')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Order could not be saved.'));
  });

  it('allows the drawer to close while an autosave is in flight', () => {
    const onClose = jest.fn();
    const screen = render(
      <MoneyCategoryReorderDrawer categories={categories} onClose={onClose} onSave={jest.fn()} saving visible />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Close category reordering' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
