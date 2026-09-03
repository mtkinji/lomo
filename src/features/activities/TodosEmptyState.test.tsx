import { render } from '@testing-library/react-native';
import { Image } from 'react-native';
import { TodosEmptyState } from './TodosEmptyState';

describe('TodosEmptyState', () => {
  it('uses an illustration without duplicating the action dock', () => {
    const screen = render(<TodosEmptyState />);

    expect(screen.getByText('No to-dos yet')).toBeTruthy();
    expect(screen.getByText('When something comes to mind, add it in the dock below.')).toBeTruthy();
    expect(screen.UNSAFE_getAllByType(Image)).toHaveLength(1);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
