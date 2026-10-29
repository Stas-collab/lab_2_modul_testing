const FEE_RATE = 0.01;
const MIN_FEE = 5;

export function calcTransferFee(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('INVALID_AMOUNT');
  }
  return Math.max(amount * FEE_RATE, MIN_FEE);
}
