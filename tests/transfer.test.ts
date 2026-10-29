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

  describe('комісія 1 % від суми', () => {
    it.each([
      { amount: 501, expected: 5.01 },
      { amount: 1000, expected: 10 },
      { amount: 1234, expected: 12.34 },
      { amount: 10000, expected: 100 },
      { amount: 14999, expected: 149.99 },
    ])('сума $amount → комісія $expected', ({ amount, expected }) => {
      expect(calcTransferFee(amount)).toBeCloseTo(expected, 2);
    });
  });

  describe('максимальна комісія', () => {
    it.each([
      { amount: 15000, expected: 150 },
      { amount: 15000.01, expected: 150 },
      { amount: 20000, expected: 150 },
      { amount: 50000, expected: 150 },
    ])('сума $amount → комісія обмежена $expected', ({ amount, expected }) => {
      expect(calcTransferFee(amount)).toBe(expected);
    });
  });

  describe('додаткова перевірка для великих сум', () => {
    it.each([50000.01, 50001, 100000, 1_000_000])(
      'сума %s вимагає додаткової перевірки',
      (amount) => {
        expect(() => calcTransferFee(amount)).toThrow(
          'ADDITIONAL_VERIFICATION_REQUIRED',
        );
      },
    );
  });
});
