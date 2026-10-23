import type { Metadata } from "next"
import { MainLayout, MainNotFound } from "@/features/storefront/screens/MainLayout"

export const metadata: Metadata = { title: "Page not found" }

/** Unmatched public URLs get the storefront shell and its 404, not Next's bare default. */
export default function NotFound() {
  return (
    <MainLayout>
      <MainNotFound />
    </MainLayout>
  )
}
