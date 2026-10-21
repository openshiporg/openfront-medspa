/** Rates are fractions (0..1); amounts are integer minor units, never percentages. */
export function commissionMinor(saleAmount: number, rate: number): number {
  if (!Number.isSafeInteger(saleAmount) || saleAmount < 0 || !Number.isFinite(rate) || rate < 0 || rate > 1) throw new Error('Commission amount or fractional rate is invalid');
  return Math.round(saleAmount * rate);
}
