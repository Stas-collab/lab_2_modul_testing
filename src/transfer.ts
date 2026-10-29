const FEE_RATE = 0.01;
const MIN_FEE = 5;
const MAX_FEE = 150;

export function calcTransferFee(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('INVALID_AMOUNT');
  }
  if (amount > 50000) {
    throw new Error('ADDITIONAL_VERIFICATION_REQUIRED');
  }
  return Math.min(Math.max(amount * FEE_RATE, MIN_FEE), MAX_FEE);
}
