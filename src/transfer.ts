const FEE_PERCENT = 1;
const MIN_FEE = 5;
const MAX_FEE = 150;
const MAX_TRANSFER_AMOUNT = 50000;

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

  const amountInKopecks = Math.round(amount * 100);
  const feeInKopecks = Math.round((amountInKopecks * FEE_PERCENT) / 100);
  const fee = feeInKopecks / 100;

  return Math.min(Math.max(fee, MIN_FEE), MAX_FEE);
}
