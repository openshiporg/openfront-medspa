import { HomePage, generateHomeMetadata as generateMetadata } from "@/features/storefront/screens"
import { MainLayout } from "@/features/storefront/screens/MainLayout"

export { generateMetadata }

export const dynamic = "force-dynamic"

export default function RootStorefrontPage() {
  return (
    <MainLayout>
      <HomePage />
    </MainLayout>
  )
}
