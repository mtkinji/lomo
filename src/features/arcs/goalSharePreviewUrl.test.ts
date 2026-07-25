import { normalizeGoalSharePreviewImageUrl } from './goalSharePreviewUrl';

describe('normalizeGoalSharePreviewImageUrl', () => {
  it.each([undefined, null, '', '   '])('rejects blank value %s', (value) => {
    expect(normalizeGoalSharePreviewImageUrl(value)).toBeUndefined();
  });

  it.each(['not a url', 'file:///tmp/goal.jpg', 'ph://asset-id', 'data:image/png;base64,abc', 'ftp://example.com/a.jpg'])(
    'rejects malformed or non-public URL %s',
    (value) => {
      expect(normalizeGoalSharePreviewImageUrl(value)).toBeUndefined();
    },
  );

  it.each([
    ['http://images.example.com/goal.jpg', 'http://images.example.com/goal.jpg'],
    ['  https://images.example.com/goal.jpg?size=large  ', 'https://images.example.com/goal.jpg?size=large'],
  ])('retains public image URL %s', (value, expected) => {
    expect(normalizeGoalSharePreviewImageUrl(value)).toBe(expected);
  });
});
