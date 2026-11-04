import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, MapPin, Phone, Clock } from "lucide-react"
import { getStorefrontBrand, storefrontMetadata } from "../lib/data/brand"
import { getAllServices } from "../lib/data/services"
import { getFeaturedProviders } from "../lib/data/providers"
import { getPublicPracticeImages } from "../lib/data/practiceImages"
import { ServiceCatalogUnavailable } from "../components/ServiceCatalogUnavailable"
import { ProviderProfilesUnavailable } from "../components/ProviderProfilesUnavailable"
import { getStorefrontImageSrc } from "../lib/images"
import { publishedHours } from "../lib/hours"
import { formatPrice } from "../lib/format"
import { getStorefrontRooms } from "../lib/data/rooms"

export async function generateMetadata(): Promise<Metadata> { return storefrontMetadata() }

export async function HomePage() {
  const [brand, catalog, providerResult, images, rooms] = await Promise.all([
    getStorefrontBrand(), getAllServices(), getFeaturedProviders(2), getPublicPracticeImages(), getStorefrontRooms(),
  ])
  const services = catalog.status === "loaded" ? catalog.data : []
  const providers = providerResult.status === "loaded" ? providerResult.data : []
  const hero = images.find(image => /room/i.test(image.altText || ""))
  // Hero: the stored room hero first, then the Treatment room photo, then any room.
  const heroSrc = (hero ? getStorefrontImageSrc(hero) : null) || rooms.find(room => /treatment/i.test(room.name))?.photoUrl || rooms[0]?.photoUrl || null
  const hours = publishedHours(brand.hours, "short").filter(day => day.hours !== "Closed")
  return <div className="altair-home">
    <section className="altair-hero" aria-labelledby="home-heading">
      {heroSrc ? <img className="altair-hero-photo" src={heroSrc} alt={hero?.altText || ""} /> : null}
      <div className="altair-hero-copy">
        <h1 id="home-heading">{brand.city ? `${brand.city}’s calmest clinic.` : brand.name}</h1>
        {services.length ? <p>{services.map(service => service.name).slice(0, 4).join(", ")}</p> : null}
      </div>
    </section>
    <div className="altair-home-grid">
      {rooms.length ? <section className="altair-rooms" id="rooms" aria-labelledby="rooms-heading">
        <h2 id="rooms-heading">Our rooms</h2>
        <div className="altair-room-grid">{rooms.map(room => <Link key={room.id} href="/book">
          <img src={room.photoUrl} alt={room.name} /><h3>{room.name}</h3>
        </Link>)}</div>
      </section> : null}
      <section className="altair-treatments" id="treatments" aria-labelledby="treatments-heading">
        <h2 id="treatments-heading">Treatments</h2>
        {catalog.status === "unavailable" ? <ServiceCatalogUnavailable retryHref="/" /> : services.length ? <div className="altair-menu">
          {services.map(service => <Link className="altair-menu-row" key={service.id} href={`/services/${service.id}`}>
            <span>{service.name}</span><span>{service.baseDuration} min</span><span>{service.basePrice === 0 ? "complimentary" : formatPrice(service.basePrice)}</span>
          </Link>)}
        </div> : <p>No treatments listed yet</p>}
        <Link href="/book" className="altair-inflow-book">Book an appointment <ArrowRight aria-hidden="true" /></Link>
      </section>
      <section className="altair-team" id="team" aria-labelledby="team-heading">
        <h2 id="team-heading">Your team</h2>
        {providerResult.status === "unavailable" ? <ProviderProfilesUnavailable retryHref="/" /> : <div className="altair-team-grid">
          {providers.map(provider => {
            const src = getStorefrontImageSrc(provider.photo)
            return <Link href={`/team/${provider.id}`} key={provider.id}>
              {src ? <img src={src} alt={provider.photo?.altText || provider.user?.name || "Provider"} /> : null}
              <h3>{provider.user?.name || "Provider"}</h3>
              {provider.title ? <p className="altair-provider-title">{provider.title}</p> : null}
            </Link>
          })}
        </div>}
      </section>
    </div>
    <section className="altair-visit" id="visit" aria-labelledby="visit-heading">
      {heroSrc ? <img src={heroSrc} alt="" /> : null}
      <h2 id="visit-heading"><Link href="/contact">Visit</Link></h2>
      {brand.addressLine ? <Link href="/contact"><MapPin aria-hidden="true" />{brand.addressLine}</Link> : null}
      {hours.length ? <Link href="/contact"><Clock aria-hidden="true" />{hours.map(day => `${day.short} ${day.hours}`).join(", ")}</Link> : null}
      {brand.phone && brand.phoneHref ? <a href={brand.phoneHref}><Phone aria-hidden="true" />{brand.phone}</a> : null}
    </section>
  </div>
}
