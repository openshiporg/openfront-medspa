import { cache } from "react"
import { keystoneContext } from "@/features/keystone/context"
import { storefrontPracticeSlug } from "@/features/keystone/lib/storefrontPractice"

/** Request-cached slug of the practice this storefront serves; throws when none is published. */
export const practiceSlug = cache(async function (): Promise<string> {
  const slug = await storefrontPracticeSlug(keystoneContext)
  if (!slug) throw new Error("No published storefront practice")
  return slug
})
