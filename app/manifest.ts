import type { MetadataRoute } from "next"
import { getStorefrontBrand } from "@/features/storefront/lib/data/brand"

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await getStorefrontBrand()
  const hue = brand.configured ? brand.accentHue : 220
  return {
    name: brand.name,
    short_name: brand.name.slice(0, 30),
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: `hsl(${hue} 18% 36%)`,
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  }
}
