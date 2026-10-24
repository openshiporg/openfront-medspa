/**
 * Checkout tax rate (fraction). TAX_RATE, when set, overrides the practice's own
 * rate; otherwise the practice rate applies. Absence of both is not zero tax.
 */
export function configuredTaxRate(value: string | undefined = process.env.TAX_RATE, practiceRate?: number | null): number {
  if (typeof value === 'string' && value.trim()) {
    const rate = Number(value.trim());
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new Error('TAX_RATE must be between 0 and 1');
    return rate;
  }
  if (typeof practiceRate === 'number' && Number.isFinite(practiceRate) && practiceRate >= 0 && practiceRate <= 1) return practiceRate;
  throw new Error('Set a tax rate for the practice before checkout');
}

export type RetailInput = { productId: string; quantity: number };

/** Validate the whole requested selection before effects; never silently drop a row. */
export function parseRetail(input: unknown): RetailInput[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) throw new Error('Retail items must be an array');
  if (input.length > 50) throw new Error('Too many retail items');
  const quantities = new Map<string, number>();
  for (const item of input) {
    if (!item || typeof item !== 'object' || Array.isArray(item)
      || Object.keys(item).some(key => key !== 'productId' && key !== 'quantity')
      || typeof item.productId !== 'string' || !item.productId.trim() || item.productId.length > 200
      || typeof item.quantity !== 'number' || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || item.quantity > 1_000) {
      throw new Error('Each retail item requires a product and an integer quantity between 1 and 1000');
    }
    const productId = item.productId.trim();
    const quantity = (quantities.get(productId) || 0) + item.quantity;
    if (quantity > 1_000) throw new Error('Total quantity per retail product must not exceed 1000');
    quantities.set(productId, quantity);
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}
