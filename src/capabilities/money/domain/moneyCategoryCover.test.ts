import { parseMoneyCategoryCover, validateMoneyCategoryCover } from './moneyCategoryCover';

const validCover = {
  source: 'unsplash' as const,
  photoId: 'housing-photo',
  imageUrl: 'https://images.unsplash.com/photo-housing?auto=format&fit=crop&w=1600',
  photographerName: 'Maya Rivera',
  photographerUrl: 'https://unsplash.com/@maya?utm_source=kwilt&utm_medium=referral',
  sourceUrl: 'https://unsplash.com/photos/housing-photo?utm_source=kwilt&utm_medium=referral',
  color: '#315545',
};

describe('Money category cover validation', () => {
  it('accepts complete Unsplash attribution metadata and null removal', () => {
    expect(validateMoneyCategoryCover(validCover)).toEqual(validCover);
    expect(validateMoneyCategoryCover(null)).toBeNull();
  });

  it.each([
    [{ ...validCover, imageUrl: 'http://images.unsplash.com/photo-housing' }, 'secure'],
    [{ ...validCover, imageUrl: 'https://example.com/photo-housing' }, 'Unsplash image'],
    [{ ...validCover, sourceUrl: 'https://example.com/photos/housing' }, 'Unsplash page'],
    [{ ...validCover, photographerUrl: 'https://example.com/@maya' }, 'Unsplash photographer'],
    [{ ...validCover, photoId: '' }, 'photo id'],
    [{ ...validCover, photographerName: '' }, 'photographer name'],
    [{ ...validCover, extra: true }, 'unknown'],
  ])('rejects invalid cover metadata', (value, message) => {
    expect(() => validateMoneyCategoryCover(value)).toThrow(message);
  });

  it('rejects payloads over 4 KB and safely ignores invalid stored values', () => {
    const oversized = { ...validCover, photographerName: 'é'.repeat(2050) };

    expect(() => validateMoneyCategoryCover(oversized)).toThrow('4 KB');
    expect(parseMoneyCategoryCover({ ...validCover, sourceUrl: 'https://example.com/photo' })).toBeNull();
  });
});
