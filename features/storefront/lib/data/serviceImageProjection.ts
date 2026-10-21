export const MAX_SERVICE_IMAGE_PROJECTION_SERVICES = 2550;
export const MAX_SERVICE_IMAGE_LOOKUP_IDS = 100;

export type StorefrontImage = {
  image: { url: string } | null;
  imagePath: string | null;
  altText: string | null;
};

type ServiceWithImageReference = { image: { id: string } | null };

export async function projectServiceImages<T extends ServiceWithImageReference>(
  services: T[],
  lookup: (imageIds: string[]) => Promise<unknown>,
): Promise<Array<Omit<T, "image"> & { image: StorefrontImage | null }>> {
  if (services.length > MAX_SERVICE_IMAGE_PROJECTION_SERVICES) {
    throw new Error("Service image projection exceeded its bounded service set");
  }

  const imageIds = [...new Set(
    services
      .map((service) => service.image?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  )];
  if (imageIds.length === 0) {
    return services.map((service) => ({ ...service, image: null }));
  }

  const imagesById = new Map<string, StorefrontImage>();
  for (let offset = 0; offset < imageIds.length; offset += MAX_SERVICE_IMAGE_LOOKUP_IDS) {
    const batch = imageIds.slice(offset, offset + MAX_SERVICE_IMAGE_LOOKUP_IDS);
    const result = await lookup(batch);
    if (!Array.isArray(result)) {
      throw new Error("Scoped service image lookup did not return a list");
    }

    const requestedIds = new Set(batch);
    for (const value of result) {
      const record = value as {
        id?: unknown;
        image?: { url?: unknown } | null;
        imagePath?: unknown;
        altText?: unknown;
      } | null;
      if (typeof record?.id !== "string" || !requestedIds.has(record.id)) continue;
      if (imagesById.has(record.id)) {
        throw new Error("Scoped service image identity is ambiguous");
      }
      imagesById.set(record.id, {
        image: typeof record.image?.url === "string" && record.image.url
          ? { url: record.image.url }
          : null,
        imagePath: typeof record.imagePath === "string" && record.imagePath ? record.imagePath : null,
        altText: typeof record.altText === "string" ? record.altText : null,
      });
    }
  }

  return services.map((service) => ({
    ...service,
    image: service.image ? imagesById.get(service.image.id) ?? null : null,
  }));
}
