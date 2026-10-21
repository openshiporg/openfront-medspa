export const MAX_CATEGORY_PROJECTION_SERVICES = 100;

export type ScopedServiceCategory = { id: string; name: string };
type ServiceWithCategory = { category: { id: string; name?: string | null } | null };

export async function projectServiceCategories<T extends ServiceWithCategory>(
  services: T[],
  lookup: (categoryIds: string[]) => Promise<unknown>,
): Promise<Array<Omit<T, "category"> & { category: ScopedServiceCategory | null }>> {
  if (services.length > MAX_CATEGORY_PROJECTION_SERVICES) {
    throw new Error("Service category projection exceeded its bounded service set");
  }

  const categoryIds = [...new Set(
    services
      .map((service) => service.category?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  )];
  if (categoryIds.length === 0) {
    return services.map((service) => ({ ...service, category: null }));
  }

  const result = await lookup(categoryIds);
  if (!Array.isArray(result)) {
    throw new Error("Scoped service category lookup did not return a list");
  }

  const requestedIds = new Set(categoryIds);
  const scopedCategories = new Map<string, ScopedServiceCategory>();
  for (const value of result) {
    const category = value as { id?: unknown; name?: unknown } | null;
    if (typeof category?.id !== "string" || !requestedIds.has(category.id)) continue;
    if (typeof category.name !== "string" || !category.name.trim() || scopedCategories.has(category.id)) {
      throw new Error("Scoped service category identity is malformed or ambiguous");
    }
    scopedCategories.set(category.id, { id: category.id, name: category.name });
  }

  return services.map((service) => ({
    ...service,
    category: service.category ? scopedCategories.get(service.category.id) ?? null : null,
  }));
}
