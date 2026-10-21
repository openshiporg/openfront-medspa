export interface StorefrontImageLike {
  image?: {
    url?: string | null
  } | null
  imagePath?: string | null
  metadata?: unknown
  altText?: string | null
}

function imagePathFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null
  const value = (metadata as { imagePath?: unknown }).imagePath
  return typeof value === "string" ? value : null
}

export function normalizePublicImagePath(path?: string | null): string | null {
  if (!path) return null
  const trimmed = path.trim()
  if (!trimmed) return null

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/images/")
  ) {
    return trimmed
  }

  return trimmed.startsWith("/") ? `/images${trimmed}` : `/images/${trimmed}`
}

export function getStorefrontImageSrc(image?: StorefrontImageLike | null): string | null {
  return (
    image?.image?.url ||
    normalizePublicImagePath(image?.imagePath) ||
    normalizePublicImagePath(imagePathFromMetadata(image?.metadata))
  )
}
