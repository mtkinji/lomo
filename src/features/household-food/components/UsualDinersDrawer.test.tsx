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
  { id: 'membership-adult', personId: 'adult', displayName: 'Blair', kind: 'adult' as const, role: 'owner' as const },
  { id: 'membership-child', personId: 'child', displayName: 'Avery', kind: 'dependent' as const, role: 'child' as const },
];

describe('Usually cooking for drawer', () => {
  it('selects represented people without imposing serving classes', () => {
    const onSave = jest.fn();
    const screen = render(<UsualDinersDrawer visible members={members} selectedPersonIds={['adult']} onClose={jest.fn()} onSave={onSave} />);

    fireEvent.press(screen.getByLabelText('Include Avery'));
    fireEvent.press(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith(['adult', 'child']);
    expect(screen.queryByText(/adult serving|kid serving/i)).toBeNull();
  });
});
