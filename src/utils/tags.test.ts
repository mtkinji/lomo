import { parseTags, suggestTagsFromText } from './tags';

describe('parseTags', () => {
  it('deduplicates tags case-insensitively while preserving first-seen labels', () => {
    expect(parseTags('Groceries, groceries, School,  , SCHOOL')).toEqual(['Groceries', 'School']);
  });
});

describe('suggestTagsFromText', () => {
  it('preserves groceries as a specific grouping tag instead of collapsing it to errands', () => {
    expect(suggestTagsFromText('Buy groceries after school')).toContain('groceries');
  });

  it('still suggests errands for explicit errands language', () => {
    expect(suggestTagsFromText('Run errands after lunch')).toContain('errands');
  });

  it('uses the existing tag label when the fallback suggestion matches', () => {
    expect(suggestTagsFromText('Buy groceries after school', { existingTags: ['Groceries'] })).toContain('Groceries');
  });
});
