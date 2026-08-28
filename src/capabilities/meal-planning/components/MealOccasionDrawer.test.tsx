import { fireEvent, render } from '@testing-library/react-native';

import { MealOccasionDrawer } from './MealOccasionDrawer';

jest.mock('../../../ui/BottomDrawer', () => {
  const { ScrollView, View } = require('react-native');
  return {
    BottomDrawer: ({ visible, children }: any) => visible ? <View>{children}</View> : null,
    BottomDrawerScrollView: ({ children }: any) => <ScrollView>{children}</ScrollView>,
  };
});

const members = [
  { id: 'member-a', personId: 'adult', displayName: 'Blair', kind: 'adult' as const, role: 'owner' as const, updatedAt: 'version' },
  { id: 'member-c', personId: 'child', displayName: 'Avery', kind: 'dependent' as const, role: 'child' as const, updatedAt: 'version' },
];

describe('Meal occasion drawer', () => {
  it('edits diners and quantity independently without serving classes', () => {
    const onSave = jest.fn();
    const screen = render(<MealOccasionDrawer
      visible title="Pasta" members={members} dinerPersonIds={['adult', 'child']}
      coveredByOtherDishPersonIds={[]} notEatingPersonIds={[]} servings={2} placementDate={null}
      alternateDishes={[]}
      onClose={jest.fn()} onAddAnotherDish={jest.fn()} onSave={onSave}
    />);

    fireEvent.press(screen.getByLabelText('Exclude Avery from Pasta'));
    expect(screen.getByText('Avery still needs another dish or an explicit pass.')).toBeTruthy();
    fireEvent.press(screen.getByText('Not eating this time'));
    fireEvent.press(screen.getByText('Make one extra'));
    fireEvent.press(screen.getByText('Save dish'));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      dinerPersonIds: ['adult'], servings: 3, notEatingPersonIds: ['child'],
    }));
    expect(screen.queryByText(/adult serving|kid serving/i)).toBeNull();
  });

  it('lets the organizer choose the alternate rather than picking one implicitly', () => {
    const onAddAnotherDish = jest.fn();
    const screen = render(<MealOccasionDrawer
      visible title="Pasta" members={members} dinerPersonIds={['adult']}
      coveredByOtherDishPersonIds={[]} notEatingPersonIds={[]} servings={2} placementDate={null}
      alternateDishes={[{ id: 'toast', title: 'Toast' }, { id: 'soup', title: 'Soup' }]}
      onClose={jest.fn()} onAddAnotherDish={onAddAnotherDish} onSave={jest.fn()}
    />);
    fireEvent.press(screen.getByText('Add another dish'));
    fireEvent.press(screen.getByText('Soup'));
    expect(onAddAnotherDish).toHaveBeenCalledWith('soup', ['child']);
  });
});
