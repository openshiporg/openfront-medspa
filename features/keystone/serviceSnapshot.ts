export type ServiceSnapshot = {
  serviceTitle: string;
  serviceImagePath: string;
  duration: number;
  price: number;
};

type ServiceSnapshotSource = {
  name?: unknown;
  baseDuration?: unknown;
  duration?: unknown;
  price?: unknown;
  basePrice?: unknown;
  image?: { imagePath?: unknown; image?: { url?: unknown } | null } | null;
};

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonnegativeInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error("Service snapshot price must be nonnegative integer cents");
  return parsed;
}

function canonicalImagePath(value: unknown) {
  if (typeof value !== "string") return "";
  const path = value.trim();
  return path.startsWith("/images/") && !path.includes("..") ? path : "";
}

export function captureServiceSnapshot(service: ServiceSnapshotSource): ServiceSnapshot {
  const serviceTitle = typeof service.name === "string" ? service.name.trim() : "";
  if (!serviceTitle || serviceTitle.length > 300) throw new Error("Service snapshot title is invalid");
  const serviceImagePath = canonicalImagePath(service.image?.imagePath)
    || canonicalImagePath(service.image?.image?.url);
  return {
    serviceTitle,
    serviceImagePath,
    duration: positiveInteger(service.baseDuration ?? service.duration, 60),
    price: nonnegativeInteger(service.price ?? service.basePrice ?? 0),
  };
}
