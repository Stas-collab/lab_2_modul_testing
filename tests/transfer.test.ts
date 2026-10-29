import { describe, it, expect } from 'vitest';
import { calcTransferFee } from '../src/transfer';

describe('calcTransferFee', () => {
  describe('валідація суми', () => {
    it.each([0, -1, -100, NaN, Infinity, -Infinity])(
      'відхиляє некоректну суму %s',
      (amount) => {
        expect(() => calcTransferFee(amount)).toThrow('INVALID_AMOUNT');
      },
    );
  });

  describe('мінімальна комісія', () => {
    it.each([0.01, 1, 100, 499.99, 500])(
      'для суми %s комісія дорівнює мінімуму 5 грн',
      (amount) => {
        expect(calcTransferFee(amount)).toBe(5);
      },
    );
  });
});
