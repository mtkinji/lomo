import {
  formatActivityTypeLabel,
  getDestinationSupportedActivityTypes,
} from './destinationCapabilities';

describe('getDestinationSupportedActivityTypes', () => {
  it('limits retailer destinations to shopping_list activities', () => {
    expect(getDestinationSupportedActivityTypes('amazon')).toEqual(['shopping_list']);
    expect(getDestinationSupportedActivityTypes('home_depot')).toEqual(['shopping_list']);
    expect(getDestinationSupportedActivityTypes('instacart')).toEqual(['shopping_list']);
    expect(getDestinationSupportedActivityTypes('doordash')).toEqual(['shopping_list']);
  });

  it('treats kind matching case-insensitively and trims whitespace', () => {
    expect(getDestinationSupportedActivityTypes('  Amazon  ')).toEqual(['shopping_list']);
    expect(getDestinationSupportedActivityTypes('CURSOR_REPO')).toEqual(
      ['task', 'checklist', 'plan', 'instructions'],
    );
  });

  it('limits cursor_repo to engineering-style activity types (no shopping)', () => {
    const types = getDestinationSupportedActivityTypes('cursor_repo');
    expect(types).toEqual(['task', 'checklist', 'plan', 'instructions']);
    expect(types).not.toContain('shopping_list');
  });

  it('falls back to non-shopping defaults for unknown kinds', () => {
    expect(getDestinationSupportedActivityTypes('unknown')).toEqual([
      'task',
      'checklist',
      'plan',
      'instructions',
    ]);
  });

  it('handles empty/whitespace kinds without throwing', () => {
    expect(getDestinationSupportedActivityTypes('')).toEqual([
      'task',
      'checklist',
      'plan',
      'instructions',
    ]);
  });
});

describe('formatActivityTypeLabel', () => {
  it('returns user-facing labels for the canonical activity types', () => {
    expect(formatActivityTypeLabel('task')).toBe('To-do');
    expect(formatActivityTypeLabel('checklist')).toBe('Checklist');
    expect(formatActivityTypeLabel('shopping_list')).toBe('Shopping list');
    expect(formatActivityTypeLabel('instructions')).toBe('Instructions');
    expect(formatActivityTypeLabel('plan')).toBe('Plan');
  });

  it('labels custom: prefixed types as "Custom"', () => {
    expect(formatActivityTypeLabel('custom:focus_block' as any)).toBe('Custom');
    expect(formatActivityTypeLabel('custom:' as any)).toBe('Custom');
  });

  it('returns the raw value when type is unrecognized', () => {
    expect(formatActivityTypeLabel('something-else' as any)).toBe('something-else');
  });
});
