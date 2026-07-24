import { moneyLifecycle } from './moneyLifecycle';

describe('moneyLifecycle', () => {
  beforeEach(async () => {
    await moneyLifecycle.deactivate();
    moneyLifecycle.resetForTests();
  });

  it('activates once and ignores duplicate activation', async () => {
    expect(moneyLifecycle.getSnapshot()).toEqual({ active: false, activationCount: 0 });

    await moneyLifecycle.activate();
    await moneyLifecycle.activate();

    expect(moneyLifecycle.getSnapshot()).toEqual({ active: true, activationCount: 1 });
  });

  it('runs registered cleanup and becomes inactive on deactivation', async () => {
    const cleanup = jest.fn();
    await moneyLifecycle.activate();
    moneyLifecycle.registerCleanup(cleanup);

    await moneyLifecycle.deactivate();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(moneyLifecycle.getSnapshot()).toEqual({ active: false, activationCount: 1 });
  });
});
