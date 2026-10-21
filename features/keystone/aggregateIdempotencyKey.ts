/** Compose an aggregate-specific key from an already scoped operation namespace and source key. */
export function aggregateIdempotencyKey(scope: string, key: string): string {
  if (typeof scope !== "string" || !scope.trim() || typeof key !== "string" || !key.trim()) {
    throw new Error("A nonempty scoped idempotency key is required");
  }
  return `${scope}:${key}`;
}
