import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StoreOpportunityCaptureSheet } from './StoreOpportunityCaptureSheet';

jest.mock('../../../ui/BottomDrawer', () => ({ BottomDrawer: ({ visible, children }: any) => visible ? children : null }));
describe('Store Opportunity capture', () => {
  it('requires visible price evidence before review', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined); const screen = render(<StoreOpportunityCaptureSheet visible onClose={jest.fn()} onSubmit={onSubmit} />);
    expect(screen.getByText('Review this opportunity')).toBeDisabled();
    fireEvent.changeText(screen.getByLabelText('Item'), 'Chicken thighs'); fireEvent.changeText(screen.getByLabelText('Store'), "Smith's"); fireEvent.changeText(screen.getByLabelText('Current package price'), '1.49');
    fireEvent.press(screen.getByText('Review this opportunity')); await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ concept: 'Chicken thighs', price: '1.49' })));
  });
});
