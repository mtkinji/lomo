import { fireEvent, render } from '@testing-library/react-native';

import { UsualDinersDrawer } from './UsualDinersDrawer';

jest.mock('../../../ui/BottomDrawer', () => {
  const { ScrollView, View } = require('react-native');
  return {
    BottomDrawer: ({ visible, children }: any) => visible ? <View>{children}</View> : null,
    BottomDrawerScrollView: ({ children }: any) => <ScrollView>{children}</ScrollView>,
  };
});

const members = [
  { id: 'membership-adult', personId: 'adult', displayName: 'Blair', kind: 'adult' as const, role: 'owner' as const, updatedAt: 'version' },
  { id: 'membership-child', personId: 'child', displayName: 'Avery', kind: 'dependent' as const, role: 'child' as const, updatedAt: 'version' },
];

describe('Usually cooking for drawer', () => {
  it('selects represented people without imposing serving classes', () => {
    const onSave = jest.fn();
    const screen = render(<UsualDinersDrawer visible members={members} usualDinerCount={7} selectedPersonIds={['adult']} onClose={jest.fn()} onSave={onSave} />);

    expect(screen.getByText('7 people')).toBeTruthy();
    expect(screen.getByText('People (optional)')).toBeTruthy();
    expect(screen.queryByText('Starting quantity for recipes.')).toBeNull();
    fireEvent.press(screen.getByLabelText('Include Avery'));
    fireEvent.press(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ usualDinerCount: 7, personIds: ['adult', 'child'] });
    expect(screen.queryByText(/adult serving|kid serving/i)).toBeNull();
  });

  it('keeps the count above selected people and does not lower it on deselection', () => {
    const onSave = jest.fn();
    const screen = render(<UsualDinersDrawer visible members={members} usualDinerCount={2} selectedPersonIds={['adult', 'child']} onClose={jest.fn()} onSave={onSave} />);

    expect(screen.getByLabelText('Decrease usual people count').props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(screen.getByLabelText('Exclude Avery'));
    expect(screen.getByText('2 people')).toBeTruthy();
    fireEvent.press(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ usualDinerCount: 2, personIds: ['adult'] });
  });
});
