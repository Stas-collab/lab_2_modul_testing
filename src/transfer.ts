export function calcTransferFee(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('INVALID_AMOUNT');
  }
  return Math.max(amount * 0.01, 5);
}
