import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ProStoreOfferSnapshot } from '../../services/entitlements';

const mockGetProStoreOfferSnapshot = jest.fn<Promise<ProStoreOfferSnapshot>, [string | null]>();
let mockIdentifiedAppUserID: string | null = 'user-a';

jest.mock('../../services/entitlements', () => ({
  getProStoreOfferSnapshot: (appUserID: string | null) =>
    mockGetProStoreOfferSnapshot(appUserID),
}));

jest.mock('../../store/useEntitlementsStore', () => ({
  useEntitlementsStore: (selector: (state: { identifiedAppUserID: string | null }) => unknown) =>
    selector({ identifiedAppUserID: mockIdentifiedAppUserID }),
}));

const readySnapshot: ProStoreOfferSnapshot = {
  status: 'ready',
  products: {
    pro_monthly: {
      sku: 'pro_monthly',
      price: 9.99,
      priceString: '$9.99',
      currencyCode: 'USD',
      introEligibility: 'unknown',
    },
  },
};

describe('useProStoreOffer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdentifiedAppUserID = 'user-a';
  });

  it('loads the current RevenueCat offer snapshot', async () => {
    mockGetProStoreOfferSnapshot.mockResolvedValue(readySnapshot);
    const { result } = renderHook(() => require('./useProStoreOffer').useProStoreOffer());

    expect(result.current).toMatchObject({ status: 'loading', snapshot: null });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.snapshot).toEqual(readySnapshot);
    expect(mockGetProStoreOfferSnapshot).toHaveBeenCalledWith('user-a');
  });

  it('exposes retry after an unavailable result', async () => {
    mockGetProStoreOfferSnapshot
      .mockResolvedValueOnce({ status: 'unavailable', products: {} })
      .mockResolvedValueOnce(readySnapshot);
    const { result } = renderHook(() => require('./useProStoreOffer').useProStoreOffer());

    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    act(() => result.current.retry());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockGetProStoreOfferSnapshot).toHaveBeenCalledTimes(2);
  });

  it('retains unavailable snapshot provenance for an honest development preview label', async () => {
    const unavailablePreview: ProStoreOfferSnapshot = {
      status: 'unavailable',
      products: {},
      source: 'development_fixture',
    };
    mockGetProStoreOfferSnapshot.mockResolvedValue(unavailablePreview);
    const { result } = renderHook(() => require('./useProStoreOffer').useProStoreOffer());

    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    expect(result.current.snapshot).toEqual(unavailablePreview);
  });

  it('reloads for identity changes and ignores the stale prior response', async () => {
    let resolveA: (value: ProStoreOfferSnapshot) => void = () => undefined;
    const pendingA = new Promise<ProStoreOfferSnapshot>((resolve) => {
      resolveA = resolve;
    });
    mockGetProStoreOfferSnapshot
      .mockReturnValueOnce(pendingA)
      .mockResolvedValueOnce(readySnapshot);
    const { result, rerender } = renderHook(() =>
      require('./useProStoreOffer').useProStoreOffer(),
    );

    mockIdentifiedAppUserID = 'user-b';
    rerender({});
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockGetProStoreOfferSnapshot).toHaveBeenLastCalledWith('user-b');

    await act(async () => {
      resolveA({ status: 'unavailable', products: {} });
      await pendingA;
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.snapshot).toEqual(readySnapshot);
  });
});
