import { describe, it, expect } from 'vitest';

describe('ізоляція від мережі (onUnhandledRequest: error)', () => {
  it('запит до неописаної адреси відхиляється, а не йде в реальну мережу', async () => {
    await expect(fetch('https://not-described.example.org/ping')).rejects.toThrow();
  });
});
