import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useCapabilityDiscoveryStore } from '../../store/useCapabilityDiscoveryStore';
import { getMenuToggleStroke, getPageHeaderTitleLineCount, PageHeader } from './PageHeader';
import { colors, fonts, spacing, typography } from '../../theme';

describe('PageHeader capability menu affordance', () => {
  beforeEach(() => {
    useCapabilityDiscoveryStore.setState({
      discovery: {
        initialized: true,
        eligible: false,
        menuOpened: false,
        visitedCapabilityIds: [],
      },
    });
  });

  it('allows titles to wrap when the system font is enlarged', () => {
    expect(getPageHeaderTitleLineCount(1)).toBe(1);
    expect(getPageHeaderTitleLineCount(1.4)).toBe(2);
  });

  it('bounds navigation-title scaling while leaving page content free to use Dynamic Type', () => {
    const { getByText } = render(<PageHeader title="Groceries" />);
    expect(getByText('Groceries').props.maxFontSizeMultiplier).toBe(1.6);
  });

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

  it('aligns the menu glyph to the canvas edge and leaves profile ownership in the launcher', () => {
    const { getByLabelText, getByTestId, queryByTestId } = render(
      <PageHeader
        title="To-dos"
        onPressMenu={jest.fn()}
        onPressAvatar={jest.fn()}
        avatarName="Andy"
        streakCount={67}
        streakShowedUpToday
        shieldCount={2}
      />,
    );

    expect(StyleSheet.flatten(getByTestId('nav.drawer.toggle').props.style)?.marginLeft).toBe(
      -spacing.sm,
    );
    expect(queryByTestId('nav.header.avatar')).toBeNull();
    expect(getByLabelText('67-day streak, 2 shields.')).toBeTruthy();
  });

  it('shows the one-time discovery dot on the menu opener until the menu has opened', () => {
    useCapabilityDiscoveryStore.setState({
      discovery: {
        initialized: true,
        eligible: true,
        menuOpened: false,
        visitedCapabilityIds: [],
      },
    });

    const { getByLabelText, getByTestId } = render(
      <PageHeader title="To-dos" onPressMenu={jest.fn()} />,
    );

    expect(getByTestId('nav.drawer.discovery')).toBeTruthy();
    expect(getByLabelText('Open navigation menu, new destinations available')).toBeTruthy();
  });

  it('uses a quiet leading title and trailing actions for conversation headers only', () => {
    const { getByText, getByTestId } = render(
      <PageHeader
        title="Implementing Phase Five"
        variant="conversation"
        onPressMenu={jest.fn()}
        moreMenu={<></>}
      />,
    );

    expect(StyleSheet.flatten(getByText('Implementing Phase Five').props.style)).toMatchObject({
      fontFamily: fonts.semibold,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      textAlign: 'left',
    });
    expect(StyleSheet.flatten(getByTestId('page.header').props.style)?.paddingBottom).toBe(
      spacing.xs,
    );
    expect(getByTestId('page.header.trailing')).toBeTruthy();
  });

  it('keeps the strong object-page title treatment by default', () => {
    const { getByRole, getByText, getByTestId } = render(<PageHeader title="Goals" />);

    expect(StyleSheet.flatten(getByText('Goals').props.style)).toMatchObject({
      fontFamily: fonts.black,
      fontSize: typography.titleMd.fontSize,
    });
    expect(StyleSheet.flatten(getByTestId('page.header').props.style)?.paddingBottom).toBe(
      spacing.md,
    );
    expect(getByRole('header', { name: 'Goals' })).toBeTruthy();
  });

  it('keeps leading and trailing content on the same canvas inset', () => {
    const { getByTestId } = render(
      <PageHeader title="Budget" rightElement={<></>} />,
    );

    expect(StyleSheet.flatten(getByTestId('page.header').props.style)).toMatchObject({
      paddingLeft: spacing.sm,
      paddingRight: spacing.sm,
    });
  });
});
