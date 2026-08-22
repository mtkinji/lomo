import { act, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors, typography } from '../../../theme';
import { MoneyFreshnessStamp } from './MoneyFreshnessStamp';

describe('MoneyFreshnessStamp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-21T18:23:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the last successful bank refresh as quiet header metadata and keeps aging it', () => {
    const screen = render(<MoneyFreshnessStamp lastSyncedAt="2026-08-21T18:00:00.000Z" />);

    expect(screen.getAllByTestId('money-freshness-clock-icon').length).toBeGreaterThan(0);
    const stamp = screen.getByText('23m ago');
    expect(stamp.props).toMatchObject({
      accessibilityLabel: 'Bank data updated 23 min ago',
      accessibilityLiveRegion: 'polite',
      maxFontSizeMultiplier: 1.3,
      numberOfLines: 1,
    });
    expect(StyleSheet.flatten(stamp.props.style)).toMatchObject({
      color: colors.muted,
      fontSize: typography.caption.fontSize,
    });

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.getByText('24m ago')).toBeTruthy();
  });

  it('changes to just now when a successful pull supplies the new sync timestamp', () => {
    const screen = render(<MoneyFreshnessStamp lastSyncedAt="2026-08-21T18:00:00.000Z" />);

    screen.rerender(<MoneyFreshnessStamp lastSyncedAt="2026-08-21T18:23:00.000Z" />);

    expect(screen.getByText('Just now')).toBeTruthy();
    expect(screen.getByLabelText('Bank data updated just now')).toBeTruthy();
  });

  it('uses the same numeric elapsed-time pattern after one day', () => {
    const screen = render(<MoneyFreshnessStamp lastSyncedAt="2026-08-20T18:23:00.000Z" />);

    expect(screen.getByText('1d ago')).toBeTruthy();
    expect(screen.getByLabelText('Bank data updated 1 day ago')).toBeTruthy();
  });
});
