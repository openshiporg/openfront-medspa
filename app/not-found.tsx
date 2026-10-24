import type { Metadata } from "next"
import { connection } from "next/server"
import { MainLayout, MainNotFound } from "@/features/storefront/screens/MainLayout"

export const metadata: Metadata = { title: "Page not found" }

/** Unmatched public URLs get the storefront shell and its 404, read at request time, not build time. */
export default async function NotFound() {
  await connection()
  return (
    <MainLayout>
      <MainNotFound />
    </MainLayout>
  )
}
