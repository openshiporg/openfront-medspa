export type ProviderReadResult<T> =
  | { status: "loaded"; data: T }
  | { status: "unavailable"; data: null };

export async function readPublicProviderProfiles<T>(read: () => Promise<T>): Promise<ProviderReadResult<T>> {
  try {
    return { status: "loaded", data: await read() };
  } catch {
    // Do not serialize GraphQL messages, schema details, or request data into UI state or logs.
    console.error("Public provider profile read failed");
    return { status: "unavailable", data: null };
  }
}
