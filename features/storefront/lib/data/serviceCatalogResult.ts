export type ServiceCatalogResult<T> =
  | { status: "loaded"; data: T }
  | { status: "unavailable"; data: null };

export async function readServiceCatalog<T>(read: () => Promise<T>): Promise<ServiceCatalogResult<T>> {
  try {
    return { status: "loaded", data: await read() };
  } catch {
    // Keep GraphQL details server-side; they may contain internal schema or request data.
    console.error("Published service catalog read failed");
    return { status: "unavailable", data: null };
  }
}
