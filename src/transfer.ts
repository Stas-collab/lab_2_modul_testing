const FEE_RATE = 0.01;
const MIN_FEE = 5;
const MAX_FEE = 150;
const MAX_TRANSFER_AMOUNT = 50000;

const round2 = (n: number): number => Math.round(n * 100) / 100;

function assertValidAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('INVALID_AMOUNT');
  }
}

function assertWithinLimit(amount: number): void {
  if (amount > MAX_TRANSFER_AMOUNT) {
    throw new Error('ADDITIONAL_VERIFICATION_REQUIRED');
  }
}

export function calcTransferFee(amount: number): number {
  assertValidAmount(amount);
  assertWithinLimit(amount);
  return round2(Math.min(Math.max(amount * FEE_RATE, MIN_FEE), MAX_FEE));
}
