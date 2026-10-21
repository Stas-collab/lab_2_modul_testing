import { describe, it, expect } from 'vitest';
import { estimateDelivery, type Region } from '../src/order';

describe('estimateDelivery', () => {
  describe('стандартна доставка', () => {
    it.each([
      { region: 'kyiv' as const, expected: 1 },
      { region: 'center' as const, expected: 2 },
      { region: 'west' as const, expected: 3 },
      { region: 'east' as const, expected: 4 },
    ])('регіон $region: $expected дн.', ({ region, expected }) => {
      expect(estimateDelivery(region, false)).toBe(expected);
    });
  });

  describe('прискорена доставка', () => {
    it.each([
      { region: 'west' as const, expected: 2 },
      { region: 'east' as const, expected: 3 },
    ])(
      'скорочує термін на 1 день для регіону $region: $expected дн.',
      ({ region, expected }) => {
        expect(estimateDelivery(region, true)).toBe(expected);
      },
    );
  });

  // Межа «мінімум 1 день»: база 3 → 2 (межа + 1), база 2 → 1 (межа),
  // база 1 → 1, а не 0 (межа − 1)
  describe('нижня межа терміну доставки', () => {
    it.each([
      { region: 'west' as const, expected: 2 },
      { region: 'center' as const, expected: 1 },
      { region: 'kyiv' as const, expected: 1 },
    ])(
      'прискорена доставка: регіон $region дає $expected дн.',
      ({ region, expected }) => {
        expect(estimateDelivery(region, true)).toBe(expected);
      },
    );

    it('ніколи не повертає менше одного дня', () => {
      const regions: Region[] = ['kyiv', 'center', 'west', 'east'];
      regions.forEach((region) => {
        expect(estimateDelivery(region, true)).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('некоректні дані', () => {
    it.each(['mars', '', 'KYIV'])(
      'відхиляє невідомий регіон «%s»',
      (region) => {
        expect(() => estimateDelivery(region as Region, false)).toThrow(
          'INVALID_REGION',
        );
      },
    );

    it('відхиляє службову назву властивості як регіон', () => {
      expect(() => estimateDelivery('toString' as Region, true)).toThrow(
        'INVALID_REGION',
      );
    });
  });
});
