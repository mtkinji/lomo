import { Linking } from 'react-native';
import {
  createAmazonCartPreparationProvider,
  openAmazonPreparedCart,
} from './amazonCartPreparationProvider';

jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

const input = {
  listId: 'list-1',
  listRevision: 4,
  items: [
    { id: 'milk', concept: 'Almond milk', quantityMin: 2, quantityMax: null, unit: 'cartons' },
    { id: 'tomatoes', concept: 'Ripe roma tomatoes', quantityMin: 6, quantityMax: null, unit: 'count' },
  ],
};

describe('Amazon cart preparation provider', () => {
  it('keeps internal examples in review rather than claiming they are cart-ready', async () => {
    const invoke = jest.fn();
    const provider = createAmazonCartPreparationProvider({ invoke, testingEnabled: true });

    const result = await provider.prepare(input);

    expect(invoke).not.toHaveBeenCalled();
    expect(result.source).toBe('preview');
    expect(result.cartUrl).toBeNull();
    expect(result.items).toEqual([
      expect.objectContaining({ itemId: 'milk', status: 'review', productId: 'preview:milk' }),
      expect.objectContaining({ itemId: 'tomatoes', status: 'review', productId: 'preview:tomatoes' }),
    ]);
  });

  it('parses provider evidence returned by the server boundary', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: {
      schemaVersion: 1,
      retailerId: 'amazon',
      listId: 'list-1',
      listRevision: 4,
      source: 'provider',
      observedAt: '2026-08-14T18:00:00.000Z',
      cartUrl: 'https://www.amazon.com/gp/cart/view.html?tag=kwiltapp-20',
      items: [
        { itemId: 'milk', status: 'ready', productId: 'B000000001', title: 'Almond milk, 6 pack' },
        { itemId: 'tomatoes', status: 'unavailable', reason: 'No confident match' },
      ],
    }, error: null });
    const provider = createAmazonCartPreparationProvider({ invoke, testingEnabled: false, batchPreparationEnabled: true });

    const result = await provider.prepare(input);

    expect(invoke).toHaveBeenCalledWith('amazon-grocery-prepare', { body: input });
    expect(result.source).toBe('provider');
    expect(result.cartUrl).toContain('amazon.com');
  });

  it('fails closed when provider evidence is unavailable or invalid', async () => {
    const unavailable = createAmazonCartPreparationProvider({
      invoke: jest.fn().mockResolvedValue({ data: null, error: { message: 'unavailable' } }),
      testingEnabled: false,
      batchPreparationEnabled: true,
    });
    const invalid = createAmazonCartPreparationProvider({
      invoke: jest.fn().mockResolvedValue({ data: { nope: true }, error: null }),
      testingEnabled: false,
      batchPreparationEnabled: true,
    });

    await expect(unavailable.prepare(input)).rejects.toThrow('amazon.preparation_unavailable');
    await expect(invalid.prepare(input)).rejects.toThrow('amazon.preparation_invalid');
  });

  it('does not invoke the provider until batch preparation is explicitly enabled', async () => {
    const invoke = jest.fn();
    const provider = createAmazonCartPreparationProvider({
      invoke,
      testingEnabled: false,
      batchPreparationEnabled: false,
    });

    await expect(provider.prepare(input)).rejects.toThrow('amazon.preparation_unavailable');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('opens only a provider-issued prepared cart', async () => {
    const provider = createAmazonCartPreparationProvider({
      invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
      testingEnabled: true,
    });
    const preview = await provider.prepare(input);
    await expect(openAmazonPreparedCart(preview)).resolves.toBe(false);
    expect(Linking.openURL).not.toHaveBeenCalled();

    const reviewOnly = {
      ...preview,
      source: 'provider',
      cartUrl: 'https://www.amazon.com/gp/cart/view.html?tag=kwiltapp-20',
    } as const;
    await expect(openAmazonPreparedCart(reviewOnly)).resolves.toBe(false);
    expect(Linking.openURL).not.toHaveBeenCalled();

    await expect(openAmazonPreparedCart({
      ...reviewOnly,
      items: reviewOnly.items.map((item, index) => index === 0 ? { ...item, status: 'ready' as const } : item),
    })).resolves.toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.amazon.com/gp/cart/view.html?tag=kwiltapp-20');
  });
});
