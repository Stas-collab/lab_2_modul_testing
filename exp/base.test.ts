import { describe, it, expect } from 'vitest';
import { calcSubtotal, calcDiscountRate } from '../src/order';

describe('базовий набір (лише calcSubtotal і calcDiscountRate)', () => {
  it('підсумовує позиції', () => {
    expect(calcSubtotal([{ sku: 'A', price: 100, qty: 2 }])).toBe(200);
  });
  it('відхиляє порожнє замовлення', () => {
    expect(() => calcSubtotal([])).toThrow('EMPTY_ORDER');
  });
  it('рахує ставку для gold', () => {
    expect(calcDiscountRate('gold', 500)).toBeCloseTo(0.1, 4);
  });
});
