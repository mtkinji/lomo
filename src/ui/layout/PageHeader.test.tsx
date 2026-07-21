import { render } from '@testing-library/react-native';
import { getMenuToggleStroke, PageHeader } from './PageHeader';
import { colors } from '../../theme';

describe('PageHeader capability menu affordance', () => {
  it('keeps the control labeled as a menu when the drawer is open', () => {
    const { getByLabelText, getByTestId, queryByLabelText } = render(
      <PageHeader title="To-dos" onPressMenu={jest.fn()} menuOpen />,
    );

    expect(getByLabelText('Open navigation menu')).toBeTruthy();
    expect(queryByLabelText(/close/i)).toBeNull();
    expect(getByTestId('nav.drawer.icon.line.top', { includeHiddenElements: true }).props).toMatchObject({
      d: 'M4 8h16',
      strokeLinecap: 1,
    });
    expect(getByTestId('nav.drawer.icon.line.bottom', { includeHiddenElements: true }).props).toMatchObject({
      d: 'M4 16h12',
      strokeLinecap: 1,
    });
    expect(getMenuToggleStroke(true)).toBe(colors.gray600);
  });
});
