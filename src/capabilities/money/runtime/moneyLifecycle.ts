type MoneyCleanup = () => void | Promise<void>;

type MoneyLifecycleSnapshot = {
  active: boolean;
  activationCount: number;
};

class MoneyLifecycle {
  private active = false;
  private activationCount = 0;
  private cleanups = new Set<MoneyCleanup>();

  async activate(): Promise<void> {
    if (this.active) return;
    this.active = true;
    this.activationCount += 1;
  }

  async deactivate(): Promise<void> {
    if (!this.active && this.cleanups.size === 0) return;
    this.active = false;
    const cleanups = [...this.cleanups];
    this.cleanups.clear();
    await Promise.allSettled(cleanups.map((cleanup) => cleanup()));
  }

  registerCleanup(cleanup: MoneyCleanup): () => void {
    this.cleanups.add(cleanup);
    return () => this.cleanups.delete(cleanup);
  }

  getSnapshot(): MoneyLifecycleSnapshot {
    return { active: this.active, activationCount: this.activationCount };
  }

  resetForTests(): void {
    this.active = false;
    this.activationCount = 0;
    this.cleanups.clear();
  }
}

export const moneyLifecycle = new MoneyLifecycle();
