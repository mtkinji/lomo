import { render } from '@testing-library/react-native';
import { ExternalActionReceiptRegion } from './ExternalActionReceiptRegion';

it('renders completed external work as quiet evidence rather than an action queue', () => {
  const view = render(<ExternalActionReceiptRegion receipts={[{
    id: 'receipt-1',
    summary: 'Renamed “Auto” to “Transportation”.',
    sourceName: 'Codex',
    createdAt: new Date(Date.now() - 120_000).toISOString(),
  }]} />);

  expect(view.getByText('Recently done')).toBeTruthy();
  expect(view.getByText('Renamed “Auto” to “Transportation”.')).toBeTruthy();
  expect(view.getByText(/Codex · 2 min ago/)).toBeTruthy();
  expect(view.queryAllByRole('button')).toHaveLength(0);
});

it('does not reserve empty space when there are no completed receipts', () => {
  expect(render(<ExternalActionReceiptRegion receipts={[]} />).toJSON()).toBeNull();
});
