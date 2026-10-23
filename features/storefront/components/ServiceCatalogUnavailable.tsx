import { StateCard } from "./ui/primitives"

export function ServiceCatalogUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <StateCard alert title="Treatments couldn't load" action={<div className="sf-track"><a href={retryHref} className="sf-pill">Try again</a></div>} />
  )
}
