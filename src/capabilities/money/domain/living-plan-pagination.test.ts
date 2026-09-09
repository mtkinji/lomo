import { collectAllPages } from './living-plan-pagination';

describe('bounded Money history reads', () => {
  it('loads the first page before starting a bounded batch, retaining page order', async () => {
    const starts: number[] = [];
    const release: Record<number, (rows: number[]) => void> = {};
    const done = collectAllPages(async from => {
      starts.push(from);
      if (from === 0) return [0, 1];
      return new Promise<number[]>(resolve => { release[from] = resolve; });
    }, 2, 3);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(starts).toEqual([0, 2, 4, 6]);
    release[6]([]); release[4]([4]); release[2]([2, 3]);
    await expect(done).resolves.toEqual([0, 1, 2, 3, 4]);
  });

  it('does not fail on an unused speculative page beyond the end of history', async () => {
    await expect(collectAllPages(async from => {
      if (from === 0) return [0, 1];
      if (from === 2) return [2];
      throw new Error('unused page failed');
    }, 2, 3)).resolves.toEqual([0, 1, 2]);
  });

  it('propagates a required page failure and never returns truncated history', async () => {
    await expect(collectAllPages(async from => {
      if (from === 0) return [0, 1];
      throw new Error('required page failed');
    }, 2, 3)).rejects.toThrow('required page failed');
  });

  it('avoids extra requests for short history and retains the sequential default', async () => {
    const short = jest.fn(async () => [1]);
    await expect(collectAllPages(short, 2, 3)).resolves.toEqual([1]);
    expect(short).toHaveBeenCalledTimes(1);
    const pages = jest.fn(async (from: number) => from === 0 ? [1, 2] : [3]);
    await expect(collectAllPages(pages, 2)).resolves.toEqual([1, 2, 3]);
    expect(pages.mock.calls).toEqual([[0, 1], [2, 3]]);
  });
});
