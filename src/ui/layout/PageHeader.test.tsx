import { render } from '@testing-library/react-native';
import { PageHeader } from './PageHeader';

describe('PageHeader capability menu affordance', () => {
  it('keeps the control labeled as a menu when the drawer is open', () => {
    const { getByLabelText, queryByLabelText } = render(
      <PageHeader title="To-dos" onPressMenu={jest.fn()} menuOpen />,
    );

    expect(getByLabelText('Open navigation menu')).toBeTruthy();
    expect(queryByLabelText(/close/i)).toBeNull();
  });
});
