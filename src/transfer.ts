const FEE_PERCENT = 1;
const MIN_FEE = 5;
const MAX_FEE = 150;
const MAX_TRANSFER_AMOUNT = 50000;
const KOPECKS_IN_HRYVNIA = 100;

const toKopecks = (hryvnias: number): number =>
  Math.round(hryvnias * KOPECKS_IN_HRYVNIA);

const toHryvnias = (kopecks: number): number => kopecks / KOPECKS_IN_HRYVNIA;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

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

/** Відсоткова комісія в копійках, заокруглена до цілої копійки. */
function percentFeeInKopecks(amount: number): number {
  return Math.round((toKopecks(amount) * FEE_PERCENT) / 100);
}

export function calcTransferFee(amount: number): number {
  assertValidAmount(amount);
  assertWithinLimit(amount);

  const fee = toHryvnias(percentFeeInKopecks(amount));
  return clamp(fee, MIN_FEE, MAX_FEE);
}
