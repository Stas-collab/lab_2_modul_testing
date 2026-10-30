import type { NegativeCache } from '../../src/promo-service';

export class InMemoryNegativeCache implements NegativeCache {
  private codes = new Set<string>();

  async has(code: string): Promise<boolean> {
    return this.codes.has(code);
  }

  async add(code: string): Promise<void> {
    this.codes.add(code);
  }

  get size(): number {
    return this.codes.size;
  }

  contains(code: string): boolean {
    return this.codes.has(code);
  }
}
