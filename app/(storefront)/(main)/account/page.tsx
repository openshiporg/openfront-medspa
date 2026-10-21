import type { Metadata } from "next"
import { AccountPage } from "@/features/storefront/screens"
import { storefrontMetadata } from "@/features/storefront/lib/data/brand"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("My account")
}

export default AccountPage
