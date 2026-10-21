/** URL inputs are not trusted GraphQL Ints or filter enums. */
export function pageIndex(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) return 0;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 0 && page <= 100_000 ? page : 0;
}

export function statusFilter<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}
